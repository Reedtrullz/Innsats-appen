import { afterEach, expect, it, vi } from 'vitest';
import { GET as geocodeGET } from '@/app/api/context/geocode/route';
import { GET as hazardsGET } from '@/app/api/context/hazards/route';
import { GET as weatherGET } from '@/app/api/context/weather/route';
import { checkContextRateLimit, resetContextRateLimitForTests } from '@/lib/integrations/context-rate-limit';

const privateNoStore = 'private, no-store';

function expectPrivateNoStore(response: Response) {
  const cacheControl = response.headers.get('Cache-Control');
  expect(cacheControl).toBe(privateNoStore);
  expect(cacheControl).not.toMatch(/s-maxage|stale-while-revalidate/i);
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetContextRateLimitForTests();
});

function kartverketFetchFixture() {
  return vi.fn(async (url: string) => {
    if (url.includes('/adresser/')) {
      return new Response(JSON.stringify({
        adresser: [{
          adressetekst: 'Munkegata 1',
          kommunenavn: 'Trondheim',
          adressekode: 123,
          representasjonspunkt: { lat: 63.43, lon: 10.39 },
        }],
      }));
    }
    if (url.includes('/stedsnavn/')) {
      return new Response(JSON.stringify({
        navn: [{
          stedsnummer: 456,
          skrivemåte: 'Trondheim',
          navneobjekttype: 'By',
          representasjonspunkt: { nord: 63.43, øst: 10.39 },
        }],
      }));
    }
    if (url.includes('/kommuneinfo/') && url.includes('knavn=Trondheim')) {
      return new Response(JSON.stringify({ kommuner: [{ kommunenavn: 'Trondheim', kommunenummer: '5001' }] }));
    }
    return new Response(JSON.stringify({ error: `unexpected Kartverket URL ${url}` }), { status: 400 });
  });
}

function metFetchFixture() {
  return vi.fn(async (url: string) => {
    if (url.includes('locationforecast')) {
      return new Response(JSON.stringify({
        properties: {
          meta: { updated_at: '2026-06-02T20:00:00Z' },
          timeseries: [{
            time: '2026-06-02T20:00:00Z',
            data: { instant: { details: { air_temperature: 12, wind_speed: 4 } } },
          }],
        },
      }));
    }
    if (url.includes('metalerts')) {
      return new Response(JSON.stringify({
        features: [{
          id: 'alert-1',
          properties: {
            event: 'rain',
            awareness_level: '2; yellow',
            description: 'Regn',
            onset: '2026-06-02T20:00:00Z',
            expires: '2026-06-03T20:00:00Z',
          },
          geometry: { type: 'Point', coordinates: [10.39, 63.43] },
        }],
      }));
    }
    return new Response(JSON.stringify({ error: `unexpected MET URL ${url}` }), { status: 400 });
  });
}

function nveFetchFixture() {
  return vi.fn(async (url: string) => {
    if (!url.includes('/api/Warning/Municipality/5001/1/2026-06-02/2026-06-03')) {
      return new Response(JSON.stringify({ error: `unexpected NVE URL ${url}` }), { status: 404 });
    }
    if (url.includes('/flood/')) {
      return new Response(JSON.stringify([{
        EventId: 'flood-1',
        Area: 'Trondheim',
        ActivityLevel: 3,
        LevelMeaningText: 'Betydelig',
        DangerTypeName: 'Flomfare',
        MainText: 'Varsel om flom',
        ValidFrom: '02/06/2026 07:00:00',
        ValidTo: '03/06/2026 07:00:00',
      }]));
    }
    if (url.includes('/landslide/')) {
      return new Response(JSON.stringify([{
        EventId: 'landslide-1',
        Area: 'Trondheim',
        ActivityLevel: 2,
        LevelMeaningText: 'Moderat',
        DangerTypeName: 'Jordskredfare',
        MainText: 'Varsel om jordskred',
        ValidFrom: '02/06/2026 07:00:00',
        ValidTo: '03/06/2026 07:00:00',
      }]));
    }
    return new Response(JSON.stringify({ error: `unknown NVE endpoint ${url}` }), { status: 404 });
  });
}

it('does not emit shared cache headers for geocode lookups', async () => {
  vi.stubGlobal('fetch', kartverketFetchFixture());

  const response = await geocodeGET(new Request('http://test/api/context/geocode?q=Trondheim'));

  expect(response.status).toBe(200);
  expectPrivateNoStore(response);
});

it('does not emit shared cache headers for weather lookups', async () => {
  vi.stubGlobal('fetch', metFetchFixture());

  const response = await weatherGET(new Request('http://test/api/context/weather?lat=63.43&lon=10.39'));

  expect(response.status).toBe(200);
  expectPrivateNoStore(response);
});

it('does not emit shared cache headers for hazard lookups', async () => {
  vi.stubGlobal('fetch', nveFetchFixture());

  const response = await hazardsGET(new Request('http://test/api/context/hazards?municipality=5001&start=2026-06-02&end=2026-06-03'));

  expect(response.status).toBe(200);
  expectPrivateNoStore(response);
});

it('adds private no-store to geocode guard and manual error responses', async () => {
  const responses = await Promise.all([
    geocodeGET(new Request('http://test/api/context/geocode?q=01010112345')),
    geocodeGET(new Request('http://test/api/context/geocode?q=Trondheim&lat=63.43&lon=10.39')),
  ]);

  for (const response of responses) {
    expect(response.status).toBe(400);
    expectPrivateNoStore(response);
  }
});

