'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import { filterActionCards, sortActionCards } from '@/lib/content/filters';
import { phaseLabels, roleLabels, roles, scenarioLabels, scenarios, phases, type Phase, type Role, type Scenario } from '@/lib/content/taxonomy';
import { buildAfterActionReport, exportAfterActionJson, exportAfterActionMarkdown, exportAfterActionPdfReadyHtml } from '@/lib/mission/after-action-report';
import { FIELD_LOG_CATEGORY_OPTIONS, FIELD_LOG_CATEGORY_LABELS, FIELD_LOG_LOCAL_ONLY_WARNING, FIELD_LOG_PATIENT_DATA_WARNING, exportFieldLogJson, exportFieldLogMarkdown, exportFieldLogPdfReadyHtml, filterFieldLogEntries } from '@/lib/mission/field-log';
import { MAN_DOWN_POST_MVP_NOTE, MEDIA_ATTACHMENT_SAFETY_NOTES } from '@/lib/mission/media-safety';
import { RUH_CATEGORY_OPTIONS, RUH_LOCAL_ONLY_WARNING, RUH_PATIENT_DATA_WARNING, RUH_RISK_OPTIONS, WELFARE_LOAD_OPTIONS, WELFARE_NON_MEDICAL_WARNING, exportRuhJson, exportRuhMarkdown, exportWelfareJson, exportWelfareMarkdown, summarizeWelfareCheck } from '@/lib/mission/ruh-welfare';
import { buildEquipmentReadinessSummary, exportEquipmentReadinessJson, exportEquipmentReadinessMarkdown } from '@/lib/mission/equipment-readiness';
import { buildOrderUpdateSuggestions } from '@/lib/mission/order-update-suggestions';
import { exportMissionStatusSummaryMarkdown } from '@/lib/mission/export-markdown';
import { archiveMission, clearArchivedMissions, clearLocalMissionData, deleteArchivedMission, listArchivedMissions, listChecklistRuns, listMissions, saveMission } from '@/lib/mission/local-store';
import { readSelectedActiveMissionId, saveSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import type { MissionContext, MissionTaskStatus, QuickStatusMessage, ResourceRequestKind, FieldLogCategory, RuhCategory, RuhRisk, WelfareLoad } from '@/lib/mission/schemas';
import { ChecklistRunner } from './checklist-runner';
import { ContextSignalPanel, markStoredContextSignalsStale } from './context-signal-panel';
import { DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS, disabledExternalDataSources, displaySignalsForExternalDataSourceSettings, externalDataSourceSettingsSnapshot, parseExternalDataSourceSettings, subscribeExternalDataSourceSettings } from '@/lib/integrations/source-settings';
import { MissionCommandHeader, MissionExportShortcuts, MissionProgressSummary } from './mission-command-summary';
import { TiltakCard } from './tiltak-card';
import { MissionMapSummary } from './mission-map-summary';
import { MissionFolderExportControls } from './mission/mission-folder-export-controls';
import { missionMapStateSnapshot, normalizeMissionMapState, subscribeMissionMapState, mapStateForMission, type MissionMapState } from '@/lib/maps/operations-map';
import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';

function operationalPrivacyErrorMessage(context: string) {
  return `${context}: Lokal tekst ble stoppet fordi den kan inneholde persondata, pasientdata, skjermet informasjon eller private lokasjoner. Bruk ordinære systemer for slike opplysninger.`;
}

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


function missionCards(cards: ActionCard[], mission: MissionContext) {
  const exact = filterActionCards(cards, { phase: mission.phase, role: mission.role, scenario: mission.scenario });
  const fallback = exact.length > 0 ? exact : filterActionCards(cards, { phase: mission.phase, scenario: mission.scenario });
  const wider = fallback.length > 0 ? fallback : filterActionCards(cards, { scenario: mission.scenario });
  return sortActionCards(wider).slice(0, 3);
}

function matchingChecklist(checklists: OperationalChecklist[], mission: MissionContext) {
  return checklists.find((checklist) => checklist.scenarios.includes(mission.scenario) && checklist.phase === mission.phase)
    ?? checklists.find((checklist) => checklist.scenarios.includes(mission.scenario))
    ?? checklists[0];
}

const taskStatusOptions: Array<{ value: MissionTaskStatus; label: string }> = [
  { value: 'not-started', label: 'Ikke startet' },
  { value: 'in-progress', label: 'Pågår' },
  { value: 'done', label: 'Ferdig' },
  { value: 'blocked', label: 'Blokkert' },
  { value: 'needs-assistance', label: 'Trenger assistanse' },
];

const quickStatusMessages: QuickStatusMessage[] = ['på posisjon', 'oppgave fullført', 'trenger assistanse'];
const missionDashboardHashTargets = new Set(['etterrapport', 'ruh-velferd', 'oppdragsmappe']);

const resourceKindOptions: Array<{ value: ResourceRequestKind; label: string }> = [
  { value: 'water', label: 'Vann' },
  { value: 'food', label: 'Mat' },
  { value: 'ppe', label: 'Verneutstyr/PPE' },
  { value: 'medical-support', label: 'Medisinsk støtte' },
  { value: 'transport', label: 'Transport' },
  { value: 'fuel', label: 'Drivstoff' },
  { value: 'equipment', label: 'Utstyr' },
];

type MissionUpdate = (mission: MissionContext) => MissionContext;

function statusSummaryMission(mission: MissionContext, externalSignals: MissionContext['externalSignals']): MissionContext {
  return { ...mission, externalSignals };
}

function LocalMissionControls({ mission, displaySignals, onMissionChange }: { mission: MissionContext; displaySignals: MissionContext['externalSignals']; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
  const openTasks = mission.tasks.filter((task) => task.status !== 'done');
  const [showStatusSummary, setShowStatusSummary] = useState(false);
  const [privacyError, setPrivacyError] = useState('');
  const statusSummaryMarkdown = showStatusSummary ? exportMissionStatusSummaryMarkdown({ mission: statusSummaryMission(mission, displaySignals) }) : '';

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('taskTitle') ?? '').trim();
    if (!title) return;
    const now = new Date().toISOString();
    const status = String(form.get('taskStatus') ?? 'not-started') as MissionTaskStatus;
    const task = { id: crypto.randomUUID(), title, status, createdAt: now, updatedAt: now };
    try {
      assertNoSensitiveOperationalTextInValue({ title: task.title }, 'localStatus.task');
    } catch {
      setPrivacyError(operationalPrivacyErrorMessage('Lokal status'));
      return;
    }
    setPrivacyError('');
    await onMissionChange(mission.id, (current) => {
      return {
        ...current,
        updatedAt: now,
        tasks: [...current.tasks, task],
      };
    });
    formElement.reset();
  }

  async function addQuickStatus(message: QuickStatusMessage) {
    const now = new Date().toISOString();
    const status = { id: crypto.randomUUID(), message, createdAt: now };
    await onMissionChange(mission.id, (current) => {
      return {
        ...current,
        updatedAt: now,
        statusLog: [...current.statusLog, status],
      };
    });
  }

  async function addResourceRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const now = new Date().toISOString();
    const resourceRequest = {
      id: crypto.randomUUID(),
      kind: String(form.get('resourceKind') ?? 'water') as ResourceRequestKind,
      status: 'not-started' as const,
      createdAt: now,
      quantity: String(form.get('resourceQuantity') ?? '').trim() || undefined,
      note: String(form.get('resourceNote') ?? '').trim() || undefined,
    };
    try {
      assertNoSensitiveOperationalTextInValue({ quantity: resourceRequest.quantity, note: resourceRequest.note }, 'localStatus.resourceRequest');
    } catch {
      setPrivacyError(operationalPrivacyErrorMessage('Lokal status'));
      return;
    }
    setPrivacyError('');
    await onMissionChange(mission.id, (current) => {
      return {
        ...current,
        updatedAt: now,
        resourceRequests: [...current.resourceRequests, resourceRequest],
      };
    });
    formElement.reset();
  }

  function generateStatusSummary() {
    setShowStatusSummary(true);
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'status-summary' });
  }

  return (
    <section id="statusrapport" className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Situasjonsoversikt nå</p>
        <h3 className="text-xl font-black">Situasjonsoversikt nå</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">Lokalt og offline. Ikke legg inn navn, ID, pasientdetaljer, helsejournal eller skjermet operativ informasjon.</p>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-slate-100 p-3"><dt className="font-black">Oppdrag</dt><dd>{mission.title} / {mission.locationText}</dd></div>
        <div className="rounded-xl bg-slate-100 p-3"><dt className="font-black">Fase/rolle/scenario</dt><dd>{phaseLabels[mission.phase]} / {roleLabels[mission.role]} / {scenarioLabels[mission.scenario]}</dd></div>
        <div className="rounded-xl bg-slate-100 p-3"><dt className="font-black">Åpne oppgaver</dt><dd>{openTasks.length}</dd></div>
        <div className="rounded-xl bg-slate-100 p-3"><dt className="font-black">Aktive sjekklister</dt><dd>{mission.activeChecklistIds.length > 0 ? mission.activeChecklistIds.join(', ') : 'Ingen registrert'}</dd></div>
      </dl>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
        <h4 className="font-black">Lokal statusrapport</h4>
        <p className="mt-1 text-sm font-semibold">Kun lokal eksport i denne nettleseren. Ikke offisiell logg. Kan inneholde lokale oppgaver, hurtigstatus og ressursbehov — ikke legg inn eller del sensitiv informasjon.</p>
        <button type="button" onClick={generateStatusSummary} className="mt-3 min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag lokal statusrapport</button>
        {statusSummaryMarkdown ? (
          <label htmlFor="local-status-summary-markdown" className="mt-3 block text-sm font-bold">
            Lokal oppdragsstatus i Markdown
            <textarea id="local-status-summary-markdown" readOnly value={statusSummaryMarkdown} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
          </label>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Vær/farer</h4>
          {displaySignals.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
              {displaySignals.map((signal, index) => <li key={`${signal.source}-${signal.kind}-${signal.upstreamId ?? signal.rawRef ?? signal.title}-${index}`}>{signal.title}: {signal.summary} ({signal.staleness})</li>)}
            </ul>
          ) : <p className="mt-2 text-sm font-semibold text-slate-600">Ingen lagrede sammendrag.</p>}
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Notater</h4>
          <p className="mt-2 text-sm font-semibold text-slate-700">{mission.notes || 'Ingen lokale notater.'}</p>
        </div>
      </div>
      {privacyError ? <p role="alert" aria-label="lokal status personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{privacyError}</p> : null}
      <div className="grid gap-3 lg:grid-cols-3">
        <form onSubmit={(event) => void addTask(event)} className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Lokal oppgaveliste</h4>
          <label className="mt-2 block text-sm font-bold">Ny lokal oppgave<input name="taskTitle" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Ikke navn, ID eller pasientdetaljer" /></label>
          <label className="mt-2 block text-sm font-bold">Oppgavestatus<select name="taskStatus" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{taskStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <button type="submit" className="mt-3 min-h-11 w-full rounded-xl bg-slate-950 px-4 font-bold text-white">Legg til oppgave</button>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700">{mission.tasks.map((task) => <li key={task.id}>{task.title} — {taskStatusOptions.find((status) => status.value === task.status)?.label ?? task.status}</li>)}</ul>
        </form>
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Hurtigstatus</h4>
          <div className="mt-2 grid gap-2">
            {quickStatusMessages.map((message) => <button key={message} type="button" onClick={() => void addQuickStatus(message)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-black text-slate-900">{message}</button>)}
          </div>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700">{mission.statusLog.slice(-3).map((status) => <li key={status.id}>{status.message}</li>)}</ul>
        </div>
        <form onSubmit={(event) => void addResourceRequest(event)} className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Ressursbehov</h4>
          <label className="mt-2 block text-sm font-bold">Ressurstype<select name="resourceKind" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{resourceKindOptions.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></label>
          <label className="mt-2 block text-sm font-bold">Mengde eller behov<input name="resourceQuantity" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Kun generelt ressursbehov" /></label>
          <label className="mt-2 block text-sm font-bold">Kort merknad<input name="resourceNote" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Ikke sensitiv informasjon" /></label>
          <button type="submit" className="mt-3 min-h-11 w-full rounded-xl bg-slate-950 px-4 font-bold text-white">Registrer ressursbehov</button>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700">{mission.resourceRequests.map((request) => <li key={request.id}>{resourceKindOptions.find((kind) => kind.value === request.kind)?.label ?? request.kind}</li>)}</ul>
        </form>
      </div>
    </section>
  );
}

function FieldLogControls({ mission, onMissionChange }: { mission: MissionContext; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
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
    try {
      assertNoSensitiveOperationalTextInValue({ text: entry.text, locationText: entry.locationText }, 'fieldLog');
    } catch {
      setPrivacyError(operationalPrivacyErrorMessage('Feltlogg'));
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
    <section id="feltlogg" className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Strukturert lokal feltlogg</p>
        <h3 className="text-xl font-black">Lokal feltlogg</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">{FIELD_LOG_LOCAL_ONLY_WARNING} {FIELD_LOG_PATIENT_DATA_WARNING}</p>
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
      {markdown ? (
        <label htmlFor="field-log-markdown" className="block text-sm font-bold">
          Feltlogg Markdown
          <textarea id="field-log-markdown" readOnly value={markdown} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
      {json ? (
        <label htmlFor="field-log-json" className="block text-sm font-bold">
          Feltlogg JSON
          <textarea id="field-log-json" readOnly value={json} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
      {pdfReadyHtml ? (
        <label htmlFor="field-log-pdf-ready-html" className="block text-sm font-bold">
          PDF-klar feltlogg HTML
          <textarea id="field-log-pdf-ready-html" readOnly value={pdfReadyHtml} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
    </section>
  );
}

function RuhWelfareControls({ mission, onMissionChange }: { mission: MissionContext; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
  const [ruhCategory, setRuhCategory] = useState<RuhCategory>('hms');
  const [ruhRisk, setRuhRisk] = useState<RuhRisk>('lav');
  const [physicalLoad, setPhysicalLoad] = useState<WelfareLoad>('lav');
  const [mentalLoad, setMentalLoad] = useState<WelfareLoad>('lav');
  const [ruhMarkdown, setRuhMarkdown] = useState('');
  const [ruhJson, setRuhJson] = useState('');
  const [welfareMarkdown, setWelfareMarkdown] = useState('');
  const [welfareJson, setWelfareJson] = useState('');
  const [ruhPrivacyError, setRuhPrivacyError] = useState('');
  const [welfarePrivacyError, setWelfarePrivacyError] = useState('');
  const ruhReports = mission.ruhReports ?? [];
  const welfareChecks = mission.welfareChecks ?? [];

  async function addRuhReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const whatHappened = String(form.get('ruhWhatHappened') ?? '').trim();
    const immediateMeasure = String(form.get('ruhImmediateMeasure') ?? '').trim();
    if (!whatHappened || !immediateMeasure) return;
    const now = new Date().toISOString();
    const timestampInput = String(form.get('ruhTimestamp') ?? '').trim();
    const report = {
      id: crypto.randomUUID(),
      timestamp: timestampInput ? datetimeLocalToIso(timestampInput) : now,
      category: String(form.get('ruhCategory') ?? 'hms') as RuhCategory,
      whatHappened,
      immediateMeasure,
      risk: String(form.get('ruhRisk') ?? 'lav') as RuhRisk,
      followUpNeeded: form.get('ruhFollowUpNeeded') === 'on',
      linkedMissionId: mission.id,
    };
    try {
      assertNoSensitiveOperationalTextInValue({ whatHappened: report.whatHappened, immediateMeasure: report.immediateMeasure }, 'ruh');
    } catch {
      setRuhPrivacyError(operationalPrivacyErrorMessage('RUH'));
      return;
    }
    setRuhPrivacyError('');
    await onMissionChange(mission.id, (current) => ({
      ...current,
      updatedAt: now,
      ruhReports: [...(current.ruhReports ?? []), report],
    }));
    formElement.reset();
    const timestampField = formElement.elements.namedItem('ruhTimestamp') as HTMLInputElement | null;
    if (timestampField) timestampField.value = toDatetimeLocalValue(new Date());
    setRuhCategory('hms');
    setRuhRisk('lav');
  }

  async function addWelfareCheck(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const now = new Date().toISOString();
    const check = {
      id: crypto.randomUUID(),
      timestamp: now,
      physicalLoad: String(form.get('physicalLoad') ?? 'lav') as WelfareLoad,
      mentalLoad: String(form.get('mentalLoad') ?? 'lav') as WelfareLoad,
      needsRest: form.get('needsRest') === 'on',
      needsRelief: form.get('needsRelief') === 'on',
      reminders: {
        water: form.get('reminderWater') === 'on',
        food: form.get('reminderFood') === 'on',
        warmth: form.get('reminderWarmth') === 'on',
        rest: form.get('reminderRest') === 'on',
        dryClothing: form.get('reminderDryClothing') === 'on',
      },
      note: String(form.get('welfareNote') ?? '').trim() || undefined,
    };
    try {
      assertNoSensitiveOperationalTextInValue({ note: check.note }, 'welfare');
    } catch {
      setWelfarePrivacyError(operationalPrivacyErrorMessage('Velferd'));
      return;
    }
    setWelfarePrivacyError('');
    await onMissionChange(mission.id, (current) => ({
      ...current,
      updatedAt: now,
      welfareChecks: [...(current.welfareChecks ?? []), check],
    }));
    formElement.reset();
    setPhysicalLoad('lav');
    setMentalLoad('lav');
  }

  function generateRuhMarkdown() {
    setRuhMarkdown(exportRuhMarkdown({ mission, reports: ruhReports }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'ruh-markdown', count: ruhReports.length });
  }

  function generateRuhJson() {
    setRuhJson(exportRuhJson({ mission, reports: ruhReports }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'ruh-json', count: ruhReports.length });
  }

  function generateWelfareMarkdown() {
    setWelfareMarkdown(exportWelfareMarkdown({ mission, checks: welfareChecks }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'welfare-markdown', count: welfareChecks.length });
  }

  function generateWelfareJson() {
    setWelfareJson(exportWelfareJson({ mission, checks: welfareChecks }));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'welfare-json', count: welfareChecks.length });
  }

  return (
    <section id="ruh-velferd" className="scroll-mt-24 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Forenklet RUH og belastning</p>
        <h3 className="text-xl font-black">RUH og velferd</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">{RUH_LOCAL_ONLY_WARNING} {RUH_PATIENT_DATA_WARNING}</p>
        <p className="mt-1 text-sm font-semibold text-amber-900">{WELFARE_NON_MEDICAL_WARNING}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <form onSubmit={(event) => void addRuhReport(event)} className="grid gap-3 rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Forenklet RUH</h4>
          <label className="block text-sm font-bold">RUH tidspunkt<input name="ruhTimestamp" type="datetime-local" defaultValue={toDatetimeLocalValue(new Date())} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" /></label>
          <label className="block text-sm font-bold">RUH kategori<select name="ruhCategory" value={ruhCategory} onChange={(event) => setRuhCategory(event.target.value as RuhCategory)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{RUH_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm font-bold">Hva skjedde<textarea name="ruhWhatHappened" required className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" placeholder="Kort avvik/nestenulykke uten navn, ID, pasientdata eller persondata" /></label>
          <label className="block text-sm font-bold">Umiddelbart tiltak<textarea name="ruhImmediateMeasure" required className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" placeholder="Hva ble gjort med en gang" /></label>
          {ruhPrivacyError ? <p role="alert" aria-label="ruh personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{ruhPrivacyError}</p> : null}
          <label className="block text-sm font-bold">RUH risiko<select name="ruhRisk" value={ruhRisk} onChange={(event) => setRuhRisk(event.target.value as RuhRisk)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{RUH_RISK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input name="ruhFollowUpNeeded" type="checkbox" className="h-5 w-5" />RUH trenger videre tiltak</label>
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Legg til RUH</button>
        </form>

        <form onSubmit={(event) => void addWelfareCheck(event)} className="grid gap-3 rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Belastning og velferd</h4>
          <label className="block text-sm font-bold">Fysisk belastning<select name="physicalLoad" value={physicalLoad} onChange={(event) => setPhysicalLoad(event.target.value as WelfareLoad)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{WELFARE_LOAD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm font-bold">Mental belastning<select name="mentalLoad" value={mentalLoad} onChange={(event) => setMentalLoad(event.target.value as WelfareLoad)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{WELFARE_LOAD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input name="needsRest" type="checkbox" className="h-5 w-5" />Trenger hvile</label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input name="needsRelief" type="checkbox" className="h-5 w-5" />Trenger avløsning</label>
          </div>
          <fieldset className="rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-sm font-black">Velferdspåminnelser</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderWater" type="checkbox" className="h-5 w-5" />Vann påminnelse</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderFood" type="checkbox" className="h-5 w-5" />Mat påminnelse</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderWarmth" type="checkbox" className="h-5 w-5" />Varme påminnelse</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderRest" type="checkbox" className="h-5 w-5" />Hvile påminnelse</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input name="reminderDryClothing" type="checkbox" className="h-5 w-5" />Tørt tøy påminnelse</label>
            </div>
          </fieldset>
          <label className="block text-sm font-bold">Velferdsnotat<textarea name="welfareNote" className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" placeholder="Kort ikke-medisinsk notat" /></label>
          {welfarePrivacyError ? <p role="alert" aria-label="velferd personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{welfarePrivacyError}</p> : null}
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lagre velferdssjekk</button>
        </form>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Siste RUH</h4>
          {ruhReports.length > 0 ? <ol className="mt-2 space-y-2">{ruhReports.slice(-3).map((report) => <li key={report.id} className="rounded-xl bg-slate-50 p-3 text-sm font-semibold"><span className="font-black">{formatUpdatedAt(report.timestamp)}</span> — {report.whatHappened}</li>)}</ol> : <p className="mt-2 text-sm font-semibold text-slate-600">Ingen lokale RUH registrert.</p>}
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Siste velferdssjekker</h4>
          {welfareChecks.length > 0 ? <ol className="mt-2 space-y-2">{welfareChecks.slice(-3).map((check) => <li key={check.id} className="rounded-xl bg-slate-50 p-3 text-sm font-semibold"><span className="font-black">{formatUpdatedAt(check.timestamp)}</span> — {summarizeWelfareCheck(check)}{check.note ? <span className="block">{check.note}</span> : null}</li>)}</ol> : <p className="mt-2 text-sm font-semibold text-slate-600">Ingen velferdssjekker registrert.</p>}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
        <h4 className="font-black">RUH/velferd eksport</h4>
        <p className="mt-1 text-sm font-semibold">Eksport er lokal forhåndsvisning. Kontroller innhold og fjern persondata før deling.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={generateRuhMarkdown} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag RUH Markdown</button>
          <button type="button" onClick={generateRuhJson} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag RUH JSON</button>
          <button type="button" onClick={generateWelfareMarkdown} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag velferd Markdown</button>
          <button type="button" onClick={generateWelfareJson} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag velferd JSON</button>
        </div>
      </div>
      {ruhMarkdown ? <label htmlFor="ruh-markdown" className="block text-sm font-bold">RUH Markdown<textarea id="ruh-markdown" readOnly value={ruhMarkdown} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" /></label> : null}
      {ruhJson ? <label htmlFor="ruh-json" className="block text-sm font-bold">RUH JSON<textarea id="ruh-json" readOnly value={ruhJson} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" /></label> : null}
      {welfareMarkdown ? <label htmlFor="welfare-markdown" className="block text-sm font-bold">Velferd Markdown<textarea id="welfare-markdown" readOnly value={welfareMarkdown} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" /></label> : null}
      {welfareJson ? <label htmlFor="welfare-json" className="block text-sm font-bold">Velferd JSON<textarea id="welfare-json" readOnly value={welfareJson} className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" /></label> : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">
        <h4 className="font-black text-slate-950">Media og man-down: ikke aktivert i MVP</h4>
        <p className="mt-1">Foto/video-vedlegg er utsatt i MVP. {MEDIA_ATTACHMENT_SAFETY_NOTES.photo.summary}</p>
        <p className="mt-1">Før eventuell media-støtte må EXIF/GPS-metadata fjernes, lagringsstørrelse varsles, og eksport kreve eksplisitt personvernadvarsel uten pasientdata eller persondata.</p>
        <p className="mt-1">Video-vedlegg har samme utsatte MVP-status og gir høyere risiko for persondata, pasientdata, lydopptak og stor lokal lagringsstørrelse.</p>
        <p className="mt-1">{MAN_DOWN_POST_MVP_NOTE}</p>
      </div>
    </section>
  );
}

function StructuredLessonsFeedbackControls({ mission, onMissionChange, onArchive }: { mission: MissionContext; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  const [lessons, setLessons] = useState(() => ({
    summary: mission.lessonsLearned?.summary ?? '',
    whatWorked: mission.lessonsLearned?.whatWorked ?? '',
    improvements: mission.lessonsLearned?.improvements ?? '',
    followUp: mission.lessonsLearned?.followUp ?? '',
  }));
  const [feedback, setFeedback] = useState(() => ({
    leadership: mission.feedback?.leadership ?? '',
    equipment: mission.feedback?.equipment ?? '',
    procedures: mission.feedback?.procedures ?? '',
    training: mission.feedback?.training ?? '',
    safety: mission.feedback?.safety ?? '',
    communications: mission.feedback?.communications ?? '',
  }));
  const [message, setMessage] = useState('');
  const [privacyError, setPrivacyError] = useState('');

  async function saveStructuredFeedback() {
    const now = new Date().toISOString();
    const nextLessons = {
      summary: lessons.summary.trim(),
      whatWorked: lessons.whatWorked.trim(),
      improvements: lessons.improvements.trim(),
      followUp: lessons.followUp.trim(),
    };
    const nextFeedback = {
      leadership: feedback.leadership.trim(),
      equipment: feedback.equipment.trim(),
      procedures: feedback.procedures.trim(),
      training: feedback.training.trim(),
      safety: feedback.safety.trim(),
      communications: feedback.communications.trim(),
    };
    try {
      assertNoSensitiveOperationalTextInValue({ lessonsLearned: nextLessons, feedback: nextFeedback }, 'structuredFeedback');
    } catch {
      setPrivacyError(operationalPrivacyErrorMessage('Erfaringer'));
      setMessage('');
      return false;
    }
    setPrivacyError('');
    await onMissionChange(mission.id, (current) => ({
      ...current,
      updatedAt: now,
      lessonsLearned: nextLessons,
      feedback: nextFeedback,
    }));
    setMessage('Erfaringer og tilbakemelding er lagret lokalt.');
    return true;
  }

  async function saveStructuredFeedbackAndArchive() {
    if (await saveStructuredFeedback()) await onArchive(mission.id);
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Lokal læring</p>
        <h3 className="text-xl font-black">Erfaringer og strukturert tilbakemelding</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">Kun lokal erfaringslogg. Ikke offisielt arkiv eller innsending. Ikke legg inn navn, ID, pasient-/helseopplysninger, sensitive private lokasjoner eller skjermet operativ informasjon.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-bold">Erfaringsoppsummering<textarea value={lessons.summary} onChange={(event) => setLessons((current) => ({ ...current, summary: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" placeholder="Kort, sanitert lokal oppsummering" /></label>
        <label className="block text-sm font-bold">Hva fungerte<textarea value={lessons.whatWorked} onChange={(event) => setLessons((current) => ({ ...current, whatWorked: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Forbedringer<textarea value={lessons.improvements} onChange={(event) => setLessons((current) => ({ ...current, improvements: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Oppfølging<textarea value={lessons.followUp} onChange={(event) => setLessons((current) => ({ ...current, followUp: event.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-slate-300 p-3" /></label>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="block text-sm font-bold">Tilbakemelding ledelse<textarea value={feedback.leadership} onChange={(event) => setFeedback((current) => ({ ...current, leadership: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding utstyr<textarea value={feedback.equipment} onChange={(event) => setFeedback((current) => ({ ...current, equipment: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding prosedyrer<textarea value={feedback.procedures} onChange={(event) => setFeedback((current) => ({ ...current, procedures: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding trening<textarea value={feedback.training} onChange={(event) => setFeedback((current) => ({ ...current, training: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding sikkerhet<textarea value={feedback.safety} onChange={(event) => setFeedback((current) => ({ ...current, safety: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
        <label className="block text-sm font-bold">Tilbakemelding kommunikasjon<textarea value={feedback.communications} onChange={(event) => setFeedback((current) => ({ ...current, communications: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-slate-300 p-3" /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void saveStructuredFeedback()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lagre erfaringer og tilbakemelding</button>
        <button type="button" onClick={() => void saveStructuredFeedbackAndArchive()} className="min-h-11 rounded-xl border border-emerald-700 bg-emerald-50 px-4 font-bold text-emerald-950">Fullfør og arkiver lokalt</button>
      </div>
      {privacyError ? <p role="alert" aria-label="erfaringer personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{privacyError}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-800">{message}</p> : null}
    </section>
  );
}

function activeAfterActionChecklists(checklists: OperationalChecklist[], mission: MissionContext, fallbackChecklist?: OperationalChecklist) {
  const activeIds = new Set(mission.activeChecklistIds);
  const active = activeIds.size > 0 ? checklists.filter((checklist) => activeIds.has(checklist.slug)) : [];
  if (active.length > 0) return active;
  return fallbackChecklist ? [fallbackChecklist] : [];
}

function EquipmentReadinessExportControls({ mission, checklists }: { mission: MissionContext; checklists: OperationalChecklist[] }) {
  const [markdown, setMarkdown] = useState('');
  const [json, setJson] = useState('');

  async function buildSummary() {
    const runs = await listChecklistRuns(mission.id);
    return buildEquipmentReadinessSummary({ mission, checklists, runs });
  }

  async function generateMarkdown() {
    setMarkdown(exportEquipmentReadinessMarkdown(await buildSummary()));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'mbk-markdown' });
  }

  async function generateJson() {
    setJson(exportEquipmentReadinessJson(await buildSummary()));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'mbk-json' });
  }

  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Materiellberedskap / MBK</p>
        <h3 className="text-xl font-black">Materiellberedskap / MBK</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">Kun lokal beslutningsstøtte. Ikke offisiell inventarliste, lagerstatus eller innsending. Ikke legg inn serienummer, persondata eller sensitive samband-lister.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void generateMarkdown()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag MBK Markdown</button>
        <button type="button" onClick={() => void generateJson()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag MBK JSON</button>
      </div>
      {markdown ? (
        <label htmlFor="mbk-equipment-markdown" className="block text-sm font-bold">
          MBK materiellstatus Markdown
          <textarea id="mbk-equipment-markdown" readOnly value={markdown} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
      {json ? (
        <label htmlFor="mbk-equipment-json" className="block text-sm font-bold">
          MBK materiellstatus JSON
          <textarea id="mbk-equipment-json" readOnly value={json} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
    </section>
  );
}

function AfterActionReportControls({ mission, displaySignals, checklists, fallbackChecklist, mapState }: { mission: MissionContext; displaySignals: MissionContext['externalSignals']; checklists: OperationalChecklist[]; fallbackChecklist?: OperationalChecklist; mapState: MissionMapState }) {
  const [localOrderText, setLocalOrderText] = useState('');
  const [localSambandText, setLocalSambandText] = useState('');
  const [localLogText, setLocalLogText] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [json, setJson] = useState('');
  const [pdfReadyHtml, setPdfReadyHtml] = useState('');

  async function buildReport() {
    const runs = await listChecklistRuns(mission.id);
    const selectedChecklists = activeAfterActionChecklists(checklists, mission, fallbackChecklist);
    return buildAfterActionReport({
      mission: statusSummaryMission(mission, displaySignals),
      checklists: selectedChecklists,
      checklistRuns: runs,
      localOrderText,
      localSambandText,
      localLogText,
      mapState,
    });
  }

  async function generateMarkdown() {
    setMarkdown(exportAfterActionMarkdown(await buildReport()));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'after-action-markdown' });
  }

  async function generateJson() {
    setJson(exportAfterActionJson(await buildReport()));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'after-action-json' });
  }

  async function generatePdfReadyHtml() {
    setPdfReadyHtml(exportAfterActionPdfReadyHtml(await buildReport()));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'after-action-pdf-ready-html' });
  }

  return (
    <section id="etterrapport" className="scroll-mt-24 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Lokal etterrapport</p>
        <h3 className="text-xl font-black">Etteraksjonsrapport</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">PDF-klar utskrift er HTML for nettleserens Skriv ut &gt; Lagre som PDF. Ikke offisiell innsending. Lagres bare lokalt; ikke legg inn persondata, pasientdata, sensitive private lokasjoner eller skjermet operativ informasjon.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <label className="block text-sm font-bold">
          Lokal ordretekst
          <textarea value={localOrderText} onChange={(event) => setLocalOrderText(event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" placeholder="Valgfritt. Hvis tomt markeres Ikke registrert i lokal oppdragstavle." />
        </label>
        <label className="block text-sm font-bold">
          Lokalt samband
          <textarea value={localSambandText} onChange={(event) => setLocalSambandText(event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" placeholder="Valgfritt lokalt sambandssammendrag uten sensitiv informasjon." />
        </label>
        <label className="block text-sm font-bold">
          Lokal logg
          <textarea value={localLogText} onChange={(event) => setLocalLogText(event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" placeholder="Valgfritt. Én hendelse per linje, uten persondata." />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void generateMarkdown()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag etteraksjonsrapport Markdown</button>
        <button type="button" onClick={() => void generateJson()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag etteraksjonsrapport JSON</button>
        <button type="button" onClick={() => void generatePdfReadyHtml()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag PDF-klar etteraksjonsrapport</button>
      </div>
      {markdown ? (
        <label htmlFor="after-action-markdown" className="block text-sm font-bold">
          Etteraksjonsrapport Markdown
          <textarea id="after-action-markdown" readOnly value={markdown} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
      {json ? (
        <label htmlFor="after-action-json" className="block text-sm font-bold">
          Etteraksjonsrapport JSON
          <textarea id="after-action-json" readOnly value={json} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
      {pdfReadyHtml ? (
        <label htmlFor="after-action-pdf-ready-html" className="block text-sm font-bold">
          PDF-klar etteraksjonsrapport HTML
          <textarea id="after-action-pdf-ready-html" readOnly value={pdfReadyHtml} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
    </section>
  );
}


function MissionCommandDashboard({ mission, cards, checklist, checklists, onMissionChange, onArchive }: { mission: MissionContext; cards: ActionCard[]; checklist?: OperationalChecklist; checklists: OperationalChecklist[]; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  const firstActions = missionCards(cards, mission);
  const settingsSnapshot = useSyncExternalStore(
    subscribeExternalDataSourceSettings,
    externalDataSourceSettingsSnapshot,
    () => JSON.stringify(DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS),
  );
  const sourceSettings = useMemo(() => parseExternalDataSourceSettings(settingsSnapshot), [settingsSnapshot]);
  const mapStateSnapshot = useSyncExternalStore(
    subscribeMissionMapState,
    missionMapStateSnapshot,
    () => JSON.stringify({ markers: [], drawings: [] }),
  );
  const mapState = useMemo(() => {
    try {
      return normalizeMissionMapState(JSON.parse(mapStateSnapshot));
    } catch {
      return { markers: [], drawings: [] };
    }
  }, [mapStateSnapshot]);
  const scopedMapState = useMemo(() => mapStateForMission(mapState, mission.id), [mapState, mission.id]);

  const staleSignals = useMemo(() => {
    const storedSignals = mission.externalSignals.length > 0 ? markStoredContextSignalsStale(mission.externalSignals) : [];
    return displaySignalsForExternalDataSourceSettings(storedSignals, sourceSettings);
  }, [mission.externalSignals, sourceSettings]);
  const disabledSources = useMemo(() => disabledExternalDataSources(sourceSettings), [sourceSettings]);
  const nextActionSteps = firstActions[0]?.steps.length
    ? firstActions[0].steps.slice(0, 3)
    : ['Åpne sjekklisten og bekreft fase, samband og sikkerhet.'];
  const orderSuggestions = buildOrderUpdateSuggestions(mission.fieldLogEntries ?? []);

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!missionDashboardHashTargets.has(targetId)) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mission.id]);

  return (
    <article className="space-y-4">
      <MissionCommandHeader mission={mission} />

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Neste anbefalte handling</p>
        <h3 className="mt-1 text-xl font-black">Neste anbefalte handling</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm font-semibold leading-6 text-slate-800">
          {nextActionSteps.map((step) => <li key={step}>{step}</li>)}
        </ol>
        {checklist ? <a href="#sjekkliste" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white">Åpne sjekkliste</a> : null}
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <MissionProgressSummary mission={mission} checklists={checklists} />
        <MissionExportShortcuts />
      </div>

      <MissionMapSummary mission={mission} mapState={scopedMapState} />

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p className="text-xs font-black uppercase tracking-wide">Operativ grense</p>
        <p className="mt-1 text-sm font-semibold">Lokalt arbeidsstøtte. Kontroller alltid mot gjeldende ordre, fagmyndighet og innsatsleders føringer. Ikke legg inn persondata.</p>
      </section>

      {orderSuggestions.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-label="Forslag til manuell ordreoppdatering">
          <h3 className="text-lg font-black">Forslag til manuell ordreoppdatering</h3>
          <p className="mt-1 text-sm font-semibold">Automatisk forslag fra kritiske lokale logginnslag. Dette endrer ikke ordre og er ikke offisiell ordre.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
            {orderSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </section>
      ) : null}

      <LocalMissionControls mission={mission} displaySignals={staleSignals} onMissionChange={onMissionChange} />
      <FieldLogControls mission={mission} onMissionChange={onMissionChange} />
      <RuhWelfareControls mission={mission} onMissionChange={onMissionChange} />
      <EquipmentReadinessExportControls mission={mission} checklists={checklists} />
      <StructuredLessonsFeedbackControls key={mission.id} mission={mission} onMissionChange={onMissionChange} onArchive={onArchive} />
      <AfterActionReportControls mission={mission} displaySignals={staleSignals} checklists={checklists} fallbackChecklist={checklist} mapState={scopedMapState} />

      <MissionFolderExportControls mission={mission} checklists={checklists} mapState={scopedMapState} />

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Anbefalte tiltak</p>
            <h3 className="text-xl font-black">Anbefalte tiltak</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Oppdatert {formatUpdatedAt(mission.updatedAt)}</span>
        </div>
        <div className="mt-3 space-y-3">
          {firstActions.length > 0 ? firstActions.map((card) => <TiltakCard key={card.slug} card={card} compact />) : (
            <p className="rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen tiltakskort matcher dette oppdraget ennå. Bruk søk eller endre fase/scenario.</p>
          )}
        </div>
      </section>

      {checklist ? <div id="sjekkliste"><ChecklistRunner checklist={checklist} missionId={mission.id} /></div> : null}
      {staleSignals.length > 0 || disabledSources.length > 0 ? <ContextSignalPanel signals={staleSignals} unavailableSources={disabledSources} /> : null}
    </article>
  );
}

export function MissionContextPanel({ mode = 'list', contentVersion, checklists, actionCards = [] }: { mode?: 'list' | 'create'; contentVersion: string; checklists: OperationalChecklist[]; actionCards?: ActionCard[] }) {
  const router = useRouter();
  const [missions, setMissions] = useState<MissionContext[]>([]);
  const [selectedActiveMissionId, setSelectedActiveMissionId] = useState<string | null>(() => readSelectedActiveMissionId());
  const [archivedMissions, setArchivedMissions] = useState<MissionContext[]>([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [privacyMessage, setPrivacyMessage] = useState('Lagres bare lokalt i denne nettleseren');
  const [createPrivacyError, setCreatePrivacyError] = useState('');
  const latestMissionsRef = useRef<MissionContext[]>([]);
  const missionWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const archiveSearchRequestRef = useRef(0);

  useEffect(() => {
    listMissions().then((storedMissions) => {
      latestMissionsRef.current = storedMissions;
      setMissions(storedMissions);
    });
  }, []);

  useEffect(() => {
    const requestId = archiveSearchRequestRef.current + 1;
    archiveSearchRequestRef.current = requestId;
    let active = true;
    listArchivedMissions(archiveSearch).then((storedArchivedMissions) => {
      if (active && archiveSearchRequestRef.current === requestId) setArchivedMissions(storedArchivedMissions);
    });
    return () => {
      active = false;
    };
  }, [archiveSearch]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const missionDraft: MissionContext = {
      id: crypto.randomUUID(),
      title: String(form.get('title') ?? ''),
      role: String(form.get('role') ?? 'mannskap') as Role,
      phase: String(form.get('phase') ?? 'for') as Phase,
      scenario: String(form.get('scenario') ?? 'generelt') as Scenario,
      locationText: String(form.get('locationText') ?? ''),
      createdAt: now,
      updatedAt: now,
      externalSignals: [],
      externalSignalHistory: [],
      activeChecklistIds: [],
      notes: '',
      tasks: [],
      statusLog: [],
      resourceRequests: [],
      fieldLogEntries: [],
      ruhReports: [],
      welfareChecks: [],
      contentVersion,
      schemaVersion: 1,
    };
    const activeChecklist = matchingChecklist(checklists, missionDraft);
    const mission = { ...missionDraft, activeChecklistIds: activeChecklist ? [activeChecklist.slug] : [] };
    try {
      assertNoSensitiveOperationalTextInValue({ title: mission.title, locationText: mission.locationText }, 'missionCreate');
    } catch {
      setCreatePrivacyError(operationalPrivacyErrorMessage('Oppdrag'));
      return;
    }
    setCreatePrivacyError('');
    await saveMission(mission);
    appendLocalAuditEntry('order-created', { missionId: mission.id, orderType: 'local-mission' });
    router.push('/oppdrag');
  }

  async function reset() {
    await clearLocalMissionData();
    appendLocalAuditEntry('local-reset', { resetScope: 'mission-data' });
    latestMissionsRef.current = [];
    saveSelectedActiveMissionId(null);
    setSelectedActiveMissionId(null);
    setMissions([]);
    setArchivedMissions([]);
    setPrivacyMessage('Dette sletter bare data i denne nettleseren. Beredskapsboka sender ikke oppdrag, sjekklister eller notater til en server i MVP.');
  }

  async function updateMission(missionId: string, update: MissionUpdate) {
    const operation = missionWriteQueueRef.current.catch(() => undefined).then(async () => {
      const currentMission = latestMissionsRef.current.find((item) => item.id === missionId);
      if (!currentMission) return;
      const saved = await saveMission(update(currentMission));
      const statusChangeCount = Math.max(0, saved.statusLog.length - currentMission.statusLog.length);
      const taskStatusChangeCount = saved.tasks.filter((task) => {
        const previous = currentMission.tasks.find((item) => item.id === task.id);
        return previous ? previous.status !== task.status : task.status !== 'not-started';
      }).length;
      if (statusChangeCount > 0 || taskStatusChangeCount > 0) {
        appendLocalAuditEntry('status-changed', { missionId: saved.id, statusChangeCount, taskStatusChangeCount });
      }
      const nextMissions = latestMissionsRef.current.map((item) => (item.id === saved.id ? saved : item)).filter((item) => !item.archivedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      latestMissionsRef.current = nextMissions;
      setMissions(nextMissions);
    });
    missionWriteQueueRef.current = operation.then(() => undefined, () => undefined);
    await operation;
  }

  async function refreshMissionLists() {
    const [active, archived] = await Promise.all([listMissions(), listArchivedMissions(archiveSearch)]);
    latestMissionsRef.current = active;
    setMissions(active);
    setArchivedMissions(archived);
  }

  async function archiveActiveMission(missionId: string) {
    await missionWriteQueueRef.current.catch(() => undefined);
    await archiveMission(missionId);
    appendLocalAuditEntry('status-changed', { missionId, beforeStatus: 'active', afterStatus: 'archived' });
    await refreshMissionLists();
    setPrivacyMessage('Oppdraget er fullført og arkivert bare lokalt i denne nettleseren. Dette er ikke offisielt arkiv eller innsending.');
  }

  async function removeArchivedMission(missionId: string) {
    await deleteArchivedMission(missionId);
    appendLocalAuditEntry('local-reset', { missionId, resetScope: 'archived-mission-delete' });
    await refreshMissionLists();
  }

  async function resetArchiveOnly() {
    await clearArchivedMissions();
    appendLocalAuditEntry('local-reset', { resetScope: 'archive' });
    await refreshMissionLists();
    setPrivacyMessage('Lokalt arkiv er tømt i denne nettleseren. Aktive lokale oppdrag er beholdt.');
  }

  function openMissionAsActive(mission: MissionContext) {
    saveSelectedActiveMissionId(mission.id);
    setSelectedActiveMissionId(mission.id);
    setPrivacyMessage(`${mission.title} er valgt som aktivt oppdrag i denne nettleseren.`);
  }

  if (mode === 'create') {
    return (
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Nytt oppdrag</p>
          <h1 className="text-3xl font-black">Opprett lokalt oppdrag</h1>
          <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Lagres bare lokalt i denne nettleseren. Ikke legg inn persondata.</p>
          {createPrivacyError ? <p role="alert" aria-label="oppdrag personvern" className="mt-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{createPrivacyError}</p> : null}
        </div>
        <label className="block text-sm font-bold">Tittel<input name="title" required className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3" placeholder="Eksempel: Tilfluktsrom sentrum" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">Rolle<select name="role" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3">{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
          <label className="block text-sm font-bold">Fase<select name="phase" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3">{phases.map((phase) => <option key={phase} value={phase}>{phaseLabels[phase]}</option>)}</select></label>
        </div>
        <label className="block text-sm font-bold">Scenario<select name="scenario" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3">{scenarios.map((scenario) => <option key={scenario} value={scenario}>{scenarioLabels[scenario]}</option>)}</select></label>
        <label className="block text-sm font-bold">Sted/lokasjon<input name="locationText" required className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3" placeholder="Kun sted, ikke persondata" /></label>
        <button type="submit" className="min-h-12 w-full rounded-xl bg-slate-950 px-5 font-bold text-white">Lagre oppdrag</button>
      </form>
    );
  }

  const activeMission = selectActiveMission(missions, selectedActiveMissionId);
  const otherMissions = activeMission ? missions.filter((mission) => mission.id !== activeMission.id) : [];
  const activeChecklist = activeMission ? matchingChecklist(checklists, activeMission) : undefined;
  const archiveSearchActive = archiveSearch.trim().length > 0;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Oppdragstavle</p>
            <h1 className="text-3xl font-black">Lokale oppdrag</h1>
            <p data-testid="privacy-message" className="mt-2 text-sm font-semibold text-amber-900">{privacyMessage}</p>
          </div>
          <a href="/oppdrag/ny" className="inline-flex min-h-12 items-center rounded-xl bg-slate-950 px-5 font-bold text-white">Nytt oppdrag</a>
        </div>
      </div>
      {!activeMission ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-5">
          <h2 className="text-2xl font-black">Ingen aktiv lokal tavle</h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">Opprett et oppdrag for å samle fase, rolle, scenario, anbefalte tiltak og sjekklister i én arbeidsflate.</p>
          <a href="/oppdrag/ny" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-slate-950 px-5 font-bold text-white">Start oppdragstavle</a>
        </section>
      ) : <MissionCommandDashboard mission={activeMission} cards={actionCards} checklist={activeChecklist} checklists={checklists} onMissionChange={updateMission} onArchive={archiveActiveMission} />}
      {otherMissions.length > 0 ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-black">Andre lokale oppdrag</h2>
          <div className="mt-3 space-y-2">
            {otherMissions.map((mission) => (
              <article key={mission.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{mission.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">{phaseLabels[mission.phase]} / {roleLabels[mission.role]} / {scenarioLabels[mission.scenario]} / {mission.locationText}</p>
                  </div>
                  <button type="button" onClick={() => openMissionAsActive(mission)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-900">Åpne {mission.title} som aktivt oppdrag</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Lokalt arkiv</p>
            <h2 className="text-lg font-black">Lokalt fullførte oppdrag</h2>
            <p className="mt-1 text-sm font-semibold text-amber-900">Bare lokalt i denne nettleseren; ikke offisielt arkiv, innsending, backend-synk eller kommandosystem. Ikke lagre navn, ID, pasient-/helsedetaljer, sensitive private lokasjoner eller skjermet operativ informasjon.</p>
          </div>
          <button type="button" onClick={() => void resetArchiveOnly()} disabled={archiveSearchActive || archivedMissions.length === 0} title={archiveSearchActive ? 'Tøm søket før du kan tømme hele det lokale arkivet.' : undefined} className="min-h-11 rounded-xl border border-red-300 bg-red-50 px-4 font-bold text-red-900 disabled:opacity-50">Tøm lokalt arkiv</button>
        </div>
        <label className="mt-3 block text-sm font-bold">Søk i lokalt arkiv<input value={archiveSearch} onChange={(event) => setArchiveSearch(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Søk i tittel, sted, erfaringer eller tilbakemelding" /></label>
        {archivedMissions.length > 0 ? (
          <div className="mt-3 space-y-2">
            {archivedMissions.map((mission) => (
              <article key={mission.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{mission.title}</h3>
                    <p className="text-sm font-semibold text-slate-600">{phaseLabels[mission.phase]} / {roleLabels[mission.role]} / {scenarioLabels[mission.scenario]} / {mission.locationText}</p>
                    <p className="text-xs font-semibold text-slate-500">Fullført: {mission.completedAt ? formatUpdatedAt(mission.completedAt) : 'Ikke registrert'} / Arkivert: {mission.archivedAt ? formatUpdatedAt(mission.archivedAt) : 'Ikke registrert'}</p>
                    {mission.lessonsLearned?.summary ? <p className="mt-1 text-sm font-semibold text-slate-700">Erfaring: {mission.lessonsLearned.summary}</p> : null}
                  </div>
                  <button type="button" onClick={() => void removeArchivedMission(mission.id)} className="min-h-11 rounded-xl border border-red-300 bg-red-50 px-3 text-sm font-bold text-red-900" aria-label={`Slett arkivert oppdrag ${mission.title}`}>Slett</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen lokale arkivtreff.</p>
        )}
      </section>
      <button type="button" onClick={() => void reset()} className="min-h-12 w-full rounded-xl border border-red-300 bg-red-50 px-5 font-bold text-red-900">Slett lokale data</button>
      <p className="text-sm text-slate-600">Dette sletter bare data i denne nettleseren. Beredskapsboka sender ikke oppdrag, sjekklister eller notater til en server i MVP.</p>
    </div>
  );
}
