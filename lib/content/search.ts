import MiniSearch from 'minisearch';
import type { ActionCard, SourceDocument } from './schemas';

export interface SearchDocument {
  id: string;
  title: string;
  body: string;
  scenario?: string;
  role?: string;
  phase?: string;
  synonyms?: string;
  type?: string;
  href?: string;
  sourceStatus?: SourceDocument['status'];
  sourceIds?: string[];
  priority?: ActionCard['priority'];
  reviewStatus?: ActionCard['reviewStatus'];
}

export type SearchHit = SearchDocument & { score?: number; terms?: string[] };
export interface SearchContext {
  role?: string;
  phase?: string;
  scenario?: string;
}

export interface SearchSynonymGroup {
  canonical: string;
  aliases: string[];
}

const BUILT_IN_SYNONYM_GROUPS: string[][] = [
  ['jod', 'kaliumjodid', 'jodtablett', 'jodtabletter', 'jod-tablett', 'jod tablet', 'jodttablett', 'atomulykke', 'atomberedskap', 'radioaktivt nedfall', 'nukleær hendelse', 'nukleaer hendelse'],
  ['rens', 'sanering', 'dekontaminering', 'dekontaminasjion', 'grovrens', 'finrens', 'ren side', 'uren side', 'mre', 'cbrn', 'cbrne', 'renseenhet'],
  ['mfe', 'mobil forsterkningsenhet', 'mobile forsterkningsenheter', 'forsterkningsenhet', 'forsterkningseenhet', 'forsterkning', 'nasjonal støtte', 'nasjonal stotte', 'støtteanmodning', 'stotteanmodning'],
  ['samband', 'radio', 'nødnett', 'nodnett', 'kallesignal', 'sambandstest', 'sambanstest', 'samban', 'kommunikasjonsplan', 'sambandsplan'],
  ['samleplass', 'oppmøtested', 'oppmotested', 'frammøtested', 'frammotested', 'fremmøtested', 'fremmotested', 'samleplas', 'depot', 'staging', 'mottakspunkt', 'samlepunkt'],
  ['dose', 'dosimeter', 'doserate', 'dosekontroll', 'radiac', 'stråling', 'straling', 'oppholdstid'],
  ['ordre', '5-punktsordre', '5 punktsordre', 'fempunktsordre', 'oppdrag', 'ordrepunkt', 'situasjon', 'utførelse', 'utforelse', 'ledelse'],
  ['ko', 'il-ko', 'ilko', 'kommandoplass', 'innsatsleders ko', 'innsatsleders il-ko'],
  ['innsatsleder', 'il', 'innsatsledelse', 'politi', 'brann', 'helse', 'stab', 'inssatsleder', 'innsatslederr'],
  ['beredskapsvakt', 'vakt', 'vakthavende', 'varselmottak'],
  ['pumpe', 'lensepumpe', 'flom', 'vannforsyning', 'slangeutlegg', 'vannskade'],
  ['skadde', 'skadet', 'førstehjelp', 'forstehjelp', '113', 'livreddende førstehjelp', 'livreddende forstehjelp', 'pasient'],
  ['psykososial', 'defuse', 'defusing', 'debrief', 'efok', 'kollegastøtte', 'kollegastotte', 'psykisk førstehjelp', 'psykisk forstehjelp', 'psykososiall'],
  ['mbk', 'materiellberedskap', 'materiellkontroll', 'etterkontroll', 'klargjøring', 'klargjoring', 'karantene', 'service', 'vask'],
];

function buildSynonymGroups(external?: SearchSynonymGroup[]): string[][] {
  const built = [...BUILT_IN_SYNONYM_GROUPS];
  if (external) {
    for (const group of external) {
      built.push([group.canonical, ...group.aliases]);
    }
  }
  return built;
}

function getCriticalCanonicalTerms(external?: SearchSynonymGroup[]): string[] {
  const groups = buildSynonymGroups(external);
  return groups.map((group) => group[0]);
}

function stripAccentsExceptNorwegian(value: string) {
  return value
    .replace(/[ÀÁÂÃÄĀĂĄ]/g, 'A')
    .replace(/[àáâãäāăą]/g, 'a')
    .replace(/[ÈÉÊËĒĖĘ]/g, 'E')
    .replace(/[èéêëēėę]/g, 'e')
    .replace(/[ÌÍÎÏĪĮ]/g, 'I')
    .replace(/[ìíîïīį]/g, 'i')
    .replace(/[ÒÓÔÕÖŌ]/g, 'O')
    .replace(/[òóôõöō]/g, 'o')
    .replace(/[ÙÚÛÜŪ]/g, 'U')
    .replace(/[ùúûüū]/g, 'u');
}