it('adds private no-store to weather guard error responses', async () => {
  const response = await weatherGET(new Request('http://test/api/context/weather?lat=abc&lon=10'));

  expect(response.status).toBe(400);
  expectPrivateNoStore(response);
});

it('adds private no-store to hazard guard and manual error responses', async () => {
  const responses = await Promise.all([
    hazardsGET(new Request('http://test/api/context/hazards?url=https://example.invalid')),
    hazardsGET(new Request('http://test/api/context/hazards?municipality=abc')),
    hazardsGET(new Request('http://test/api/context/hazards?municipality=5001&start=bad-date')),
  ]);

  for (const response of responses) {
    expect(response.status).toBe(400);
    expectPrivateNoStore(response);
  }
});

it('adds private no-store to upstream failure error responses', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'upstream unavailable' }), { status: 503 })));
  const responses = await Promise.all([
    geocodeGET(new Request('http://test/api/context/geocode?q=Trondheim')),
    weatherGET(new Request('http://test/api/context/weather?lat=63.43&lon=10.39')),
    hazardsGET(new Request('http://test/api/context/hazards?municipality=5001&start=2026-06-02&end=2026-06-03')),
  ]);

  for (const response of responses) {
    expect(response.status).toBe(502);
    expectPrivateNoStore(response);
  }
});

it('returns private no-store rate-limit responses for context API bursts', async () => {
  const fetchFixture = kartverketFetchFixture();
  vi.stubGlobal('fetch', fetchFixture);

  const requests = await Promise.all(Array.from({ length: 8 }, () =>
    geocodeGET(new Request('http://test/api/context/geocode?lat=63.43&lon=10.39', {
      headers: { 'x-real-ip': '203.0.113.10', 'x-forwarded-for': '198.51.100.99' },
    })),
  ));

  const limited = requests.filter((response) => response.status === 429);
  expect(limited).toHaveLength(2);
  expect(fetchFixture).toHaveBeenCalledTimes(6);
  for (const response of limited) {
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(await response.json()).toEqual({ error: 'rate limit exceeded' });
  }
});

it('ignores spoofed x-forwarded-for values for context API rate limits', async () => {
  vi.stubGlobal('fetch', metFetchFixture());

  const requests = await Promise.all(Array.from({ length: 8 }, (_, index) =>
    weatherGET(new Request('http://test/api/context/weather?lat=63.43&lon=10.39', {
      headers: { 'x-forwarded-for': `203.0.113.${index + 1}` },
    })),
  ));

  const limited = requests.filter((response) => response.status === 429);
  expect(limited).toHaveLength(2);
  for (const response of limited) {
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(await response.json()).toEqual({ error: 'rate limit exceeded' });
  }
});

it('normalizes invalid x-real-ip values to the shared local rate-limit bucket', () => {
  const now = 1_000;
  const decisions = Array.from({ length: 8 }, (_, index) => checkContextRateLimit(new Request('http://test/api/context/weather', {
    headers: {
      'x-real-ip': `203.0.113.${index}-${'x'.repeat(64)}`,
      'x-forwarded-for': `198.51.100.${index}`,
    },
  }), 'weather', now));

  const limited = decisions.filter((decision) => !decision.ok);
  expect(limited).toHaveLength(2);
  for (const decision of limited) {
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
  }
});

it('does not spend rate-limit budget on rejected guard queries', async () => {
  const fetchFixture = metFetchFixture();
  vi.stubGlobal('fetch', fetchFixture);
  const headers = { 'x-real-ip': '203.0.113.44' };

  const invalidRequests = await Promise.all(Array.from({ length: 8 }, () =>
    weatherGET(new Request('http://test/api/context/weather?lat=abc&lon=10.39', { headers })),
  ));
  for (const response of invalidRequests) {
    expect(response.status).toBe(400);
    expectPrivateNoStore(response);
  }

  const validResponse = await weatherGET(new Request('http://test/api/context/weather?lat=63.43&lon=10.39', { headers }));

  expect(validResponse.status).toBe(200);
  expectPrivateNoStore(validResponse);
  expect(fetchFixture).toHaveBeenCalled();
});

it('evicts oldest rate-limit buckets once the bucket cap is reached', () => {
  const now = 1_000;
  expect(checkContextRateLimit(new Request('http://test/api/context/weather', {
    headers: { 'x-real-ip': '203.0.113.1' },
  }), 'weather', now)).toEqual({ ok: true });

  for (let index = 2; index <= 1_001; index += 1) {
    expect(checkContextRateLimit(new Request('http://test/api/context/weather', {
      headers: { 'x-real-ip': `bucket-${index}` },
    }), 'weather', now)).toEqual({ ok: true });
  }

  const oldestBucketRequests = Array.from({ length: 6 }, () =>
    checkContextRateLimit(new Request('http://test/api/context/weather', {
      headers: { 'x-real-ip': '203.0.113.1' },
    }), 'weather', now),
  );

  expect(oldestBucketRequests).toEqual(Array.from({ length: 6 }, () => ({ ok: true })));
  expect(checkContextRateLimit(new Request('http://test/api/context/weather', {
    headers: { 'x-real-ip': '203.0.113.1' },
  }), 'weather', now).ok).toBe(false);
});
