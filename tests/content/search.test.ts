import {
  buildSearchIndex,
  expandOperationalSearchQuery,
  isSearchIndexStale,
  searchContent,
  searchDocuments,
  searchIndexFreshnessLabel,
  suggestSearchQueries,
  type SearchDocument,
} from '@/lib/content/search';

it('finds operational stress terms', () => {
  const index = buildSearchIndex([
    { id: 'card-tilfluktsrom', title: 'Klargjør tilfluktsrom', body: 'ventilasjon nødstrøm vann sanitær' },
    { id: 'card-radiac', title: 'Dosekontroll', body: 'dosimeter radiac jod' },
  ]);
  expect(searchContent(index, 'tilfluktsrom')[0]?.id).toBe('card-tilfluktsrom');
  expect(searchContent(index, 'jod')[0]?.id).toBe('card-radiac');
});

const criticalDocs: SearchDocument[] = [
  { id: 'jod', title: 'Jodtabletter', body: 'kaliumjodid atomberedskap nukleær hendelse radioaktivt nedfall', synonyms: 'jod jod-tablett atomulykke' },
  { id: 'rens', title: 'Rens CBRN', body: 'sanering dekontaminering grovrens finrens ren side uren side MRE', synonyms: 'rens renseenhet' },
  { id: 'mfe', title: 'MFE støtte', body: 'mobil forsterkningsenhet nasjonal støtte støtteanmodning', synonyms: 'MFE forsterkningsenhet' },
  { id: 'samband', title: 'Sambandsplan', body: 'radio nødnett kallesignal sambandstest kommunikasjonsplan sambandsplan', synonyms: 'samband' },
  { id: 'samleplass', title: 'Samleplass og depot', body: 'oppmøtested frammøtested depot staging mottakspunkt samlepunkt', synonyms: 'samleplass' },
  { id: 'dose', title: 'Dosekontroll', body: 'dosimeter doserate dosekontroll radiac stråling oppholdstid', synonyms: 'dose' },
  { id: 'ordre', title: '5-punktsordre', body: 'fempunktsordre oppdrag ordrepunkt situasjon utførelse ledelse', synonyms: 'ordre' },
  { id: 'ko', title: 'IL-KO kommandoplass', body: 'kommandoplass innsatsleders KO ko ilko il-ko', synonyms: 'KO IL-KO' },
  { id: 'il', title: 'Innsatsleder', body: 'IL innsatsledelse politi brann helse stab', synonyms: 'innsatsleder' },
  { id: 'vakt', title: 'Beredskapsvakt', body: 'vakt vakthavende varselmottak', synonyms: 'beredskapsvakt' },
  { id: 'pumpe', title: 'Pumpe og vannforsyning', body: 'lensepumpe flom vannforsyning slangeutlegg vannskade', synonyms: 'pumpe' },
  { id: 'forstehjelp', title: 'Førstehjelp skadde', body: 'skadet skadde 113 livreddende førstehjelp samleplass', synonyms: 'pasient' },
  { id: 'psykososial', title: 'Psykososial oppfølging EFOK', body: 'defuse defusing debrief EFOK kollegastøtte psykisk førstehjelp', synonyms: 'psykososial' },
  { id: 'mbk', title: 'MBK materiellberedskap', body: 'materiellkontroll etterkontroll klargjøring karantene service vask', synonyms: 'MBK' },
  { id: 'tilflukt', title: 'Tilfluktsrom klargjøring', body: 'offentlig tilfluktsrom ventilasjon vann sanitær', synonyms: 'sivile beskyttelsestiltak' },
];

