import { render, screen, within } from '@testing-library/react';
import { flushAsyncEffects } from '../helpers/react-effects';
import BoundaryPage from '@/app/(app)/begrensninger/page';
import DataOnDevicePage from '@/app/(app)/data-pa-enheten/page';
import KnownLimitationsPage from '@/app/(app)/kjente-begrensninger/page';
import Home from '@/app/page';

it('shows the operational command-surface landing page', async () => {
  render(<Home />);
  await flushAsyncEffects();

  expect(screen.getByRole('heading', { name: /Beredskapsboka/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Hva står du i nå/i })).toBeInTheDocument();
  expect(screen.getByText(/kildebelagt beslutningsstøtte før, under og etter innsats/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Start lokalt oppdrag/i })).toHaveAttribute('href', '/oppdrag/ny');
  expect(screen.getByRole('link', { name: /Finn tiltak raskt/i })).toHaveAttribute('href', '/sok');
  expect(screen.getByRole('link', { name: /^Før innsats$/i })).toHaveAttribute('href', '/for');
  expect(screen.getByRole('link', { name: /^Under innsats$/i })).toHaveAttribute('href', '/under');
  expect(screen.getByRole('link', { name: /^Etter innsats$/i })).toHaveAttribute('href', '/etter');
  expect(screen.getAllByRole('link', { name: /Kilder/i }).some((link) => link.getAttribute('href') === '/kilder')).toBe(true);
  expect(screen.getByRole('link', { name: /Alvorlig ulykke/i })).toHaveAttribute('href', '/kort/alvorlig-ulykke-dod-eget-personell');
  expect(screen.getByRole('link', { name: /Psykologisk førstehjelp/i })).toHaveAttribute('href', '/kort/psykologisk-forstehjelp-sekvens');
  expect(screen.getByRole('link', { name: /Samband \/ ordre/i })).toHaveAttribute('href', '/kort/sambandsplan-start');
  expect(screen.getByText('Offline-klar')).toBeInTheDocument();
  expect(screen.getByText('Lagres lokalt')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Release readiness/i })).not.toBeInTheDocument();
  expect(screen.getByText(/Ikke offisielt kommandosystem/i)).toBeInTheDocument();
});

it('renders the in-app boundary, known limitations, and device data pages', async () => {
  const { unmount } = render(<BoundaryPage />);
  expect(screen.getByRole('heading', { name: /Operative grenser/i })).toBeInTheDocument();
  expect(screen.getByText(/ikke et offisielt kommando/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke et ordre-/i)).toBeInTheDocument();
  unmount();

  const known = render(<KnownLimitationsPage />);
  expect(screen.getByRole('heading', { name: /Kjente begrensninger/i })).toBeInTheDocument();
  expect(screen.getByText(/ingen backend/i)).toBeInTheDocument();
  expect(screen.getByText(/ingen private\/skjermede tilfluktsrom/i)).toBeInTheDocument();
  known.unmount();

  render(<DataOnDevicePage />);
  await flushAsyncEffects();
  expect(screen.getByRole('heading', { name: /Data lagret på denne enheten/i })).toBeInTheDocument();
  const localStorageSection = screen.getByRole('heading', { name: /Hva lagres lokalt/i }).closest('section');
  expect(localStorageSection).not.toBeNull();
  expect(within(localStorageSection as HTMLElement).getByText(/IndexedDB/i)).toBeInTheDocument();
  expect(within(localStorageSection as HTMLElement).getByText(/localStorage: release-readiness/i)).toBeInTheDocument();
  expect(screen.getByText(/Eksporterte filer er manuell lokal JSON/i)).toBeInTheDocument();
});
