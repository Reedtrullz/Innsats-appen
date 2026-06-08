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

  return (
    <section id="oppdragsmappe" className="scroll-mt-24 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200" aria-label="Oppdragsmappe">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Oppdragsmappe</p>
        <h3 className="text-xl font-black">Lokal oppdragsmappe</h3>
        <p className="mt-1 text-sm font-semibold text-amber-900">Generer lokalt, se over, kopier/eksporter. Ikke offisielt arkiv.</p>
      </div>
      <button type="button" onClick={() => void generate()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Generer oppdragsmappe</button>
      {markdown ? (
        <label htmlFor="mission-folder-markdown" className="block text-sm font-bold">
          Oppdragsmappe Markdown
          <textarea id="mission-folder-markdown" readOnly value={markdown} className="mt-1 min-h-48 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
      {json ? (
        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <summary className="min-h-11 cursor-pointer list-none text-sm font-black text-slate-900">Vis JSON</summary>
          <label htmlFor="mission-folder-json" className="mt-3 block text-sm font-bold">
            Oppdragsmappe JSON
            <textarea id="mission-folder-json" readOnly value={json} className="mt-1 min-h-48 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
          </label>
        </details>
      ) : null}
    </section>
  );
}
