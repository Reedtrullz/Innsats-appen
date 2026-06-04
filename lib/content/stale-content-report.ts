import type { SourceDocument } from '@/lib/content/schemas';

export interface StaleContentItem {
  id: string;
  title: string;
  status: SourceDocument['status'];
  reviewRisk: SourceDocument['reviewRisk'];
  reviewAfter?: string;
  expiresAt?: string;
}

export interface StaleContentReport {
  generatedFor: string;
  stale: StaleContentItem[];
  expired: StaleContentItem[];
}

export function assertIsoDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must use YYYY-MM-DD');
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Date must use a valid YYYY-MM-DD calendar date');
  return date;
}

function toItem(source: SourceDocument): StaleContentItem {
  return {
    id: source.id,
    title: source.title,
    status: source.status,
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
  const reportDate = assertIsoDate(today);
  const expired = sources.filter((source) => source.status === 'expired' || isOnOrBefore(source.expiresAt, reportDate)).map(toItem);
  const expiredIds = new Set(expired.map((item) => item.id));
  const stale = sources.filter((source) => !expiredIds.has(source.id) && isOnOrBefore(source.reviewAfter, reportDate)).map(toItem);

  return {
    generatedFor: reportDate,
    stale: sortItems(stale),
    expired: sortItems(expired),
  };
}

function renderItems(items: StaleContentItem[]) {
  if (items.length === 0) return 'Ingen.';
  return items
    .map((item) => {
      const dates = [
        item.reviewAfter ? `reviewAfter: ${item.reviewAfter}` : undefined,
        item.expiresAt ? `expiresAt: ${item.expiresAt}` : undefined,
      ].filter(Boolean).join(', ');
      return `- ${item.id} — ${item.title} (status: ${item.status}, risiko: ${item.reviewRisk}${dates ? `, ${dates}` : ''})`;
    })
    .join('\n');
}

export function staleContentReportToMarkdown(report: StaleContentReport) {
  return [
    '# Stale content report',
    '',
    `Dato: ${report.generatedFor}`,
    '',
    'Ingen persondata, ingen private posisjoner, ingen eier/reviewer-navn og ingen kilde-body kopieres til denne meldingen. Bruk kilde-ID i repoet og kjør redaksjonell kontroll før publisering.',
    '',
    '## Foreldede kilder',
    renderItems(report.stale),
    '',
    '## Utløpte kilder',
    renderItems(report.expired),
    '',
  ].join('\n');
}