it.each([
  ['jod-tablett', 'jod'],
  ['radioaktivt nedfall', 'jod'],
  ['dekontaminering', 'rens'],
  ['ren side', 'rens'],
  ['mobil forsterkningsenhet', 'mfe'],
  ['støtteanmodning', 'mfe'],
  ['nødnett', 'samband'],
  ['kommunikasjonsplan', 'samband'],
  ['frammøtested', 'samleplass'],
  ['staging', 'samleplass'],
  ['doserate', 'dose'],
  ['oppholdstid', 'dose'],
  ['fempunktsordre', 'ordre'],
  ['ordrepunkt', 'ordre'],
  ['ilko', 'ko'],
  ['kommandoplass', 'ko'],
  ['IL', 'il'],
  ['innsatsledelse', 'il'],
  ['vakthavende', 'vakt'],
  ['varselmottak', 'vakt'],
  ['lensepumpe', 'pumpe'],
  ['vannskade', 'pumpe'],
  ['livreddende førstehjelp', 'forstehjelp'],
  ['førstehjelp', 'forstehjelp'],
  ['pasient', 'forstehjelp'],
  ['defusing', 'psykososial'],
  ['kollegastøtte', 'psykososial'],
  ['materiellberedskap', 'mbk'],
  ['etterkontroll', 'mbk'],
])('maps operational alias %s to %s', (query, expectedId) => {
  expect(searchDocuments(criticalDocs, query)[0]?.id).toBe(expectedId);
});

it('expands canonical Norwegian operational terms and typos', () => {
  expect(expandOperationalSearchQuery('jodtablet')).toContain('jod');
  expect(expandOperationalSearchQuery('sambanstest')).toContain('samband');
  expect(searchDocuments(criticalDocs, 'inssatsleder')[0]?.id).toBe('il');
  expect(searchDocuments(criticalDocs, 'psykososiall')[0]?.id).toBe('psykososial');
  expect(searchDocuments(criticalDocs, 'samleplas')[0]?.id).toBe('samleplass');
});

it('preserves partial-prefix search for ordinary content terms', () => {
  expect(searchDocuments(criticalDocs, 'tilflukt')[0]?.id).toBe('tilflukt');
});

it('boosts role, phase and scenario matches without hiding query relevance', () => {
  const docs: SearchDocument[] = [
    { id: 'generic', title: 'Samband generelt', body: 'samband radio', role: 'mannskap', phase: 'for', scenario: 'tilfluktsrom' },
    { id: 'context', title: 'Samband for lagfører under flom', body: 'samband radio', role: 'lagfører', phase: 'under', scenario: 'flom' },
    { id: 'other', title: 'Samband for beredskapsvakt', body: 'samband radio', role: 'beredskapsvakt', phase: 'etter', scenario: 'brann' },
  ];

  expect(searchDocuments(docs, 'radio', { role: 'lagfører', phase: 'under', scenario: 'flom' })[0]?.id).toBe('context');
});

it('suggests no-result aliases and reports offline index freshness', () => {
  expect(suggestSearchQueries('joddtablett', 3)).toContain('jod');
  expect(suggestSearchQueries('tilflukt', 3)).not.toContain('innsatsleder');
  expect(suggestSearchQueries('xx', 10)).toEqual([]);
  expect(suggestSearchQueries('til', 10)).toEqual([]);
  expect(suggestSearchQueries('ko', 10)).not.toContain('jod');
  expect(suggestSearchQueries('xxko', 10)).toEqual([]);
  expect(suggestSearchQueries('tiko', 10)).toEqual([]);
  expect(suggestSearchQueries('ilxx', 10)).toEqual([]);
  expect(suggestSearchQueries('dekontaminasjion', 5)).toContain('rens');
  expect(suggestSearchQueries('dekontaminasjion', 5)).not.toContain('ko');
  expect(isSearchIndexStale('2026-01-01T00:00:00.000Z', new Date('2026-02-15T00:00:00.000Z'), 30)).toBe(true);
  expect(isSearchIndexStale('2026-02-01T00:00:00.000Z', new Date('2026-02-15T00:00:00.000Z'), 30)).toBe(false);
  expect(searchIndexFreshnessLabel('2026-01-01T00:00:00.000Z', new Date('2026-02-15T00:00:00.000Z'), 30)).toMatch(/kan være utdatert/i);
});
