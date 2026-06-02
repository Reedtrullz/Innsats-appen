import { render, screen } from '@testing-library/react';
import { ActionCardDetail } from '@/components/action-card-detail';
import type { ActionCard, SourceDocument } from '@/lib/content/schemas';

it('shows source-backed tilfluktsrom warnings', () => {
  const card = { slug: 'tilfluktsrom-klargjoring', title: 'Klargjør offentlig tilfluktsrom', phase: 'for', roles: ['leder'], scenarios: ['tilfluktsrom'], priority: 'high', steps: ['Bruk bare godkjent informasjon'], safety: ['Ikke publiser private data'], reporting: ['Rapporter status'], sourceIds: ['src-deep-research-tilfluktsrom'], competenceRequired: [], warning: 'Researchbasert støtte, ikke offisiell ordre' } as ActionCard;
  const sources = [{ id: 'src-deep-research-tilfluktsrom', title: 'SRC - Deep research tilfluktsrom', sourcePath: '/vault/source.md', sourceType: 'source-extract', status: 'unverified', body: 'Tilfluktsrom', warnings: ['Ingen private/skjermede data'] }] as SourceDocument[];
  render(<ActionCardDetail card={card} sources={sources} />);
  expect(screen.getByRole('heading', { name: /Klargjør offentlig tilfluktsrom/i })).toBeInTheDocument();
  expect(screen.getByText(/SRC - Deep research tilfluktsrom/i)).toBeInTheDocument();
  expect(screen.getByText(/Ingen private\/skjermede data/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke offisiell ordre/i)).toBeInTheDocument();
});
