import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ActionCardDetail } from '@/components/action-card-detail';
import type { ActionCard, ImageMetadata, SourceDocument } from '@/lib/content/schemas';

const testSource = (overrides: Partial<SourceDocument>): SourceDocument => ({
  id: 'src-test',
  title: 'SRC - Test',
  sourcePath: 'source-extracts/SRC - Test.md',
  sourceType: 'source-extract',
  status: 'verified',
  verifiedAt: '2026-06-03',
  owner: 'content-team',
  reviewer: 'fagansvarlig',
  reviewRisk: 'low',
  body: 'Test',
  warnings: [],
  ...overrides,
});

it('shows source-backed tilfluktsrom warnings', () => {
  const card = { slug: 'tilfluktsrom-klargjoring', title: 'Klargjør offentlig tilfluktsrom', phase: 'for', roles: ['leder'], scenarios: ['tilfluktsrom'], priority: 'high', steps: ['Bruk bare godkjent informasjon'], safety: ['Ikke publiser private data'], reporting: ['Rapporter status'], sourceIds: ['src-operativt-konsept-for-sivilforsvaret'], competenceRequired: [], warning: 'Ikke offisiell ordre eller fullstendig oversikt; ikke publiser private eller skjermede data' } as ActionCard;
  const sources = [testSource({ id: 'src-operativt-konsept-for-sivilforsvaret', title: 'SRC - Operativt konsept for Sivilforsvaret', status: 'verified', pilotReviewStatus: 'approved-for-pilot', publicationStatus: 'approved-public', body: 'Tilfluktsrom', warnings: ['Ingen private/skjermede data'] })];
  render(<ActionCardDetail card={card} sources={sources} />);
  expect(screen.getByRole('heading', { name: /Klargjør offentlig tilfluktsrom/i })).toBeInTheDocument();
  expect(screen.getByText(/SRC - Operativt konsept for Sivilforsvaret/i)).toBeInTheDocument();
  expect(screen.getByText(/Ingen private\/skjermede data/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke offisiell ordre/i)).toBeInTheDocument();
});

it.each([
  ['reviewed', 'Faglig godkjent'],
  ['pending-fagperson', 'Til gjennomgang'],
  ['unreviewed', 'Ikke faglig vurdert'],
] as const)('shows professional review state %s separately from source governance', (reviewStatus, label) => {
  const card = {
    slug: 'review-state-card',
    title: 'Review state card',
    phase: 'under',
    roles: ['lagforer'],
    scenarios: ['generelt'],
    priority: 'medium',
    steps: ['Gjør noe'],
    safety: [],
    reporting: [],
    sourceIds: ['src-test'],
    competenceRequired: [],
    reviewStatus,
  } as ActionCard;

  render(<ActionCardDetail card={card} sources={[testSource({})]} />);

  expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.getByText(/Verifisert kildegrunnlag/i)).toBeInTheDocument();
});

it('keeps card-level safety warning visible when the linked source is pilot-approved but high risk', () => {
  const card = { slug: 'tilfluktsrom-klargjoring', title: 'Klargjør offentlig tilfluktsrom', phase: 'for', roles: ['leder'], scenarios: ['tilfluktsrom'], priority: 'high', steps: ['Bruk bare godkjent informasjon'], safety: ['Ikke publiser private data'], reporting: ['Rapporter status'], sourceIds: ['src-operativt-konsept-for-sivilforsvaret'], competenceRequired: [], warning: 'Ikke offisiell ordre eller fullstendig oversikt; ikke publiser private eller skjermede data' } as ActionCard;
  const sources = [testSource({ id: 'src-operativt-konsept-for-sivilforsvaret', title: 'SRC - Operativt konsept for Sivilforsvaret', status: 'verified', pilotReviewStatus: 'approved-for-pilot', publicationStatus: 'approved-public', reviewRisk: 'high', verifiedAt: '2026-06-06', body: 'Tilfluktsrom' })];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getByText(/Ikke offisiell ordre eller fullstendig oversikt/i)).toBeInTheDocument();
  expect(screen.getByText(/private eller skjermede data/i)).toBeInTheDocument();
  expect(screen.queryByText(/Ikke kildegodkjent for pilot/i)).not.toBeInTheDocument();
  const sourceLink = screen.getByRole('link', { name: /SRC - Operativt konsept for Sivilforsvaret/i });
  expect(sourceLink).toHaveTextContent(/·\s*verified/i);
  expect(sourceLink).toHaveTextContent(/Høy kilde-risiko/i);
  expect(sourceLink).not.toHaveTextContent(/unverified/i);
});

