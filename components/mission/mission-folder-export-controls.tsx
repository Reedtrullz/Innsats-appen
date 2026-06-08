'use client';

import { useState } from 'react';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { MissionContext, ChecklistRun } from '@/lib/mission/schemas';
import type { MissionMapState } from '@/lib/maps/operations-map';
import { buildMissionFolderExport, exportMissionFolderMarkdown } from '@/lib/mission/mission-folder-export';
import { listChecklistRuns } from '@/lib/mission/local-store';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { ContextNotice } from './context-notice';
import { ExportReview } from './export-review';

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
        <ContextNotice variant="not-official" className="mt-1">Bygg lokalt, se over, eksporter. Ikke offisielt arkiv.</ContextNotice>
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
      <ExportReview title="Oppdragsmappe Markdown" text={markdown} textareaId="mission-folder-markdown" onCopy={(text) => void copyText(text)} copyLabel="Kopier Markdown" formatLabel="Markdown" />
      <ExportReview title="Oppdragsmappe JSON" text={json} textareaId="mission-folder-json" onCopy={(text) => void copyText(text)} copyLabel="Kopier JSON" formatLabel="JSON" />
    </section>
  );
}
