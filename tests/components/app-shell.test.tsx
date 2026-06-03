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
