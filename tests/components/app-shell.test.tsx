import { render, screen, waitFor, within, type RenderResult } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { AppShell } from '@/components/app-shell';
import { FIELD_MODE_STORAGE_KEY, serializeFieldModeSettings } from '@/lib/field-mode/field-mode';
import { flushAsyncEffects } from '../helpers/react-effects';
import { getMustReadNotices } from '@/lib/content/load-content';


async function renderAndFlush(ui: React.ReactElement): Promise<RenderResult> {
  const result = render(ui);
  await flushAsyncEffects();
  return result;
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.fieldMode;
  delete document.documentElement.dataset.fieldGloveMode;
  delete document.documentElement.dataset.fieldTheme;
});

it('shows five mobile navigation tabs with current route', async () => {
  await renderAndFlush(<AppShell currentPath="/sok"><p>Innhold</p></AppShell>);
  const navigation = within(screen.getByRole('navigation', { name: /Hovednavigasjon/i }));
  for (const label of ['Hjem', 'Søk', 'Oppdrag', 'Kart', 'Mer']) {
    expect(navigation.getByRole('link', { name: label })).toBeInTheDocument();
  }
  expect(navigation.getByRole('link', { name: 'Søk' })).toHaveAttribute('aria-current', 'page');
  expect(navigation.getByRole('link', { name: 'Hjem' })).not.toHaveAttribute('aria-current');
  expect(navigation.queryByRole('link', { name: 'Release' })).not.toBeInTheDocument();
});

it('marks only new critical must-read notices as urgent', async () => {
  const acknowledgements = Object.fromEntries(getMustReadNotices().map((notice) => [notice.id, notice.changedAt]));
  localStorage.setItem('beredskapsboka-must-read-ack-v1', JSON.stringify(acknowledgements));

  await renderAndFlush(<AppShell currentPath="/"><p>Innhold</p></AppShell>);

  const mustRead = screen.getByRole('link', { name: /Må leses 0 nye/i });
  expect(mustRead).not.toHaveClass('bg-red-600');
});

it('restores the route top unless navigation targets a hash', async () => {
  const scrollTo = vi.mocked(window.scrollTo);
  const { rerender } = await renderAndFlush(<AppShell currentPath="/"><h1>Hjem</h1></AppShell>);
  scrollTo.mockClear();

  rerender(<AppShell currentPath="/sok"><h1>Søk</h1></AppShell>);
  await flushAsyncEffects();
  expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });

  scrollTo.mockClear();
  window.history.replaceState(null, '', '/oppdrag#hurtiglogg');
  rerender(<AppShell currentPath="/oppdrag"><h1>Oppdrag</h1></AppShell>);
  await flushAsyncEffects();
  expect(scrollTo).not.toHaveBeenCalled();
});

it('suppresses the mobile bottom navigation on release routes', async () => {
  const { rerender } = await renderAndFlush(<AppShell currentPath="/release"><p>Release</p></AppShell>);

  expect(screen.queryByRole('navigation', { name: /Hovednavigasjon/i })).not.toBeInTheDocument();

  rerender(<AppShell currentPath="/release/foo"><p>Release details</p></AppShell>);
  await flushAsyncEffects();

  expect(screen.queryByRole('navigation', { name: /Hovednavigasjon/i })).not.toBeInTheDocument();
});

it('keeps a visible decision-support and local-only disclaimer in the persistent shell', async () => {
  await renderAndFlush(<AppShell currentPath="/oppdrag"><p>Operativ flate</p></AppShell>);

  expect(screen.getByText(/beslutningsstøtte/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke et offisielt kommando/i)).toBeInTheDocument();
  expect(screen.getByText(/lagres bare lokalt/i)).toBeInTheDocument();
  expect(screen.getByText(/ikke legg inn persondata/i)).toBeInTheDocument();
  // The shell keeps one persistent entry point to the full boundary text;
  // the deeper limitation/data pages are linked from /begrensninger and /mer.
  expect(screen.getByRole('link', { name: /Les grensene/i })).toHaveAttribute('href', '/begrensninger');
});

it('applies field mode runtime CSS for night mode and 48x48 touch targets', async () => {
  localStorage.setItem(FIELD_MODE_STORAGE_KEY, serializeFieldModeSettings({ enabled: true, gloveMode: false, theme: 'night', outdoorReadabilityReviewed: true }));

  await renderAndFlush(<AppShell currentPath="/feltmodus"><button type="button">Kritisk valg</button></AppShell>);

  await waitFor(() => expect(document.documentElement.dataset.fieldMode).toBe('on'));
  await waitFor(() => expect(document.documentElement.dataset.fieldTheme).toBe('night'));
  expect(document.documentElement.dataset.fieldGloveMode).toBe('off');
  const runtimeCss = Array.from(document.querySelectorAll('style')).map((style) => style.textContent ?? '').join('\n');
  expect(runtimeCss).toContain('min-width: 48px');
  expect(runtimeCss).toContain('main [class*="bg-white"]');
  expect(runtimeCss).toContain('background: #020617');
});

it('shows consolidated operational status chrome and keeps release/admin under Mer', async () => {
  await renderAndFlush(<AppShell currentPath="/hurtigkort"><p>Innhold</p></AppShell>);
  const header = within(screen.getByRole('banner'));

  expect(header.getByRole('link', { name: /Beredskapsboka/i })).toHaveAttribute('href', '/');
  expect(header.getByRole('link', { name: /Må leses/i })).toHaveAttribute('href', '/ma-leses');
  expect(header.getByRole('link', { name: 'Mer' })).toHaveAttribute('href', '/mer');
  // Status now lives in a single consolidated strip below the header, not inside the banner.
  expect(header.queryByText('Offline-klar')).not.toBeInTheDocument();
  expect(screen.getByText(/Tilkoblet/)).toBeInTheDocument();
  expect(screen.getByText('Offline-klar')).toBeInTheDocument();
  expect(screen.getByText('Lokalt')).toBeInTheDocument();
  // No raw developer diagnostics in the default view.
  expect(screen.queryByText(/cache v/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/SW klar/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Release/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Kildegjennomgang/i })).not.toBeInTheDocument();
});
