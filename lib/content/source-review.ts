import type { SourceDocument } from './schemas';

const highRiskStatuses = new Set(['unverified', 'historical', 'draft', 'expired']);

export type SourceFreshnessState = 'current' | 'stale' | 'expired' | 'unreviewed' | 'high-risk';

export interface SourceFreshness {
  state: SourceFreshnessState;
  label: string;
  detail: string;
  tone: 'emerald' | 'amber' | 'red' | 'slate';
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const dateOnly = value.slice(0, 10);
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) return undefined;
  return parsed.toISOString().slice(0, 10) === dateOnly ? parsed : undefined;
}

export function isHighRiskSource(source: Pick<SourceDocument, 'status' | 'reviewRisk'>) {
  return source.reviewRisk === 'high' || highRiskStatuses.has(source.status);
}

export function sourceFreshness(source: SourceDocument, now = new Date()): SourceFreshness {
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const reviewAfter = parseDate(source.reviewAfter);
  const expiresAt = parseDate(source.expiresAt);

  if (!source.verifiedAt) {
    return { state: 'unreviewed', label: 'Ikke verifisert', detail: 'Kilden mangler verifiedAt.', tone: 'red' };
  }
  if (source.status === 'expired' || (expiresAt && expiresAt <= today)) {
    return { state: 'expired', label: 'Utløpt kilde', detail: source.expiresAt ? `Utløp ${source.expiresAt}.` : 'Status er expired.', tone: 'red' };
  }
  if (reviewAfter && reviewAfter <= today) {
    return { state: 'stale', label: 'Gjennomgang forfalt', detail: `Ny gjennomgang skulle vært gjort ${source.reviewAfter}.`, tone: 'amber' };
  }
  if (isHighRiskSource(source)) {
    return { state: 'high-risk', label: 'Høy kilde-risiko', detail: source.reviewAfter ? `Ny gjennomgang innen ${source.reviewAfter}.` : 'Kilden krever tett faglig oppfølging.', tone: 'amber' };
  }
  return { state: 'current', label: 'Kilde fersk', detail: source.reviewAfter ? `Ny gjennomgang innen ${source.reviewAfter}.` : `Verifisert ${source.verifiedAt}.`, tone: 'emerald' };
}

export interface SourceReviewDashboardItem {
  source: SourceDocument;
  freshness: SourceFreshness;
}

export interface SourceReviewDashboard {
  stale: SourceReviewDashboardItem[];
  expired: SourceReviewDashboardItem[];
  unreviewed: SourceReviewDashboardItem[];
  highRisk: SourceReviewDashboardItem[];
  attention: SourceReviewDashboardItem[];
}

export function buildSourceReviewDashboard(sources: SourceDocument[], now = new Date()): SourceReviewDashboard {
  const items = sources.map((source) => ({ source, freshness: sourceFreshness(source, now) }));
  const stale = items.filter((item) => item.freshness.state === 'stale');
  const expired = items.filter((item) => item.freshness.state === 'expired');
  const unreviewed = items.filter((item) => item.freshness.state === 'unreviewed');
  const highRisk = items.filter((item) => isHighRiskSource(item.source));
  const attentionIds = new Set([...stale, ...expired, ...unreviewed, ...highRisk].map((item) => item.source.id));
  const attention = items.filter((item) => attentionIds.has(item.source.id)).sort((a, b) => a.source.title.localeCompare(b.source.title, 'nb'));
  return { stale, expired, unreviewed, highRisk, attention };
}
