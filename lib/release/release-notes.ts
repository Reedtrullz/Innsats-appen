import type { ContentChangelogEntry, ContentManifest } from '@/lib/content/schemas';

export interface ReleaseNotesEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  changeType: ContentChangelogEntry['changeType'];
  mustRead: boolean;
  contentRefs: ContentChangelogEntry['contentRefs'];
  sourceIds: string[];
}

export interface ReleaseNotes {
  releaseId: string;
  contentVersion: string;
  generatedAt: string;
  summary: string;
  counts: Pick<
    ContentManifest,
    'sourceCount' | 'actionCardCount' | 'checklistCount' | 'faqCount' | 'changelogCount' | 'mustReadCount' | 'workplanCount'
  >;
  mustReadCount: number;
  sourceIds: string[];
  entries: ReleaseNotesEntry[];
}

export function contentVersionToReleaseId(contentVersion: string) {
  const normalized = contentVersion
    .trim()
    .toLowerCase()
    .replace(/^(\d{4}-\d{2}-\d{2})[ t](\d{2}):(\d{2}):(\d{2}).*$/, '$1-$2$3$4')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `content-${normalized || 'unknown'}`;
}

function sortEntries(entries: ContentChangelogEntry[]) {
  return [...entries].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title, 'nb');
  });
}

export function buildReleaseNotes({ manifest, changelog }: { manifest: ContentManifest; changelog: ContentChangelogEntry[] }): ReleaseNotes {
  const entries = sortEntries(changelog).map((entry) => ({
    id: entry.id,
    date: entry.date,
    title: entry.title,
    summary: entry.summary,
    changeType: entry.changeType,
    mustRead: entry.mustRead,
    contentRefs: entry.contentRefs,
    sourceIds: [...entry.sourceIds].sort(),
  }));
  const sourceIds = [...new Set(changelog.flatMap((entry) => entry.sourceIds))].sort();
  const mustReadCount = entries.filter((entry) => entry.mustRead).length;

  return {
    releaseId: contentVersionToReleaseId(manifest.contentVersion),
    contentVersion: manifest.contentVersion,
    generatedAt: manifest.generatedAt,
    summary: `${entries.length} endringer, ${mustReadCount} må-leses, ${manifest.actionCardCount} tiltakskort, ${manifest.checklistCount} sjekklister.`,
    counts: {
      sourceCount: manifest.sourceCount,
      actionCardCount: manifest.actionCardCount,
      checklistCount: manifest.checklistCount,
      faqCount: manifest.faqCount,
      changelogCount: manifest.changelogCount,
      mustReadCount: manifest.mustReadCount,
      workplanCount: manifest.workplanCount,
    },
    mustReadCount,
    sourceIds,
    entries,
  };
}

export function releaseNotesToMarkdown(notes: ReleaseNotes) {
  const lines = [
    `# Release notes: ${notes.releaseId}`,
    '',
    `Innholdsversjon: ${notes.contentVersion}`,
    `Generert: ${notes.generatedAt}`,
    '',
    'Ikke operativ ordre. Dette er offentlig beslutningsstøtte og må kontrolleres mot lokal ordre, samband og offisielle kilder før bruk.',
    '',
    `Sammendrag: ${notes.summary}`,
    '',
    '## Endringer',
    '',
  ];

  for (const entry of notes.entries) {
    lines.push(`- ${entry.date} · ${entry.title}`);
    lines.push(`  - Type: ${entry.changeType}`);
    lines.push(`  - Må-leses: ${entry.mustRead ? 'ja' : 'nei'}`);
    lines.push(`  - ${entry.summary}`);
  }

  lines.push('', '## Kilde-ID-er', notes.sourceIds.length > 0 ? notes.sourceIds.join(', ') : 'Ingen kilde-ID-er registrert.');
  return `${lines.join('\n')}\n`;
}
