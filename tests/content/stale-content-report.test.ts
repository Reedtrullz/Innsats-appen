import { describe, expect, it } from 'vitest';
import type { SourceDocument } from '@/lib/content/schemas';
import { buildStaleContentReport, staleContentReportToMarkdown } from '@/lib/content/stale-content-report';

const sources: SourceDocument[] = [
  {
    id: 'src-current',
    title: 'Gjeldende kilde',
    sourcePath: 'source-extracts/current.md',
    sourceType: 'source-extract',
    status: 'verified',
    verifiedAt: '2026-06-01',
    reviewAfter: '2026-12-01',
    owner: 'Fagansvarlig',
    reviewer: 'Redaktør',
    reviewRisk: 'low',
    body: 'Offentlig kilde.',
    warnings: [],
  },
  {
    id: 'src-stale',
    title: 'Foreldet kilde',
    sourcePath: 'source-extracts/stale.md',
    sourceType: 'source-extract',
    status: 'verified',
    verifiedAt: '2025-01-01',
    reviewAfter: '2026-01-10',
    owner: 'Fagansvarlig',
    reviewer: 'Redaktør',
    reviewRisk: 'medium',
    body: 'Offentlig kilde.',
    warnings: [],
  },
  {
    id: 'src-expired',
    title: 'Utløpt kilde',
    sourcePath: 'source-extracts/expired.md',
    sourceType: 'source-extract',
    status: 'expired',
    verifiedAt: '2024-01-01',
    expiresAt: '2026-01-01',
    owner: 'Fagansvarlig',
    reviewer: 'Redaktør',
    reviewRisk: 'high',
    body: 'Offentlig kilde.',
    warnings: [],
  },
];

describe('stale content report', () => {
  it('identifies stale and expired sources without including source body text', () => {
    const report = buildStaleContentReport({ sources, today: '2026-02-01' });

    expect(report.generatedFor).toBe('2026-02-01');
    expect(report.stale.map((item) => item.id)).toEqual(['src-stale']);
    expect(report.expired.map((item) => item.id)).toEqual(['src-expired']);
    expect(JSON.stringify(report)).not.toContain('Offentlig kilde.');
  });

  it('renders a privacy-safe markdown notification body', () => {
    const markdown = staleContentReportToMarkdown(buildStaleContentReport({ sources, today: '2026-02-01' }));

    expect(markdown).toContain('# Stale content report');
    expect(markdown).toContain('src-stale');
    expect(markdown).toContain('src-expired');
    expect(markdown).toContain('Ingen persondata');
    expect(markdown).not.toContain('Offentlig kilde.');
  });
});
