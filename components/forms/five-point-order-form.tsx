'use client';

import { useState, type FormEvent } from 'react';
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

function value(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}

type ExportFormat = 'markdown' | 'json' | 'pdf';

interface ExportPreview {
  format: ExportFormat;
  text: string;
}

function selectedTemplate(templateId: FivePointOrderTemplateId) {
  return FIVE_POINT_ORDER_ROLE_TEMPLATES.find((template) => template.id === templateId) ?? FIVE_POINT_ORDER_ROLE_TEMPLATES[0];
}

interface FivePointOrderFormProps {
  contentVersion?: string;
}

const EXPORT_BLOCKED_MESSAGE = 'Eksport blokkert: Fjern persondata, pasientdata, kontaktopplysninger eller skjermet informasjon før lokal eksport.';

function buildInput(form: FormData, contentVersion: string): FivePointOrderInput {
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

export function FivePointOrderForm({ contentVersion = 'local-mvp' }: FivePointOrderFormProps) {
  const [templateId, setTemplateId] = useState<FivePointOrderTemplateId>('lagleder-lagforer');
  const [readbackConfirmed, setReadbackConfirmed] = useState(false);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const template = selectedTemplate(templateId);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = buildInput(form, contentVersion);
    if (!input.readbackConfirmed) return;

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
    <form onSubmit={onSubmit} onChange={() => { setPreview(null); setExportError(null); }} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Lokal ordre</p>
        <h2 className="text-2xl font-black">5-punktsordre</h2>
        <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Eksporteres lokalt som beslutningsstøtte. Kontroller mot gjeldende ordre og bruk bare operativt nødvendige opplysninger.</p>
        <p className="mt-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-950">{EXPORT_SENSITIVITY_WARNING}</p>
        <p className="mt-2 rounded-2xl bg-sky-50 p-3 text-sm font-semibold text-sky-950">PDF-klar HTML er tekst for nettleserens Skriv ut &gt; Lagre som PDF. Ikke offisiell innsending.</p>
      </div>

      <label className="block text-sm font-bold">
        Rolle/mal for 5-punktsordre
        <select
          name="templateId"
          value={templateId}
          onChange={(event) => {
            setTemplateId(event.currentTarget.value as FivePointOrderTemplateId);
            setPreview(null);
            setExportError(null);
          }}
          className="mt-1 min-h-12 w-full rounded-2xl border px-3"
        >
          {FIVE_POINT_ORDER_ROLE_TEMPLATES.map((roleTemplate) => (
            <option key={roleTemplate.id} value={roleTemplate.id}>{roleTemplate.label}</option>
          ))}
        </select>
      </label>

      <section className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-950" aria-label="Malveiledning">
        <h3 className="font-black">Malveiledning: {template.label}</h3>
        <p className="mt-1 font-semibold">{template.description}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Situasjon:</strong> {template.guidance.situasjon}</li>
          <li><strong>Oppdrag:</strong> {template.guidance.oppdrag}</li>
          <li><strong>Utførelse:</strong> {template.guidance.utforelse}</li>
          <li><strong>Administrasjon/forsyning:</strong> {template.guidance.administrasjonForsyning}</li>
          <li><strong>Ledelse/samband:</strong> {template.guidance.ledelseSamband}</li>
        </ul>
      </section>

      <label className="block text-sm font-bold">Situasjon<textarea name="situasjon" required placeholder={template.guidance.situasjon} className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Oppdrag<textarea name="oppdrag" required placeholder={template.guidance.oppdrag} className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Utførelse<textarea name="utforelse" required placeholder={template.guidance.utforelse} className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Administrasjon/forsyning<textarea name="administrasjonForsyning" required placeholder={template.guidance.administrasjonForsyning} className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Ledelse/samband<textarea name="ledelseSamband" required placeholder={template.guidance.ledelseSamband} className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Notes<textarea name="notes" className="mt-1 min-h-20 w-full rounded-2xl border px-3 py-2" /></label>

      <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">
        <input
          type="checkbox"
          name="readbackConfirmed"
          required
          checked={readbackConfirmed}
          onChange={(event) => {
            setReadbackConfirmed(event.currentTarget.checked);
            setPreview(null);
            setExportError(null);
          }}
          className="mt-1 h-5 w-5"
        />
        Tilbakelesing/forstått er bekreftet før lokal eksport
      </label>

      <div className="grid gap-2 sm:grid-cols-3">
        <button type="submit" name="format" value="markdown" disabled={!readbackConfirmed} className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Eksporter Markdown</button>
        <button type="submit" name="format" value="json" disabled={!readbackConfirmed} className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Eksporter JSON</button>
        <button type="submit" name="format" value="pdf" disabled={!readbackConfirmed} className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{preview?.format === 'pdf' ? 'Oppdater utskrift' : 'Lag PDF-klar HTML'}</button>
      </div>

      {!readbackConfirmed ? <p className="rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Bekreft tilbakelesing/forstått for å åpne lokal eksport.</p> : null}
      {exportError ? <p role="status" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-950">{exportError}</p> : null}
      {preview ? <pre className="whitespace-pre-wrap rounded-2xl bg-slate-100 p-3 text-sm">{preview.text}</pre> : null}
    </form>
  );
}
