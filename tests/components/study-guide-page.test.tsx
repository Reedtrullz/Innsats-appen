import { render, screen } from '@testing-library/react';
import StudyGuidePage from '@/app/(app)/nytt/sok-og-redning/page';

it('renders the missing-person study surface with safe source-backed navigation', () => {
  render(<StudyGuidePage />);

  expect(screen.getByRole('heading', { name: /Dette er nytt.*søk etter savnet/i })).toBeInTheDocument();
  expect(screen.getByText(/studer.*før neste søk/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /søk etter savnet planlegging/i })).toHaveAttribute('href', '/kort/sok-og-redning-planlegging');
  expect(screen.getAllByRole('link', { name: /sjekkliste: søk og redning sektor under innsats/i }).every((link) => link.getAttribute('href') === '#sjekkliste-sok-og-redning-sektor-under')).toBe(true);
  expect(screen.getByRole('heading', { name: /sjekkliste-lesing uten oppdrag/i })).toBeInTheDocument();
  expect(screen.getByText(/Oppdrag, teig, metode, startpunkt og sluttpunkt er bekreftet/i)).toBeInTheDocument();
  expect(screen.getByText(/kapitlene 5, 6, 7 og 12/i)).toBeInTheDocument();
  expect(screen.getByText(/SHA-256/i)).toBeInTheDocument();
});
