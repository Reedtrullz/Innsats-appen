import { render, screen } from '@testing-library/react';
import ChangelogPage from '@/app/(app)/endringer/page';
import FAQPage from '@/app/(app)/faq/page';
import HurtigkortPage from '@/app/(app)/hurtigkort/page';
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
  expect(screen.getAllByText(/Kilder:/i).length).toBeGreaterThan(0);
});

it('includes FAQ entries and glossary aliases in the visible local quick-card search', () => {
  window.history.replaceState(null, '', '/hurtigkort?q=kommando');
  const faqRender = render(<HurtigkortPage />);

  expect(screen.getByRole('heading', { name: /Hurtigkort/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Er Beredskapsboka en offisiell ordre/i })).toHaveAttribute('href', '/faq#beslutningsstotte-og-ordre');
  faqRender.unmount();

  window.history.replaceState(null, '', '/hurtigkort?q=kaliumjodid');
  render(<HurtigkortPage />);
  expect(screen.getByRole('link', { name: 'jod' })).toHaveAttribute('href', '/hurtigkort?q=jod');
});
