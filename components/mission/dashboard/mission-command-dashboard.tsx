'use client';

import { useEffect, useMemo, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import { CommsPlanForm } from '@/components/forms/comms-plan-form';
import { FivePointOrderForm } from '@/components/forms/five-point-order-form';
import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import { filterActionCards, sortActionCards } from '@/lib/content/filters';
import { buildEquipmentReadinessSummary, exportEquipmentReadinessJson, exportEquipmentReadinessMarkdown } from '@/lib/mission/equipment-readiness';
import { buildOrderUpdateSuggestions } from '@/lib/mission/order-update-suggestions';
import { listChecklistRuns } from '@/lib/mission/local-store';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import type { MissionContext } from '@/lib/mission/schemas';
import { ChecklistRunner } from '../../checklist-runner';
import { ContextSignalPanel, markStoredContextSignalsStale } from '../../context-signal-panel';
import { DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS, disabledExternalDataSources, displaySignalsForExternalDataSourceSettings, externalDataSourceSettingsSnapshot, parseExternalDataSourceSettings, subscribeExternalDataSourceSettings } from '@/lib/integrations/source-settings';
import { MissionCommandHeader, MissionProgressSummary, MissionQuickActionsGrid } from '../../mission-command-summary';
import { TiltakCard, TiltakCardRow } from '../../tiltak-card';
import { MissionMapSummary } from '../../mission-map-summary';
import { LocalMissionControls } from '../local-mission-controls';
import { FieldLogControls } from '../field-log-controls';
import { MissionLogOverview } from '../mission-log-overview';
import { QuickFieldLogComposer } from '../quick-field-log-composer';
import { RuhWelfareControls } from '../ruh-welfare-controls';
import { AfterActionReportControls } from '../after-action-report-controls';
import { MissionFolderExportControls } from '../mission-folder-export-controls';
import { missionMapStateSnapshot, normalizeMissionMapState, subscribeMissionMapState, mapStateForMission, type MissionMapState } from '@/lib/maps/operations-map';
import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';
import { OperationalIcon } from '../../ui/operational-icons';
import { CriticalNotice } from '../../ui/operational-primitives';
import { MissionModeControl } from './mission-mode-control';
import { MissionStatusStrip } from './mission-status-strip';
import { missionDashboardHashTargets, modeForHashTarget, type MissionMode } from './hash-navigation';

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

function EquipmentExportReview({
  title,
  text,
  textareaId,
  onCopy,
}: {
  title: string;
  text: string;
  textareaId: string;
  onCopy: (text: string) => void;
}) {
  if (!text) return null;
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
      <p className="font-black">{title} er klar</p>
      <p className="mt-1 text-sm font-semibold">Se over innholdet før lokal bruk eller deling.</p>
      <button type="button" onClick={() => onCopy(text)} className="mt-3 min-h-11 rounded-xl bg-white px-4 text-sm font-black text-emerald-950 ring-1 ring-emerald-200">Kopier</button>
      <details className="mt-3 rounded-xl bg-white p-3 ring-1 ring-emerald-200">
        <summary className="min-h-11 cursor-pointer list-none text-sm font-black">Vis forhåndsvisning</summary>
        <label htmlFor={textareaId} className="mt-3 block text-sm font-bold">
          {title}
          <textarea id={textareaId} readOnly value={text} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      </details>
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

  async function copyText(text: string) {
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
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
      <EquipmentExportReview title="MBK materiellstatus Markdown" text={markdown} textareaId="mbk-equipment-markdown" onCopy={(text) => void copyText(text)} />
      <EquipmentExportReview title="MBK materiellstatus JSON" text={json} textareaId="mbk-equipment-json" onCopy={(text) => void copyText(text)} />
    </section>
  );
}

function PanelHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</p>
      <h2 id={id} className="text-2xl font-black text-slate-950">{title}</h2>
    </div>
  );
}

function NextActionCard({ nextActionSteps, checklist }: { nextActionSteps: string[]; checklist?: OperationalChecklist }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-800">
          <OperationalIcon name="spark" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Neste anbefalte handling</p>
          <h3 className="mt-1 text-xl font-black">Gjør dette først</h3>
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
      {checklist ? <a href="#sjekkliste" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#082F49] px-4 text-sm font-black text-white">Fortsett sjekkliste</a> : null}
    </section>
  );
}

