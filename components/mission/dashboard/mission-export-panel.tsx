'use client';

import { CommsPlanForm } from '@/components/forms/comms-plan-form';
import { FivePointOrderForm } from '@/components/forms/five-point-order-form';
import type { OperationalChecklist } from '@/lib/content/schemas';
import type { MissionMapState } from '@/lib/maps/operations-map';
import type { MissionContext } from '@/lib/mission/schemas';
import { AfterActionReportControls } from '../after-action-report-controls';
import { LocalMissionControls } from '../local-mission-controls';
import { MissionFolderExportControls } from '../mission-folder-export-controls';
import { RuhWelfareControls } from '../ruh-welfare-controls';
import type { MissionUpdate } from './dashboard-types';
import { EquipmentReadinessExportControls } from './equipment-readiness-export-controls';
import { ExportGroup } from './export-group';
import { ExportToolDetails } from './export-tool-details';
import { MissionAdvancedPanel } from './mission-advanced-panel';
import { PanelHeading } from './panel-heading';

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
    <section id="mission-export-panel" role="region" aria-labelledby="mission-export-heading" className="scroll-mt-28 space-y-4">
      <PanelHeading eyebrow="Avslutning" title="Avslutt oppdrag" id="mission-export-heading" />
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
