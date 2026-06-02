'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { phaseLabels, roleLabels, roles, scenarioLabels, scenarios, phases, type Phase, type Role, type Scenario } from '@/lib/content/taxonomy';
import { clearLocalMissionData, listMissions, saveMission } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';
import { ChecklistRunner } from './checklist-runner';
import { ContextSignalPanel, markStoredContextSignalsStale } from './context-signal-panel';

export function MissionContextPanel({ mode = 'list', contentVersion, checklists }: { mode?: 'list' | 'create'; contentVersion: string; checklists: OperationalChecklist[] }) {
  const router = useRouter();
  const [missions, setMissions] = useState<MissionContext[]>([]);
  const [privacyMessage, setPrivacyMessage] = useState('Lagres bare lokalt i denne nettleseren');

  useEffect(() => {
    listMissions().then(setMissions);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const now = new Date().toISOString();
    const mission: MissionContext = {
      id: crypto.randomUUID(),
      title: String(form.get('title') ?? ''),
      role: String(form.get('role') ?? 'mannskap') as Role,
      phase: String(form.get('phase') ?? 'for') as Phase,
      scenario: String(form.get('scenario') ?? 'generelt') as Scenario,
      locationText: String(form.get('locationText') ?? ''),
      createdAt: now,
      updatedAt: now,
      externalSignals: [],
      activeChecklistIds: ['tilfluktsrom-teknisk-status'],
      notes: '',
      contentVersion,
      schemaVersion: 1,
    };
    await saveMission(mission);
    router.push('/oppdrag');
  }

  async function reset() {
    await clearLocalMissionData();
    setMissions([]);
    setPrivacyMessage('Dette sletter bare data i denne nettleseren. Beredskapsboka sender ikke oppdrag, sjekklister eller notater til en server i MVP.');
  }

  if (mode === 'create') {
    return (
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Nytt oppdrag</p>
        <h1 className="text-3xl font-black">Opprett lokalt oppdrag</h1>
        <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Lagres bare lokalt i denne nettleseren. Ikke legg inn persondata.</p>
        <label className="block text-sm font-bold">Tittel<input name="title" required className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
        <label className="block text-sm font-bold">Rolle<select name="role" className="mt-1 min-h-12 w-full rounded-2xl border px-3">{roles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
        <label className="block text-sm font-bold">Fase<select name="phase" className="mt-1 min-h-12 w-full rounded-2xl border px-3">{phases.map((phase) => <option key={phase} value={phase}>{phaseLabels[phase]}</option>)}</select></label>
        <label className="block text-sm font-bold">Scenario<select name="scenario" className="mt-1 min-h-12 w-full rounded-2xl border px-3">{scenarios.map((scenario) => <option key={scenario} value={scenario}>{scenarioLabels[scenario]}</option>)}</select></label>
        <label className="block text-sm font-bold">Sted/lokasjon<input name="locationText" required className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
        <button type="submit" className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-bold text-white">Lagre oppdrag</button>
      </form>
    );
  }

  const tilfluktChecklist = checklists.find((checklist) => checklist.slug === 'tilfluktsrom-teknisk-status') ?? checklists[0];
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Oppdrag</p>
        <h1 className="text-3xl font-black">Lokale oppdrag</h1>
        <p className="mt-2 text-sm font-semibold text-amber-900">{privacyMessage}</p>
        <a href="/oppdrag/ny" className="mt-4 inline-flex min-h-12 items-center rounded-2xl bg-slate-950 px-5 font-bold text-white">Nytt oppdrag</a>
      </div>
      {missions.length === 0 ? <p className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-700">Ingen lokale oppdrag.</p> : null}
      {missions.map((mission) => (
        <article key={mission.id} className="space-y-3 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-black">{mission.title}</h2>
          <p className="text-sm text-slate-700">{phaseLabels[mission.phase]} · {roleLabels[mission.role]} · {scenarioLabels[mission.scenario]} · {mission.locationText}</p>
          {mission.externalSignals.length > 0 ? <ContextSignalPanel signals={markStoredContextSignalsStale(mission.externalSignals)} /> : null}
          {tilfluktChecklist ? <ChecklistRunner checklist={tilfluktChecklist} missionId={mission.id} /> : null}
        </article>
      ))}
      <button type="button" onClick={() => void reset()} className="min-h-12 w-full rounded-2xl border border-red-300 bg-red-50 px-5 font-bold text-red-900">Slett lokale data</button>
      <p className="text-sm text-slate-600">Dette sletter bare data i denne nettleseren. Beredskapsboka sender ikke oppdrag, sjekklister eller notater til en server i MVP.</p>
    </div>
  );
}
