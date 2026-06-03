import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

it('shows the Beredskapsboka landing page', () => {
  render(<Home />);
  expect(screen.getByRole('heading', { name: /Beredskapsboka/i })).toBeInTheDocument();
  expect(screen.getByText(/mobil/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Åpne hurtigkort/i })).toHaveAttribute('href', '/hurtigkort');
  expect(screen.getByRole('link', { name: /Start lokalt oppdrag/i })).toHaveAttribute('href', '/oppdrag/ny');
});
