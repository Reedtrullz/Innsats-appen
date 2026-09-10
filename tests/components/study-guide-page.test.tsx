import { render, screen } from '@testing-library/react';
import StudyGuidePage from '@/app/(app)/nytt/sok-og-redning/page';

it('renders the missing-person study surface with safe source-backed navigation', () => {
  render(<StudyGuidePage />);

  expect(screen.getByRole('heading', { name: /Dette er nytt.*søk etter savnet/i })).toBeInTheDocument();
  expect(screen.getByText(/studer.*før neste søk/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /søk etter savnet planlegging/i })).toHaveAttribute('href', '/kort/sok-og-redning-planlegging');
  expect(screen.getByText(/SHA-256/i)).toBeInTheDocument();
});
