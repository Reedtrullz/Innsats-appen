import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
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

it('reports public source document bodies that are exposed without publication approval', () => {
  type SourceDocumentFixture = Parameters<typeof buildSourceGovernanceReport>[0]['sources'][number] & {
    body?: string;
  };
  type ReportWithPublicBodyFindings = ReturnType<typeof buildSourceGovernanceReport> & {
    summary: ReturnType<typeof buildSourceGovernanceReport>['summary'] & {
      publicBodyBlockingSourceCount: number;
    };
    findings: ReturnType<typeof buildSourceGovernanceReport>['findings'] & {
      publicBodyBlockingSources: Array<{
        sourceId: string;
        reason: string;
        referencedBy: string[];
      }>;
    };
  };

  // This fixture models public/generated-content/source-documents.json: any non-approved body
  // present here is already a public exposure, independent of cards/checklists/training paths.
  const publicSourceDocuments: SourceDocumentFixture[] = [
    {
      id: 'src-body-needs-permission',
      title: 'Body Needs Permission',
      status: 'verified',
      reviewRisk: 'high',
      warnings: [],
      pilotReviewStatus: 'approved-for-pilot',
      publicationStatus: 'needs-permission',
      body: 'This body must not be public.',
    },
    {
      id: 'src-approved-public-with-body',
      title: 'Approved Public With Body',
      status: 'verified',
      reviewRisk: 'low',
      warnings: [],
      pilotReviewStatus: 'approved-for-pilot',
      publicationStatus: 'approved-public',
      body: 'Approved public body.',
    },
  ];
  const report = buildSourceGovernanceReport({
    sources: publicSourceDocuments,
    cards: [],
    checklists: [],
    trainingPaths: [],
  }) as ReportWithPublicBodyFindings;

  expect(report.summary.publicBodyBlockingSourceCount).toBe(1);
  expect(report.findings.publicBodyBlockingSources).toEqual([
    expect.objectContaining({
      sourceId: 'src-body-needs-permission',
      reason: 'public body is present while publication status is needs-permission',
      referencedBy: [],
    }),
  ]);
  expect(report.findings.publicBodyBlockingSources.map((finding) => finding.sourceId)).not.toContain(
    'src-approved-public-with-body',
  );
  expect(JSON.stringify(report.findings.publicBodyBlockingSources)).not.toContain(
    'This body must not be public.',
  );
  expect(JSON.stringify(report.findings.publicBodyBlockingSources)).not.toContain(
    'Approved public body.',
  );
});

it('does not treat private generated source bodies as public exposure when public snapshot is redacted', () => {
  const report = buildSourceGovernanceReport({
    sources: [
      {
        id: 'src-private-body-needs-permission',
        title: 'Private Body Needs Permission',
        status: 'verified',
        reviewRisk: 'high',
        warnings: [],
        pilotReviewStatus: 'approved-for-pilot',
        publicationStatus: 'needs-permission',
        body: 'This private generated body is intentionally preserved.',
      },
    ],
    publicSources: [
      {
        id: 'src-private-body-needs-permission',
        title: 'Private Body Needs Permission',
        status: 'verified',
        reviewRisk: 'high',
        warnings: [],
        pilotReviewStatus: 'approved-for-pilot',
        publicationStatus: 'needs-permission',
        body: '',
      },
    ],
    cards: [],
    checklists: [],
    trainingPaths: [],
  });

  expect(report.summary.publicBodyBlockingSourceCount).toBe(0);
  expect(report.findings.publicBodyBlockingSources).toEqual([]);
  expect(JSON.stringify(report)).not.toContain('This private generated body is intentionally preserved.');
});

it('exposes source governance npm scripts', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

  expect(packageJson.scripts['report:source-governance']).toBe('tsx scripts/report-source-governance.ts');
  expect(packageJson.scripts['report:source-governance:strict']).toBe(
    'tsx scripts/report-source-governance.ts --strict',
  );
});

it('keeps strict source-governance output as complete JSON while exiting with gate failure', () => {
  const result = spawnSync('npx', ['tsx', 'scripts/report-source-governance.ts', '--strict'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });

  expect(result.status).toBe(2);
  expect(result.stderr).toContain('Source governance strict gate failed:');
  const report = JSON.parse(result.stdout) as ReturnType<typeof buildSourceGovernanceReport>;
  expect(report.summary.pilotBlockingReferencedSourceCount).toBeGreaterThan(0);
  expect(JSON.stringify(report)).not.toContain('"body"');
  expect(JSON.stringify(report)).not.toContain('"owner"');
  expect(JSON.stringify(report)).not.toContain('"reviewer"');
});
