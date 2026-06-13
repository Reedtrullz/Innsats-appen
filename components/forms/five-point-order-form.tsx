'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  EXPORT_SENSITIVITY_WARNING,
  FIVE_POINT_ORDER_ROLE_TEMPLATES,
  type FivePointOrderInput,
  type FivePointOrderTemplateId,
  exportFivePointOrderJson,
  exportFivePointOrderMarkdown,
  exportFivePointOrderPdfReadyHtml,
} from '@/lib/mission/order-export';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { ContextNotice } from '@/components/mission/context-notice';
import { ExportReview } from '@/components/mission/export-review';

function value(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}

type ExportFormat = 'markdown' | 'json' | 'pdf';

interface ExportPreview {
  format: ExportFormat;
  text: string;
}

type OrderPointKey = 'situasjon' | 'oppdrag' | 'utforelse' | 'administrasjonForsyning' | 'ledelseSamband';

const orderPointLabels: Array<{ key: OrderPointKey; label: string; inputName: string; guidanceKey: keyof ReturnType<typeof selectedTemplate>['guidance'] }> = [
  { key: 'situasjon', label: 'Situasjon', inputName: 'situasjon', guidanceKey: 'situasjon' },
  { key: 'oppdrag', label: 'Oppdrag', inputName: 'oppdrag', guidanceKey: 'oppdrag' },
  { key: 'utforelse', label: 'Utførelse', inputName: 'utforelse', guidanceKey: 'utforelse' },
  { key: 'administrasjonForsyning', label: 'Administrasjon/forsyning', inputName: 'administrasjonForsyning', guidanceKey: 'administrasjonForsyning' },
  { key: 'ledelseSamband', label: 'Ledelse/samband', inputName: 'ledelseSamband', guidanceKey: 'ledelseSamband' },
];

function selectedTemplate(templateId: FivePointOrderTemplateId) {
  return FIVE_POINT_ORDER_ROLE_TEMPLATES.find((template) => template.id === templateId) ?? FIVE_POINT_ORDER_ROLE_TEMPLATES[0];
}

interface FivePointOrderFormProps {
  contentVersion?: string;
}

const EXPORT_BLOCKED_MESSAGE = 'Eksport blokkert: Fjern persondata, pasientdata, kontaktopplysninger eller skjermet informasjon før lokal eksport.';

export const FIVE_POINT_ORDER_DRAFT_KEY = 'beredskapsboka-five-point-order-draft-v1';

const EMPTY_POINTS: Record<OrderPointKey, string> = {
  situasjon: '',
  oppdrag: '',
  utforelse: '',
  administrasjonForsyning: '',
  ledelseSamband: '',
};

type OrderDraft = {
  templateId: FivePointOrderTemplateId;
  points: Record<OrderPointKey, string>;
  notes: string;
};

