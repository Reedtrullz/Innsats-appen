import { render, screen } from '@testing-library/react';
import { PhasePageContent } from '@/components/action-card-list';
import type { ActionCard } from '@/lib/content/schemas';

const cards = [
  { slug: 'for-card', title: 'Før kort', phase: 'for', roles: ['mannskap'], scenarios: ['generelt'], priority: 'high', steps: ['a'], safety: [], reporting: [], sourceIds: ['src-a'], competenceRequired: [], warning: 'w' },
  { slug: 'under-card', title: 'Under kort', phase: 'under', roles: ['mannskap'], scenarios: ['generelt'], priority: 'high', steps: ['b'], safety: [], reporting: [], sourceIds: ['src-b'], competenceRequired: [], warning: 'w' },
  { slug: 'etter-card', title: 'Etter kort', phase: 'etter', roles: ['mannskap'], scenarios: ['generelt'], priority: 'high', steps: ['c'], safety: [], reporting: [], sourceIds: ['src-c'], competenceRequired: [], warning: 'w' },
] as ActionCard[];

it('shows correct cards for each phase', () => {
  render(<PhasePageContent phase="for" cards={cards} />);
  expect(screen.getByRole('heading', { name: /Før/i, level: 1 })).toBeInTheDocument();
  expect(screen.getByText('Før kort')).toBeInTheDocument();
  expect(screen.queryByText('Under kort')).not.toBeInTheDocument();
});
