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
    expect(screen.getAllByText(/kort/i).length).toBeGreaterThan(0);
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

it('keeps implementation metadata behind details and leads with the first action', async () => {
  render(<SearchBox documents={[{ ...docs[2], firstAction: 'Kontroller sikker adkomst.', authority: 'Kildegrunnlag kontrollert', sourceStatus: 'verified', sourceIds: ['src-flom'] }]} />);
  await userEvent.type(screen.getByRole('searchbox'), 'pumpe');

  expect(screen.getByRole('link', { name: /Pumpe og vannforsyning/i })).toBeInTheDocument();
  expect(screen.getByText(/Kontroller sikker adkomst/i)).toBeInTheDocument();
  expect(screen.getByText(/Kildegrunnlag kontrollert/i)).toBeInTheDocument();
  expect(screen.getByText(/Fase:/i)).toHaveTextContent(/under/i);
  const details = screen.getByText('Detaljer').closest('details') as HTMLDetailsElement;
  expect(details.open).toBe(false);
  await userEvent.click(screen.getByText('Detaljer'));
  expect(details.open).toBe(true);
  expect(screen.getByText(/Søkeord:/i)).toHaveTextContent(/pumpe/i);
  expect(screen.getByText(/Kilde: verified/i)).toBeInTheDocument();
});

it('offers incident, action and source entry intents', async () => {
  render(<SearchBox documents={docs} suggestionBasePath="/sok" />);

  expect(screen.getByRole('button', { name: 'Hva har skjedd?' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Hva må jeg gjøre?' }));
  expect(window.location.search).toContain('intent=action');
  await userEvent.click(screen.getByRole('button', { name: 'Finn kilde' }));
  expect(window.location.search).toContain('intent=source');
});

it('uses one review badge instead of a default metadata badge cloud', async () => {
  render(<SearchBox documents={[{ ...docs[2], priority: 'high', reviewStatus: 'pending-fagperson' }]} />);

  await userEvent.type(screen.getByRole('searchbox'), 'pumpe');

  expect(screen.getByRole('link', { name: /Pumpe og vannforsyning/i })).toBeInTheDocument();
  expect(screen.getByText(/Til gjennomgang/i)).toBeInTheDocument();
  expect(screen.queryByText(/Kritisk prioritet/i)).not.toBeInTheDocument();
});

it.each([
  ['reviewed', 'Faglig godkjent'],
  ['unreviewed', 'Ikke faglig vurdert'],
] as const)('shows card review state %s separately from source state', async (reviewStatus, label) => {
  render(<SearchBox documents={[{ ...docs[2], reviewStatus, sourceStatus: 'verified' }]} />);
  await userEvent.type(screen.getByRole('searchbox'), 'pumpe');

  expect(screen.getByText(label)).toBeInTheDocument();
  const details = screen.getByText('Detaljer').closest('details') as HTMLDetailsElement;
  expect(details.open).toBe(false);
  await userEvent.click(screen.getByText('Detaljer'));
  expect(details.open).toBe(true);
  expect(screen.getByText(/Kilde: verified/i)).toBeInTheDocument();
});

it('filters operational search results by phase, type and source status', async () => {
  render(<SearchBox documents={[
    { id: 'kort:flom', title: 'Flom og pumpe', body: 'pumpe', type: 'kort', phase: 'under', href: '/kort/flom', sourceStatus: 'verified' },
    { id: 'kilde:flom', title: 'SRC - Flom', body: 'pumpe', type: 'kilde', href: '/kilder/src-flom', sourceStatus: 'unverified' },
  ]} enableFilters />);

  await userEvent.type(screen.getByRole('searchbox'), 'pumpe');
  await userEvent.click(screen.getByRole('button', { name: /Fase: Under/i }));
  await userEvent.click(screen.getByRole('button', { name: /Type: kort/i }));
  await userEvent.click(screen.getByRole('button', { name: /Kilde: verified/i }));

  expect(screen.getByRole('link', { name: 'Flom og pumpe' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'SRC - Flom' })).not.toBeInTheDocument();
});

it('filters matching results before applying the visible result limit', async () => {
  const highRankingKortDocs = Array.from({ length: 12 }, (_, index) => ({
    id: `kort:limit-${index}`,
    title: `Aa pumpe tiltak ${String(index).padStart(2, '0')}`,
    body: 'pumpe',
    type: 'kort',
    href: `/kort/limit-${index}`,
  }));
  render(<SearchBox documents={[
    ...highRankingKortDocs,
    { id: 'kilde:late-match', title: 'Zz kilde etter limit', body: 'pumpe', type: 'kilde', href: '/kilder/late-match' },
  ]} enableFilters />);

  await userEvent.type(screen.getByRole('searchbox'), 'pumpe');
  expect(screen.queryByRole('link', { name: 'Zz kilde etter limit' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Type: kilde/i }));

  expect(screen.getByRole('link', { name: 'Zz kilde etter limit' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Aa pumpe tiltak 00' })).not.toBeInTheDocument();
});

it('explains when filters hide search results and lets users reset filters', async () => {
  render(<SearchBox documents={[docs[2]]} enableFilters />);

  await userEvent.type(screen.getByRole('searchbox'), 'pumpe');
  expect(screen.getByRole('link', { name: 'Pumpe og vannforsyning' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Fase: Før/i }));

  expect(screen.getByText(/1 treff skjult av filtre/i)).toBeInTheDocument();
  expect(screen.queryByText(/Ingen treff\. Prøv et kjent fagord/i)).not.toBeInTheDocument();
  const reset = screen.getByRole('link', { name: /Nullstill filtre/i });
  expect(reset).toHaveAttribute('href', '/hurtigkort?q=pumpe');

  await userEvent.click(reset);

  expect(screen.getByRole('link', { name: 'Pumpe og vannforsyning' })).toBeInTheDocument();
  expect(screen.queryByText(/treff skjult av filtre/i)).not.toBeInTheDocument();
});

it('shows answers before filters after the user enters a query', async () => {
  render(<SearchBox documents={docs} enableFilters />);

  await userEvent.type(screen.getByRole('searchbox'), 'tilfluktsrom');

  const firstResult = screen.getByRole('link', { name: 'Rens CBRN' });
  const filters = screen.getByRole('group', { name: /Søkefiltre/i });
  expect(Boolean(firstResult.compareDocumentPosition(filters) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
});
