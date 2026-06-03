'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import { filterActionCards, sortActionCards } from '@/lib/content/filters';
import { phaseLabels, priorityLabels, roleLabels, roles, scenarioLabels, scenarios, phases, type Phase, type Role, type Scenario } from '@/lib/content/taxonomy';
import { exportMissionStatusSummaryMarkdown } from '@/lib/mission/export-markdown';
import { clearLocalMissionData, listMissions, saveMission } from '@/lib/mission/local-store';
import type { MissionContext, MissionTaskStatus, QuickStatusMessage, ResourceRequestKind } from '@/lib/mission/schemas';
import { ChecklistRunner } from './checklist-runner';
import { ContextSignalPanel, markStoredContextSignalsStale } from './context-signal-panel';

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function moduleHref(scenario: Scenario) {
  if (scenario === 'tilfluktsrom') return '/moduler/tilfluktsrom';
  if (scenario === 'cbrn-cbrne') return '/moduler/cbrn';
  if (scenario === 'radiac-nedfall') return '/moduler/radiac';
  if (scenario === 'mfe-stotte') return '/moduler/mfe';
  return '/hurtigkort';
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
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
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

function MissionCommandDashboard({ mission, cards, checklist, onMissionChange }: { mission: MissionContext; cards: ActionCard[]; checklist?: OperationalChecklist; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
  const firstActions = missionCards(cards, mission);
  const staleSignals = useMemo(() => (mission.externalSignals.length > 0 ? markStoredContextSignalsStale(mission.externalSignals) : []), [mission.externalSignals]);

  return (
    <article className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-900 bg-slate-950 text-white shadow-sm">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-wide text-sky-200">Aktivt lokalt oppdrag</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">{mission.title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-200">{mission.locationText}</p>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-white/10 text-sm sm:grid-cols-4">
          <div className="bg-slate-950 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Fase</dt>
            <dd className="mt-1 font-black">{phaseLabels[mission.phase]}</dd>
          </div>
          <div className="bg-slate-950 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Rolle</dt>
            <dd className="mt-1 font-black">{roleLabels[mission.role]}</dd>
          </div>
          <div className="bg-slate-950 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Scenario</dt>
            <dd className="mt-1 font-black">{scenarioLabels[mission.scenario]}</dd>
          </div>
          <div className="bg-slate-950 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Status</dt>
            <dd className="mt-1 font-black">Offline-klar</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link className="rounded-2xl bg-white p-4 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200" href="/hurtigkort">
          Søk tiltakskort
          <span className="mt-1 block text-xs font-semibold text-slate-600">Finn kildebelagt støtte raskt</span>
        </Link>
        <Link className="rounded-2xl bg-white p-4 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200" href={moduleHref(mission.scenario)}>
          Åpne modul
          <span className="mt-1 block text-xs font-semibold text-slate-600">{scenarioLabels[mission.scenario]}</span>
        </Link>
        <Link className="rounded-2xl bg-white p-4 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200" href="#ordre-samband-heading">
          Ordre og samband
          <span className="mt-1 block text-xs font-semibold text-slate-600">Fyll ut lokalt og eksporter</span>
        </Link>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p className="text-xs font-black uppercase tracking-wide">Operativ grense</p>
        <p className="mt-1 text-sm font-semibold">Lokalt arbeidsstøtte. Kontroller alltid mot gjeldende ordre, fagmyndighet og innsatsleders føringer. Ikke legg inn persondata.</p>
      </section>

      <LocalMissionControls mission={mission} displaySignals={staleSignals} onMissionChange={onMissionChange} />

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Gjør først</p>
            <h3 className="text-xl font-black">Anbefalte tiltak nå</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Oppdatert {formatUpdatedAt(mission.updatedAt)}</span>
        </div>
        <div className="mt-3 space-y-3">
          {firstActions.length > 0 ? firstActions.map((card) => (
            <Link key={card.slug} href={`/kort/${card.slug}`} className="block rounded-2xl border border-slate-200 p-3 hover:bg-slate-50">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${card.priority === 'high' ? 'bg-red-100 text-red-900' : card.priority === 'medium' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{priorityLabels[card.priority]}</span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-900">{phaseLabels[card.phase]}</span>
              </div>
              <h4 className="mt-2 text-lg font-black">{card.title}</h4>
              <p className="mt-1 text-sm font-semibold text-slate-700">{card.steps[0]}</p>
              {card.warning ? <p className="mt-2 text-sm font-semibold text-amber-900">{card.warning}</p> : null}
            </Link>
          )) : (
            <p className="rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen tiltakskort matcher dette oppdraget ennå. Bruk søk eller endre fase/scenario.</p>
          )}
        </div>
      </section>

      {checklist ? <ChecklistRunner checklist={checklist} missionId={mission.id} /> : null}
      {staleSignals.length > 0 ? <ContextSignalPanel signals={staleSignals} /> : null}
    </article>
  );
}

export function MissionContextPanel({ mode = 'list', contentVersion, checklists, actionCards = [] }: { mode?: 'list' | 'create'; contentVersion: string; checklists: OperationalChecklist[]; actionCards?: ActionCard[] }) {
  const router = useRouter();
  const [missions, setMissions] = useState<MissionContext[]>([]);
  const [privacyMessage, setPrivacyMessage] = useState('Lagres bare lokalt i denne nettleseren');
  const latestMissionsRef = useRef<MissionContext[]>([]);
  const missionWriteQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    listMissions().then((storedMissions) => {
      latestMissionsRef.current = storedMissions;
      setMissions(storedMissions);
    });
  }, []);

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
      activeChecklistIds: [],
      notes: '',
      tasks: [],
      statusLog: [],
      resourceRequests: [],
      contentVersion,
      schemaVersion: 1,
    };
    const activeChecklist = matchingChecklist(checklists, missionDraft);
    const mission = { ...missionDraft, activeChecklistIds: activeChecklist ? [activeChecklist.slug] : [] };
    await saveMission(mission);
    router.push('/oppdrag');
  }

  async function reset() {
    await clearLocalMissionData();
    latestMissionsRef.current = [];
    setMissions([]);
    setPrivacyMessage('Dette sletter bare data i denne nettleseren. Beredskapsboka sender ikke oppdrag, sjekklister eller notater til en server i MVP.');
  }

  async function updateMission(missionId: string, update: MissionUpdate) {
    const operation = missionWriteQueueRef.current.catch(() => undefined).then(async () => {
      const currentMission = latestMissionsRef.current.find((item) => item.id === missionId);
      if (!currentMission) return;
      const saved = await saveMission(update(currentMission));
      const nextMissions = latestMissionsRef.current.map((item) => (item.id === saved.id ? saved : item)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      latestMissionsRef.current = nextMissions;
      setMissions(nextMissions);
    });
    missionWriteQueueRef.current = operation.then(() => undefined, () => undefined);
    await operation;
  }

  if (mode === 'create') {
    return (
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Nytt oppdrag</p>
          <h1 className="text-3xl font-black">Opprett lokalt oppdrag</h1>
          <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Lagres bare lokalt i denne nettleseren. Ikke legg inn persondata.</p>
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

  const activeMission = missions[0];
  const activeChecklist = activeMission ? matchingChecklist(checklists, activeMission) : undefined;
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
      ) : <MissionCommandDashboard mission={activeMission} cards={actionCards} checklist={activeChecklist} onMissionChange={updateMission} />}
      {missions.length > 1 ? (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-black">Andre lokale oppdrag</h2>
          <div className="mt-3 space-y-2">
            {missions.slice(1).map((mission) => (
              <article key={mission.id} className="rounded-xl border border-slate-200 p-3">
                <h3 className="font-black">{mission.title}</h3>
                <p className="text-sm font-semibold text-slate-600">{phaseLabels[mission.phase]} / {roleLabels[mission.role]} / {scenarioLabels[mission.scenario]} / {mission.locationText}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <button type="button" onClick={() => void reset()} className="min-h-12 w-full rounded-xl border border-red-300 bg-red-50 px-5 font-bold text-red-900">Slett lokale data</button>
      <p className="text-sm text-slate-600">Dette sletter bare data i denne nettleseren. Beredskapsboka sender ikke oppdrag, sjekklister eller notater til en server i MVP.</p>
    </div>
  );
}
