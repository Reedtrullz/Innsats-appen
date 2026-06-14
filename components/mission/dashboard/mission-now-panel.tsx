'use client';

import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import type { listChecklistRuns } from '@/lib/mission/local-store';
import type { MissionContext } from '@/lib/mission/schemas';
import { MissionCommandHeader } from '../../mission-command-summary';
import { RunbookView } from '../../runbook/runbook-view';
import { PanelHeading } from './panel-heading';
import { MissionProgressStrip } from './mission-progress-strip';
import { CompactQuickLog } from './compact-quick-log';
import { RecommendedActionsPanel } from './recommended-actions-panel';
import type { MissionUpdate } from './dashboard-types';

export function MissionNowPanel({
  mission,
  checklists,
  checklistRuns,
  commandMapSummary,
  firstActions,
  criticalActions,
  recommendedLabel,
  sourceTitleById,
  sourceRiskById,
  onMissionChange,
  onChecklistRunSaved,
}: {
  mission: MissionContext;
  checklists: OperationalChecklist[];
  checklistRuns: Awaited<ReturnType<typeof listChecklistRuns>>;
  commandMapSummary: { markerCount: number; drawingCount: number };
  firstActions: ActionCard[];
  criticalActions: ActionCard[];
  recommendedLabel: string;
  sourceTitleById?: Record<string, string>;
  sourceRiskById?: Record<string, 'caution' | 'ok'>;
  onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>;
  onChecklistRunSaved?: () => void;
}) {
  return (
    <section id="mission-now-panel" role="tabpanel" aria-labelledby="mission-now-tab" className="space-y-4">
      <PanelHeading eyebrow="Nå" title="Situasjon og neste grep" id="mission-now-heading" />
      {/* Instructions first: the guided runbook is the default Nå experience;
          mission context and recommendations follow below it. */}
      <RunbookView checklists={checklists} compact sourceTitleById={sourceTitleById} sourceRiskById={sourceRiskById} onRunSaved={onChecklistRunSaved} />
      <CompactQuickLog mission={mission} onMissionChange={onMissionChange} />
      <MissionCommandHeader mission={mission} />
      <RecommendedActionsPanel recommendedLabel={recommendedLabel} criticalActions={criticalActions} firstActions={firstActions} mission={mission} />
      <MissionProgressStrip mission={mission} checklists={checklists} checklistRuns={checklistRuns} mapSummary={commandMapSummary} />
    </section>
  );
}
