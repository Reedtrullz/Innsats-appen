'use client';

import { useState } from 'react';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { MissionContext } from '@/lib/mission/schemas';
import type { MissionMapState } from '@/lib/maps/operations-map';
import { buildAfterActionReport, buildRuhWelfareSummary, exportAfterActionJson, exportAfterActionMarkdown, exportAfterActionPdfReadyHtml } from '@/lib/mission/after-action-report';
import { listChecklistRuns } from '@/lib/mission/local-store';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';

function statusSummaryMission(mission: MissionContext, externalSignals: MissionContext['externalSignals']): MissionContext {
  return { ...mission, externalSignals };
}

function activeAfterActionChecklists(checklists: OperationalChecklist[], mission: MissionContext, fallbackChecklist?: OperationalChecklist) {
  const activeIds = new Set(mission.activeChecklistIds);
  const active = activeIds.size > 0 ? checklists.filter((checklist) => activeIds.has(checklist.slug)) : [];
  if (active.length > 0) return active;
  return fallbackChecklist ? [fallbackChecklist] : [];
}

export function AfterActionReportControls({ mission, displaySignals, checklists, fallbackChecklist, mapState }: { mission: MissionContext; displaySignals: MissionContext['externalSignals']; checklists: OperationalChecklist[]; fallbackChecklist?: OperationalChecklist; mapState: MissionMapState }) {
  const [localOrderText, setLocalOrderText] = useState('');
  const [localSambandText, setLocalSambandText] = useState('');
  const [localLogText, setLocalLogText] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [json, setJson] = useState('');
  const [pdfReadyHtml, setPdfReadyHtml] = useState('');
  const ruhWelfareSummary = buildRuhWelfareSummary(statusSummaryMission(mission, displaySignals));

  async function buildReport() {
    const runs = await listChecklistRuns(mission.id);
    const selectedChecklists = activeAfterActionChecklists(checklists, mission, fallbackChecklist);
    return buildAfterActionReport({
      mission: statusSummaryMission(mission, displaySignals),
      checklists: selectedChecklists,
      checklistRuns: runs,
      localOrderText,
      localSambandText,
      localLogText,
      mapState,
    });
  }

  async function generateMarkdown() {
    setMarkdown(exportAfterActionMarkdown(await buildReport()));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'after-action-markdown' });
  }

  async function generateJson() {
    setJson(exportAfterActionJson(await buildReport()));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'after-action-json' });
  }

  async function generatePdfReadyHtml() {
    setPdfReadyHtml(exportAfterActionPdfReadyHtml(await buildReport()));
    appendLocalAuditEntry('export-created', { missionId: mission.id, exportKind: 'after-action-pdf-ready-html' });
  }

  return (
    <section id="etterrapport" className="scroll-mt-24 space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">Lokal etterrapport</p>
        <h3 className="text-xl font-black">Etteraksjonsrapport</h3>
        <p className="mt-1 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Generer lokalt, se over, kopier/eksporter. Ikke legg inn persondata.</p>
      </div>
      <div role="region" aria-label="RUH/velferd lokal gjennomgang før eksport" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-950">
        <p className="text-xs font-black uppercase tracking-wide text-sky-700">1 · Bygg</p>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="font-black">RUH/velferd gjennomgang</h4>
            <p className="mt-1 text-sm font-semibold">{ruhWelfareSummary.warning}</p>
            <p className="mt-1 text-sm font-bold">Status: {ruhWelfareSummary.status === 'needs-review' ? 'Trenger gjennomgang' : 'OK'}</p>
          </div>
          <a href="#ruh-velferd" className="rounded-xl bg-white px-3 py-2 text-sm font-black text-amber-950 ring-1 ring-amber-200">Åpne RUH/velferd</a>
        </div>
        {ruhWelfareSummary.items.length > 0 ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
            {ruhWelfareSummary.items.slice(0, 4).map((item, index) => <li key={`ruh-follow-up-${index}-${item}`}>{item}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm font-semibold">Ingen lokale RUH/velferd-oppfølgingskandidater registrert før eksport.</p>
        )}
      </div>
      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <summary className="min-h-11 cursor-pointer list-none text-sm font-black text-slate-900">2 · Se over lokale tilleggsnotater</summary>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <label className="block text-sm font-bold">
            Lokal ordretekst
            <textarea value={localOrderText} onChange={(event) => setLocalOrderText(event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" placeholder="Valgfritt. Hvis tomt markeres Ikke registrert i lokal oppdragstavle." />
          </label>
          <label className="block text-sm font-bold">
            Lokalt samband
            <textarea value={localSambandText} onChange={(event) => setLocalSambandText(event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" placeholder="Valgfritt lokalt sambandssammendrag uten sensitiv informasjon." />
          </label>
          <label className="block text-sm font-bold">
            Lokal logg
            <textarea value={localLogText} onChange={(event) => setLocalLogText(event.target.value)} className="mt-1 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" placeholder="Valgfritt. Én hendelse per linje, uten persondata." />
          </label>
        </div>
      </details>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-black text-slate-900">3 · Eksporter</p>
        <button type="button" onClick={() => void generateMarkdown()} className="mt-3 min-h-11 w-full rounded-xl bg-slate-950 px-4 font-bold text-white sm:w-auto">Bygg etterrapport</button>
        <details className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
          <summary className="min-h-11 cursor-pointer list-none text-sm font-black text-slate-900">Avanserte eksportformater</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void generateJson()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag JSON</button>
            <button type="button" onClick={() => void generatePdfReadyHtml()} className="min-h-11 rounded-xl bg-slate-950 px-4 font-bold text-white">Lag PDF-klar HTML</button>
          </div>
        </details>
      </div>
      {markdown ? (
        <label htmlFor="after-action-markdown" className="block text-sm font-bold">
          Etteraksjonsrapport Markdown
          <textarea id="after-action-markdown" readOnly value={markdown} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
      {json ? (
        <label htmlFor="after-action-json" className="block text-sm font-bold">
          Etteraksjonsrapport JSON
          <textarea id="after-action-json" readOnly value={json} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
      {pdfReadyHtml ? (
        <label htmlFor="after-action-pdf-ready-html" className="block text-sm font-bold">
          PDF-klar etteraksjonsrapport HTML
          <textarea id="after-action-pdf-ready-html" readOnly value={pdfReadyHtml} className="mt-1 min-h-64 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900" />
        </label>
      ) : null}
    </section>
  );
}
