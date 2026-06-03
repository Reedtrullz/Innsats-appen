import { render, screen } from '@testing-library/react';
import BoundaryPage from '@/app/(app)/begrensninger/page';
import DataOnDevicePage from '@/app/(app)/data-pa-enheten/page';
import KnownLimitationsPage from '@/app/(app)/kjente-begrensninger/page';
import Home from '@/app/page';

it('shows the Beredskapsboka landing page', () => {
  render(<Home />);
  expect(screen.getByRole('heading', { name: /Beredskapsboka/i })).toBeInTheDocument();
  expect(screen.getByText(/mobil/i)).toBeInTheDocument();
  expect(screen.getByText(/beslutningsstøtte/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke et offisielt kommando/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Åpne hurtigkort/i })).toHaveAttribute('href', '/hurtigkort');
  expect(screen.getByRole('link', { name: /Start lokalt oppdrag/i })).toHaveAttribute('href', '/oppdrag/ny');
  expect(screen.getByRole('link', { name: /grenser/i })).toHaveAttribute('href', '/begrensninger');
  expect(screen.getByRole('link', { name: /kjente begrensninger/i })).toHaveAttribute('href', '/kjente-begrensninger');
  expect(screen.getByRole('link', { name: /data på enheten/i })).toHaveAttribute('href', '/data-pa-enheten');
});

it('renders the in-app boundary, known limitations, and device data pages', () => {
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
  expect(screen.getByRole('heading', { name: /Data lagret på denne enheten/i })).toBeInTheDocument();
  expect(screen.getByText(/IndexedDB/i)).toBeInTheDocument();
  expect(screen.getByText(/localStorage/i)).toBeInTheDocument();
  expect(screen.getByText(/eksporterte filer kan inneholde operasjonelt sensitiv informasjon/i)).toBeInTheDocument();
});