function foldNorwegian(value: string) {
  return value
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'a');
}

export function normalizeSearchText(value: string) {
  return foldNorwegian(stripAccentsExceptNorwegian(value))
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‐‑‒–—−/_.:;,()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, '');
}

function words(value: string) {
  return normalizeSearchText(value).split(' ').filter(Boolean);
}

function hasPhrase(haystack: string, phrase: string) {
  const normalizedPhrase = normalizeSearchText(phrase);
  if (!normalizedPhrase) return false;
  return new RegExp(`(^|\\s)${escapeRegExp(normalizedPhrase)}($|\\s)`, 'u').test(haystack);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function typoThreshold(length: number) {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  if (length <= 12) return 2;
  return Math.floor(length * 0.25);
}

function isNearTerm(query: string, term: string) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedQuery || !normalizedTerm) return false;
  if (normalizedQuery === normalizedTerm) return true;
  if (normalizedTerm.length >= 5 && (normalizedTerm.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedTerm))) return true;
  const queryCompact = compact(normalizedQuery);
  const termCompact = compact(normalizedTerm);
  const distance = levenshtein(queryCompact, termCompact);
  return distance <= typoThreshold(Math.max(queryCompact.length, termCompact.length));
}

function matchingGroups(query: string, external?: SearchSynonymGroup[]) {
  const normalizedQuery = normalizeSearchText(query);
  const queryCompact = compact(query);
  const queryWords = words(query);
  const aliases = new Set<string>();

  for (const group of buildSynonymGroups(external)) {
    if (group.some((term) => {
      const normalizedTerm = normalizeSearchText(term);
      const termCompact = compact(term);
      if (normalizedQuery === normalizedTerm || queryCompact === termCompact) return true;
      if (hasPhrase(normalizedQuery, normalizedTerm)) return true;
      if (queryWords.some((word) => word.length >= 5 && isNearTerm(word, normalizedTerm))) return true;
      return normalizedQuery.length >= 5 && isNearTerm(normalizedQuery, normalizedTerm);
    })) {
      for (const term of group) aliases.add(term);
    }
  }
  return aliases;
}

export function expandOperationalSearchQuery(query: string, externalSynonyms?: SearchSynonymGroup[]) {
  const terms = new Set<string>();
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery) terms.add(normalizedQuery);
  for (const word of words(query)) terms.add(word);
  for (const term of matchingGroups(query, externalSynonyms)) terms.add(normalizeSearchText(term));
  return Array.from(terms).filter(Boolean);
}

export function buildSearchIndex(docs: SearchDocument[]) {
  const index = new MiniSearch<SearchDocument>({
    idField: 'id',
    fields: ['title', 'body', 'scenario', 'role', 'phase', 'synonyms'],
    storeFields: ['id', 'title', 'body', 'scenario', 'role', 'phase', 'synonyms', 'type', 'href', 'sourceStatus', 'sourceIds', 'priority'],
    searchOptions: { boost: { title: 3, synonyms: 2 }, prefix: true, fuzzy: 0.2 },
  });
  index.addAll(docs);
  return index;
}

function scoreField(field: string | undefined, query: string, terms: string[], weights: { exact: number; term: number; token: number }) {
  const haystack = normalizeSearchText(field ?? '');
  if (!haystack) return 0;
  let score = 0;
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery && hasPhrase(haystack, normalizedQuery)) score += weights.exact;
  for (const term of terms) {
    if (term && hasPhrase(haystack, term)) score += term === normalizedQuery ? weights.exact : weights.term;
  }
  for (const token of words(query)) {
    if (token.length < 2) continue;
    if (hasPhrase(haystack, token)) {
      score += weights.token;
      continue;
    }
    if (token.length >= 4 && haystack.split(' ').some((word) => word.startsWith(token))) {
      score += weights.token;
    }
  }
  return score;
}

function scoreContext(docValue: string | undefined, contextValue: string | undefined, weight: number) {
  if (!docValue || !contextValue) return 0;
  const haystack = normalizeSearchText(docValue);
  const needle = normalizeSearchText(contextValue);
  if (!needle) return 0;
  return hasPhrase(haystack, needle) ? weight : 0;
}

function deterministicSort(a: SearchHit, b: SearchHit) {
  const scoreDelta = (b.score ?? 0) - (a.score ?? 0);
  if (scoreDelta !== 0) return scoreDelta;
  return `${a.title}|${a.id}`.localeCompare(`${b.title}|${b.id}`, 'nb');
}

