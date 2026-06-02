import MiniSearch from 'minisearch';

export interface SearchDocument {
  id: string;
  title: string;
  body: string;
  scenario?: string;
  role?: string;
  synonyms?: string;
  type?: string;
  href?: string;
}

export type SearchHit = SearchDocument & { score?: number; terms?: string[] };

export function buildSearchIndex(docs: SearchDocument[]) {
  const index = new MiniSearch<SearchDocument>({
    idField: 'id',
    fields: ['title', 'body', 'scenario', 'role', 'synonyms'],
    storeFields: ['id', 'title', 'body', 'scenario', 'role', 'synonyms', 'type', 'href'],
    searchOptions: { boost: { title: 3, synonyms: 2 }, prefix: true, fuzzy: 0.2 },
  });
  index.addAll(docs);
  return index;
}

export function searchContent(index: MiniSearch<SearchDocument>, query: string): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return index.search(trimmed).map((hit) => hit as unknown as SearchHit);
}
