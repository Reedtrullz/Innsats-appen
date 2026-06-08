'use client';

import { useEffect, useMemo, useState, useSyncExternalStore, type MouseEvent } from 'react';
import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import { filterActionCards, sortActionCards } from '@/lib/content/filters';
import { DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS, disabledExternalDataSources, displaySignalsForExternalDataSourceSettings, externalDataSourceSettingsSnapshot, parseExternalDataSourceSettings, subscribeExternalDataSourceSettings } from '@/lib/integrations/source-settings';
import { missionMapStateSnapshot, normalizeMissionMapState, subscribeMissionMapState, mapStateForMission } from '@/lib/maps/operations-map';
import { listChecklistRuns } from '@/lib/mission/local-store';
import { buildOrderUpdateSuggestions } from '@/lib/mission/order-update-suggestions';
import type { MissionContext } from '@/lib/mission/schemas';
import { markStoredContextSignalsStale } from '../../context-signal-panel';
import type { MissionUpdate } from './dashboard-types';
import { missionDashboardHashTargets, modeForHashTarget, type MissionMode } from './hash-navigation';
import { MissionExportPanel } from './mission-export-panel';
import { MissionModeControl } from './mission-mode-control';
import { MissionNowPanel } from './mission-now-panel';
import { MissionWorkPanel } from './mission-work-panel';

function missionCards(cards: ActionCard[], mission: MissionContext) {
  const exact = filterActionCards(cards, { phase: mission.phase, role: mission.role, scenario: mission.scenario });
  const fallback = exact.length > 0 ? exact : filterActionCards(cards, { phase: mission.phase, scenario: mission.scenario });
  const wider = fallback.length > 0 ? fallback : filterActionCards(cards, { scenario: mission.scenario });
  return sortActionCards(wider).slice(0, 3);
}

export function MissionCommandDashboard({ mission, cards, checklist, checklists, contentVersion, onMissionChange, onArchive }: { mission: MissionContext; cards: ActionCard[]; checklist?: OperationalChecklist; checklists: OperationalChecklist[]; contentVersion: string; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  const firstActions = missionCards(cards, mission);
  const [checklistRuns, setChecklistRuns] = useState<Awaited<ReturnType<typeof listChecklistRuns>>>([]);
  const [activeMode, setActiveMode] = useState<MissionMode>('now');
  const [pendingHashTarget, setPendingHashTarget] = useState<string | null>(null);
  const settingsSnapshot = useSyncExternalStore(
    subscribeExternalDataSourceSettings,
    externalDataSourceSettingsSnapshot,
    () => JSON.stringify(DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS),
  );
  const sourceSettings = useMemo(() => parseExternalDataSourceSettings(settingsSnapshot), [settingsSnapshot]);
  const mapStateSnapshot = useSyncExternalStore(
    subscribeMissionMapState,
    missionMapStateSnapshot,
    () => JSON.stringify({ markers: [], drawings: [] }),
  );
  const mapState = useMemo(() => {
    try {
      return normalizeMissionMapState(JSON.parse(mapStateSnapshot));
    } catch {
      return { markers: [], drawings: [] };
    }
  }, [mapStateSnapshot]);
  const scopedMapState = useMemo(() => mapStateForMission(mapState, mission.id), [mapState, mission.id]);
  const commandMapSummary = useMemo(() => ({
    markerCount: scopedMapState.markers.length,
    drawingCount: scopedMapState.drawings.length,
  }), [scopedMapState.drawings.length, scopedMapState.markers.length]);

  const staleSignals = useMemo(() => {
    const storedSignals = mission.externalSignals.length > 0 ? markStoredContextSignalsStale(mission.externalSignals) : [];
    return displaySignalsForExternalDataSourceSettings(storedSignals, sourceSettings);
  }, [mission.externalSignals, sourceSettings]);
  const disabledSources = useMemo(() => disabledExternalDataSources(sourceSettings), [sourceSettings]);
  const nextActionSteps = firstActions[0]?.steps.length
    ? firstActions[0].steps.slice(0, 3)
    : ['Åpne sjekklisten og bekreft fase, samband og sikkerhet.'];
  const orderSuggestions = buildOrderUpdateSuggestions(mission.fieldLogEntries ?? []);
  const criticalActions = firstActions.filter((card) => card.priority === 'high');
  const recommendedLabel = criticalActions.length > 0 ? 'Kritisk nå' : 'Anbefalte tiltak';

  useEffect(() => {
    let active = true;
    listChecklistRuns(mission.id).then((runs) => {
      if (active) setChecklistRuns(runs);
    });
    return () => {
      active = false;
    };
  }, [mission.id]);

  function refreshChecklistRuns() {
    void listChecklistRuns(mission.id).then(setChecklistRuns);
  }

  function activateHashTarget(targetId: string) {
    if (!missionDashboardHashTargets.has(targetId)) return;
    const targetMode = modeForHashTarget(targetId);
    if (targetMode) setActiveMode(targetMode);
    setPendingHashTarget(targetId);
  }

  useEffect(() => {
    function openHashTarget() {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      if (!missionDashboardHashTargets.has(targetId)) return;
      activateHashTarget(targetId);
    }

    openHashTarget();
    const onHashChange = () => {
      openHashTarget();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [mission.id]);

  useEffect(() => {
    if (!pendingHashTarget) return undefined;
    let innerFrame = 0;
    const outerFrame = window.requestAnimationFrame(() => {
      innerFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(pendingHashTarget);
        const parentDetails = target?.closest('details') as HTMLDetailsElement | null;
        if (parentDetails) parentDetails.open = true;
        if (typeof target?.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
        setPendingHashTarget(null);
      });
    });
    return () => {
      window.cancelAnimationFrame(outerFrame);
      if (innerFrame) window.cancelAnimationFrame(innerFrame);
    };
  }, [activeMode, pendingHashTarget]);

  function handleDashboardAnchorClick(event: MouseEvent<HTMLElement>) {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!anchor) return;
    const targetId = decodeURIComponent(anchor.hash.slice(1));
    if (!missionDashboardHashTargets.has(targetId)) return;
    event.preventDefault();
    if (window.location.hash !== anchor.hash) window.history.pushState(null, '', anchor.hash);
    activateHashTarget(targetId);
  }

  return (
    <article className="space-y-4" onClickCapture={handleDashboardAnchorClick}>
      <MissionModeControl activeMode={activeMode} onModeChange={setActiveMode} />
      {activeMode === 'now' ? (
        <MissionNowPanel
          mission={mission}
          checklist={checklist}
          checklists={checklists}
          checklistRuns={checklistRuns}
          commandMapSummary={commandMapSummary}
          firstActions={firstActions}
          criticalActions={criticalActions}
          recommendedLabel={recommendedLabel}
          nextActionSteps={nextActionSteps}
          onMissionChange={onMissionChange}
        />
      ) : activeMode === 'work' ? (
        <MissionWorkPanel
          mission={mission}
          checklist={checklist}
          checklistRuns={checklistRuns}
          staleSignals={staleSignals}
          scopedMapState={scopedMapState}
          orderSuggestions={orderSuggestions}
          onMissionChange={onMissionChange}
          onChecklistRunSaved={refreshChecklistRuns}
        />
      ) : (
        <MissionExportPanel
          mission={mission}
          contentVersion={contentVersion}
          checklists={checklists}
          checklist={checklist}
          staleSignals={staleSignals}
          disabledSources={disabledSources}
          scopedMapState={scopedMapState}
          onMissionChange={onMissionChange}
          onArchive={onArchive}
        />
      )}
    </article>
  );
}
