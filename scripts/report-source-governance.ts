import fs from 'node:fs';
import path from 'node:path';
import { buildSourceGovernanceReport } from '@/lib/content/source-governance';

const rootDir = process.cwd();
const generatedDir = path.join(rootDir, 'content', 'generated');
const strict = process.argv.includes('--strict');

function readJson<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(generatedDir, fileName), 'utf8')) as T;
}

const report = buildSourceGovernanceReport({
  sources: readJson('source-documents.json'),
  cards: readJson('action-cards.json'),
  checklists: readJson('checklists.json'),
  trainingPaths: readJson('training-paths.json'),
});

console.log(JSON.stringify(report, null, 2));

if (strict && report.findings.pilotBlockingReferencedSources.length > 0) {
  console.error(
    `Source governance strict gate failed: ${report.findings.pilotBlockingReferencedSources.length} referenced sources are not verified, pilot-approved, and public-approved.`,
  );
  process.exitCode = 2;
}