function RecommendedActionsPanel({ recommendedLabel, criticalActions, firstActions, mission }: { recommendedLabel: string; criticalActions: ActionCard[]; firstActions: ActionCard[]; mission: MissionContext }) {
  const secondaryActions = firstActions.filter((card) => card.priority !== 'high');
  const highPriorityActions = criticalActions.length > 0 ? criticalActions : firstActions.filter((card) => card.priority === 'high');

  return (
    <section id="kritisk-tiltak" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
        {highPriorityActions.length > 0 ? highPriorityActions.map((card) => <TiltakCard key={card.slug} card={card} compact />) : null}
        {secondaryActions.length > 0 ? (
          <div className="space-y-2">
            {secondaryActions.map((card) => <TiltakCardRow key={card.slug} card={card} />)}
          </div>
        ) : null}
        {firstActions.length === 0 ? (
          <p className="rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen tiltakskort matcher dette oppdraget ennå. Bruk søk eller endre fase/scenario.</p>
        ) : null}
      </div>
    </section>
  );
}

function activeChecklistForDashboard(mission: MissionContext, checklists: OperationalChecklist[]) {
  return checklists.find((item) => mission.activeChecklistIds.includes(item.slug))
    ?? checklists.find((item) => item.phase === mission.phase && item.scenarios.includes(mission.scenario))
    ?? checklists.find((item) => item.phase === mission.phase)
    ?? checklists[0];
}

function MissionProgressStrip({ mission, checklists, checklistRuns, mapSummary }: { mission: MissionContext; checklists: OperationalChecklist[]; checklistRuns: Awaited<ReturnType<typeof listChecklistRuns>>; mapSummary: { markerCount: number; drawingCount: number } }) {
  const activeChecklist = activeChecklistForDashboard(mission, checklists);
  const run = activeChecklist ? checklistRuns.find((item) => item.templateSlug === activeChecklist.slug) : undefined;
  const checkedIds = new Set(run?.checkedItemIds ?? []);
  const checkedCount = activeChecklist ? activeChecklist.items.filter((item) => checkedIds.has(item.id)).length : 0;
  const totalChecklistItems = activeChecklist?.items.length ?? 0;
  const doneTasks = mission.tasks.filter((task) => task.status === 'done').length;
  const criticalLogCount = (mission.fieldLogEntries ?? []).filter((entry) => entry.criticalObservation || entry.mustBeForwarded).length;
  const mapCount = mapSummary.markerCount + mapSummary.drawingCount;

  return (
    <section aria-label="Kompakt fremdrift" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <h2 className="sr-only">Fremdrift</h2>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Sjekkliste</p>
          <p className="mt-1 font-black text-slate-950">{checkedCount}/{totalChecklistItems}</p>
          <p className="sr-only">{checkedCount}/{totalChecklistItems} punkter fullført</p>
          <p className="truncate text-xs font-semibold text-slate-600">{activeChecklist?.title ?? 'Ingen valgt'}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Oppgaver</p>
          <p className="mt-1 font-black text-slate-950">{doneTasks}/{mission.tasks.length}</p>
          <p className="text-xs font-semibold text-slate-600">fullført</p>
        </div>
        <div className={`rounded-xl p-2 ${criticalLogCount > 0 ? 'bg-red-50 text-red-950' : 'bg-slate-50 text-slate-950'}`}>
          <p className="text-[0.65rem] font-black uppercase tracking-wide opacity-70">Kritisk logg</p>
          <p className="mt-1 font-black">{criticalLogCount}</p>
          <p className="text-xs font-semibold">kritisk/videresend</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-2">
          <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500">Kart</p>
          <p className="mt-1 font-black text-slate-950">{mapCount}</p>
          <p className="text-xs font-semibold text-slate-600">{mapSummary.markerCount} markører · {mapSummary.drawingCount} tegninger</p>
        </div>
      </div>
    </section>
  );
}

