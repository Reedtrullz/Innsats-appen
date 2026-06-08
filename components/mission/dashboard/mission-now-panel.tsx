'use client';

import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import type { listChecklistRuns } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';
import { MissionCommandHeader } from '../../mission-command-summary';
import { MissionStatusStrip } from './mission-status-strip';
import { PanelHeading } from './panel-heading';
import { MissionProgressStrip } from './mission-progress-strip';
import { CompactQuickLog } from './compact-quick-log';
import { RecommendedActionsPanel } from './recommended-actions-panel';
import type { MissionUpdate } from './dashboard-types';
import { OperationalIcon } from '../../ui/operational-icons';

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
