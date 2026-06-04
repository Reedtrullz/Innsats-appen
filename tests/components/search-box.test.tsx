import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from '@/components/search-box';

beforeEach(() => {
  window.history.replaceState(null, '', '/hurtigkort');
});

const docs = [
  { id: 'kort:jod', title: 'Jodtabletter', body: 'atomberedskap radiac', synonyms: 'kaliumjodid jod-tablett', type: 'kort', href: '/kort/jod' },
  { id: 'kort:rens', title: 'Rens CBRN', body: 'MFE samband dose tilfluktsrom FIG10', synonyms: 'dekontaminering sanering', type: 'kort', href: '/kort/rens' },
  { id: 'kort:flom', title: 'Pumpe og vannforsyning', body: 'lensepumpe flom vannskade', role: 'lagfører', phase: 'under', scenario: 'flom', type: 'kort', href: '/kort/flom' },
];

it('finds operational stress terms locally', async () => {
  render(<SearchBox documents={docs} />);
  for (const term of ['jod', 'rens', 'MFE', 'samband', 'dose', 'tilfluktsrom', 'tilflukt', 'FIG10']) {
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), term);
    expect(screen.getByText(/kort/i)).toBeInTheDocument();
  }
});

it('reacts to query-string changes while mounted', async () => {
  window.history.replaceState(null, '', '/hurtigkort');
  render(<SearchBox documents={docs} />);
  expect(screen.getByRole('searchbox')).toHaveValue('');

  act(() => {
    window.history.pushState(null, '', '/hurtigkort?q=FIG10');
  });

  await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue('FIG10'));
  expect(screen.getByRole('link', { name: 'Rens CBRN' })).toBeInTheDocument();
});

it('finds aliases and typos through operational expansion', async () => {
  render(<SearchBox documents={docs} />);
  await userEvent.type(screen.getByRole('searchbox'), 'jodtablet');
  expect(screen.getByRole('link', { name: 'Jodtabletter' })).toBeInTheDocument();

  await userEvent.clear(screen.getByRole('searchbox'));
  await userEvent.type(screen.getByRole('searchbox'), 'dekontaminering');
  expect(screen.getByRole('link', { name: 'Rens CBRN' })).toBeInTheDocument();
});

it('renders no-result suggestions as functional links', async () => {
  render(<SearchBox documents={docs} />);
  await userEvent.type(screen.getByRole('searchbox'), 'jodddttabl');
  expect(screen.getByText(/Ingen treff/i)).toBeInTheDocument();
  const suggestion = screen.getByRole('link', { name: /^jod$/i });
  expect(suggestion).toHaveAttribute('href', '/hurtigkort?q=jod');

  await userEvent.click(suggestion);
  act(() => {
    window.history.pushState(null, '', '/hurtigkort?q=jod');
  });
  await waitFor(() => expect(screen.getByRole('searchbox')).toHaveValue('jod'));
  expect(screen.getByRole('link', { name: 'Jodtabletter' })).toBeInTheDocument();
  expect(screen.queryByText(/Ingen treff/i)).not.toBeInTheDocument();
});

it('uses URL role phase and scenario as ranking context', async () => {
  window.history.replaceState(null, '', '/hurtigkort?q=vannforsyning&role=lagf%C3%B8rer&phase=under&scenario=flom');
  render(<SearchBox documents={docs} />);
  expect(await screen.findByRole('searchbox')).toHaveValue('vannforsyning');
  expect(screen.getAllByRole('link')[0]).toHaveTextContent('Pumpe og vannforsyning');
});

it('shows stale offline search-index indicator when generatedAt is old', () => {
  render(<SearchBox documents={docs} generatedAt="2026-01-01T00:00:00.000Z" now={new Date('2026-02-15T00:00:00.000Z')} />);
  expect(screen.getByText(/Lokalt søkeindeks/i)).toHaveTextContent(/kan være utdatert/i);
});

it('shows missing offline search-index indicator when explicitly requested without generatedAt', () => {
  render(<SearchBox documents={docs} showFreshnessIndicator />);
  expect(screen.getByText(/Lokalt søkeindeks/i)).toHaveTextContent(/mangler genereringstidspunkt/i);
});
