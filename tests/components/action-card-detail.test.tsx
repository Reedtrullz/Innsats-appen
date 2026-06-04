import { render, screen } from '@testing-library/react';
import { ActionCardDetail } from '@/components/action-card-detail';
import type { ActionCard, SourceDocument } from '@/lib/content/schemas';

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
  const card = { slug: 'tilfluktsrom-klargjoring', title: 'Klargjør offentlig tilfluktsrom', phase: 'for', roles: ['leder'], scenarios: ['tilfluktsrom'], priority: 'high', steps: ['Bruk bare godkjent informasjon'], safety: ['Ikke publiser private data'], reporting: ['Rapporter status'], sourceIds: ['src-deep-research-tilfluktsrom'], competenceRequired: [], warning: 'Researchbasert støtte, ikke offisiell ordre' } as ActionCard;
  const sources = [testSource({ id: 'src-deep-research-tilfluktsrom', title: 'SRC - Deep research tilfluktsrom', status: 'unverified', body: 'Tilfluktsrom', warnings: ['Ingen private/skjermede data'] })];
  render(<ActionCardDetail card={card} sources={sources} />);
  expect(screen.getByRole('heading', { name: /Klargjør offentlig tilfluktsrom/i })).toBeInTheDocument();
  expect(screen.getByText(/SRC - Deep research tilfluktsrom/i)).toBeInTheDocument();
  expect(screen.getByText(/Ingen private\/skjermede data/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke offisiell ordre/i)).toBeInTheDocument();
});

it('shows trained-personnel-only treatment and fallback guidance for competence-gated cards', () => {
  const card = { slug: 'radiac-malepunkt', title: 'RADIAC målepunkt', phase: 'under', roles: ['rad'], scenarios: ['radiac-nedfall'], priority: 'high', steps: ['Mål bare etter ordre'], safety: ['Hold dose lav'], reporting: ['Rapporter måling'], sourceIds: ['src-radiac'], competenceRequired: ['RAD10', 'RAD30'] } as ActionCard;
  const sources = [testSource({ id: 'src-radiac', title: 'SRC - RADIAC', body: 'RADIAC' })];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getByText(/Kun for trent personell/i)).toBeInTheDocument();
  expect(screen.getByText(/RAD10/i)).toBeInTheDocument();
  expect(screen.getByText(/RAD30/i)).toBeInTheDocument();
  expect(screen.getByText(/appen gir ikke kompetanse/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke utfør/i)).toBeInTheDocument();
  expect(screen.getByText(/avvent trent ressurs|lederordre/i)).toBeInTheDocument();
});

it('shows competence rationale when no explicit competence requirement exists', () => {
  const card = { slug: 'tilfluktsrom-offentlig-beredskap', title: 'Offentlig tilfluktsrom', phase: 'under', roles: ['leder'], scenarios: ['tilfluktsrom'], priority: 'high', steps: ['Følg myndighet'], safety: [], reporting: [], sourceIds: ['src-tilfluktsrom'], competenceRequired: [], competenceRationale: 'Tilfluktsromstøtte styres av ansvarlig myndighet og lokal opplæring.' } as ActionCard;
  const sources = [testSource({ id: 'src-tilfluktsrom', title: 'SRC - Tilfluktsrom', body: 'Tilfluktsrom' })];

  render(<ActionCardDetail card={card} sources={sources} />);

  expect(screen.getByText(/Kompetansevurdering/i)).toBeInTheDocument();
  expect(screen.getByText(/Tilfluktsromstøtte styres av ansvarlig myndighet/i)).toBeInTheDocument();
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
