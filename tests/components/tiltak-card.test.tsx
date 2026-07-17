import { render, screen } from '@testing-library/react';
import { TiltakCard } from '@/components/tiltak-card';
import type { ActionCard } from '@/lib/content/schemas';

const card = {
  slug: 'alvorlig-ulykke-dod-eget-personell',
  title: 'Alvorlig ulykke eller død blant eget personell',
  phase: 'under',
  roles: ['leder'],
  scenarios: ['psykososial'],
  priority: 'high',
  steps: ['Sikre skadested', 'Varsle 113 og operativ leder', 'Skjerm involverte'],
  safety: ['Ikke utsett mannskap for ny risiko'],
  reporting: [],
  sourceIds: ['src-fig-alvorlig-ulykke'],
  competenceRequired: [],
  warning: 'Varsle linje og politi etter lokal instruks.',
} as ActionCard;

it('renders standardized priority, phase, source, first steps, safety and CTA for an action card', () => {
  render(<TiltakCard card={card} />);

  expect(screen.getByRole('heading', { name: /Alvorlig ulykke/i })).toBeInTheDocument();
  expect(screen.getByText('Høy')).toBeInTheDocument();
  expect(screen.getByText(/Kritisk/)).toBeInTheDocument();
  expect(screen.getByText('Under innsats')).toBeInTheDocument();
  expect(screen.getByText('Gjør først')).toBeInTheDocument();
  expect(screen.getByText('Sikre skadested')).toBeInTheDocument();
  expect(screen.getByText('Kildebelagt')).toBeInTheDocument();
  expect(screen.getByText('Sikkerhet')).toBeInTheDocument();
  expect(screen.getByText('Ikke utsett mannskap for ny risiko').closest('li')).not.toHaveTextContent(/^•/);
  expect(screen.getByRole('link', { name: /Åpne tiltakskort/i })).toHaveAttribute('href', '/kort/alvorlig-ulykke-dod-eget-personell');
});

it.each([
  ['reviewed', 'Faglig godkjent'],
  ['pending-fagperson', 'Til gjennomgang'],
  ['unreviewed', 'Ikke faglig vurdert'],
] as const)('renders the professional review state %s', (reviewStatus, label) => {
  render(<TiltakCard card={{ ...card, reviewStatus }} compact />);

  expect(screen.getByText(label)).toBeInTheDocument();
});

it('renders only the first two steps and hides safety in compact mode', () => {
  render(<TiltakCard card={card} compact />);

  expect(screen.getByText('Sikre skadested')).toBeInTheDocument();
  expect(screen.getByText('Varsle 113 og operativ leder')).toBeInTheDocument();
  expect(screen.queryByText('Skjerm involverte')).not.toBeInTheDocument();
  expect(screen.queryByText('Sikkerhet')).not.toBeInTheDocument();
});

it('renders honest fallbacks for missing sources and first steps without scenarios', () => {
  const incompleteCard = {
    ...card,
    slug: 'mangelfullt-tiltakskort',
    title: 'Mangelfullt tiltakskort',
    scenarios: [],
    steps: [],
    safety: [],
    sourceIds: [],
  } as ActionCard;

  render(<TiltakCard card={incompleteCard} />);

  expect(screen.getByRole('heading', { name: 'Mangelfullt tiltakskort' })).toBeInTheDocument();
  expect(screen.getByText('Kilde mangler')).toBeInTheDocument();
  expect(screen.queryByText('Kildebelagt')).not.toBeInTheDocument();
  expect(screen.getByText('Ingen første steg registrert.')).toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(screen.queryByText('Sikkerhet')).not.toBeInTheDocument();
});
