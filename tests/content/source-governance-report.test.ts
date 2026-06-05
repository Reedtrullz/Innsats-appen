import fs from 'node:fs';
import { expect, it } from 'vitest';
import { buildSourceGovernanceReport } from '@/lib/content/source-governance';

const sources = [
  {
    id: 'src-verified',
    title: 'Verified',
    status: 'verified',
    reviewRisk: 'low',
    warnings: [],
    pilotReviewStatus: 'approved-for-pilot',
    publicationStatus: 'approved-public',
  },
  {
    id: 'src-unverified',
    title: 'Unverified',
    status: 'unverified',
    reviewRisk: 'high',
    warnings: ['Deep research basis'],
    pilotReviewStatus: 'not-reviewed',
    publicationStatus: 'needs-permission',
  },
  {
    id: 'src-verified-not-pilot',
    title: 'Verified but not pilot-approved',
    status: 'verified',
    reviewRisk: 'high',
    warnings: [],
    pilotReviewStatus: 'not-reviewed',
    publicationStatus: 'approved-public',
  },
];

const cards = [
  { slug: 'safe-card', title: 'Safe card', sourceIds: ['src-verified'] },
  { slug: 'risky-card', title: 'Risky card', sourceIds: ['src-unverified'] },
];

const checklists = [
  {
    slug: 'risky-checklist',
    title: 'Risky checklist',
    sourceIds: [],
    items: [
      {
        id: 'item-a',
        label: 'Risky item',
        sourceIds: ['src-unverified', 'src-verified-not-pilot'],
      },
    ],
  },
];
const trainingPaths = [{ slug: 'safe-training', title: 'Safe training', sourceIds: ['src-verified'] }];

it('reports referenced sources that are not pilot/public approved, including checklist item sourceIds', () => {
  const report = buildSourceGovernanceReport({ sources, cards, checklists, trainingPaths });

  expect(report.summary.sourceCount).toBe(3);
  expect(report.summary.referencedSourceCount).toBe(3);
  expect(report.summary.pilotBlockingReferencedSourceCount).toBe(2);
  expect(report.findings.pilotBlockingReferencedSources).toEqual([
    expect.objectContaining({
      sourceId: 'src-unverified',
      referencedBy: ['card:risky-card', 'checklist:risky-checklist:item:item-a'],
    }),
    expect.objectContaining({
      sourceId: 'src-verified-not-pilot',
      referencedBy: ['checklist:risky-checklist:item:item-a'],
    }),
  ]);
});

it('does not flag unreferenced draft sources as pilot-blocking operational usage', () => {
  const report = buildSourceGovernanceReport({
    sources: [
      ...sources,
      {
        id: 'src-draft',
        title: 'Draft',
        status: 'draft',
        reviewRisk: 'high',
        warnings: [],
        pilotReviewStatus: 'not-reviewed',
        publicationStatus: 'needs-permission',
      },
    ],
    cards,
    checklists,
    trainingPaths,
  });

  expect(
    report.findings.pilotBlockingReferencedSources.map((finding: { sourceId: string }) => finding.sourceId),
  ).not.toContain('src-draft');
});

it('exposes source governance npm scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

  expect(packageJson.scripts['report:source-governance']).toBe('tsx scripts/report-source-governance.ts');
  expect(packageJson.scripts['report:source-governance:strict']).toBe(
    'tsx scripts/report-source-governance.ts --strict',
  );
});
