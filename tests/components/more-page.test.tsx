import { render, screen } from '@testing-library/react';
import MorePage from '@/app/(app)/mer/page';

it('groups secondary and admin routes under Mer', () => {
  render(<MorePage />);

  expect(screen.getByRole('heading', { name: 'Mer' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /^Kilder$/i })).toHaveAttribute('href', '/kilder');
  expect(screen.getByRole('link', { name: /Moduler/i })).toHaveAttribute('href', '/laering');
  expect(screen.getByRole('link', { name: /Feltmodus/i })).toHaveAttribute('href', '/feltmodus');
  expect(screen.getByRole('link', { name: /Kart/i })).toHaveAttribute('href', '/kart');
  expect(screen.getByRole('link', { name: /Personvern/i })).toHaveAttribute('href', '/personvern');
  expect(screen.getByRole('link', { name: /Release readiness/i })).toHaveAttribute('href', '/release');
  expect(screen.getByRole('link', { name: /^Datakilder$/i })).toHaveAttribute('href', '/datakilder');
  expect(screen.getByText(/admin\/release/i)).toBeInTheDocument();
});
