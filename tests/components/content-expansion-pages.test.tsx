import { render, screen, within } from '@testing-library/react';
import ChangelogPage from '@/app/(app)/endringer/page';
import FAQPage from '@/app/(app)/faq/page';
import HurtigkortPage from '@/app/(app)/hurtigkort/page';
import SokPage from '@/app/(app)/sok/page';
import MustReadPage from '@/app/(app)/ma-leses/page';
import WhatsNewPage from '@/app/(app)/nytt/page';

it('renders FAQ entries from curated generated content', () => {
  render(<FAQPage />);

  expect(screen.getByRole('heading', { name: /Ofte stilte spørsmål/i })).toBeInTheDocument();
  expect(screen.getByText(/offentlig, kildebelagt beslutningsstøtte/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Oppdatert/i).length).toBeGreaterThan(0);
});

it('renders new and updated procedures from generated changelog', () => {
  render(<ChangelogPage />);

  expect(screen.getByRole('heading', { name: /Endringslogg/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Nye og oppdaterte prosedyrer/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Hva nå-stresskort lagt til/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /må-leses-varsler/i })).toHaveAttribute('href', '/ma-leses');
  expect(screen.getByRole('link', { name: /Hva er nytt/i })).toHaveAttribute('href', '/nytt');
});

it('renders what is new from generated release notes and content version mapping', () => {
  render(<WhatsNewPage />);

  expect(screen.getByRole('heading', { level: 1, name: /Hva er nytt/i })).toBeInTheDocument();
  expect(screen.getByText(/Innholdsversjon/i)).toBeInTheDocument();
  expect(screen.getByText(/Release-ID/i)).toBeInTheDocument();
  expect(screen.getByText(/Ikke operativ ordre/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Må-leses/i).length).toBeGreaterThan(0);
});

it('renders must-read notices linked to cards and changelog', () => {
  render(<MustReadPage />);

  expect(screen.getByRole('heading', { level: 1, name: /Må leses/i })).toBeInTheDocument();
  expect(screen.getByText(/erstatter ikke lokal ordre/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Hva nå-kort er ikke faggodkjent ennå/i })).toBeInTheDocument();
  expect(screen.getAllByText(/Kilder:/i).length).toBeGreaterThan(0);
});

it('includes FAQ entries and glossary aliases in the visible local search', () => {
  window.history.replaceState(null, '', '/sok?q=kommando');
  const faqRender = render(<SokPage />);

  expect(screen.getByRole('heading', { name: /Søk i tiltak, kilder og moduler/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Er Beredskapsboka en offisiell ordre/i })).toHaveAttribute('href', '/faq#beslutningsstotte-og-ordre');
  faqRender.unmount();

  window.history.replaceState(null, '', '/sok?q=kaliumjodid');
  render(<SokPage />);
  expect(screen.getByRole('link', { name: 'jod' })).toHaveAttribute('href', '/sok?q=jod');
});

it('surfaces what-next operational cards on the quick-card page', () => {
  render(<HurtigkortPage />);

  const section = screen.getByRole('region', { name: /Hva nå/i });
  expect(within(section).getByRole('link', { name: /Oppdrag mottatt - hva nå/i })).toHaveAttribute('href', '/kort/oppdrag-mottatt-hva-na');
  expect(within(section).getByRole('link', { name: /Samband brutt - hva nå/i })).toHaveAttribute('href', '/kort/samband-brutt-hva-na');
  expect(within(section).getByText(/første tiltakene når situasjonen endrer seg/i)).toBeInTheDocument();
});

it('uses curated synonym card bindings in the visible quick-card search', () => {
  window.history.replaceState(null, '', '/hurtigkort?q=transporttavle');
  render(<HurtigkortPage />);

  const searchRegion = screen.getByRole('region', { name: 'Lokalt søk' });
  expect(within(searchRegion).queryByText(/Ingen treff/i)).not.toBeInTheDocument();
  expect(within(searchRegion).getByRole('link', { name: /ATV, båt og transportlogistikk/i })).toHaveAttribute('href', '/kort/atv-bat-transportlogistikk');
});
