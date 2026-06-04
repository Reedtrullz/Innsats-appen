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

  expect(screen.getByText('Offline')).toBeInTheDocument();
  expect(screen.getByText('Lokalt')).toBeInTheDocument();
  expect(screen.getByText('Kilde')).toBeInTheDocument();
  expect(screen.getByText('Ikke kommando')).toBeInTheDocument();
});
