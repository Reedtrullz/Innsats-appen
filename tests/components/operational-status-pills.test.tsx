import { render, screen } from '@testing-library/react';
import { OperationalStatusPills } from '@/components/operational-status-pills';

it('shows operational MVP status as compact trust pills', () => {
  render(<OperationalStatusPills />);

  expect(screen.getByText('Offline-klar')).toBeInTheDocument();
  expect(screen.getByText('Lagres lokalt')).toBeInTheDocument();
  expect(screen.getByText('Kildebelagt')).toBeInTheDocument();
  expect(screen.getByText('Ikke offisielt kommandosystem')).toBeInTheDocument();
});

it('supports compact labels for tight mobile chrome', () => {
  render(<OperationalStatusPills compact />);

  // "Offline-klar" stays unabbreviated so it never reads as a connectivity state next to the live indicator.
  expect(screen.getByText('Offline-klar')).toBeInTheDocument();
  expect(screen.getByText('Lokalt')).toBeInTheDocument();
  expect(screen.getByText('Kilde')).toBeInTheDocument();
  expect(screen.getByText('Ikke kommando')).toBeInTheDocument();
});

it('supports limiting compact pills for constrained shell chrome', () => {
  render(<OperationalStatusPills compact limit={2} />);

  expect(screen.getByText('Offline-klar')).toBeInTheDocument();
  expect(screen.getByText('Lokalt')).toBeInTheDocument();
  expect(screen.queryByText('Kilde')).not.toBeInTheDocument();
  expect(screen.queryByText('Ikke kommando')).not.toBeInTheDocument();
});
