'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
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
type OrderStep = 'template' | 'points' | 'confirm' | 'export';

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

const orderSteps: Array<{ id: OrderStep; label: string }> = [
  { id: 'template', label: 'Mal' },
  { id: 'points', label: 'Fem punkter' },
  { id: 'confirm', label: 'Bekreft' },
  { id: 'export', label: 'Eksporter' },
];

function StepBlock({ step, title, active, children }: { step: number; title: string; active: boolean; children: ReactNode }) {
  return (
    <section hidden={!active} aria-hidden={!active} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-[#082F49] text-xs font-black text-white">{step}</span>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

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
  const [points, setPoints] = useState<Record<OrderPointKey, string>>({
    situasjon: '',
    oppdrag: '',
    utforelse: '',
    administrasjonForsyning: '',
    ledelseSamband: '',
  });
  const [notes, setNotes] = useState('');
  const [readbackConfirmed, setReadbackConfirmed] = useState(false);
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<OrderStep>('template');
  const template = selectedTemplate(templateId);
  const completedPointCount = useMemo(() => orderPointLabels.filter((item) => points[item.key].trim().length > 0).length, [points]);
  const requiredPointsComplete = useMemo(() => orderPointLabels.every((item) => points[item.key].trim().length > 0), [points]);
  const stepCompletion: Record<OrderStep, boolean> = {
    template: Boolean(templateId),
    points: requiredPointsComplete,
    confirm: readbackConfirmed,
    export: Boolean(preview),
  };

  function resetPreview() {
    setPreview(null);
    setExportError(null);
  }

  function canOpenStep(step: OrderStep) {
    if (step === 'template') return true;
    if (step === 'points') return Boolean(templateId);
    if (step === 'confirm') return requiredPointsComplete;
    if (step === 'export') return requiredPointsComplete && readbackConfirmed;
    return true;
  }

  function goToStep(step: OrderStep) {
    if (canOpenStep(step)) setActiveStep(step);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = buildInput(form, contentVersion);
    if (!requiredPointsComplete || !input.readbackConfirmed) return;

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
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Velg mal → fyll fem punkter → tilbakelesing → eksport</p>
        <h2 className="text-2xl font-black">5-punktsordre</h2>
      </div>
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1" role="tablist" aria-label="5-punktsordre steg">
        {orderSteps.map((step) => {
          const selected = activeStep === step.id;
          const disabled = !canOpenStep(step.id);
          return (
            <button
              key={step.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => goToStep(step.id)}
              className={selected
                ? 'min-h-11 rounded-xl bg-[#082F49] px-2 text-xs font-black text-white'
                : disabled
                  ? 'min-h-11 rounded-xl px-2 text-xs font-black text-slate-400'
                  : 'min-h-11 rounded-xl px-2 text-xs font-black text-slate-700 hover:bg-white'}
            >
              <span className="block">{step.label}</span>
              <span
                aria-hidden="true"
                className={selected
                  ? 'mt-1 block text-[0.65rem] font-black text-sky-100'
                  : stepCompletion[step.id]
                    ? 'mt-1 block text-[0.65rem] font-black text-emerald-700'
                    : disabled
                      ? 'mt-1 block text-[0.65rem] font-black text-slate-400'
                      : 'mt-1 block text-[0.65rem] font-black text-slate-500'}
              >
                {stepCompletion[step.id] ? 'Fullført' : disabled ? 'Låst' : 'Klar'}
              </span>
              <span className="sr-only">{stepCompletion[step.id] ? ' fullført' : disabled ? ' låst' : ' tilgjengelig'}</span>
            </button>
          );
        })}
      </div>
      <ContextNotice variant="local-support">Lokal beslutningsstøtte. Kontroller mot gjeldende ordre og unngå persondata før eksport.</ContextNotice>

      <StepBlock step={1} title="Velg mal" active={activeStep === 'template'}>
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
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => goToStep('points')} className="min-h-11 flex-1 rounded-xl bg-[#082F49] px-4 font-bold text-white">Neste: fyll fem punkter</button>
        </div>
      </StepBlock>

      <StepBlock step={2} title="Fyll fem punkter" active={activeStep === 'points'}>
        <p className="rounded-xl bg-slate-100 p-3 text-sm font-black text-slate-800">{completedPointCount}/5 punkter fylt ut</p>
        {orderPointLabels.map((item) => (
          <label key={item.key} className="block text-sm font-bold">
            {item.label}
            <textarea
              name={item.inputName}
              required
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
        <label className="block text-sm font-bold">Notes<textarea name="notes" value={notes} onChange={(event) => { setNotes(event.currentTarget.value); resetPreview(); }} className="mt-1 min-h-20 w-full rounded-2xl border px-3 py-2" /></label>
        {!requiredPointsComplete ? <p className="rounded-xl bg-white p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Fyll ut alle fem punkter før tilbakelesing.</p> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => goToStep('template')} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold text-slate-900">Tilbake</button>
          <button type="button" onClick={() => goToStep('confirm')} disabled={!requiredPointsComplete} className="min-h-11 rounded-xl bg-[#082F49] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Neste: bekreft tilbakelesing</button>
        </div>
      </StepBlock>

      <StepBlock step={3} title="Bekreft tilbakelesing" active={activeStep === 'confirm'}>
        <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-950">
          <input
            type="checkbox"
            name="readbackConfirmed"
            required
            checked={readbackConfirmed}
            onChange={(event) => {
              setReadbackConfirmed(event.currentTarget.checked);
              resetPreview();
            }}
            className="mt-1 h-5 w-5"
          />
          Tilbakelesing/forstått er bekreftet før lokal eksport
        </label>
        {!readbackConfirmed ? <p className="rounded-xl bg-white p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">Bekreft tilbakelesing/forstått for å åpne lokal eksport.</p> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => goToStep('points')} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold text-slate-900">Tilbake</button>
          <button type="button" onClick={() => goToStep('export')} disabled={!readbackConfirmed} className="min-h-11 rounded-xl bg-[#082F49] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Neste: eksport</button>
        </div>
      </StepBlock>

      <StepBlock step={4} title="Eksporter" active={activeStep === 'export'}>
        <button type="button" onClick={() => goToStep('confirm')} className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold text-slate-900">Tilbake</button>
        <button type="submit" name="format" value="markdown" disabled={!requiredPointsComplete || !readbackConfirmed} className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Eksporter Markdown</button>
        <details className="rounded-2xl border border-slate-200 bg-white p-3">
          <summary className="min-h-11 cursor-pointer list-none text-sm font-black text-slate-900">Flere eksportformater</summary>
          <p className="mt-2 text-sm font-semibold text-slate-700">{EXPORT_SENSITIVITY_WARNING}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button type="submit" name="format" value="json" disabled={!requiredPointsComplete || !readbackConfirmed} className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Eksporter JSON</button>
            <button type="submit" name="format" value="pdf" disabled={!requiredPointsComplete || !readbackConfirmed} className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{preview?.format === 'pdf' ? 'Oppdater utskrift' : 'Lag PDF-klar HTML'}</button>
          </div>
        </details>
      </StepBlock>

      {exportError ? <p role="status" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-950">{exportError}</p> : null}
      <ExportReview title="Eksport" text={preview?.text ?? ''} textareaId="five-point-order-preview" formatLabel={preview?.format.toUpperCase()} />
    </form>
  );
}