function CompactQuickLog({ mission, onMissionChange }: { mission: MissionContext; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void> }) {
  return (
    <details id="hurtiglogg" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="min-h-11 cursor-pointer list-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]">
        <span className="block text-xs font-black uppercase tracking-wide text-sky-700">Hurtiglogg</span>
        <span className="block text-lg font-black text-slate-950">Logg observasjon</span>
        <span className="block text-sm font-semibold text-slate-600">Åpne bare når du skal skrive. Full loggflate ligger i Arbeid.</span>
      </summary>
      <div className="mt-3">
        <QuickFieldLogComposer mission={mission} onMissionChange={onMissionChange} sourceLabel="Oppdragstavle" criticalObservationAriaLabel="Hurtiglogg kritisk flagg" mustBeForwardedAriaLabel="Hurtiglogg videresending flagg" />
      </div>
    </details>
  );
}

export function MissionNowPanel({
  mission,
  checklist,
  checklists,
  checklistRuns,
  commandMapSummary,
  firstActions,
  criticalActions,
  recommendedLabel,
  nextActionSteps,
  onMissionChange,
}: {
  mission: MissionContext;
  checklist?: OperationalChecklist;
  checklists: OperationalChecklist[];
  checklistRuns: Awaited<ReturnType<typeof listChecklistRuns>>;
  commandMapSummary: { markerCount: number; drawingCount: number };
  firstActions: ActionCard[];
  criticalActions: ActionCard[];
  recommendedLabel: string;
  nextActionSteps: string[];
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
}) {
  return (
    <section id="mission-now-panel" role="tabpanel" aria-labelledby="mission-now-tab" className="space-y-4">
      <PanelHeading eyebrow="Nå" title="Situasjon og neste grep" id="mission-now-heading" />
      <MissionCommandHeader mission={mission} />
      <MissionStatusStrip />
      <NextActionCard nextActionSteps={nextActionSteps} checklist={checklist} />
      <RecommendedActionsPanel recommendedLabel={recommendedLabel} criticalActions={criticalActions} firstActions={firstActions} mission={mission} />
      <CompactQuickLog mission={mission} onMissionChange={onMissionChange} />
      <MissionProgressStrip mission={mission} checklists={checklists} checklistRuns={checklistRuns} mapSummary={commandMapSummary} />
    </section>
  );
}

export function MissionWorkPanel({
  mission,
  checklist,
  checklistRuns,
  staleSignals,
  scopedMapState,
  orderSuggestions,
  onMissionChange,
  onChecklistRunSaved,
}: {
  mission: MissionContext;
  checklist?: OperationalChecklist;
  checklistRuns: Awaited<ReturnType<typeof listChecklistRuns>>;
  staleSignals: MissionContext['externalSignals'];
  scopedMapState: MissionMapState;
  orderSuggestions: string[];
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
  onChecklistRunSaved: () => void;
}) {
  return (
    <section id="mission-work-panel" role="tabpanel" aria-labelledby="mission-work-tab" className="space-y-4">
      <PanelHeading eyebrow="Arbeid" title="Sjekkliste, logg og kart" id="mission-work-heading" />
      <MissionQuickActionsGrid phase={mission.phase} />
      {checklist ? <div id="sjekkliste" className="scroll-mt-28"><ChecklistRunner checklist={checklist} missionId={mission.id} onRunSaved={onChecklistRunSaved} /></div> : null}
      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">Hurtiglogg</summary>
        <div className="mt-3">
          <QuickFieldLogComposer mission={mission} onMissionChange={onMissionChange} sourceLabel="Arbeidsflate" criticalObservationAriaLabel="Arbeid hurtiglogg kritisk flagg" mustBeForwardedAriaLabel="Arbeid hurtiglogg videresending flagg" />
        </div>
      </details>
      <details id="loggoversikt" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">
          <span id="mission-local-work-heading">Loggoversikt og lokale oppgaver</span>
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{mission.tasks.length} oppgaver · {(mission.fieldLogEntries ?? []).length} logger</span>
        </summary>
        <div className="mt-3 space-y-3">
          <MissionLogOverview mission={mission} />
          <LocalMissionControls mission={mission} displaySignals={staleSignals} onMissionChange={onMissionChange} variant="work" />
        </div>
      </details>
      <MissionMapSummary mission={mission} mapState={scopedMapState} />
      <details id="feltlogg" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">Feltlogg</summary>
        <div className="mt-3">
          <FieldLogControls mission={mission} onMissionChange={onMissionChange} />
        </div>
      </details>
      {orderSuggestions.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" aria-label="Forslag til manuell ordreoppdatering">
          <h3 className="text-lg font-black">Forslag til manuell ordreoppdatering</h3>
          <p className="mt-1 text-sm font-semibold">Automatisk forslag fra kritiske lokale logginnslag. Dette endrer ikke ordre og er ikke offisiell ordre.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
            {orderSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
          </ul>
        </section>
      ) : null}
      <p className="sr-only">Sjekklister lastet: {checklistRuns.length}</p>
    </section>
  );
}

