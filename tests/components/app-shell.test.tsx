import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach } from 'vitest';
import { AppShell } from '@/components/app-shell';
import { FIELD_MODE_STORAGE_KEY, serializeFieldModeSettings } from '@/lib/field-mode/field-mode';

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.fieldMode;
  delete document.documentElement.dataset.fieldGloveMode;
  delete document.documentElement.dataset.fieldTheme;
});

it('shows five mobile navigation tabs with current route', () => {
  render(<AppShell currentPath="/sok"><p>Innhold</p></AppShell>);
  const navigation = within(screen.getByRole('navigation', { name: /Hovednavigasjon/i }));
  for (const label of ['Hjem', 'Søk', 'Oppdrag', 'Kort', 'Mer']) {
    expect(navigation.getByRole('link', { name: label })).toBeInTheDocument();
  }
  expect(navigation.getByRole('link', { name: 'Søk' })).toHaveAttribute('aria-current', 'page');
  expect(navigation.getByRole('link', { name: 'Hjem' })).not.toHaveAttribute('aria-current');
  expect(navigation.queryByRole('link', { name: 'Release' })).not.toBeInTheDocument();
});

it('suppresses the mobile bottom navigation on release routes', () => {
  const { rerender } = render(<AppShell currentPath="/release"><p>Release</p></AppShell>);

  expect(screen.queryByRole('navigation', { name: /Hovednavigasjon/i })).not.toBeInTheDocument();

  rerender(<AppShell currentPath="/release/foo"><p>Release details</p></AppShell>);

  expect(screen.queryByRole('navigation', { name: /Hovednavigasjon/i })).not.toBeInTheDocument();
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

it('applies field mode runtime CSS for night mode and 48x48 touch targets', async () => {
  localStorage.setItem(FIELD_MODE_STORAGE_KEY, serializeFieldModeSettings({ enabled: true, gloveMode: false, theme: 'night', outdoorReadabilityReviewed: true }));

  render(<AppShell currentPath="/feltmodus"><button type="button">Kritisk valg</button></AppShell>);

  await waitFor(() => expect(document.documentElement.dataset.fieldMode).toBe('on'));
  await waitFor(() => expect(document.documentElement.dataset.fieldTheme).toBe('night'));
  expect(document.documentElement.dataset.fieldGloveMode).toBe('off');
  const runtimeCss = Array.from(document.querySelectorAll('style')).map((style) => style.textContent ?? '').join('\n');
  expect(runtimeCss).toContain('min-width: 48px');
  expect(runtimeCss).toContain('main [class*="bg-white"]');
  expect(runtimeCss).toContain('background: #020617');
});

it('shows generated content version and expanded content navigation', () => {
  render(<AppShell currentPath="/hurtigkort"><p>Innhold</p></AppShell>);

  expect(screen.getByTestId('shell-content-version')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Kildegjennomgang/i })).toHaveAttribute('href', '/kildegjennomgang');
  expect(screen.getByRole('link', { name: /Datakilder/i })).toHaveAttribute('href', '/datakilder');
  expect(screen.getByRole('link', { name: /Personvern/i })).toHaveAttribute('href', '/personvern');
  expect(screen.getAllByRole('link', { name: /Kart/i }).some((link) => link.getAttribute('href') === '/kart')).toBe(true);
  expect(screen.getByRole('link', { name: /Feltmodus/i })).toHaveAttribute('href', '/feltmodus');
  expect(screen.getByRole('link', { name: /FAQ/i })).toHaveAttribute('href', '/faq');
  expect(screen.getByRole('link', { name: /Endringer/i })).toHaveAttribute('href', '/endringer');
  expect(screen.getByRole('link', { name: /Må leses/i })).toHaveAttribute('href', '/ma-leses');
});
