import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getContentChangelog, getContentManifest } from '../lib/content/load-content';
import { buildReleaseNotes, releaseNotesToMarkdown } from '../lib/release/release-notes';

const notes = buildReleaseNotes({ manifest: getContentManifest(), changelog: getContentChangelog() });
const markdown = releaseNotesToMarkdown(notes);
const outputPath = process.argv[2] ?? path.join('docs', 'release', `${notes.releaseId}.md`);

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, markdown);
console.log(`Wrote ${outputPath}`);
