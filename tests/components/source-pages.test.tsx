import { render, screen } from '@testing-library/react';
import { SourceBadge, SourceDocumentView } from '@/components/source-badge';
import type { SourceDocument } from '@/lib/content/schemas';

const source = {
  id: 'src-5-punktsordre',
  title: 'SRC - 5-punktsordre',
  sourcePath: 'source-extracts/SRC - 5-punktsordre.md',
  sourceType: 'source-extract',
  status: 'unverified',
  verifiedAt: '2026-06-03',
  reviewAfter: '2026-09-01',
  expiresAt: '2027-06-03',
  owner: 'content-team',
  reviewer: 'fagansvarlig',
  reviewRisk: 'high',
  reviewNotes: 'Kontrolleres hvert kvartal.',
  warnings: ['Kontroller mot planverk'],
  body: 'Situasjon og oppdrag',
} as SourceDocument;

it('shows source document metadata before body', () => {
  render(<SourceDocumentView source={source} />);
  expect(screen.getByRole('heading', { name: /SRC - 5-punktsordre/i })).toBeInTheDocument();
  expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  expect(screen.getByText(/Verifisert:\s*2026-06-03/i)).toBeInTheDocument();
  expect(screen.getByText(/Ny gjennomgang:\s*2026-09-01/i)).toBeInTheDocument();
  expect(screen.getByText(/Utløper:\s*2027-06-03/i)).toBeInTheDocument();
  expect(screen.getByText(/Eier:\s*content-team/i)).toBeInTheDocument();
  expect(screen.getByText(/Reviewer:\s*fagansvarlig/i)).toBeInTheDocument();
  expect(screen.getByText(/Kontrolleres hvert kvartal/i)).toBeInTheDocument();
  expect(screen.getByText(/Kontroller mot planverk/i)).toBeInTheDocument();
  expect(screen.getByText(/Kildereferanse:\s*source-extracts\/SRC - 5-punktsordre\.md/)).toBeInTheDocument();
});

it('shows source freshness badges on linked source chips', () => {
  render(<SourceBadge source={source} now={new Date('2026-10-01T00:00:00.000Z')} />);

  expect(screen.getByRole('link', { name: /SRC - 5-punktsordre/i })).toBeInTheDocument();
  expect(screen.getByText(/Gjennomgang forfalt/i)).toBeInTheDocument();
});