function ExportToolDetails({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="min-h-11 cursor-pointer list-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]">
        <span className="block text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</span>
        <span className="block text-lg font-black text-slate-950">{title}</span>
      </summary>
      <div className="mt-4 space-y-3">
        {children}
      </div>
    </details>
  );
}

function ExportGroup({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">{eyebrow}</p>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function MissionAdvancedPanel({ mission, staleSignals, disabledSources, onMissionChange, onArchive }: { mission: MissionContext; staleSignals: MissionContext['externalSignals']; disabledSources: string[]; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="min-h-11 cursor-pointer list-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]">
        <span className="block text-xs font-black uppercase tracking-wide text-slate-500">Sekundært</span>
        <span className="block text-lg font-black text-slate-950">Avansert / dokumentasjon</span>
      </summary>
      <div className="mt-4 space-y-3">
        <StructuredLessonsFeedbackControls key={mission.id} mission={mission} onMissionChange={onMissionChange} onArchive={onArchive} />
        {staleSignals.length > 0 || disabledSources.length > 0 ? <ContextSignalPanel signals={staleSignals} unavailableSources={disabledSources} /> : null}
      </div>
    </details>
  );
}

export function MissionExportPanel({
  mission,
  contentVersion,
  checklists,
  checklist,
  staleSignals,
  disabledSources,
  scopedMapState,
  onMissionChange,
  onArchive,
}: {
  mission: MissionContext;
  contentVersion: string;
  checklists: OperationalChecklist[];
  checklist?: OperationalChecklist;
  staleSignals: MissionContext['externalSignals'];
  disabledSources: string[];
  scopedMapState: MissionMapState;
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
  onArchive: (missionId: string) => Promise<void>;
}) {
  return (
    <section id="mission-export-panel" role="tabpanel" aria-labelledby="mission-export-tab" className="space-y-4">
      <PanelHeading eyebrow="Eksport" title="Dokumentasjon og lokale eksportfiler" id="mission-export-heading" />
      <MissionStatusStrip />
      <ExportGroup eyebrow="Primært" title="Ordre, samband og status">
        <ExportToolDetails eyebrow="Ordre" title="5-punktsordre">
          <div id="5-punktsordre" className="scroll-mt-28">
            <FivePointOrderForm contentVersion={contentVersion} />
          </div>
        </ExportToolDetails>
        <ExportToolDetails eyebrow="Samband" title="Sambandsplan">
          <div id="sambandsplan" className="scroll-mt-28">
            <CommsPlanForm contentVersion={contentVersion} />
          </div>
        </ExportToolDetails>
        <ExportToolDetails eyebrow="Status" title="Lokal statusrapport">
          <LocalMissionControls mission={mission} displaySignals={staleSignals} onMissionChange={onMissionChange} variant="export" />
        </ExportToolDetails>
      </ExportGroup>
      <ExportGroup eyebrow="Etterarbeid" title="Rapporter og oppdragsmappe">
        <ExportToolDetails eyebrow="RUH / velferd" title="RUH og velferd">
          <RuhWelfareControls mission={mission} onMissionChange={onMissionChange} />
        </ExportToolDetails>
        <ExportToolDetails eyebrow="Etterrapport" title="Etterrapport">
          <AfterActionReportControls mission={mission} displaySignals={staleSignals} checklists={checklists} fallbackChecklist={checklist} mapState={scopedMapState} />
        </ExportToolDetails>
        <ExportToolDetails eyebrow="Oppdragsmappe" title="Samlet lokal oppdragsmappe">
          <MissionFolderExportControls mission={mission} checklists={checklists} mapState={scopedMapState} />
        </ExportToolDetails>
      </ExportGroup>
      <ExportGroup eyebrow="Avansert" title="Materiell, erfaringer og signaler">
        <ExportToolDetails eyebrow="Materiell" title="MBK / materiellberedskap">
          <EquipmentReadinessExportControls mission={mission} checklists={checklists} />
        </ExportToolDetails>
        <MissionAdvancedPanel mission={mission} staleSignals={staleSignals} disabledSources={disabledSources} onMissionChange={onMissionChange} onArchive={onArchive} />
      </ExportGroup>
    </section>
  );
}


