'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { exportMissionStatusSummaryMarkdown } from '@/lib/mission/export-markdown';
import type { MissionContext, MissionTaskStatus, QuickStatusMessage, ResourceRequestKind } from '@/lib/mission/schemas';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { SensitiveTextError, findSensitiveOperationalTextInValue, sensitiveTextFieldError } from '@/lib/privacy/sensitive-text';
import { ContextNotice } from './context-notice';
import { ExportReview } from './export-review';

type MissionUpdate = (mission: MissionContext) => MissionContext;

// Generic fallback for failures where no single field/category can be named
// (e.g. status-summary generation over the whole mission).
function operationalPrivacyErrorMessage(context: string) {
  return `${context}: Lokal tekst ble stoppet fordi den kan inneholde persondata, pasientdata, skjermet informasjon eller private lokasjoner. Bruk ordinære systemer for slike opplysninger.`;
}

const taskStatusOptions: Array<{ value: MissionTaskStatus; label: string }> = [
  { value: 'not-started', label: 'Ikke startet' },
  { value: 'in-progress', label: 'Pågår' },
  { value: 'done', label: 'Ferdig' },
  { value: 'blocked', label: 'Blokkert' },
  { value: 'needs-assistance', label: 'Trenger assistanse' },
];

const quickStatusMessages: QuickStatusMessage[] = ['på posisjon', 'oppgave fullført', 'trenger assistanse'];
const resourceKindOptions: Array<{ value: ResourceRequestKind; label: string }> = [
  { value: 'water', label: 'Vann' },
  { value: 'food', label: 'Mat' },
  { value: 'ppe', label: 'Verneutstyr/PPE' },
  { value: 'medical-support', label: 'Medisinsk støtte' },
  { value: 'transport', label: 'Transport' },
  { value: 'fuel', label: 'Drivstoff' },
  { value: 'equipment', label: 'Utstyr' },
];

function statusSummaryMission(mission: MissionContext, externalSignals: MissionContext['externalSignals']): MissionContext {
  return { ...mission, externalSignals };
}

const localSensitivePlaceholder = 'Skjult lokalt: mulig sensitiv tekst';

function localDisplayText(value: unknown, fallback: string, context: string) {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return findSensitiveOperationalTextInValue(trimmed, context) ? localSensitivePlaceholder : trimmed;
}

function statusSummaryContentKey(mission: MissionContext, displaySignals: MissionContext['externalSignals']) {
  return JSON.stringify({
    mission: {
      title: mission.title,
      phase: mission.phase,
      role: mission.role,
      scenario: mission.scenario,
      locationText: mission.locationText,
      updatedAt: mission.updatedAt,
      activeChecklistIds: mission.activeChecklistIds,
      notes: mission.notes,
      tasks: mission.tasks.map((task) => ({
        title: task.title,
        status: task.status,
        notes: task.notes,
      })),
      statusLog: mission.statusLog.map((status) => ({
        message: status.message,
        createdAt: status.createdAt,
        note: status.note,
      })),
      resourceRequests: mission.resourceRequests.map((request) => ({
        kind: request.kind,
        status: request.status,
        quantity: request.quantity,
        note: request.note,
      })),
    },
    displaySignals: displaySignals.map((signal) => ({
      source: signal.source,
      severity: signal.severity,
      staleness: signal.staleness,
      title: signal.title,
      summary: signal.summary,
    })),
  });
}

type LocalMissionControlsVariant = 'full' | 'work' | 'export';

