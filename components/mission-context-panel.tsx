'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import { phaseLabels, roleLabels, roles, scenarioLabels, scenarios, phases, type Phase, type Role, type Scenario } from '@/lib/content/taxonomy';
import { archiveMission, clearArchivedMissions, clearLocalMissionData, deleteArchivedMission, listArchivedMissions, listMissions, saveMission } from '@/lib/mission/local-store';
import { readSelectedActiveMissionId, saveSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import type { MissionContext } from '@/lib/mission/schemas';
import { findSensitiveOperationalTextInValue, sensitiveTextFieldError } from '@/lib/privacy/sensitive-text';
import { useRole } from '@/lib/role/role-context';
import { selectRunbookChecklist } from '@/lib/mission/runbook';
import { MissionCommandDashboard } from './mission/dashboard/mission-command-dashboard';

function prefillRole(globalRole: string): Role {
  return (roles as readonly string[]).includes(globalRole) ? (globalRole as Role) : 'mannskap';
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}


type MissionUpdate = (mission: MissionContext) => MissionContext;

export function MissionContextPanel({ mode = 'list', contentVersion, checklists, actionCards = [], sourceTitleById, sourceRiskById }: { mode?: 'list' | 'create'; contentVersion: string; checklists: OperationalChecklist[]; actionCards?: ActionCard[]; sourceTitleById?: Record<string, string>; sourceRiskById?: Record<string, 'caution' | 'ok'> }) {
  const router = useRouter();
  const [missions, setMissions] = useState<MissionContext[]>([]);
  const [selectedActiveMissionId, setSelectedActiveMissionId] = useState<string | null>(() => readSelectedActiveMissionId());
  const [archivedMissions, setArchivedMissions] = useState<MissionContext[]>([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [privacyMessage, setPrivacyMessage] = useState('Lagres bare lokalt i denne nettleseren');
  const [createPrivacyError, setCreatePrivacyError] = useState<{ field: 'title' | 'locationText'; message: string } | null>(null);
  const [createError, setCreateError] = useState('');
  const { role: globalRole } = useRole();
  const [selectedRole, setSelectedRole] = useState<Role>(() => prefillRole(globalRole));
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
    const activeChecklist = selectRunbookChecklist(checklists, missionDraft);
    const mission = { ...missionDraft, activeChecklistIds: activeChecklist ? [activeChecklist.slug] : [] };
    const sensitive = findSensitiveOperationalTextInValue({ title: mission.title, locationText: mission.locationText }, 'missionCreate');
    if (sensitive) {
      setCreatePrivacyError({
        field: sensitive.context.endsWith('locationText') ? 'locationText' : 'title',
        message: sensitiveTextFieldError(sensitive.kind),
      });
      return;
    }
    setCreatePrivacyError(null);
    try {
      await saveMission(mission);
    } catch {
      setCreateError('Kunne ikke lagre oppdraget lokalt. Kontroller feltene og prøv igjen.');
      return;
    }
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
    setPrivacyMessage('Dette sletter bare data i denne nettleseren. Beredskapsboka sender ikke oppdrag, sjekklister eller notater til en server.');
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
        </div>
        <div>
          <label className="block text-sm font-bold">Tittel <span className="text-red-600" aria-label="påkrevd">*</span><input name="title" required aria-required="true" aria-invalid={createPrivacyError?.field === 'title' || undefined} className={`mt-1 min-h-12 w-full rounded-xl border px-3 ${createPrivacyError?.field === 'title' ? 'border-red-500' : 'border-slate-300'}`} placeholder="Eksempel: Tilfluktsrom sentrum" /></label>
          {createPrivacyError?.field === 'title' ? <p role="alert" aria-label="oppdrag personvern" className="mt-1 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">Tittel: {createPrivacyError.message}</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">Rolle<select name="role" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as Role)} className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3">{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
          <label className="block text-sm font-bold">Fase<select name="phase" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3">{phases.map((phase) => <option key={phase} value={phase}>{phaseLabels[phase]}</option>)}</select></label>
        </div>
        <label className="block text-sm font-bold">Scenario<select name="scenario" className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 px-3">{scenarios.map((scenario) => <option key={scenario} value={scenario}>{scenarioLabels[scenario]}</option>)}</select></label>
        <div>
          <label className="block text-sm font-bold">Sted/lokasjon <span className="font-semibold text-slate-500">(valgfritt)</span><input name="locationText" aria-invalid={createPrivacyError?.field === 'locationText' || undefined} className={`mt-1 min-h-12 w-full rounded-xl border px-3 ${createPrivacyError?.field === 'locationText' ? 'border-red-500' : 'border-slate-300'}`} placeholder="Kun sted, ikke persondata" /></label>
          {createPrivacyError?.field === 'locationText' ? <p role="alert" aria-label="oppdrag personvern" className="mt-1 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">Sted/lokasjon: {createPrivacyError.message}</p> : null}
          <p className="mt-1 text-xs text-slate-600">Offentlig kontekst bruker bare valgt posisjon eller søketekst når du åpner egne kontekstverktøy. Oppdragsnotater og privat tekst forblir lokalt på enheten.</p>
        </div>
        {createError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-900">{createError}</p> : null}
        <button type="submit" className="min-h-12 w-full rounded-xl bg-slate-950 px-5 font-bold text-white">Lagre oppdrag</button>
      </form>
    );
  }

  const activeMission = selectActiveMission(missions, selectedActiveMissionId);
  const otherMissions = activeMission ? missions.filter((mission) => mission.id !== activeMission.id) : [];
  const activeChecklist = activeMission ? selectRunbookChecklist(checklists, activeMission) : undefined;
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
          <MissionCommandDashboard mission={activeMission} cards={actionCards} checklist={activeChecklist} checklists={checklists} contentVersion={contentVersion} sourceTitleById={sourceTitleById} sourceRiskById={sourceRiskById} onMissionChange={updateMission} onArchive={archiveActiveMission} />
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
      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="min-h-11 cursor-pointer list-none text-sm font-black text-slate-900">Personvern og sletting</summary>
        <p className="mt-2 text-sm text-slate-600">Dette sletter bare data i denne nettleseren. Beredskapsboka sender ikke oppdrag, sjekklister eller notater til en server. Se også <a href="/personvern" className="font-bold underline underline-offset-2">Personvern</a>.</p>
        <button type="button" onClick={() => void reset()} className="mt-3 min-h-12 w-full rounded-xl border border-red-300 bg-red-50 px-5 font-bold text-red-900">Slett lokale data</button>
      </details>
    </div>
  );
}
