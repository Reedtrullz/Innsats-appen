'use client';

import { useEffect, useMemo, useState, useSyncExternalStore, type MouseEvent } from 'react';
import type { ActionCard, OperationalChecklist } from '@/lib/content/schemas';
import { DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS, disabledExternalDataSources, displaySignalsForExternalDataSourceSettings, externalDataSourceSettingsSnapshot, parseExternalDataSourceSettings, subscribeExternalDataSourceSettings } from '@/lib/integrations/source-settings';
import { missionMapStateSnapshot, normalizeMissionMapState, subscribeMissionMapState, mapStateForMission } from '@/lib/maps/operations-map';
import { listChecklistRuns } from '@/lib/mission/local-store';
import { buildOrderUpdateSuggestions } from '@/lib/mission/order-update-suggestions';
import type { MissionContext } from '@/lib/mission/schemas';
import { selectMissionRecommendations } from '@/lib/mission/recommendations';
import { markStoredContextSignalsStale } from '../../context-signal-panel';
import type { MissionUpdate } from './dashboard-types';
import { missionDashboardHashTargets } from './hash-navigation';
import { MissionExportPanel } from './mission-export-panel';
import { MissionNowPanel } from './mission-now-panel';
import { MissionStickyHeader } from './mission-sticky-header';
import { MissionWorkPanel } from './mission-work-panel';

export function MissionCommandDashboard({ mission, cards, checklist, checklists, contentVersion, sourceTitleById, sourceRiskById, onMissionChange, onArchive }: { mission: MissionContext; cards: ActionCard[]; checklist?: OperationalChecklist; checklists: OperationalChecklist[]; contentVersion: string; sourceTitleById?: Record<string, string>; sourceRiskById?: Record<string, 'caution' | 'ok'>; onMissionChange: (missionId: string, update: MissionUpdate) => Promise<void>; onArchive: (missionId: string) => Promise<void> }) {
  const recommendations = useMemo(() => selectMissionRecommendations(cards, mission), [cards, mission]);
  const recommendationContextKey = `${mission.phase}|${mission.role}|${mission.scenario}`;
  const [otherPhaseContextKey, setOtherPhaseContextKey] = useState<string | null>(null);
  const showOtherPhases = otherPhaseContextKey === recommendationContextKey;
  const firstActions = useMemo(() => (
    showOtherPhases
      ? [...recommendations.currentPhaseCards, ...recommendations.otherPhaseCards].slice(0, 3)
      : recommendations.currentPhaseCards
  ), [recommendations, showOtherPhases]);
  const [checklistRuns, setChecklistRuns] = useState<Awaited<ReturnType<typeof listChecklistRuns>>>([]);
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
  const orderSuggestions = buildOrderUpdateSuggestions(mission.fieldLogEntries ?? []);
  const criticalActions = firstActions.filter((card) => card.priority === 'high');
  const recommendedLabel = criticalActions.length > 0 ? 'Kritiske tiltak' : 'Anbefalte tiltak';

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
    const targetId = pendingHashTarget;
    let cancelled = false;
    const headerOffset = 112; // sticky app header (~56px) + sticky mode control (~56px)
    const maxAttempts = 8;

    function openAncestorDetails(target: HTMLElement) {
      let opened = false;
      let element: HTMLElement | null = target;
      while (element) {
        if (element.tagName === 'DETAILS' && !(element as HTMLDetailsElement).open) {
          (element as HTMLDetailsElement).open = true;
          opened = true;
        }
        element = element.parentElement;
      }
      return opened;
    }

    function attemptScroll(remaining: number) {
      if (cancelled) return;
      const target = document.getElementById(targetId);
      const scrollIntoView = target && typeof target.scrollIntoView === 'function' ? target.scrollIntoView.bind(target) : null;
      if (!target) {
        if (remaining > 0) {
          window.requestAnimationFrame(() => attemptScroll(remaining - 1));
        } else {
          setPendingHashTarget(null);
        }
        return;
      }

      const openedDetails = openAncestorDetails(target);
      const rect = target.getBoundingClientRect();
      const fullyVisible = rect.top >= headerOffset && rect.bottom <= window.innerHeight;

      if (openedDetails) {
        // Layout will change after the <details> opens; scroll now, then re-measure next frame.
        scrollIntoView?.({ block: 'start' });
        if (remaining > 0) {
          window.requestAnimationFrame(() => attemptScroll(remaining - 1));
        } else {
          setPendingHashTarget(null);
        }
        return;
      }

      if (fullyVisible) {
        setPendingHashTarget(null);
        return;
      }

      scrollIntoView?.({ block: 'start' });
      if (remaining > 0) {
        window.requestAnimationFrame(() => attemptScroll(remaining - 1));
      } else {
        setPendingHashTarget(null);
      }
    }

    const initialFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => attemptScroll(maxAttempts));
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(initialFrame);
    };
  }, [pendingHashTarget]);

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
      <MissionStickyHeader mission={mission} />
      <MissionNowPanel
        mission={mission}
        checklists={checklists}
        checklistRuns={checklistRuns}
        commandMapSummary={commandMapSummary}
        firstActions={firstActions}
        criticalActions={criticalActions}
        recommendedLabel={recommendedLabel}
        recommendationScope={recommendations.scope}
        otherPhaseCount={recommendations.otherPhaseCards.length}
        showOtherPhases={showOtherPhases}
        onShowOtherPhases={() => setOtherPhaseContextKey(recommendationContextKey)}
        sourceTitleById={sourceTitleById}
        sourceRiskById={sourceRiskById}
        onMissionChange={onMissionChange}
        onChecklistRunSaved={refreshChecklistRuns}
      />
      <MissionWorkPanel
        mission={mission}
        checklist={checklist}
        checklists={checklists}
        checklistRuns={checklistRuns}
        staleSignals={staleSignals}
        scopedMapState={scopedMapState}
        orderSuggestions={orderSuggestions}
        sourceTitleById={sourceTitleById}
        onMissionChange={onMissionChange}
        onChecklistRunSaved={refreshChecklistRuns}
      />
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
    </article>
  );
}