export function LocalMissionControls({ mission, displaySignals, onMissionChange, variant = 'full' }: { mission: MissionContext; displaySignals: MissionContext['externalSignals']; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; variant?: LocalMissionControlsVariant }) {
  const openTasks = mission.tasks.filter((task) => task.status !== 'done');
  const showStatusExport = variant !== 'work';
  const showWorkControls = variant !== 'export';
  const showSignalAndNotes = variant !== 'work';
  const [showStatusSummary, setShowStatusSummary] = useState(false);
  const [statusSummaryMarkdown, setStatusSummaryMarkdown] = useState('');
  const [statusSummaryMarkdownKey, setStatusSummaryMarkdownKey] = useState('');
  const [privacyError, setPrivacyError] = useState('');
  const currentStatusSummaryKey = useMemo(() => statusSummaryContentKey(mission, displaySignals), [displaySignals, mission]);
  const displayMissionTitle = useMemo(() => localDisplayText(mission.title, 'Ukjent oppdrag', 'localStatus.mission.title'), [mission.title]);
  const displayMissionLocation = useMemo(() => localDisplayText(mission.locationText, 'Ukjent lokasjon', 'localStatus.mission.locationText'), [mission.locationText]);
  const displayMissionNotes = useMemo(() => localDisplayText(mission.notes, 'Ingen lokale notater.', 'localStatus.mission.notes'), [mission.notes]);
  const displaySignalItems = useMemo(() => displaySignals.map((signal, index) => ({
    ...signal,
    displayTitle: localDisplayText(signal.title, 'Ukjent lokalt signal', `localStatus.displaySignals[${index}].title`),
    displaySummary: localDisplayText(signal.summary, 'Skjult lokalt sammendrag', `localStatus.displaySignals[${index}].summary`),
  })), [displaySignals]);
  const renderedStatusSummaryMarkdown = showStatusSummary && statusSummaryMarkdownKey === currentStatusSummaryKey ? statusSummaryMarkdown : '';
  const sectionHeading = variant === 'export' ? 'Grunnlag for lokal statusrapport' : 'Situasjonsoversikt nå';

  const generateStatusSummary = useCallback(({ audit = true }: { audit?: boolean } = {}) => {
    let markdown: string;
    try {
      markdown = exportMissionStatusSummaryMarkdown({ mission: statusSummaryMission(mission, displaySignals) });
    } catch (error) {
      setStatusSummaryMarkdown('');
      setStatusSummaryMarkdownKey('');
      setShowStatusSummary(false);
      setPrivacyError(error instanceof SensitiveTextError
        ? `Lokal status: ${sensitiveTextFieldError(error.kind)}`
        : operationalPrivacyErrorMessage('Lokal status'));
      return;
    }
    setStatusSummaryMarkdown(markdown);
    setStatusSummaryMarkdownKey(currentStatusSummaryKey);
    setShowStatusSummary(true);
    setPrivacyError('');
    if (audit) appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'status-summary' });
  }, [currentStatusSummaryKey, displaySignals, mission]);

  useEffect(() => {
    if (!showStatusSummary || statusSummaryMarkdownKey === currentStatusSummaryKey) return undefined;
    const timeout = window.setTimeout(() => generateStatusSummary({ audit: false }), 0);
    return () => window.clearTimeout(timeout);
  }, [currentStatusSummaryKey, generateStatusSummary, showStatusSummary, statusSummaryMarkdownKey]);

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('taskTitle') ?? '').trim();
    if (!title) return;
    const now = new Date().toISOString();
    const status = String(form.get('taskStatus') ?? 'not-started') as MissionTaskStatus;
    const task = { id: crypto.randomUUID(), title, status, createdAt: now, updatedAt: now };
    const sensitive = findSensitiveOperationalTextInValue({ title: task.title }, 'localStatus.task');
    if (sensitive) {
      setPrivacyError(`Lokal oppgave: ${sensitiveTextFieldError(sensitive.kind)}`);
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
    const sensitive = findSensitiveOperationalTextInValue({ quantity: resourceRequest.quantity, note: resourceRequest.note }, 'localStatus.resourceRequest');
    if (sensitive) {
      setPrivacyError(`Ressursbehov: ${sensitiveTextFieldError(sensitive.kind)}`);
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

  return (
    <section id={showStatusExport ? 'statusrapport' : undefined} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">{sectionHeading}</p>
        <h3 className="text-xl font-black">{sectionHeading}</h3>
        {variant !== 'export' ? <ContextNotice variant="privacy" className="mt-1">Lokalt og offline. Ekstern kontekst (posisjon/søk til MET/Kartverket/NVE) legges til post-MVP. Ikke legg inn navn, ID, pasientdetaljer, helsejournal eller skjermet operativ informasjon.</ContextNotice> : null}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-slate-100 p-3"><dt className="font-black">Oppdrag</dt><dd>{displayMissionTitle} / {displayMissionLocation}</dd></div>
        <div className="rounded-xl bg-slate-100 p-3"><dt className="font-black">Fase/rolle/scenario</dt><dd>{phaseLabels[mission.phase]} / {roleLabels[mission.role]} / {scenarioLabels[mission.scenario]}</dd></div>
        <div className="rounded-xl bg-slate-100 p-3"><dt className="font-black">Åpne oppgaver</dt><dd>{openTasks.length}</dd></div>
        <div className="rounded-xl bg-slate-100 p-3"><dt className="font-black">Aktive sjekklister</dt><dd>{mission.activeChecklistIds.length > 0 ? mission.activeChecklistIds.join(', ') : 'Ingen registrert'}</dd></div>
      </dl>
      {showStatusExport ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
        <h4 className="font-black">Lokal statusrapport</h4>
        <ContextNotice variant="privacy" className="mt-1">Kun lokal eksport i denne nettleseren. Ikke offisiell logg. Kan inneholde lokale oppgaver, hurtigstatus og ressursbehov — ikke legg inn eller del sensitiv informasjon.</ContextNotice>
        <button type="button" onClick={() => generateStatusSummary()} className="mt-3 min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag lokal statusrapport</button>
        <ExportReview
          title="Lokal statusrapport"
          text={showStatusSummary ? renderedStatusSummaryMarkdown : ''}
          textareaId="local-status-summary-markdown"
          formatLabel="Markdown"
        />
      </div> : null}
      {showSignalAndNotes ? <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Vær/farer</h4>
          {displaySignalItems.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-700">
              {displaySignalItems.map((signal, index) => <li key={`${signal.source}-${signal.kind}-${signal.upstreamId ?? signal.rawRef ?? signal.title}-${index}`}>{signal.displayTitle}: {signal.displaySummary} ({signal.staleness})</li>)}
            </ul>
          ) : <p className="mt-2 text-sm font-semibold text-slate-600">Ingen lagrede sammendrag.</p>}
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Notater</h4>
          <p className="mt-2 text-sm font-semibold text-slate-700">{displayMissionNotes}</p>
        </div>
      </div> : null}
      {privacyError ? <p role="alert" aria-label="lokal status personvern" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{privacyError}</p> : null}
      {showWorkControls ? <div className="grid gap-3 lg:grid-cols-3">
        <form onSubmit={(event) => void addTask(event)} className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Lokal oppgaveliste</h4>
          <label className="mt-2 block text-sm font-bold">Ny lokal oppgave<input name="taskTitle" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Ikke navn, ID eller pasientdetaljer" /></label>
          <label className="mt-2 block text-sm font-bold">Oppgavestatus<select name="taskStatus" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{taskStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <button type="submit" className="mt-3 min-h-11 w-full rounded-xl bg-slate-950 px-4 font-bold text-white">Legg til oppgave</button>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700">{mission.tasks.map((task, index) => <li key={task.id}>{localDisplayText(task.title, 'Uten lokal oppgavetittel', `localStatus.tasks[${index}].title`)} — {taskStatusOptions.find((status) => status.value === task.status)?.label ?? task.status}</li>)}</ul>
        </form>
        <div className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Hurtigstatus</h4>
          <div className="mt-2 grid gap-2">
            {quickStatusMessages.map((message) => <button key={message} type="button" onClick={() => void addQuickStatus(message)} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-black text-slate-900">{message}</button>)}
          </div>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700">{mission.statusLog.slice(-3).map((status, index) => <li key={status.id}>{localDisplayText(status.message, 'Uten lokal hurtigstatus', `localStatus.statusLog[${index}].message`)}</li>)}</ul>
        </div>
        <form onSubmit={(event) => void addResourceRequest(event)} className="rounded-xl border border-slate-200 p-3">
          <h4 className="font-black">Ressursbehov</h4>
          <label className="mt-2 block text-sm font-bold">Ressurstype<select name="resourceKind" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3">{resourceKindOptions.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></label>
          <label className="mt-2 block text-sm font-bold">Mengde eller behov<input name="resourceQuantity" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Kun generelt ressursbehov" /></label>
          <label className="mt-2 block text-sm font-bold">Kort merknad<input name="resourceNote" className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" placeholder="Ikke sensitiv informasjon" /></label>
          <button type="submit" className="mt-3 min-h-11 w-full rounded-xl bg-slate-950 px-4 font-bold text-white">Registrer ressursbehov</button>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700">{mission.resourceRequests.map((request) => <li key={request.id}>{resourceKindOptions.find((kind) => kind.value === request.kind)?.label ?? request.kind}</li>)}</ul>
        </form>
      </div> : null}
    </section>
  );
}