it('shows trained-personnel-only treatment and fallback guidance for competence-gated cards', () => {
  const card = { slug: 'radiac-malepunkt', title: 'RADIAC målepunkt', phase: 'under', roles: ['rad'], scenarios: ['radiac-nedfall'], priority: 'high', steps: ['Mål bare etter ordre'], safety: ['Hold dose lav'], reporting: ['Rapporter måling'], sourceIds: ['src-radiac'], competenceRequired: ['RAD10', 'RAD30'] } as ActionCard;
  const sources = [testSource({ id: 'src-radiac', title: 'SRC - RADIAC', body: 'RADIAC' })];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getByText(/Kun for trent personell/i)).toBeInTheDocument();
  // The competence codes appear both in the compact strip and the expanded guidance.
  expect(screen.getAllByText(/RAD10/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/RAD30/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/appen gir ikke kompetanse/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke utfør/i)).toBeInTheDocument();
  expect(screen.getByText(/avvent trent ressurs|lederordre/i)).toBeInTheDocument();
});

it('shows competence rationale when no explicit competence requirement exists', () => {
  const card = { slug: 'tilfluktsrom-offentlig-beredskap', title: 'Offentlig tilfluktsrom', phase: 'under', roles: ['leder'], scenarios: ['tilfluktsrom'], priority: 'high', steps: ['Følg myndighet'], safety: [], reporting: [], sourceIds: ['src-tilfluktsrom'], competenceRequired: [], competenceRationale: 'Tilfluktsromstøtte styres av ansvarlig myndighet og lokal opplæring.' } as ActionCard;
  const sources = [testSource({ id: 'src-tilfluktsrom', title: 'SRC - Tilfluktsrom', body: 'Tilfluktsrom' })];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getAllByText(/Kompetansevurdering/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Tilfluktsromstøtte styres av ansvarlig myndighet/i)).toBeInTheDocument();
});

it('renders expanded how examples and step-linked pump illustrations', () => {
  const card = {
    slug: 'skogbrann-vannforsyningsplan',
    title: 'Skogbrann vannforsyningsplan',
    phase: 'under',
    roles: ['lagforer'],
    scenarios: ['skogbrann'],
    priority: 'high',
    steps: [{
      action: 'Velg mellom enkelt utlegg og seriekjøring.',
      how: 'Bruk mellompumpe for trykkforsterkning når lang slangevei eller høydeforskjell gir for lavt trykk.',
      imageIds: ['pumpeutlegg-image-1'],
      sourceIds: ['src-pumpe'],
    }],
    safety: [],
    reporting: [],
    sourceIds: ['src-pumpe'],
    competenceRequired: [],
    reviewStatus: 'pending-fagperson',
  } as ActionCard;
  const sources = [testSource({ id: 'src-pumpe', title: 'SRC - Pumpe', body: 'Pumpe' })];
  const images = [{
    id: 'pumpeutlegg-image-1',
    publicPath: '/content-assets/docx_Eksempler-pa-utlegg-fra-pumpe__image1.png',
    alt: 'Illustrasjon av pumpeutlegg',
    caption: 'Pumpeutlegg',
    sourceIds: ['src-pumpe'],
    approvedForPublication: true,
    usedByCardSlugs: ['skogbrann-vannforsyningsplan'],
    updatedAt: '2026-06-03',
  }] as ImageMetadata[];

  render(<ActionCardDetail card={card} sources={sources} images={images} />);

  expect(screen.getByText(/Vis hvordan/i)).toBeInTheDocument();
  expect(screen.getByText(/mellompumpe for trykkforsterkning/i)).toBeInTheDocument();
  expect(screen.getByAltText(/Illustrasjon av pumpeutlegg/i)).toBeInTheDocument();
  expect(screen.getByText(/Til gjennomgang/i)).toBeInTheDocument();
});

