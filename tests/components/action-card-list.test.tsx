import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionCardList } from '@/components/action-card-list';
import type { ActionCard } from '@/lib/content/schemas';

const cards = [
  { slug: 'tilfluktsrom-klargjoring', title: 'Klargjør tilfluktsrom', phase: 'for', roles: ['leder'], scenarios: ['tilfluktsrom'], priority: 'high', steps: ['ventilasjon'], safety: [], reporting: [], sourceIds: ['src-deep-research-tilfluktsrom'], competenceRequired: [], warning: 'bruk bare godkjent informasjon' },
  { slug: 'radiac-dosekontroll', title: 'RADIAC dosekontroll', phase: 'under', roles: ['rad'], scenarios: ['radiac-nedfall'], priority: 'medium', steps: ['dosimeter'], safety: [], reporting: [], sourceIds: ['src-rad'], competenceRequired: ['RAD10'], warning: 'kontroller ordre' },
] as ActionCard[];

it('filters cards by tilfluktsrom scenario', async () => {
  render(<ActionCardList cards={cards} />);
  expect(screen.getByText('Klargjør tilfluktsrom')).toBeInTheDocument();
  expect(screen.getByText('RADIAC dosekontroll')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Tilfluktsrom/i }));
  expect(screen.getByText('Klargjør tilfluktsrom')).toBeInTheDocument();
  expect(screen.queryByText('RADIAC dosekontroll')).not.toBeInTheDocument();
});
