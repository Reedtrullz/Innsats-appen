import { render, screen } from '@testing-library/react';
import { SourceDocumentView } from '@/components/source-badge';
import type { SourceDocument } from '@/lib/content/schemas';

it('shows source document metadata before body', () => {
  const source = { id: 'src-5-punktsordre', title: 'SRC - 5-punktsordre', sourcePath: 'source-extracts/SRC - 5-punktsordre.md', sourceType: 'source-extract', status: 'unverified', warnings: ['Kontroller mot planverk'], body: 'Situasjon og oppdrag' } as SourceDocument;
  render(<SourceDocumentView source={source} />);
  expect(screen.getByRole('heading', { name: /SRC - 5-punktsordre/i })).toBeInTheDocument();
  expect(screen.getByText(/unverified/i)).toBeInTheDocument();
  expect(screen.getByText(/Kontroller mot planverk/i)).toBeInTheDocument();
  expect(screen.getByText(/Kildereferanse:\s*source-extracts\/SRC - 5-punktsordre\.md/)).toBeInTheDocument();
});
