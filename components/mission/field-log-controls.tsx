'use client';

import { useState } from 'react';
import { FIELD_LOG_CATEGORY_OPTIONS, FIELD_LOG_CATEGORY_LABELS, FIELD_LOG_LOCAL_ONLY_WARNING, FIELD_LOG_PATIENT_DATA_WARNING, exportFieldLogJson, exportFieldLogMarkdown, exportFieldLogPdfReadyHtml, filterFieldLogEntries } from '@/lib/mission/field-log';
import type { FieldLogCategory, MissionContext } from '@/lib/mission/schemas';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { findSensitiveOperationalTextInValue, sensitiveTextFieldError } from '@/lib/privacy/sensitive-text';
import { ContextNotice } from './context-notice';
import { ExportReview } from './export-review';
import type { MissionUpdate } from './quick-field-log-composer';

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function toDatetimeLocalValue(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function datetimeLocalToIso(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function FieldLogControls({ mission, onMissionChange }: { mission: MissionContext; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<FieldLogCategory | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<FieldLogCategory>('observasjon');
  const [markdown, setMarkdown] = useState('');
  const [json, setJson] = useState('');
  const [pdfReadyHtml, setPdfReadyHtml] = useState('');
  const [privacyError, setPrivacyError] = useState('');
  const entries = mission.fieldLogEntries ?? [];
  const filteredEntries = filterFieldLogEntries(entries, { query, category: categoryFilter });
  const selectedCategoryHelp = FIELD_LOG_CATEGORY_OPTIONS.find((option) => option.value === selectedCategory)?.helpText;

  async function addFieldLogEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const text = String(form.get('fieldLogText') ?? '').trim();
    if (!text) return;
    const now = new Date().toISOString();
    const timestampInput = String(form.get('fieldLogTimestamp') ?? '').trim();
    const category = String(form.get('fieldLogCategory') ?? 'observasjon') as FieldLogCategory;
    const entry = {
      id: crypto.randomUUID(),
      timestamp: timestampInput ? datetimeLocalToIso(timestampInput) : now,
      locationText: String(form.get('fieldLogLocation') ?? '').trim() || undefined,
      category,
      text,
      linkedMissionId: mission.id,
      criticalObservation: form.get('criticalObservation') === 'on',
      mustBeForwarded: form.get('mustBeForwarded') === 'on',
    };
    const sensitive = findSensitiveOperationalTextInValue({ text: entry.text, locationText: entry.locationText }, 'fieldLog');
    if (sensitive) {
      setPrivacyError(`Feltlogg: ${sensitiveTextFieldError(sensitive.kind)}`);
      return;
    }
    setPrivacyError('');
    await onMissionChange(mission.id, (current) => ({
      ...current,
      updatedAt: now,
      fieldLogEntries: [...(current.fieldLogEntries ?? []), entry],
    }));
    formElement.reset();
    const timestampField = formElement.elements.namedItem('fieldLogTimestamp') as HTMLInputElement | null;
    if (timestampField) timestampField.value = toDatetimeLocalValue(new Date());
    setSelectedCategory('observasjon');
  }

  function generateMarkdown() {
    setMarkdown(exportFieldLogMarkdown({ mission, entries: filteredEntries }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'field-log-markdown', count: filteredEntries.length });
  }

  function generateJson() {
    setJson(exportFieldLogJson({ mission, entries: filteredEntries }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'field-log-json', count: filteredEntries.length });
  }

  function generatePdfReadyHtml() {
    setPdfReadyHtml(exportFieldLogPdfReadyHtml({ mission, entries: filteredEntries }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'field-log-pdf-ready-html', count: filteredEntries.length });
  }

  return (
    <section id="feltlogg-controls" className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Strukturert lokal feltlogg</p>
        <h3 className="text-xl font-black">Lokal feltlogg</h3>
        <ContextNotice variant="privacy" className="mt-1">{FIELD_LOG_LOCAL_ONLY_WARNING} {FIELD_LOG_PATIENT_DATA_WARNING}</ContextNotice>
      </div>
      <form onSubmit={(event) => void addFieldLogEntry(event)} className="grid gap-3 rounded-xl border border-slate-200 p-3 lg:grid-cols-3">
        <label className="block text-sm font-bold">
          Feltlogg tidspunkt
          <input name="fieldLogTimestamp" type="datetime-local" defaultValue={toDatetimeLocalValue(new Date())} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
        </label>
        <label className="block text-sm font-bold">
          Feltlogg lokasjon <span className="font-semibold text-slate-500">(valgfritt)</span>
          <input name="fieldLogLocation" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Sted uten persondata" />
        </label>
        <label className="block text-sm font-bold">
          Feltlogg kategori
          <select name="fieldLogCategory" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as FieldLogCategory)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">
            {FIELD_LOG_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block text-sm font-bold lg:col-span-3">
          Feltlogg tekst
          <textarea name="fieldLogText" required className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" placeholder="Kort observasjon. Ikke persondata, pasientdata eller skjermet operativ informasjon." />
        </label>
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950 lg:col-span-3">{selectedCategoryHelp}</p>
        {privacyError ? <p role="alert" aria-label="feltlogg personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900 lg:col-span-3">{privacyError}</p> : null}
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold">
          <input name="criticalObservation" type="checkbox" className="h-5 w-5" />
          Kritisk observasjon
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold">
          <input name="mustBeForwarded" type="checkbox" className="h-5 w-5" />
          Må videresendes
        </label>
        <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Legg til feltlogg</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-bold">
          Søk i feltlogg
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Søk i tekst, sted, kategori eller flagg" />
        </label>
        <label className="block text-sm font-bold">
          Filtrer feltloggkategori
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as FieldLogCategory | '')} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">
            <option value="">Alle kategorier</option>
            {FIELD_LOG_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-black">Feltlogg tidslinje</h4>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{filteredEntries.length}/{entries.length} treff</span>
        </div>
        {filteredEntries.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {filteredEntries.map((entry) => (
              <li key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-slate-950">{formatUpdatedAt(entry.timestamp)}</span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-900">{FIELD_LOG_CATEGORY_LABELS[entry.category]}</span>
                  {entry.criticalObservation ? <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-black text-red-900">Kritisk observasjon</span> : null}
                  {entry.mustBeForwarded ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-950">Må videresendes</span> : null}
                </div>
                {entry.locationText ? <p className="mt-1 font-semibold text-slate-700">Sted: {entry.locationText}</p> : null}
                <p className="mt-1 font-semibold text-slate-900">{entry.text}</p>
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen feltloggtreff.</p>}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
        <h4 className="font-black">Eksport</h4>
        <p className="mt-1 text-sm font-semibold">Eksporterer bare synlige/filtrerte feltloggtreff. PDF-klar HTML brukes med nettleserens Skriv ut &gt; Lagre som PDF.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={generateMarkdown} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag feltlogg Markdown</button>
          <button type="button" onClick={generateJson} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag feltlogg JSON</button>
          <button type="button" onClick={generatePdfReadyHtml} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag PDF-klar feltlogg</button>
        </div>
      </div>
      <ExportReview title="Feltlogg Markdown" text={markdown} textareaId="field-log-markdown" formatLabel="Markdown" />
      <ExportReview title="Feltlogg JSON" text={json} textareaId="field-log-json" formatLabel="JSON" />
      <ExportReview title="PDF-klar feltlogg HTML" text={pdfReadyHtml} textareaId="field-log-pdf-ready-html" formatLabel="HTML" />
    </section>
  );
}
