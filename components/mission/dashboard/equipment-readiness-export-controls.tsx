'use client';

import { useState } from 'react';
import type { OperationalChecklist } from '@/lib/content/schemas';
import { buildEquipmentReadinessSummary, exportEquipmentReadinessJson, exportEquipmentReadinessMarkdown } from '@/lib/mission/equipment-readiness';
import { listChecklistRuns } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { ContextNotice } from '../context-notice';
import { ExportReview } from '../export-review';

export function EquipmentReadinessExportControls({ mission, checklists }: { mission: MissionContext; checklists: OperationalChecklist[] }) {
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
        <ContextNotice variant="not-official" className="mt-1">Kun lokal beslutningsstøtte. Ikke offisiell inventarliste, lagerstatus eller innsending. Ikke legg inn serienummer, persondata eller sensitive samband-lister.</ContextNotice>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void generateMarkdown()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag MBK Markdown</button>
        <button type="button" onClick={() => void generateJson()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag MBK JSON</button>
      </div>
      <ExportReview title="MBK materiellstatus Markdown" text={markdown} textareaId="mbk-equipment-markdown" onCopy={(text) => void copyText(text)} formatLabel="Markdown" />
      <ExportReview title="MBK materiellstatus JSON" text={json} textareaId="mbk-equipment-json" onCopy={(text) => void copyText(text)} formatLabel="JSON" />
    </section>
  );
}
