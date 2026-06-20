import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvisorySuggestionCard } from '@/components/maps/advisory-suggestion-card';

const baseProps = {
  suggestion: 'Vurder relé midtveis',
  why: 'Langt utlegg gir trykktap.',
  assumptions: ['slangevei 58 enh.', 'høyde ukjent'],
  confidence: 'medium' as const,
  confidenceNote: 'Bekreft på stedet.',
  sourceBasis: 'assisted' as const,
  sourceNote: 'Kilde: utlegg fra pumpe',
};

it('renders the full advisory anatomy by default', () => {
  render(<AdvisorySuggestionCard {...baseProps} />);
  expect(screen.getByText('Vurder relé midtveis')).toBeTruthy();
  expect(screen.getByText('Hvorfor')).toBeTruthy();
  expect(screen.getByText('slangevei 58 enh.')).toBeTruthy();
  expect(screen.getByText('Kilde: utlegg fra pumpe')).toBeTruthy();
  expect(screen.getByText('Middels')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Juster manuelt/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Logg/ })).toBeTruthy();
});

it('strips to suggestion + confidence + actions in compact (feltmodus)', () => {
  render(<AdvisorySuggestionCard {...baseProps} compact />);
  // Essentials kept
  expect(screen.getByText('Vurder relé midtveis')).toBeTruthy();
  expect(screen.getByText('Middels')).toBeTruthy();
  expect(screen.getByRole('button', { name: /Juster manuelt/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Logg/ })).toBeTruthy();
  // Detail stripped
  expect(screen.queryByText('Hvorfor')).toBeNull();
  expect(screen.queryByText('slangevei 58 enh.')).toBeNull();
  expect(screen.queryByText('Kilde: utlegg fra pumpe')).toBeNull();
});

it('always exposes both override paths (override is an equal path)', async () => {
  const onAdjust = vi.fn();
  const onLog = vi.fn();
  render(<AdvisorySuggestionCard {...baseProps} compact onAdjust={onAdjust} onLog={onLog} />);
  await userEvent.click(screen.getByRole('button', { name: /Juster manuelt/ }));
  await userEvent.click(screen.getByRole('button', { name: /Logg/ }));
  expect(onAdjust).toHaveBeenCalledOnce();
  expect(onLog).toHaveBeenCalledOnce();
});