export function MissionCommandDashboard({ mission, cards, checklist, checklists, contentVersion, onMissionChange, onArchive }: { mission: MissionContext; cards: ActionCard[]; checklist?: OperationalChecklist; checklists: OperationalChecklist[]; contentVersion: string; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  const firstActions = missionCards(cards, mission);
  const [checklistRuns, setChecklistRuns] = useState<Awaited<ReturnType<typeof listChecklistRuns>>>([]);
  const [activeMode, setActiveMode] = useState<MissionMode>('now');
  const [pendingHashTarget, setPendingHashTarget] = useState<string | null>(null);
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

  function refreshChecklistRuns() {
    void listChecklistRuns(mission.id).then(setChecklistRuns);
  }

  function activateHashTarget(targetId: string) {
    if (!missionDashboardHashTargets.has(targetId)) return;
    const targetMode = modeForHashTarget(targetId);
    if (targetMode) setActiveMode(targetMode);
    setPendingHashTarget(targetId);
  }

  useEffect(() => {
    function openHashTarget() {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      if (!missionDashboardHashTargets.has(targetId)) return;
      activateHashTarget(targetId);
    }

    openHashTarget();
    const onHashChange = () => {
      openHashTarget();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [mission.id]);

  useEffect(() => {
    if (!pendingHashTarget) return undefined;
    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(pendingHashTarget);
        const parentDetails = target?.closest('details') as HTMLDetailsElement | null;
        if (parentDetails) parentDetails.open = true;
        if (typeof target?.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
        setPendingHashTarget(null);
      });
    });
    return () => {
      window.cancelAnimationFrame(outerFrame);
      if (innerFrame) window.cancelAnimationFrame(innerFrame);
    };
  }, [activeMode, pendingHashTarget]);

  function handleDashboardAnchorClick(event: MouseEvent<HTMLElement>) {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor) return;
    const targetId = decodeURIComponent(anchor.hash.slice(1));
    if (!missionDashboardHashTargets.has(targetId)) return;
    event.preventDefault();
    if (window.location.hash !== anchor.hash) window.history.pushState(null, '', anchor.hash);
    activateHashTarget(targetId);
  }

  return (
    <article className="space-y-4" onClickCapture={handleDashboardAnchorClick}>
      <MissionModeControl activeMode={activeMode} onModeChange={setActiveMode} />
      {activeMode === 'now' ? (
        <MissionNowPanel
          mission={mission}
          checklist={checklist}
          checklists={checklists}
          checklistRuns={checklistRuns}
          commandMapSummary={commandMapSummary}
          firstActions={firstActions}
          criticalActions={criticalActions}
          recommendedLabel={recommendedLabel}
          nextActionSteps={nextActionSteps}
          onMissionChange={onMissionChange}
        />
      ) : activeMode === 'work' ? (
        <MissionWorkPanel
          mission={mission}
          checklist={checklist}
          checklistRuns={checklistRuns}
          staleSignals={staleSignals}
          scopedMapState={scopedMapState}
          orderSuggestions={orderSuggestions}
          onMissionChange={onMissionChange}
          onChecklistRunSaved={refreshChecklistRuns}
        />
      ) : (
        <MissionExportPanel
          mission={mission}
          contentVersion={contentVersion}
          checklists={checklists}
          checklist={checklist}
          staleSignals={staleSignals}
          disabledSources={disabledSources}
          scopedMapState={scopedMapState}
          onMissionChange={onMissionChange}
          onArchive={onArchive}
        />
      )}
    </article>
  );
}
