import { describe, expect, it } from 'vitest';
import type { ContentChangelogEntry, ContentManifest } from '@/lib/content/schemas';
import { buildReleaseNotes, contentVersionToReleaseId, releaseNotesToMarkdown } from '@/lib/release/release-notes';

const manifest: ContentManifest = {
  contentVersion: '2026-06-04 07:16:22.17',
  generatedAt: '2026-06-04T07:16:22.170Z',
  sourceSnapshotGeneratedAt: '2026-06-04T07:16:22.170Z',
  sourceSnapshotHash: 'sha256:test-snapshot',
  usedPregeneratedFallback: false,
  sourceCount: 2,
  actionCardCount: 3,
  checklistCount: 1,
  trainingPathCount: 0,
  protectionMeasureCount: 0,
  glossaryCount: 0,
  faqCount: 1,
  equipmentTaxonomyCount: 0,
  exportTemplateCount: 0,
  imageMetadataCount: 0,
  localOverlayCount: 0,
  changelogCount: 2,
  mustReadCount: 3,
  workplanCount: 5,
  copiedAssetCount: 0,
};

const changelog: ContentChangelogEntry[] = [
  {
    id: 'minor-update',
    date: '2026-06-03',
    title: 'Mindre oppdatering',
    summary: 'Ikke kritisk oppdatering.',
    changeType: 'updated',
    contentRefs: [{ kind: 'faq', id: 'beslutningsstotte-og-ordre' }],
    sourceIds: ['src-a'],
    mustRead: false,
  },
  {
    id: 'critical-update',
    date: '2026-06-04',
    title: 'Kritisk prosedyreendring',
    summary: 'Leses før bruk i felt.',
    changeType: 'critical',
    contentRefs: [{ kind: 'action-card', id: 'tilfluktsrom-klargjoring' }],
    sourceIds: ['src-b'],
    mustRead: true,
  },
];

describe('release notes generation', () => {
  it('maps generated content versions to stable release identifiers', () => {
    expect(contentVersionToReleaseId('2026-06-04 07:16:22.17')).toBe('content-2026-06-04-071622-17');
    expect(contentVersionToReleaseId('2026-06-04 07:16:22.936')).toBe('content-2026-06-04-071622-936');
    expect(contentVersionToReleaseId('pilot alpha')).toBe('content-pilot-alpha');
    const longA = contentVersionToReleaseId(`pilot ${'a'.repeat(120)} x`);
    const longB = contentVersionToReleaseId(`pilot ${'a'.repeat(120)} y`);
    expect(longA).not.toBe(longB);
    expect(longA.length).toBeLessThanOrEqual(80);
  });

  it('builds release notes from manifest and changelog with must-read counts', () => {
    const notes = buildReleaseNotes({ manifest, changelog });

    expect(notes.releaseId).toBe('content-2026-06-04-071622-17');
    expect(notes.contentVersion).toBe(manifest.contentVersion);
    expect(notes.mustReadCount).toBe(3);
    expect(notes.entries.map((entry) => entry.id)).toEqual(['critical-update', 'minor-update']);
    expect(notes.sourceIds).toEqual(['src-a', 'src-b']);
    expect(notes.summary).toMatch(/2 endringer/i);
    expect(notes.summary).toMatch(/3 må-leses/i);
  });

  it('renders markdown for release notes and operator handoff', () => {
    const markdown = releaseNotesToMarkdown(buildReleaseNotes({ manifest, changelog }));

    expect(markdown).toContain('# Release notes: content-2026-06-04-071622-17');
    expect(markdown).toContain('Kritisk prosedyreendring');
    expect(markdown).toContain('Må-leses: ja');
    expect(markdown).toContain('Ikke operativ ordre');
  });
});