export function searchDocuments(documents: SearchDocument[], query: string, context: SearchContext = {}, externalSynonyms?: SearchSynonymGroup[]): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const expandedTerms = expandOperationalSearchQuery(trimmed, externalSynonyms);
  return documents
    .map<SearchHit | null>((doc) => {
      let score = 0;
      score += scoreField(doc.title, trimmed, expandedTerms, { exact: 36, term: 16, token: 4 });
      score += scoreField(doc.synonyms, trimmed, expandedTerms, { exact: 28, term: 12, token: 3 });
      score += scoreField(doc.body, trimmed, expandedTerms, { exact: 18, term: 7, token: 2 });
      score += scoreField(doc.type, trimmed, expandedTerms, { exact: 8, term: 3, token: 1 });
      score += scoreField(doc.role, trimmed, expandedTerms, { exact: 6, term: 2, token: 1 });
      score += scoreField(doc.phase, trimmed, expandedTerms, { exact: 6, term: 2, token: 1 });
      score += scoreField(doc.scenario, trimmed, expandedTerms, { exact: 6, term: 2, token: 1 });
      if (score <= 0) return null;
      score += scoreContext(doc.role, context.role, 9);
      score += scoreContext(doc.phase, context.phase, 7);
      score += scoreContext(doc.scenario, context.scenario, 7);
      return { ...doc, score, terms: expandedTerms };
    })
    .filter((hit): hit is SearchHit => hit !== null)
    .sort(deterministicSort);
}

export function searchContent(index: MiniSearch<SearchDocument>, query: string): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return index.search(trimmed).map((hit) => hit as unknown as SearchHit);
}

export function suggestSearchQueries(query: string, limit = 5, externalSynonyms?: SearchSynonymGroup[]) {
  const normalizedQuery = normalizeSearchText(query);
  const criticalTerms = getCriticalCanonicalTerms(externalSynonyms);
  if (!normalizedQuery) return criticalTerms.slice(0, limit);
  const expanded = expandOperationalSearchQuery(query, externalSynonyms);
  const scored = new Map<string, number>();
  for (const group of buildSynonymGroups(externalSynonyms)) {
    const canonical = group[0];
    for (const term of group) {
      const normalizedTerm = normalizeSearchText(term);
      const exactExpansion = expanded.includes(normalizedTerm) || expanded.includes(normalizeSearchText(canonical));
      const distance = levenshtein(compact(normalizedQuery), compact(normalizedTerm));
      const nearEnough = normalizedQuery.length >= 5 && normalizedTerm.length >= 5
        && distance <= Math.max(2, Math.floor(Math.max(compact(normalizedQuery).length, compact(normalizedTerm).length) * 0.4));
      const queryContainsLongTerm = normalizedTerm.length >= 4 && normalizedQuery.includes(normalizedTerm);
      const queryStartsWithShortTerm = normalizedTerm.length >= 3 && normalizedQuery.startsWith(normalizedTerm);
      const longTermContainsQuery = normalizedQuery.length >= 4 && normalizedTerm.includes(normalizedQuery);
      if (exactExpansion || nearEnough || queryContainsLongTerm || queryStartsWithShortTerm || longTermContainsQuery) {
        const current = scored.get(canonical) ?? Number.POSITIVE_INFINITY;
        scored.set(canonical, Math.min(current, exactExpansion ? 0 : distance));
      }
    }
  }
  return Array.from(scored.entries())
    .sort(([aTerm, aScore], [bTerm, bScore]) => aScore - bScore || aTerm.localeCompare(bTerm, 'nb'))
    .map(([term]) => term)
    .slice(0, limit);
}

export function isSearchIndexStale(generatedAt: string | Date | undefined, now = new Date(), maxAgeDays = 30) {
  if (!generatedAt) return true;
  const generatedDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  if (Number.isNaN(generatedDate.valueOf())) return true;
  const ageMs = now.valueOf() - generatedDate.valueOf();
  return ageMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

export function searchIndexFreshnessLabel(generatedAt: string | Date | undefined, now = new Date(), maxAgeDays = 30) {
  if (!generatedAt) return 'Lokalt søkeindeks mangler genereringstidspunkt og kan være utdatert.';
  const generatedDate = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  if (Number.isNaN(generatedDate.valueOf())) return 'Lokalt søkeindeks har ugyldig genereringstidspunkt og kan være utdatert.';
  const dateLabel = generatedDate.toISOString().slice(0, 10);
  if (isSearchIndexStale(generatedDate, now, maxAgeDays)) {
    return `Lokalt søkeindeks generert ${dateLabel}; kan være utdatert offline.`;
  }
  return `Lokalt søkeindeks generert ${dateLabel}; klart for offline søk.`;
}
