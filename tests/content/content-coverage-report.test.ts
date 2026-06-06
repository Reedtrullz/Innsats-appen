import { buildContentCoverageReport } from '@/lib/content/coverage-report';

describe('content coverage source-governance release board gaps', () => {
  it('flags referenced sources that are not verified, pilot-approved, and public-approved', () => {
    const report = buildContentCoverageReport({
      sources: [
        {
          id: 'src-unapproved',
          title: 'Unapproved referenced source',
          status: 'unverified',
          pilotReviewStatus: 'not-reviewed',
          publicationStatus: 'needs-permission',
        },
      ],
      actionCards: [
        {
          slug: 'uses-unapproved-source',
          title: 'Uses unapproved source',
          sourceIds: ['src-unapproved'],
          warning: 'Use with source governance review.',
          competenceRequired: ['source-review'],
        },
      ],
      checklists: [],
      trainingPaths: [],
      protectionMeasures: [],
      glossary: [],
    } as any, '2026-06-06T00:00:00.000Z');

    const gap = report.releaseBoard.gaps.find((candidate) => candidate.id === 'source-governance-pilot-blockers');
    expect(gap).toMatchObject({ count: 1, severity: 'high' });
  });

  it('flags only public generated source bodies that are not approved for public publication', () => {
    const report = buildContentCoverageReport({
      sources: [],
      actionCards: [],
      checklists: [],
      trainingPaths: [],
      protectionMeasures: [],
      glossary: [],
      publicGraph: {
        sources: [
          {
            id: 'src-public-needs-permission',
            title: 'Public body that still needs permission',
            publicationStatus: 'needs-permission',
            body: 'This body is visible publicly but not approved.',
          },
          {
            id: 'src-public-approved',
            title: 'Approved public body',
            publicationStatus: 'approved-public',
            body: 'Approved body is allowed to be public.',
          },
        ],
      },
    } as any, '2026-06-06T00:00:00.000Z');

    const gap = report.releaseBoard.gaps.find((candidate) => candidate.id === 'source-governance-publication-blockers');
    expect(gap).toMatchObject({ count: 1, severity: 'high' });
  });

  it('does not use private source bodies for publication blockers when public sources are redacted', () => {
    const report = buildContentCoverageReport({
      sources: [
        {
          id: 'src-private-redacted-publicly',
          title: 'Private source body must not be used for publication blocker when public graph exists',
          status: 'verified',
          pilotReviewStatus: 'approved-for-pilot',
          publicationStatus: 'needs-permission',
          body: 'Private source body retained in the private generated snapshot.',
        },
      ],
      actionCards: [],
      checklists: [],
      trainingPaths: [],
      protectionMeasures: [],
      glossary: [],
      publicGraph: {
        sources: [
          {
            id: 'src-private-redacted-publicly',
            title: 'Private body is redacted in public output',
            publicationStatus: 'needs-permission',
            body: '',
          },
        ],
      },
    } as any, '2026-06-06T00:00:00.000Z');

    expect(report.releaseBoard.gaps.some((candidate) => candidate.id === 'source-governance-publication-blockers')).toBe(false);
  });
});