it('summarizes source confidence before the full source list', () => {
  const card = { slug: 'flom-pumpe-start', title: 'Flom og pumpeutlegg', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-flom'], competenceRequired: [] } as ActionCard;
  const sources = [testSource({ id: 'src-flom', title: 'SRC - Flom', status: 'verified', verifiedAt: '2026-06-04', body: 'Flom' })];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getByRole('heading', { name: /Kildestatus/i })).toBeInTheDocument();
  expect(screen.getByText(/Verifisert kildegrunnlag/i)).toBeInTheDocument();
  expect(screen.getByText(/Sist verifisert: 2026-06-04/i)).toBeInTheDocument();
});

it('warns when a card has an expired source', () => {
  const card = { slug: 'flom-pumpe-start', title: 'Flom og pumpeutlegg', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-flom'], competenceRequired: [] } as ActionCard;
  const sources = [testSource({ id: 'src-flom', title: 'SRC - Flom', status: 'expired', verifiedAt: '2026-06-04', expiresAt: '2000-01-01', body: 'Flom' })];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getByText(/Kilde krever kontroll/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Utløpt kilde/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Status: expired/i)).toBeInTheDocument();
  expect(screen.queryByText(/Verifisert kildegrunnlag/i)).not.toBeInTheDocument();
});

it('warns and shows a missing source id even when another linked source is verified', () => {
  const card = { slug: 'flom-pumpe-start', title: 'Flom og pumpeutlegg', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-flom', 'missing-source'], competenceRequired: [] } as ActionCard;
  const sources = [testSource({ id: 'src-flom', title: 'SRC - Flom', status: 'verified', verifiedAt: '2026-06-04', body: 'Flom' })];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getByText(/Kilde krever kontroll/i)).toBeInTheDocument();
  expect(screen.getByText(/Mangler kilde: missing-source/i)).toBeInTheDocument();
  expect(screen.queryByText(/Verifisert kildegrunnlag/i)).not.toBeInTheDocument();
});

it('warns when linked sources mix current and draft source states', () => {
  const card = { slug: 'flom-pumpe-start', title: 'Flom og pumpeutlegg', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-current', 'src-draft'], competenceRequired: [] } as ActionCard;
  const sources = [
    testSource({ id: 'src-current', title: 'SRC - Current', status: 'verified', verifiedAt: '2026-06-04', body: 'Current' }),
    testSource({ id: 'src-draft', title: 'SRC - Draft', status: 'draft', verifiedAt: '2026-06-04', reviewAfter: '2099-01-01', body: 'Draft' }),
  ];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getByText(/Kilde krever kontroll/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Høy kilde-risiko/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Status: draft/i)).toBeInTheDocument();
  expect(screen.queryByText(/Verifisert kildegrunnlag/i)).not.toBeInTheDocument();
});

it('warns for unverified sources even when source freshness is current', async () => {
  vi.resetModules();
  vi.doMock('@/lib/content/source-review', () => ({
    sourceFreshness: () => ({
      state: 'current',
      label: 'Kilde fersk',
      detail: 'forced current',
      tone: 'emerald',
    }),
  }));

  try {
    const { ActionCardDetail: MockedActionCardDetail } = await import('@/components/action-card-detail');
    const card = { slug: 'flom-pumpe-start', title: 'Flom og pumpeutlegg', phase: 'under', roles: ['lagforer'], scenarios: ['flom'], priority: 'high', steps: ['Start pumpe'], safety: [], reporting: [], sourceIds: ['src-unverified'], competenceRequired: [] } as ActionCard;
    const sources = [testSource({ id: 'src-unverified', title: 'SRC - Unverified', status: 'unverified', verifiedAt: '2026-06-04', reviewAfter: '2099-01-01', body: 'Unverified' })];

    render(<MockedActionCardDetail card={card} sources={sources} />);

    expect(screen.getByText(/Kilde krever kontroll/i)).toBeInTheDocument();
    expect(screen.getByText(/Status: unverified/i)).toBeInTheDocument();
    expect(screen.queryByText(/Verifisert kildegrunnlag/i)).not.toBeInTheDocument();
  } finally {
    vi.doUnmock('@/lib/content/source-review');
    vi.resetModules();
  }
});
