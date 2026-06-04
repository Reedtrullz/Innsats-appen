import { buildSearchDocuments } from '@/lib/content/search-documents';
import type { ActionCard, FAQEntry, GlossaryTerm, ProtectionMeasure, SourceDocument, TrainingPath } from '@/lib/content/schemas';

it('builds routeable search documents with operational metadata', () => {
  const docs = buildSearchDocuments({
    queryBasePath: '/sok',
    cards: [{ slug: 'flom-pumpe-start', title: 'Flom og pumpeutlegg', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-flom'], competenceRequired: [], equipmentRequired: ['pumpe'] }] as ActionCard[],
    sources: [{ id: 'src-flom', title: 'SRC - Flom', sourcePath: 'source-extracts/SRC - Flom.md', sourceType: 'source-extract', status: 'verified', verifiedAt: '2026-06-04', owner: 'content-team', reviewer: 'fag', reviewRisk: 'low', body: 'Pumpe og flom', warnings: [] }] as SourceDocument[],
    glossary: [{ term: 'pumpe', definition: 'Lensepumpe', aliases: [], synonyms: [], sourceIds: ['src-flom'] }] as GlossaryTerm[],
    training: [] as TrainingPath[],
    protection: [] as ProtectionMeasure[],
    faq: [] as FAQEntry[],
  });

  expect(docs.find((doc) => doc.id === 'kort:flom-pumpe-start')).toMatchObject({
    title: 'Flom og pumpeutlegg',
    href: '/kort/flom-pumpe-start',
    type: 'kort',
    phase: 'under',
    scenario: 'flom',
    role: 'lagforer',
    sourceStatus: 'verified',
    sourceIds: ['src-flom'],
  });
  expect(docs.find((doc) => doc.id === 'ord:pumpe')).toMatchObject({
    type: 'ord',
    href: '/sok?q=pumpe',
  });
  expect(docs.find((doc) => doc.id === 'kilde:src-flom')).toMatchObject({
    type: 'kilde',
    href: '/kilder/src-flom',
    sourceStatus: 'verified',
  });
});

it('prefers problem source statuses over verified sources for cards', () => {
  const docs = buildSearchDocuments({
    cards: [{ slug: 'flom-pumpe-start', title: 'Flom og pumpeutlegg', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-verified', 'src-unverified'], competenceRequired: [], equipmentRequired: ['pumpe'] }] as ActionCard[],
    sources: [
      { id: 'src-verified', title: 'SRC - Verified', sourcePath: 'source-extracts/SRC - Verified.md', sourceType: 'source-extract', status: 'verified', verifiedAt: '2026-06-04', owner: 'content-team', reviewer: 'fag', reviewRisk: 'low', body: 'Verifisert flomkilde', warnings: [] },
      { id: 'src-unverified', title: 'SRC - Unverified', sourcePath: 'source-extracts/SRC - Unverified.md', sourceType: 'source-extract', status: 'unverified', verifiedAt: '2026-06-04', reviewAfter: '2026-07-04', owner: 'content-team', reviewer: 'fag', reviewRisk: 'medium', body: 'Uverifisert flomkilde', warnings: [] },
    ] as SourceDocument[],
    glossary: [] as GlossaryTerm[],
    training: [] as TrainingPath[],
    protection: [] as ProtectionMeasure[],
    faq: [] as FAQEntry[],
  });

  expect(docs.find((doc) => doc.id === 'kort:flom-pumpe-start')).toMatchObject({
    sourceStatus: 'unverified',
    sourceIds: ['src-verified', 'src-unverified'],
  });
});

it('prefers historical source status over verified sources when verified is listed first', () => {
  const docs = buildSearchDocuments({
    cards: [{ slug: 'flom-pumpe-start', title: 'Flom og pumpeutlegg', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-verified', 'src-historical'], competenceRequired: [], equipmentRequired: ['pumpe'] }] as ActionCard[],
    sources: [
      { id: 'src-verified', title: 'SRC - Verified', sourcePath: 'source-extracts/SRC - Verified.md', sourceType: 'source-extract', status: 'verified', verifiedAt: '2026-06-04', owner: 'content-team', reviewer: 'fag', reviewRisk: 'low', body: 'Verifisert flomkilde', warnings: [] },
      { id: 'src-historical', title: 'SRC - Historical', sourcePath: 'source-extracts/SRC - Historical.md', sourceType: 'source-extract', status: 'historical', verifiedAt: '2026-06-04', reviewAfter: '2026-07-04', owner: 'content-team', reviewer: 'fag', reviewRisk: 'medium', body: 'Historisk flomkilde', warnings: [] },
    ] as SourceDocument[],
    glossary: [] as GlossaryTerm[],
    training: [] as TrainingPath[],
    protection: [] as ProtectionMeasure[],
    faq: [] as FAQEntry[],
  });

  expect(docs.find((doc) => doc.id === 'kort:flom-pumpe-start')).toMatchObject({
    sourceStatus: 'historical',
    sourceIds: ['src-verified', 'src-historical'],
  });
});

it('does not promote stale verified, expired, or unresolved source refs as verified search metadata', () => {
  const docs = buildSearchDocuments({
    cards: [
      { slug: 'stale-source-card', title: 'Stale source card', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-stale-verified'], competenceRequired: [], equipmentRequired: [] },
      { slug: 'expired-source-card', title: 'Expired source card', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-expired'], competenceRequired: [], equipmentRequired: [] },
      { slug: 'missing-source-card', title: 'Missing source card', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-current', 'src-missing'], competenceRequired: [], equipmentRequired: [] },
    ] as ActionCard[],
    sources: [
      { id: 'src-current', title: 'SRC - Current', sourcePath: 'source-extracts/SRC - Current.md', sourceType: 'source-extract', status: 'verified', verifiedAt: '2026-06-04', reviewAfter: '2099-01-01', owner: 'content-team', reviewer: 'fag', reviewRisk: 'low', body: 'Current source', warnings: [] },
      { id: 'src-stale-verified', title: 'SRC - Stale verified', sourcePath: 'source-extracts/SRC - Stale verified.md', sourceType: 'source-extract', status: 'verified', verifiedAt: '2024-01-01', reviewAfter: '2024-02-01', owner: 'content-team', reviewer: 'fag', reviewRisk: 'low', body: 'Stale verified source', warnings: [] },
      { id: 'src-expired', title: 'SRC - Expired', sourcePath: 'source-extracts/SRC - Expired.md', sourceType: 'source-extract', status: 'verified', verifiedAt: '2024-01-01', expiresAt: '2024-02-01', owner: 'content-team', reviewer: 'fag', reviewRisk: 'low', body: 'Expired source', warnings: [] },
    ] as SourceDocument[],
    glossary: [] as GlossaryTerm[],
    training: [] as TrainingPath[],
    protection: [] as ProtectionMeasure[],
    faq: [] as FAQEntry[],
  });

  expect(docs.find((doc) => doc.id === 'kort:stale-source-card')).toMatchObject({ sourceStatus: 'unverified' });
  expect(docs.find((doc) => doc.id === 'kilde:src-stale-verified')).toMatchObject({ sourceStatus: 'unverified' });
  expect(docs.find((doc) => doc.id === 'kort:expired-source-card')).toMatchObject({ sourceStatus: 'expired' });
  expect(docs.find((doc) => doc.id === 'kilde:src-expired')).toMatchObject({ sourceStatus: 'expired' });
  expect(docs.find((doc) => doc.id === 'kort:missing-source-card')).toMatchObject({ sourceStatus: 'unverified' });
});

it('uses hurtigkort as default glossary query base path', () => {
  const docs = buildSearchDocuments({
    cards: [] as ActionCard[],
    sources: [{ id: 'src-flom', title: 'SRC - Flom', sourcePath: 'source-extracts/SRC - Flom.md', sourceType: 'source-extract', status: 'verified', verifiedAt: '2026-06-04', owner: 'content-team', reviewer: 'fag', reviewRisk: 'low', body: 'Pumpe og flom', warnings: [] }] as SourceDocument[],
    glossary: [{ term: 'pumpe ved flom', definition: 'Lensepumpe', aliases: [], synonyms: [], sourceIds: ['src-flom'] }] as GlossaryTerm[],
    training: [] as TrainingPath[],
    protection: [] as ProtectionMeasure[],
    faq: [] as FAQEntry[],
  });

  expect(docs.find((doc) => doc.id === 'ord:pumpe ved flom')).toMatchObject({
    type: 'ord',
    href: '/hurtigkort?q=pumpe%20ved%20flom',
  });
});
