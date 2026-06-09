import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchDocuments } from '@/lib/content/search-documents';
import { buildSearchIndex } from '@/lib/content/search';
import type { ActionCard, FAQEntry, GlossaryTerm, ProtectionMeasure, SearchSynonymGroup, SourceDocument, TrainingPath } from '@/lib/content/schemas';

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function buildGeneratedSearchIndex(generatedDir = 'content/generated', publicGeneratedDir = 'public/generated-content') {
  const [actionCards, sources, glossary, trainingPaths, protectionMeasures, faq, searchSynonyms] = await Promise.all([
    readJson<ActionCard[]>(path.join(generatedDir, 'action-cards.json')),
    readJson<SourceDocument[]>(path.join(generatedDir, 'source-documents.json')),
    readJson<GlossaryTerm[]>(path.join(generatedDir, 'glossary.json')),
    readJson<TrainingPath[]>(path.join(generatedDir, 'training-paths.json')),
    readJson<ProtectionMeasure[]>(path.join(generatedDir, 'protection-measures.json')),
    readJson<FAQEntry[]>(path.join(generatedDir, 'faq.json')),
    readJson<SearchSynonymGroup[]>(path.join(generatedDir, 'search-synonyms.json')),
  ]);
  const docs = buildSearchDocuments({
    cards: actionCards,
    sources,
    glossary,
    training: trainingPaths,
    protection: protectionMeasures,
    faq,
  });
  bakeSearchSynonyms(docs, searchSynonyms);
  const index = buildSearchIndex(docs);
  const payload = { documents: docs, index: index.toJSON(), generatedAt: new Date().toISOString() };
  await writeJson(path.join(generatedDir, 'search-index.json'), payload);
  await writeJson(path.join(publicGeneratedDir, 'search-index.json'), payload);
  return payload;
}

function bakeSearchSynonyms(docs: Array<{ id: string; synonyms?: string }>, synonyms: SearchSynonymGroup[]) {
  const cardSynonymMap = new Map<string, string[]>();
  for (const group of synonyms) {
    const tokens = [group.canonical, ...group.aliases];
    for (const cardId of group.cardIds) {
      const existing = cardSynonymMap.get(cardId) ?? [];
      cardSynonymMap.set(cardId, [...existing, ...tokens]);
    }
  }
  for (const doc of docs) {
    const extraTokens = cardSynonymMap.get(doc.id);
    if (extraTokens && extraTokens.length > 0) {
      doc.synonyms = [doc.synonyms ?? '', ...extraTokens].join(' ').trim();
    }
  }
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
