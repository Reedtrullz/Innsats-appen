import { render, screen } from '@testing-library/react';
import EtterPage from '@/app/(app)/etter/page';
import KnownLimitationsPage from '@/app/(app)/kjente-begrensninger/page';
import MustReadPage from '@/app/(app)/ma-leses/page';
import UnderPage from '@/app/(app)/under/page';
import { PhasePageContent } from '@/components/action-card-list';
import type { ActionCard, ContentChangelogEntry, MustReadNotice, OperationalChecklist } from '@/lib/content/schemas';

const cards = [
  { slug: 'for-card', title: 'Før kort', phase: 'for', roles: ['mannskap'], scenarios: ['generelt'], priority: 'high', steps: ['a'], safety: [], reporting: [], sourceIds: ['src-a'], competenceRequired: [], warning: 'w' },
  { slug: 'under-card', title: 'Under kort', phase: 'under', roles: ['mannskap'], scenarios: ['generelt'], priority: 'high', steps: ['b'], safety: [], reporting: [], sourceIds: ['src-b'], competenceRequired: [], warning: 'w' },
  { slug: 'etter-card', title: 'Etter kort', phase: 'etter', roles: ['mannskap'], scenarios: ['generelt'], priority: 'high', steps: ['c'], safety: [], reporting: [], sourceIds: ['src-c'], competenceRequired: [], warning: 'w' },
] as ActionCard[];

it('shows correct cards for each phase', () => {
  render(<PhasePageContent phase="for" cards={cards} />);
  expect(screen.getByRole('heading', { name: /Før/i, level: 1 })).toBeInTheDocument();
  expect(screen.getByText('Før kort')).toBeInTheDocument();
  expect(screen.queryByText('Under kort')).not.toBeInTheDocument();
});

it('shows før utrykning combined workflow, latest procedure notice, and must-read deployment notices', () => {
  const checklists = [
    {
      slug: 'for-utrykning-samlet',
      title: 'Før utrykning samlet kontroll',
      phase: 'for',
      roles: ['mannskap', 'lagforer'],
      scenarios: ['generelt'],
      sourceIds: ['src-sjekkliste-fig-og-figp'],
      items: [{ id: 'kontakt-og-mottak', label: 'Kontakt beredskapsvakt og mottak av oppdrag avklart', required: true, sourceIds: ['src-sjekkliste-fig-og-figp'] }],
    },
    {
      slug: 'fig-under-innsats',
      title: 'FIG under innsats',
      phase: 'under',
      roles: ['mannskap'],
      scenarios: ['generelt'],
      sourceIds: ['src-tiltakskort-for-innsats'],
      items: [{ id: 'ankomst-og-egen-sikkerhet', label: 'Ankomst og egen sikkerhet vurdert', required: true, sourceIds: ['src-tiltakskort-for-innsats'] }],
    },
  ] as OperationalChecklist[];
  const latestChange = { id: 'group-2a-for-utrykning', date: '2026-06-03', title: 'Før utrykning-prosedyre oppdatert', summary: 'Ny samlet kontroll før avreise.', changeType: 'updated', contentRefs: [{ kind: 'checklist', id: 'for-utrykning-samlet' }], sourceIds: ['src-sjekkliste-fig-og-figp'], mustRead: true } as ContentChangelogEntry;
  const mustRead = [{ id: 'for-utrykning-les-forst', title: 'Må leses før utrykning', body: 'Kontroller ordre, vær/farer og lokale føringer før avreise.', severity: 'warning', changedAt: '2026-06-03', sourceIds: ['src-sjekkliste-fig-og-figp'] }] as MustReadNotice[];

  render(<PhasePageContent phase="for" cards={cards} checklists={checklists} latestChange={latestChange} mustRead={mustRead} />);

  expect(screen.getByRole('heading', { name: /Før utrykning samlet kontroll/i })).toBeInTheDocument();
  expect(screen.getByText(/Kontakt beredskapsvakt/i)).toBeInTheDocument();
  expect(screen.getByText(/Sist oppdatert prosedyre/i)).toBeInTheDocument();
  expect(screen.getByText(/Før utrykning-prosedyre oppdatert/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Må leses før utrykning/i })).toBeInTheDocument();
  expect(screen.getByText(/Kontroller ordre, vær\/farer/i)).toBeInTheDocument();
});

it('shows under-phase operational entry points for map, log and active mission', () => {
  render(<UnderPage />);

  expect(screen.getByRole('heading', { name: /Under innsats/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Åpne aktivt oppdrag/i })).toHaveAttribute('href', '/oppdrag');
  expect(screen.getByRole('link', { name: /Åpne kart/i })).toHaveAttribute('href', '/kart');
  expect(screen.getByRole('link', { name: /Loggfør observasjon/i })).toHaveAttribute('href', '/oppdrag#feltlogg');
  expect(screen.getByText(/Kart og logg er lokal beslutningsstøtte/i)).toBeInTheDocument();
});

it('links Etter CTAs to the exact dashboard sections', () => {
  render(<EtterPage />);

  expect(screen.getByRole('heading', { name: /Etter innsats/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Åpne etterrapport/i })).toHaveAttribute('href', '/oppdrag#etterrapport');
  expect(screen.getByRole('link', { name: /RUH og velferd/i })).toHaveAttribute('href', '/oppdrag#ruh-velferd');
  expect(screen.getByRole('link', { name: /Oppdragsmappe/i })).toHaveAttribute('href', '/oppdrag#oppdragsmappe');
  expect(screen.getByText(/lokal og ikke offisiell innsending/i)).toBeInTheDocument();
});

it('states that Må leses is not Nødvarsel or official population warning', () => {
  const mustRead = render(<MustReadPage />);
  const mustReadText = mustRead.container.textContent ?? '';
  expect(mustReadText).toMatch(/ikke Nødvarsel/i);
  expect(mustReadText).toMatch(/ikke pushvarsel/i);
  expect(mustReadText).toMatch(/ikke offisiell befolkningsvarsling/i);
  mustRead.unmount();

  const limitations = render(<KnownLimitationsPage />);
  const limitationsText = limitations.container.textContent ?? '';
  expect(limitationsText).toMatch(/ikke Nødvarsel/i);
  expect(limitationsText).toMatch(/ikke pushvarsel/i);
  expect(limitationsText).toMatch(/ikke offisiell befolkningsvarsling/i);
});
