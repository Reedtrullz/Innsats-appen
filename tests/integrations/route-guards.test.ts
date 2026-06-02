import {
  guardAllowedQuery,
  guardExternalContextSignals,
  guardLatLon,
  guardSupportedUpstreamPath,
  jsonGuardError,
} from '@/lib/integrations/route-guards';

const validSignal = {
  source: 'met',
  kind: 'weather',
  severity: 'info',
  title: 'Vær',
  summary: 'OK',
  validFrom: null,
  validTo: null,
  fetchedAt: '2026-06-02T20:00:00.000Z',
  staleness: 'fresh',
  upstreamHash: 'abc123',
  rawRef: 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=63.4&lon=10.4',
};

it('rejects invalid or missing lat/lon with a 400 guard result', async () => {
  for (const params of ['', 'lat=&lon=10', 'lat=abc&lon=10', 'lat=91&lon=10', 'lat=63.4']) {
    const result = guardLatLon(new URLSearchParams(params));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect((await jsonGuardError(result).json()).error).toMatch(/lat\/lon/i);
    }
  }
  expect(guardLatLon(new URLSearchParams('lat=63.43001&lon=10.39001'))).toEqual({ ok: true, value: { lat: 63.43, lon: 10.39 } });
});

it('rejects unsupported upstream paths and generic proxy/query parameters', () => {
  expect(guardSupportedUpstreamPath('/weatherapi/locationforecast/2.0/compact', ['/weatherapi/locationforecast/2.0/compact']).ok).toBe(true);
  expect(guardSupportedUpstreamPath('/evil/proxy', ['/weatherapi/locationforecast/2.0/compact']).ok).toBe(false);
  expect(guardSupportedUpstreamPath('https://evil.example/api', ['/weatherapi/locationforecast/2.0/compact']).ok).toBe(false);

  for (const key of ['url', 'upstream', 'proxy', 'target', 'href']) {
    const result = guardAllowedQuery(new URLSearchParams(`${key}=https://evil.example`), ['lat', 'lon']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  }
  expect(guardAllowedQuery(new URLSearchParams('q=Trondheim&extra=1'), ['q']).ok).toBe(false);
});

it('accepts only external context signals, not action-card-shaped payloads', () => {
  expect(guardExternalContextSignals([validSignal]).ok).toBe(true);
  expect(guardExternalContextSignals([{ ...validSignal, steps: ['Tiltak'], sourceIds: ['src-1'] }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, rawPayload: { secret: true } }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, source: 123 }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, validFrom: 123 }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, upstreamHash: { hash: 'bad' } }]).ok).toBe(false);
});
