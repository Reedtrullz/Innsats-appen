'use client';

import { useState } from 'react';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { MissionContext, ChecklistRun } from '@/lib/mission/schemas';
import type { MissionMapState } from '@/lib/maps/operations-map';
import { buildMissionFolderExport, exportMissionFolderMarkdown } from '@/lib/mission/mission-folder-export';
import { listChecklistRuns } from '@/lib/mission/local-store';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';

export function MissionFolderExportControls({ mission, checklists, mapState }: { mission: MissionContext; checklists: OperationalChecklist[]; mapState: MissionMapState }) {
  const [json, setJson] = useState('');
  const [markdown, setMarkdown] = useState('');

  async function generate() {
    const checklistRuns: ChecklistRun[] = await listChecklistRuns(mission.id);
    const bundle = buildMissionFolderExport({ mission, checklists, checklistRuns, mapState });
    setJson(`${JSON.stringify(bundle, null, 2)}\n`);
    setMarkdown(exportMissionFolderMarkdown(bundle));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'mission-folder' });
  }

  async function copyText(text: string) {
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(text);
  }

  return (
    <section id="oppdragsmappe" className="scroll-mt-24 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-label="Oppdragsmappe">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Oppdragsmappe</p>
        <h3 className="text-xl font-black">Lokal oppdragsmappe</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">Bygg lokalt, se over, eksporter. Ikke offisielt arkiv.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">1 · Build</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">Samler oppdrag, sjekklister, logg og kart lokalt.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">2 · Review</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">Se over innholdet før det brukes videre.</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">3 · Export</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">Markdown vises først etter bygging.</p>
        </div>
      </div>
      <button type="button" onClick={() => void generate()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Bygg oppdragsmappe</button>
      {markdown ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
          <p className="font-black">Oppdragsmappe er klar</p>
          <p className="mt-1 text-sm font-semibold">Se over innholdet før lokal bruk eller deling.</p>
          <button type="button" onClick={() => void copyText(markdown)} className="mt-3 min-h-11 rounded-xl bg-white px-4 text-sm font-black text-emerald-950 ring-1 ring-emerald-200">Kopier Markdown</button>
          <details className="mt-3 rounded-xl bg-white p-3 ring-1 ring-emerald-200">
            <summary className="min-h-11 cursor-pointer list-none text-sm font-black">Vis forhåndsvisning</summary>
            <label htmlFor="mission-folder-markdown" className="mt-3 block text-sm font-bold">
              Oppdragsmappe Markdown
              <textarea id="mission-folder-markdown" readOnly value={markdown} className="mt-1 min-h-48 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
            </label>
          </details>
          {json ? (
            <details className="mt-3 rounded-xl bg-white p-3 ring-1 ring-emerald-200">
              <summary className="min-h-11 cursor-pointer list-none text-sm font-black">Vis JSON</summary>
              <label htmlFor="mission-folder-json" className="mt-3 block text-sm font-bold">
                Oppdragsmappe JSON
                <textarea id="mission-folder-json" readOnly value={json} className="mt-1 min-h-48 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
              </label>
            </details>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
