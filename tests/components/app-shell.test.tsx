import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/app-shell';

it('shows mobile navigation links with current route', () => {
  render(<AppShell currentPath="/hurtigkort"><p>Innhold</p></AppShell>);
  for (const label of ['Hurtigkort', 'Før', 'Under', 'Etter', 'Oppdrag', 'Kilder']) {
    expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: 'Hurtigkort' })).toHaveAttribute('aria-current', 'page');
});

it('keeps a visible decision-support and local-only disclaimer in the persistent shell', () => {
  render(<AppShell currentPath="/oppdrag"><p>Operativ flate</p></AppShell>);

  expect(screen.getByText(/beslutningsstøtte/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke et offisielt kommando/i)).toBeInTheDocument();
  expect(screen.getByText(/lagres bare lokalt/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke legg inn persondata/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /grenser/i })).toHaveAttribute('href', '/begrensninger');
  expect(screen.getByRole('link', { name: /kjente begrensninger/i })).toHaveAttribute('href', '/kjente-begrensninger');
  expect(screen.getByRole('link', { name: /data på enheten/i })).toHaveAttribute('href', '/data-pa-enheten');
});

it('shows generated content version and expanded content navigation', () => {
  render(<AppShell currentPath="/hurtigkort"><p>Innhold</p></AppShell>);

  expect(screen.getByTestId('shell-content-version')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Kildegjennomgang/i })).toHaveAttribute('href', '/kildegjennomgang');
  expect(screen.getByRole('link', { name: /Datakilder/i })).toHaveAttribute('href', '/datakilder');
  expect(screen.getByRole('link', { name: /FAQ/i })).toHaveAttribute('href', '/faq');
  expect(screen.getByRole('link', { name: /Endringer/i })).toHaveAttribute('href', '/endringer');
  expect(screen.getByRole('link', { name: /Må leses/i })).toHaveAttribute('href', '/ma-leses');
});
