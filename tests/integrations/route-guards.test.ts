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
  rawRef: 'met:locationforecast',
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
  expect(guardAllowedQuery(new URLSearchParams('q=Trondheim&q=Oslo'), ['q']).ok).toBe(false);
  expect(guardAllowedQuery(new URLSearchParams('Q=Trondheim'), ['q']).ok).toBe(false);
  expect(guardAllowedQuery(new URLSearchParams('lat=63.4&lon=10.4&q=unsupported'), ['lat', 'lon']).ok).toBe(false);
  expect(guardAllowedQuery(new URLSearchParams('municipality=5001&lat=63.4'), ['municipality', 'start', 'end']).ok).toBe(false);
});

it('rejects sensitive or oversized public geocode lookup text', () => {
  for (const q of ['01010112345', 'privat tilfluktsrom ved skole', 'skjermet tilfluktsromliste', 'x'.repeat(121), 'Trondheim\nAdresse']) {
    const result = guardAllowedQuery(new URLSearchParams([['q', q]]), ['q']);
    expect(result.ok, q).toBe(false);
  }
});

it('accepts only external context signals, not action-card-shaped payloads', () => {
  expect(guardExternalContextSignals([validSignal]).ok).toBe(true);
  expect(guardExternalContextSignals([{ ...validSignal, steps: ['Tiltak'], sourceIds: ['src-1'] }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, rawPayload: { secret: true } }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, geometry: { type: 'Point', coordinates: [10.39, 63.43] } }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, source: 123 }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, validFrom: 123 }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, upstreamHash: { hash: 'bad' } }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, fetchedAt: 'not-a-date' }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, validFrom: 'not-a-date' }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, patientName: 'Ola' }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, rawRef: 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=63.4&lon=10.4' }]).ok).toBe(false);
  expect(guardExternalContextSignals([{ ...validSignal, rawRef: 'met:locationforecast?lat=63.4' }]).ok).toBe(false);
});

it('bounds external context signal array size and public string payloads', () => {
  expect(guardExternalContextSignals(Array.from({ length: 50 }, () => validSignal)).ok).toBe(true);
  const tooMany = guardExternalContextSignals(Array.from({ length: 51 }, () => validSignal));
  expect(tooMany.ok).toBe(false);
  if (!tooMany.ok) expect(tooMany.error).toMatch(/at most 50/i);

  for (const signal of [
    { ...validSignal, title: 'x'.repeat(501) },
    { ...validSignal, summary: 'ok\u0001bad' },
    { ...validSignal, kind: 'weather\u0007' },
  ]) {
    const result = guardExternalContextSignals([signal]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/string|control|characters/i);
  }
});
