import fs from 'node:fs';
import path from 'node:path';
import { buildSourceGovernanceReport, sourceGovernanceStrictFailureMessage } from '@/lib/content/source-governance';

const rootDir = process.cwd();
const generatedDir = path.join(rootDir, 'content', 'generated');
const publicGeneratedDir = path.join(rootDir, 'public', 'generated-content');
const strict = process.argv.includes('--strict');

function readJson<T>(dirName: string, fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(dirName, fileName), 'utf8')) as T;
}

function readGeneratedJson<T>(fileName: string): T {
  return readJson<T>(generatedDir, fileName);
}

function readPublicGeneratedJsonIfExists<T>(fileName: string): T | undefined {
  const filePath = path.join(publicGeneratedDir, fileName);
  if (!fs.existsSync(filePath)) return undefined;
  return readJson<T>(publicGeneratedDir, fileName);
}

const report = buildSourceGovernanceReport({
  sources: readGeneratedJson('source-documents.json'),
  publicSources: readPublicGeneratedJsonIfExists('source-documents.json') ?? [],
  cards: readGeneratedJson('action-cards.json'),
  checklists: readGeneratedJson('checklists.json'),
  trainingPaths: readGeneratedJson('training-paths.json'),
  protectionMeasures: readGeneratedJson('protection-measures.json'),
  glossary: readGeneratedJson('glossary.json'),
});

console.log(JSON.stringify(report, null, 2));

const strictFailure = sourceGovernanceStrictFailureMessage(report);
if (strict && strictFailure) {
  console.error(strictFailure);
  process.exitCode = 2;
}
