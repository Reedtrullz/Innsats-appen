'use client';

import { useState } from 'react';
import { phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { exportMissionStatusSummaryMarkdown } from '@/lib/mission/export-markdown';
import type { MissionContext, MissionTaskStatus, QuickStatusMessage, ResourceRequestKind } from '@/lib/mission/schemas';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';

type MissionUpdate = (mission: MissionContext) => MissionContext;

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

export function LocalMissionControls({ mission, displaySignals, onMissionChange }: { mission: MissionContext; displaySignals: MissionContext['externalSignals']; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
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

