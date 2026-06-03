import { afterEach, vi } from 'vitest';
import { GET } from '@/app/api/context/geocode/route';
import { fetchKartverketSignals } from '@/lib/integrations/kartverket';

afterEach(() => {
  vi.unstubAllGlobals();
});

function kartverketFetchFixture() {
  return vi.fn(async (url: string) => {
    if (url.includes('/adresser/')) {
      return new Response(JSON.stringify({ adresser: [{ adressetekst: 'Munkegata 1', kommunenavn: 'Trondheim', adressekode: 123, representasjonspunkt: { lat: 63.43, lon: 10.39 } }] }));
    }
    if (url.includes('/stedsnavn/')) {
      return new Response(JSON.stringify({ navn: [{ stedsnummer: 456, skrivemåte: 'Trondheim', navneobjekttype: 'By', representasjonspunkt: { nord: 63.43, øst: 10.39 } }] }));
    }
    if (url.includes('/kommuneinfo/') && url.includes('knavn=Trondheim')) {
      return new Response(JSON.stringify({ kommuner: [{ kommunenavn: 'Trondheim', kommunenummer: '5001' }] }));
    }
    return new Response(JSON.stringify({ error: 'wrong fixture URL' }), { status: 400 });
  });
}

it('maps Kartverket address, stedsnavn and municipality responses with upstream identities', async () => {
  const fetchImpl = kartverketFetchFixture();
  const signals = await fetchKartverketSignals({ q: 'Trondheim', fetchImpl });
  expect(signals.every((signal) => signal.source === 'kartverket')).toBe(true);
  expect(signals.filter((signal) => signal.kind === 'geocode')).toHaveLength(2);
  expect(signals.some((signal) => signal.kind === 'administrative-area')).toBe(true);
  expect(signals.every((signal) => signal.upstreamId || signal.upstreamHash)).toBe(true);
  expect(signals.map((signal) => signal.rawRef)).toEqual(['kartverket:adresse-sok', 'kartverket:stedsnavn-sok', 'kartverket:kommune-sok']);
  expect(fetchImpl.mock.calls.map(([url]) => url).join('\n')).toContain('/sok?knavn=Trondheim');
});

it('serves the geocode route through allowlisted upstream calls only', async () => {
  const fetchMock = kartverketFetchFixture();
  vi.stubGlobal('fetch', fetchMock);
  const response = await GET(new Request('http://localhost/api/context/geocode?q=Trondheim'));
  expect(response.status).toBe(200);
  const signals = await response.json();
  expect(signals.some((signal: any) => signal.kind === 'administrative-area')).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

it('returns partial geocode context if one Kartverket upstream fails', async () => {
  const fetchImpl = vi.fn(async (url: string) => {
    if (url.includes('/adresser/')) return new Response(JSON.stringify({ adresser: [{ adressetekst: 'Munkegata 1', kommunenavn: 'Trondheim', adressekode: 123 }] }));
    if (url.includes('/stedsnavn/')) return new Response(JSON.stringify({ navn: [{ stedsnummer: 456, skrivemåte: 'Trondheim', navneobjekttype: 'By' }] }));
    return new Response(JSON.stringify({ error: 'municipality down' }), { status: 502 });
  });
  const signals = await fetchKartverketSignals({ q: 'Trondheim', fetchImpl });
  expect(signals.filter((signal) => signal.kind === 'geocode')).toHaveLength(2);
});

it('returns an empty geocode signal list when Kartverket succeeds with no matches', async () => {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ adresser: [], navn: [], kommuner: [] })));
  await expect(fetchKartverketSignals({ q: 'NoSuchPlace', fetchImpl })).resolves.toEqual([]);
});

it('rejects malformed geocode route queries before fetch', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  for (const query of ['url=https://evil.example', 'proxy=https://evil.example', '', 'lat=63.4', 'q=Trondheim&lat=63.4&lon=10.4', 'q=Trondheim&q=Oslo', 'q=01010112345', 'q=privat tilfluktsrom ved skole']) {
    const response = await GET(new Request(`http://localhost/api/context/geocode?${query}`));
    expect(response.status).toBe(400);
  }
  expect(fetchMock).not.toHaveBeenCalled();
});
