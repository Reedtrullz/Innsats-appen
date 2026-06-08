'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import { filterActionCards, sortActionCards } from '@/lib/content/filters';
import { phaseLabels, roleLabels, roles, scenarioLabels, scenarios, phases, type Phase, type Role, type Scenario } from '@/lib/content/taxonomy';
import { buildEquipmentReadinessSummary, exportEquipmentReadinessJson, exportEquipmentReadinessMarkdown } from '@/lib/mission/equipment-readiness';
import { buildOrderUpdateSuggestions } from '@/lib/mission/order-update-suggestions';
import { archiveMission, clearArchivedMissions, clearLocalMissionData, deleteArchivedMission, listArchivedMissions, listChecklistRuns, listMissions, saveMission } from '@/lib/mission/local-store';
import { readSelectedActiveMissionId, saveSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import type { MissionContext } from '@/lib/mission/schemas';
import { ChecklistRunner } from './checklist-runner';
import { ContextSignalPanel, markStoredContextSignalsStale } from './context-signal-panel';
import { DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS, disabledExternalDataSources, displaySignalsForExternalDataSourceSettings, externalDataSourceSettingsSnapshot, parseExternalDataSourceSettings, subscribeExternalDataSourceSettings } from '@/lib/integrations/source-settings';
import { MissionCommandHeader, MissionProgressSummary, MissionQuickActionsGrid } from './mission-command-summary';
import { TiltakCard } from './tiltak-card';
import { MissionMapSummary } from './mission-map-summary';
import { LocalMissionControls } from './mission/local-mission-controls';
import { FieldLogControls } from './mission/field-log-controls';
import { MissionLogOverview } from './mission/mission-log-overview';
import { QuickFieldLogComposer } from './mission/quick-field-log-composer';
import { RuhWelfareControls } from './mission/ruh-welfare-controls';
import { AfterActionReportControls } from './mission/after-action-report-controls';
import { MissionFolderExportControls } from './mission/mission-folder-export-controls';
import { missionMapStateSnapshot, normalizeMissionMapState, subscribeMissionMapState, mapStateForMission, type MissionMapState } from '@/lib/maps/operations-map';
import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';
import { OperationalIcon } from './ui/operational-icons';
import { CriticalNotice } from './ui/operational-primitives';

function operationalPrivacyErrorMessage(context: string) {
  return `${context}: Lokal tekst ble stoppet fordi den kan inneholde persondata, pasientdata, skjermet informasjon eller private lokasjoner. Bruk ordinære systemer for slike opplysninger.`;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
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

const missionDashboardHashTargets = new Set(['hurtiglogg', 'loggoversikt', 'sjekkliste', '5-punktsordre', 'sambandsplan', 'statusrapport', 'feltlogg', 'kart', 'etterrapport', 'ruh-velferd', 'oppdragsmappe']);

type MissionUpdate = (mission: MissionContext) => MissionContext;


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


function MissionCommandDashboard({ mission, cards, checklist, checklists, onMissionChange, onArchive }: { mission: MissionContext; cards: ActionCard[]; checklist?: OperationalChecklist; checklists: OperationalChecklist[]; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  const firstActions = missionCards(cards, mission);
  const [checklistRuns, setChecklistRuns] = useState<Awaited<ReturnType<typeof listChecklistRuns>>>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
  const commandMapSummary = useMemo(() => ({
    markerCount: scopedMapState.markers.length,
    drawingCount: scopedMapState.drawings.length,
  }), [scopedMapState.drawings.length, scopedMapState.markers.length]);

  const staleSignals = useMemo(() => {
    const storedSignals = mission.externalSignals.length > 0 ? markStoredContextSignalsStale(mission.externalSignals) : [];
    return displaySignalsForExternalDataSourceSettings(storedSignals, sourceSettings);
  }, [mission.externalSignals, sourceSettings]);
  const disabledSources = useMemo(() => disabledExternalDataSources(sourceSettings), [sourceSettings]);
  const nextActionSteps = firstActions[0]?.steps.length
    ? firstActions[0].steps.slice(0, 3)
    : ['Åpne sjekklisten og bekreft fase, samband og sikkerhet.'];
  const orderSuggestions = buildOrderUpdateSuggestions(mission.fieldLogEntries ?? []);
  const criticalActions = firstActions.filter((card) => card.priority === 'high');
  const recommendedLabel = criticalActions.length > 0 ? 'Kritisk nå' : 'Anbefalte tiltak';

  useEffect(() => {
    let active = true;
    listChecklistRuns(mission.id).then((runs) => {
      if (active) setChecklistRuns(runs);
    });
    return () => {
      active = false;
    };
  }, [mission.id]);

  useEffect(() => {
    function openHashTarget() {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      if (!missionDashboardHashTargets.has(targetId)) return undefined;
      return window.requestAnimationFrame(() => {
        const target = document.getElementById(targetId);
        const parentDetails = target?.closest('details') as HTMLDetailsElement | null;
        if (parentDetails) {
          parentDetails.open = true;
          setAdvancedOpen(true);
        }
        if (typeof target?.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
      });
    }

    let frame = openHashTarget();
    const onHashChange = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = openHashTarget();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [mission.id]);

  function handleDashboardAnchorClick(event: MouseEvent<HTMLElement>) {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor) return;
    const targetId = decodeURIComponent(anchor.hash.slice(1));
    if (!missionDashboardHashTargets.has(targetId)) return;
    const target = document.getElementById(targetId);
    const parentDetails = target?.closest('details') as HTMLDetailsElement | null;
    if (parentDetails) {
      parentDetails.open = true;
      setAdvancedOpen(true);
    }
  }

  return (
    <article className="space-y-4" onClickCapture={handleDashboardAnchorClick}>
      <MissionCommandHeader mission={mission} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-800">
            <OperationalIcon name="spark" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Neste anbefalte handling</p>
            <h3 className="mt-1 text-xl font-black">Neste anbefalte handling</h3>
          </div>
        </div>
        <ol className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-800">
          {nextActionSteps.map((step, index) => (
            <li key={step} className="grid grid-cols-[1.75rem_1fr] items-start gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-700 ring-1 ring-slate-200">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {checklist ? <a href="#sjekkliste" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#082F49] px-4 text-sm font-black text-white">Åpne sjekkliste</a> : null}
      </section>

      <MissionQuickActionsGrid />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700">{recommendedLabel}</p>
            <h3 className="text-xl font-black">{recommendedLabel}</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Oppdatert {formatUpdatedAt(mission.updatedAt)}</span>
        </div>
        <div className="mt-3 space-y-3">
          {criticalActions.length > 0 ? (
            <CriticalNotice title={`${criticalActions.length} kritisk tiltak først`} tone="critical">
              Visningen prioriterer høyt merkede tiltak for valgt fase, rolle og scenario.
            </CriticalNotice>
          ) : null}
          {firstActions.length > 0 ? firstActions.map((card) => <TiltakCard key={card.slug} card={card} compact />) : (
            <p className="rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen tiltakskort matcher dette oppdraget ennå. Bruk søk eller endre fase/scenario.</p>
          )}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <MissionProgressSummary mission={mission} checklists={checklists} checklistRuns={checklistRuns} mapSummary={commandMapSummary} />
      </div>

      <MissionMapSummary mission={mission} mapState={scopedMapState} />

      {orderSuggestions.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-label="Forslag til manuell ordreoppdatering">
          <h3 className="text-lg font-black">Forslag til manuell ordreoppdatering</h3>
          <p className="mt-1 text-sm font-semibold">Automatisk forslag fra kritiske lokale logginnslag. Dette endrer ikke ordre og er ikke offisiell ordre.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
            {orderSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </section>
      ) : null}

      <CriticalNotice title="Operativ grense" tone="warning">
        Lokalt arbeidsstøtte. Kontroller alltid mot gjeldende ordre, fagmyndighet og innsatsleders føringer. Ikke legg inn persondata.
      </CriticalNotice>

      {checklist ? <div id="sjekkliste"><ChecklistRunner checklist={checklist} missionId={mission.id} onRunSaved={() => void listChecklistRuns(mission.id).then(setChecklistRuns)} /></div> : null}

      <section className="space-y-3" aria-labelledby="mission-local-work-heading">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Lokal arbeidsflate</p>
          <h3 id="mission-local-work-heading" className="text-xl font-black text-slate-950">Logg, status og oppgaver</h3>
        </div>
        <div id="hurtiglogg">
          <QuickFieldLogComposer mission={mission} onMissionChange={onMissionChange} sourceLabel="Oppdragstavle" criticalObservationAriaLabel="Hurtiglogg kritisk flagg" mustBeForwardedAriaLabel="Hurtiglogg videresending flagg" />
        </div>
        <MissionLogOverview mission={mission} />
        <LocalMissionControls mission={mission} displaySignals={staleSignals} onMissionChange={onMissionChange} />
      </section>

      <details open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]">
          <span>
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">Avansert / dokumentasjon</span>
            <span id="mission-advanced-heading" className="block text-xl font-black text-slate-950">Eksport, etterarbeid og kontekst</span>
            <span className="mt-1 block text-sm font-semibold text-slate-600">Tyngre verktøy samlet lavere i flaten. Alt beholdes lokalt på enheten.</span>
          </span>
          <OperationalIcon name="chevron" className="h-5 w-5 shrink-0 text-slate-500 transition group-open:rotate-90" />
        </summary>
        <div className="mt-4 space-y-3" aria-labelledby="mission-advanced-heading">
          <FieldLogControls mission={mission} onMissionChange={onMissionChange} />
          <RuhWelfareControls mission={mission} onMissionChange={onMissionChange} />
          <EquipmentReadinessExportControls mission={mission} checklists={checklists} />
          <StructuredLessonsFeedbackControls key={mission.id} mission={mission} onMissionChange={onMissionChange} onArchive={onArchive} />
          <AfterActionReportControls mission={mission} displaySignals={staleSignals} checklists={checklists} fallbackChecklist={checklist} mapState={scopedMapState} />
          <MissionFolderExportControls mission={mission} checklists={checklists} mapState={scopedMapState} />
          {staleSignals.length > 0 || disabledSources.length > 0 ? <ContextSignalPanel signals={staleSignals} unavailableSources={disabledSources} /> : null}
        </div>
      </details>
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
    let active = true;
    listMissions().then((storedMissions) => {
      if (!active) return;
      latestMissionsRef.current = storedMissions;
      setMissions(storedMissions);
    });
    return () => {
      active = false;
    };
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
        <div>
          <label className="block text-sm font-bold">Sted/lokasjon<input name="locationText" required className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3" placeholder="Kun sted, ikke persondata" /></label>
          <p className="mt-1 text-xs text-slate-600">Når du henter offentlig kontekst: Bare valgt posisjon eller søketekst sendes til offentlige API-er hos MET/Kartverket/NVE. Dine oppdragsnotater og privat tekst forblir lokalt på enheten.</p>
        </div>
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
      {!activeMission ? <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Oppdragstavle</p>
            <h1 className="text-3xl font-black">Lokale oppdrag</h1>
            <p data-testid="privacy-message" className="mt-2 text-sm font-semibold text-amber-900">{privacyMessage}</p>
          </div>
          <a href="/oppdrag/ny" className="inline-flex min-h-12 items-center rounded-xl bg-slate-950 px-5 font-bold text-white">Nytt oppdrag</a>
        </div>
      </div> : null}
      {!activeMission ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-100 p-5">
          <h2 className="text-2xl font-black">Ingen aktiv lokal tavle</h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">Opprett et oppdrag for å samle fase, rolle, scenario, anbefalte tiltak og sjekklister i én arbeidsflate.</p>
          <a href="/oppdrag/ny" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-slate-950 px-5 font-bold text-white">Start oppdragstavle</a>
        </section>
      ) : (
        <>
          <MissionCommandDashboard mission={activeMission} cards={actionCards} checklist={activeChecklist} checklists={checklists} onMissionChange={updateMission} onArchive={archiveActiveMission} />
          <p data-testid="privacy-message" className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-950">{privacyMessage}</p>
        </>
      )}
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
