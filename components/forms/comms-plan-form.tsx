'use client';

import { useState, type FormEvent } from 'react';
import {
  COMMS_PLAN_ROLE_TEMPLATES,
  EXPORT_SENSITIVITY_WARNING,
  type CommsPlanInput,
  type CommsPlanTemplateId,
  exportCommsPlanJson,
  exportCommsPlanMarkdown,
  exportCommsPlanPdfReadyHtml,
} from '@/lib/mission/order-export';
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

interface CommsPlanFormProps {
  contentVersion?: string;
}

const EXPORT_BLOCKED_MESSAGE = 'Eksport blokkert: Fjern persondata, pasientdata, kontaktopplysninger eller skjermet informasjon før lokal eksport.';

function selectedTemplate(templateId: CommsPlanTemplateId) {
  return COMMS_PLAN_ROLE_TEMPLATES.find((template) => template.id === templateId) ?? COMMS_PLAN_ROLE_TEMPLATES[0];
}

function buildInput(form: FormData, contentVersion: string): CommsPlanInput {
  return {
    templateId: value(form, 'templateId') as CommsPlanTemplateId,
    primaryChannel: value(form, 'primaryChannel'),
    fallbackChannel: value(form, 'fallbackChannel'),
    kallesignal: value(form, 'kallesignal'),
    ilKoContact: value(form, 'ilKoContact'),
    districtContact: value(form, 'districtContact'),
    checkInInterval: value(form, 'checkInInterval'),
    lostCommsProcedure: value(form, 'lostCommsProcedure'),
    batteryStatus: value(form, 'batteryStatus'),
    notes: value(form, 'notes'),
    contentVersion,
  };
}

export function CommsPlanForm({ contentVersion = 'local-mvp' }: CommsPlanFormProps) {
  const [templateId, setTemplateId] = useState<CommsPlanTemplateId>('lagleder-lagforer');
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const template = selectedTemplate(templateId);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = buildInput(form, contentVersion);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const format = (submitter?.value as ExportFormat | undefined) ?? 'markdown';
    try {
      const nextPreview = format === 'json'
        ? { format, text: exportCommsPlanJson(input) }
        : format === 'pdf'
          ? { format, text: exportCommsPlanPdfReadyHtml(input) }
          : { format: 'markdown' as const, text: exportCommsPlanMarkdown(input) };
      setExportError(null);
      setPreview(nextPreview);
    } catch {
      setPreview(null);
      setExportError(EXPORT_BLOCKED_MESSAGE);
    }
  }

  async function copyPreview() {
    if (!preview?.text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(preview.text);
  }

  return (
    <form onSubmit={onSubmit} onChange={() => { setPreview(null); setExportError(null); }} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Lokal samband</p>
        <h2 className="text-2xl font-black">Sambandsplan</h2>
        <ContextNotice variant="privacy" className="mt-2">Kontroller mot lokal sambandsplan og bruk bare operativt nødvendige opplysninger; ikke legg inn persondata eller sensitive sambandstabeller, abonnentlister eller ISSI-lister.</ContextNotice>
        <ContextNotice variant="blocked-sensitive-content" className="mt-2">{EXPORT_SENSITIVITY_WARNING}</ContextNotice>
        <ContextNotice variant="not-official" className="mt-2">PDF-klar HTML er tekst for nettleserens Skriv ut &gt; Lagre som PDF. Ikke offisiell innsending.</ContextNotice>
      </div>

      <label className="block text-sm font-bold">
        Rolle/mal for sambandsplan
        <select
          name="templateId"
          value={templateId}
          onChange={(event) => {
            setTemplateId(event.currentTarget.value as CommsPlanTemplateId);
            setPreview(null);
            setExportError(null);
          }}
          className="mt-1 min-h-12 w-full rounded-2xl border px-3"
        >
          {COMMS_PLAN_ROLE_TEMPLATES.map((roleTemplate) => (
            <option key={roleTemplate.id} value={roleTemplate.id}>{roleTemplate.label}</option>
          ))}
        </select>
      </label>

      <section className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-950" aria-label="Malveiledning sambandsplan">
        <h3 className="font-black">Malveiledning: {template.label}</h3>
        <p className="mt-1 font-semibold">{template.description}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Primær:</strong> {template.guidance.primaryChannel}</li>
          <li><strong>Fallback:</strong> {template.guidance.fallbackChannel}</li>
          <li><strong>Kallesignal:</strong> {template.guidance.kallesignal}</li>
          <li><strong>IL-KO:</strong> {template.guidance.ilKoContact}</li>
          <li><strong>Distrikt/beredskapsvakt:</strong> {template.guidance.districtContact}</li>
          <li><strong>Innsjekking:</strong> {template.guidance.checkInInterval}</li>
          <li><strong>Bortfall:</strong> {template.guidance.lostCommsProcedure}</li>
          <li><strong>Batteri/lading:</strong> {template.guidance.batteryStatus}</li>
        </ul>
      </section>

      <label className="block text-sm font-bold">Primær kanal/talegruppe<input name="primaryChannel" required placeholder={template.guidance.primaryChannel} className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Fallback kanal/kontaktmetode<input name="fallbackChannel" required placeholder={template.guidance.fallbackChannel} className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Kallesignal<input name="kallesignal" required placeholder={template.guidance.kallesignal} className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">IL-KO kontakt<input name="ilKoContact" required placeholder={template.guidance.ilKoContact} className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Distrikt/beredskapsvakt kontakt<input name="districtContact" required placeholder={template.guidance.districtContact} className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Innsjekkingsintervall<input name="checkInInterval" required placeholder={template.guidance.checkInInterval} className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Prosedyre ved bortfall av samband<textarea name="lostCommsProcedure" required placeholder={template.guidance.lostCommsProcedure} className="mt-1 min-h-20 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Batteri-/ladestatus<input name="batteryStatus" required placeholder={template.guidance.batteryStatus} className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Notes<textarea name="notes" className="mt-1 min-h-20 w-full rounded-2xl border px-3 py-2" /></label>

      <div className="grid gap-2 sm:grid-cols-3">
        <button type="submit" name="format" value="markdown" className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white">Eksporter Markdown</button>
        <button type="submit" name="format" value="json" className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white">Eksporter JSON</button>
        <button type="submit" name="format" value="pdf" className="min-h-12 rounded-2xl bg-slate-950 px-5 font-bold text-white">{preview?.format === 'pdf' ? 'Oppdater utskrift' : 'Lag PDF-klar HTML'}</button>
      </div>

      {exportError ? <p role="status" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-950">{exportError}</p> : null}
      <ExportReview title="Sambandsplan" text={preview?.text ?? ''} textareaId="comms-plan-preview" onCopy={() => void copyPreview()} formatLabel={preview?.format.toUpperCase()} />
    </form>
  );
}