function readDraft(): OrderDraft | null {
  try {
    const raw = localStorage.getItem(FIVE_POINT_ORDER_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OrderDraft> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    const points = { ...EMPTY_POINTS };
    for (const key of Object.keys(points) as OrderPointKey[]) {
      const candidate = parsed.points?.[key];
      if (typeof candidate === 'string') points[key] = candidate;
    }
    const templateId = FIVE_POINT_ORDER_ROLE_TEMPLATES.some((template) => template.id === parsed.templateId)
      ? (parsed.templateId as FivePointOrderTemplateId)
      : 'lagleder-lagforer';
    return { templateId, points, notes: typeof parsed.notes === 'string' ? parsed.notes : '' };
  } catch {
    return null;
  }
}

function writeDraft(draft: OrderDraft) {
  try {
    localStorage.setItem(FIVE_POINT_ORDER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Draft persistence is best-effort; the form keeps working without it.
  }
}

function clearDraftStorage() {
  try {
    localStorage.removeItem(FIVE_POINT_ORDER_DRAFT_KEY);
  } catch {
    // ignore
  }
}

/**
 * One-screen order form. Field reality: orders are drafted under time
 * pressure, often partially, and read back over samband. Nothing is gated —
 * empty points export as "—", readback is a recommended confirmation rather
 * than a lock, and the draft survives navigation/restart via localStorage.
 */
export function FivePointOrderForm({ contentVersion = 'local-mvp' }: FivePointOrderFormProps) {
  const [templateId, setTemplateId] = useState<FivePointOrderTemplateId>('lagleder-lagforer');
  const [points, setPoints] = useState<Record<OrderPointKey, string>>(EMPTY_POINTS);
  const [notes, setNotes] = useState('');
  const [readbackConfirmed, setReadbackConfirmed] = useState(false);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const template = selectedTemplate(templateId);
  const completedPointCount = useMemo(() => orderPointLabels.filter((item) => points[item.key].trim().length > 0).length, [points]);
  const hasAnyContent = completedPointCount > 0 || notes.trim().length > 0;

  useEffect(() => {
    // Seed editable state from the persisted draft once after mount. This must
    // run in an effect rather than a lazy initializer: localStorage is
    // unavailable during SSR, and reading it during the first client render
    // would diverge from the server-rendered (empty) form and break hydration.
    const draft = readDraft();
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage; see comment above
      setTemplateId(draft.templateId);
      setPoints(draft.points);
      setNotes(draft.notes);
      if (Object.values(draft.points).some((text) => text.trim().length > 0) || draft.notes.trim().length > 0) {
        setDraftRestored(true);
      }
    }
  }, []);

  useEffect(() => {
    // Only persist a draft worth restoring. An all-empty form (including right
    // after "Tøm utkast") clears storage instead of re-saving a blank draft.
    if (hasAnyContent) {
      writeDraft({ templateId, points, notes });
    } else {
      clearDraftStorage();
    }
  }, [templateId, points, notes, hasAnyContent]);

  function resetPreview() {
    setPreview(null);
    setExportError(null);
  }

  function clearDraft() {
    setPoints(EMPTY_POINTS);
    setNotes('');
    setReadbackConfirmed(false);
    setDraftRestored(false);
    clearDraftStorage();
    resetPreview();
  }

  function buildInput(form: FormData): FivePointOrderInput {
    return {
      templateId: value(form, 'templateId') as FivePointOrderTemplateId,
      situasjon: value(form, 'situasjon'),
      oppdrag: value(form, 'oppdrag'),
      utforelse: value(form, 'utforelse'),
      administrasjonForsyning: value(form, 'administrasjonForsyning'),
      ledelseSamband: value(form, 'ledelseSamband'),
      notes: value(form, 'notes'),
      readbackConfirmed: form.get('readbackConfirmed') === 'on',
      contentVersion,
    };
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = buildInput(form);

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const format = (submitter?.value as ExportFormat | undefined) ?? 'markdown';
    try {
      const nextPreview = format === 'json'
        ? { format, text: exportFivePointOrderJson(input) }
        : format === 'pdf'
          ? { format, text: exportFivePointOrderPdfReadyHtml(input) }
          : { format: 'markdown' as const, text: exportFivePointOrderMarkdown(input) };
      appendLocalAuditEntry('export-created', { exportKind: `five-point-order-${format}`, templateId: input.templateId, readbackConfirmed: input.readbackConfirmed });
      setExportError(null);
      setPreview(nextPreview);
    } catch {
      setPreview(null);
      setExportError(EXPORT_BLOCKED_MESSAGE);
    }
  }

  return (
    <form onSubmit={onSubmit} onChange={resetPreview} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Fyll det du har → eksporter → les tilbake</p>
        <h2 className="text-2xl font-black">5-punktsordre</h2>
      </div>
      <ContextNotice variant="local-support">Lokal beslutningsstøtte. Kontroller mot gjeldende ordre og unngå persondata før eksport.</ContextNotice>
      {draftRestored ? (
        <p role="status" className="rounded-xl bg-sky-50 p-3 text-sm font-bold text-sky-950">
          Lokalt utkast gjenopprettet.
          <button type="button" onClick={clearDraft} className="ml-2 inline-flex min-h-11 items-center align-middle font-black underline underline-offset-2">Tøm utkast</button>
        </p>
      ) : null}

      <label className="block text-sm font-bold">
        Rolle/mal for 5-punktsordre
        <select
          name="templateId"
          value={templateId}
          onChange={(event) => {
            setTemplateId(event.currentTarget.value as FivePointOrderTemplateId);
            resetPreview();
          }}
          className="mt-1 min-h-12 w-full rounded-2xl border px-3"
        >
          {FIVE_POINT_ORDER_ROLE_TEMPLATES.map((roleTemplate) => (
            <option key={roleTemplate.id} value={roleTemplate.id}>{roleTemplate.label}</option>
          ))}
        </select>
      </label>

      <details className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-950">
        <summary className="min-h-11 cursor-pointer list-none font-black">Malveiledning: {template.label}</summary>
        <p className="mt-1 font-semibold">{template.description}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Situasjon:</strong> {template.guidance.situasjon}</li>
          <li><strong>Oppdrag:</strong> {template.guidance.oppdrag}</li>
          <li><strong>Utførelse:</strong> {template.guidance.utforelse}</li>
          <li><strong>Administrasjon/forsyning:</strong> {template.guidance.administrasjonForsyning}</li>
          <li><strong>Ledelse/samband:</strong> {template.guidance.ledelseSamband}</li>
        </ul>
      </details>

      <p className="rounded-xl bg-slate-100 p-3 text-sm font-black text-slate-800">{completedPointCount}/5 punkter fylt ut. Tomme punkter eksporteres som «—».</p>
      {orderPointLabels.map((item) => (
        <label key={item.key} className="block text-sm font-bold">
          {item.label}
          <textarea
            name={item.inputName}
            value={points[item.key]}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setPoints((current) => ({ ...current, [item.key]: nextValue }));
              resetPreview();
            }}
            placeholder={template.guidance[item.guidanceKey]}
            className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2"
          />
        </label>
      ))}
      <label className="block text-sm font-bold">Notater<textarea name="notes" value={notes} onChange={(event) => { setNotes(event.currentTarget.value); resetPreview(); }} className="mt-1 min-h-20 w-full rounded-2xl border px-3 py-2" /></label>

      <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">
        <input
          type="checkbox"
          name="readbackConfirmed"
          checked={readbackConfirmed}
          onChange={(event) => {
            setReadbackConfirmed(event.currentTarget.checked);
            resetPreview();
          }}
          className="mt-1 h-5 w-5"
        />
        <span>
          Tilbakelesing/forstått er bekreftet før lokal eksport
          <span className="mt-1 block text-xs font-semibold">Anbefalt, men låser ikke eksporten. Status tas med i eksporten.</span>
        </span>
      </label>

      <div className="space-y-2">
        <button type="submit" name="format" value="markdown" disabled={!hasAnyContent} className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Eksporter Markdown</button>
        <details className="rounded-2xl border border-slate-200 bg-white p-3">
          <summary className="min-h-11 cursor-pointer list-none text-sm font-black text-slate-900">Flere eksportformater</summary>
          <p className="mt-2 text-sm font-semibold text-slate-700">{EXPORT_SENSITIVITY_WARNING}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="submit" name="format" value="json" disabled={!hasAnyContent} className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Eksporter JSON</button>
            <button type="submit" name="format" value="pdf" disabled={!hasAnyContent} className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{preview?.format === 'pdf' ? 'Oppdater utskrift' : 'Lag PDF-klar HTML'}</button>
          </div>
        </details>
      </div>

      {exportError ? <p role="status" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-950">{exportError}</p> : null}
      <ExportReview title="Eksport" text={preview?.text ?? ''} textareaId="five-point-order-preview" formatLabel={preview?.format.toUpperCase()} />
    </form>
  );
}
