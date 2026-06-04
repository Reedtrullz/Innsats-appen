import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchIndex, type SearchDocument } from '@/lib/content/search';
import type { ActionCard, FAQEntry, GlossaryTerm, ProtectionMeasure, SourceDocument, TrainingPath } from '@/lib/content/schemas';

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function buildGeneratedSearchIndex(generatedDir = 'content/generated', publicGeneratedDir = 'public/generated-content') {
  const [actionCards, sources, glossary, trainingPaths, protectionMeasures, faq] = await Promise.all([
    readJson<ActionCard[]>(path.join(generatedDir, 'action-cards.json')),
    readJson<SourceDocument[]>(path.join(generatedDir, 'source-documents.json')),
    readJson<GlossaryTerm[]>(path.join(generatedDir, 'glossary.json')),
    readJson<TrainingPath[]>(path.join(generatedDir, 'training-paths.json')),
    readJson<ProtectionMeasure[]>(path.join(generatedDir, 'protection-measures.json')),
    readJson<FAQEntry[]>(path.join(generatedDir, 'faq.json')),
  ]);
  const docs: SearchDocument[] = [
    ...actionCards.map((card) => ({
      id: `kort:${card.slug}`,
      title: card.title,
      body: [...(card.steps ?? []), ...(card.safety ?? []), ...(card.reporting ?? []), card.warning ?? '', ...(card.competenceRequired ?? []), ...(card.equipmentRequired ?? [])].join(' '),
      scenario: card.scenarios.join(' '),
      role: card.roles.join(' '),
      phase: card.phase,
      type: 'kort',
      href: `/kort/${card.slug}`,
    })),
    ...sources.map((source) => ({
      id: `kilde:${source.id}`,
      title: source.title,
      body: `${source.body.slice(0, 5000)} ${source.warnings.join(' ')}`,
      type: 'kilde',
      href: `/kilder/${source.id}`,
    })),
    ...glossary.map((term) => ({
      id: `ord:${term.term.toLowerCase()}`,
      title: term.term,
      body: term.definition,
      synonyms: [...(term.aliases ?? []), ...term.synonyms].join(' '),
      type: 'ord',
      href: `/hurtigkort?q=${encodeURIComponent(term.term)}`,
    })),
    ...trainingPaths.map((training) => ({
      id: `opplaering:${training.slug}`,
      title: training.title,
      body: `${training.courseCode} ${training.skills.join(' ')} ${training.prerequisites.join(' ')}`,
      role: training.targetRoles.join(' '),
      type: 'opplæring',
      href: '/laering',
    })),
    ...protectionMeasures.map((measure) => ({
      id: `tilfluktsrom:${measure.slug}`,
      title: measure.title,
      body: `${measure.readinessChecks.join(' ')} ${measure.operationalSteps.join(' ')} ${measure.dataWarnings.join(' ')}`,
      type: 'tilfluktsrom',
      href: '/moduler/tilfluktsrom',
    })),
    ...faq.filter((entry) => entry.status === 'approved').map((entry) => ({
      id: `faq:${entry.id}`,
      title: entry.question,
      body: `${entry.answer} ${entry.category} ${entry.aliases.join(' ')} ${entry.competenceCodes.join(' ')} ${entry.equipmentTerms.join(' ')}`,
      scenario: entry.scenarios.join(' '),
      role: entry.roles.join(' '),
      type: 'FAQ',
      href: `/faq#${entry.id}`,
    })),
  ];
  const index = buildSearchIndex(docs);
  const payload = { documents: docs, index: index.toJSON(), generatedAt: new Date().toISOString() };
  await writeJson(path.join(generatedDir, 'search-index.json'), payload);
  await writeJson(path.join(publicGeneratedDir, 'search-index.json'), payload);
  return payload;
}

async function main() {
  await buildGeneratedSearchIndex();
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
