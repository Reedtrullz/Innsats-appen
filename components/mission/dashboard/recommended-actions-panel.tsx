'use client';

import type { ActionCard } from '@/lib/content/schemas';
import type { MissionContext } from '@/lib/mission/schemas';
import { TiltakCard, TiltakCardRow } from '../../tiltak-card';
import { CriticalNotice } from '../../ui/operational-primitives';
import type { MissionRecommendationScope } from '@/lib/mission/recommendations';

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function RecommendedActionsPanel({ recommendedLabel, criticalActions, firstActions, mission, recommendationScope = 'exact', otherPhaseCount = 0, showOtherPhases = false, onShowOtherPhases }: { recommendedLabel: string; criticalActions: ActionCard[]; firstActions: ActionCard[]; mission: MissionContext; recommendationScope?: MissionRecommendationScope; otherPhaseCount?: number; showOtherPhases?: boolean; onShowOtherPhases?: () => void }) {
  const secondaryActions = firstActions.filter((card) => card.priority !== 'high');
  const highPriorityActions = criticalActions.length > 0 ? criticalActions : firstActions.filter((card) => card.priority === 'high');

  return (
    <section id="kritisk-tiltak" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Prioritet</p>
          <h3 className="text-xl font-black">{recommendedLabel}</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Oppdatert {formatUpdatedAt(mission.updatedAt)}</span>
      </div>
      <div className="mt-3 space-y-3">
        {recommendationScope === 'widened-role' ? (
          <p className="rounded-xl bg-[var(--info-surface)] px-3 py-2 text-sm font-semibold text-[var(--info-fg)]">Utvidet til andre roller i samme fase fordi ingen tiltak traff valgt rolle.</p>
        ) : null}
        {showOtherPhases ? (
          <p className="rounded-xl bg-[var(--warning-surface)] px-3 py-2 text-sm font-semibold text-[var(--warning-fg)]">Viser tiltak fra andre faser etter ditt valg. Kontroller fasemerkingen før bruk.</p>
        ) : null}
        {criticalActions.length > 0 ? (
          <CriticalNotice title={`${criticalActions.length} kritisk tiltak først`} tone="critical">
            Visningen prioriterer høyt merkede tiltak for valgt fase, rolle og scenario.
          </CriticalNotice>
        ) : null}
        {highPriorityActions.length > 0 ? highPriorityActions.map((card) => <TiltakCard key={card.slug} card={card} compact />) : null}
        {secondaryActions.length > 0 ? (
          <div className="space-y-2">
            {secondaryActions.map((card) => <TiltakCardRow key={card.slug} card={card} />)}
          </div>
        ) : null}
        {firstActions.length === 0 ? (
          <p className="rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen tiltakskort matcher dette oppdraget ennå. Bruk søk eller endre fase/scenario.</p>
        ) : null}
        {!showOtherPhases && otherPhaseCount > 0 ? (
          <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-black text-[var(--text-primary)]" onClick={onShowOtherPhases}>
            Vis også andre faser ({otherPhaseCount})
          </button>
        ) : null}
      </div>
    </section>
  );
}
