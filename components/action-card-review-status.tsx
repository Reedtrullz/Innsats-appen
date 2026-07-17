import type { ActionCard } from '@/lib/content/schemas';
import { OperationalIcon } from './ui/operational-icons';
import { StatusPill } from './ui/operational-primitives';

type ReviewStatus = ActionCard['reviewStatus'];
type DefinedReviewStatus = NonNullable<ReviewStatus>;

const reviewLabels: Record<DefinedReviewStatus, string> = {
  reviewed: 'Faglig godkjent',
  'pending-fagperson': 'Til gjennomgang',
  unreviewed: 'Ikke faglig vurdert',
};

export function actionCardReviewLabel(reviewStatus: ReviewStatus | undefined) {
  return reviewLabels[reviewStatus ?? 'unreviewed'];
}

export function ActionCardReviewBadge({ reviewStatus }: { reviewStatus?: ReviewStatus }) {
  const normalizedStatus = reviewStatus ?? 'unreviewed';
  const tone = normalizedStatus === 'reviewed' ? 'success' : 'warning';
  return <StatusPill label={reviewLabels[normalizedStatus]} tone={tone} compact />;
}

export function ActionCardReviewNotice({ card }: { card: ActionCard }) {
  const reviewStatus = card.reviewStatus ?? 'unreviewed';
  const approved = reviewStatus === 'reviewed';
  const detail = approved
    ? `Kortet er faglig gjennomgått${card.reviewedBy ? ` av ${card.reviewedBy}` : ''}. Kontroller fortsatt mot gjeldende ordre og fagmyndighet.`
    : reviewStatus === 'pending-fagperson'
      ? 'Innholdet er utvidet fra kildedokumentene og venter på faglig godkjenning. Bruk det som støtte, ikke som fasit.'
      : 'Kortet er ikke faglig vurdert. Bruk det bare som orienterende støtte og kontroller mot gjeldende ordre og fagmyndighet.';

  return (
    <details className={`rounded-2xl border shadow-sm ${approved ? 'border-[#34d399]/30 bg-[var(--success-surface)] text-[var(--success-fg)]' : 'border-[#fbbf24]/30 bg-[var(--warning-surface)] text-[var(--warning-fg)]'}`} aria-label="Faglig status">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-base font-black">
        <OperationalIcon name="shield" className="h-5 w-5" />
        {reviewLabels[reviewStatus]}
        <span className="ml-auto text-xs underline underline-offset-2">Detaljer</span>
      </summary>
      <p className="border-t px-4 py-3 text-sm font-semibold" style={{ borderColor: 'inherit' }}>{detail}</p>
    </details>
  );
}
