import type { SourceDocument } from '@/lib/content/schemas';

export interface StaleContentItem {
  id: string;
  title: string;
  status: SourceDocument['status'];
  owner: string;
  reviewer: string;
  reviewRisk: SourceDocument['reviewRisk'];
  reviewAfter?: string;
  expiresAt?: string;
}

export interface StaleContentReport {
  generatedFor: string;
  stale: StaleContentItem[];
  expired: StaleContentItem[];
}

function toItem(source: SourceDocument): StaleContentItem {
  return {
    id: source.id,
    title: source.title,
    status: source.status,
    owner: source.owner,
    reviewer: source.reviewer,
    reviewRisk: source.reviewRisk,
    reviewAfter: source.reviewAfter,
    expiresAt: source.expiresAt,
  };
}

function isOnOrBefore(date: string | undefined, today: string) {
  return typeof date === 'string' && date.localeCompare(today) <= 0;
}

function sortItems(items: StaleContentItem[]) {
  return [...items].sort((a, b) => (a.reviewAfter ?? a.expiresAt ?? '').localeCompare(b.reviewAfter ?? b.expiresAt ?? '') || a.id.localeCompare(b.id));
}

export function buildStaleContentReport({ sources, today }: { sources: SourceDocument[]; today: string }): StaleContentReport {
  const expired = sources.filter((source) => source.status === 'expired' || isOnOrBefore(source.expiresAt, today)).map(toItem);
  const expiredIds = new Set(expired.map((item) => item.id));
  const stale = sources.filter((source) => !expiredIds.has(source.id) && isOnOrBefore(source.reviewAfter, today)).map(toItem);

  return {
    generatedFor: today,
    stale: sortItems(stale),
    expired: sortItems(expired),
  };
}

function renderItems(items: StaleContentItem[]) {
  if (items.length === 0) return 'Ingen.';
  return items
    .map((item) => `- ${item.id} — ${item.title} (status: ${item.status}, eier: ${item.owner}, reviewer: ${item.reviewer}, risiko: ${item.reviewRisk})`)
    .join('\n');
}

export function staleContentReportToMarkdown(report: StaleContentReport) {
  return [
    '# Stale content report',
    '',
    `Dato: ${report.generatedFor}`,
    '',
    'Ingen persondata, ingen private posisjoner og ingen kilde-body kopieres til denne meldingen. Bruk kilde-ID i repoet og kjør redaksjonell kontroll før publisering.',
    '',
    '## Foreldede kilder',
    renderItems(report.stale),
    '',
    '## Utløpte kilder',
    renderItems(report.expired),
    '',
  ].join('\n');
}
