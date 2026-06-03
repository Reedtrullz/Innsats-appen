import { afterEach, vi } from 'vitest';
import { GET } from '@/app/api/context/weather/route';
import { fetchMetSignals, getMetUserAgent, refreshMetSourceHealth } from '@/lib/integrations/met';

afterEach(() => {
  delete process.env.MET_USER_AGENT;
  vi.unstubAllEnvs();
});

function metFetchFixture() {
  return async (url: string, init?: RequestInit) => {
    const agent = String((init?.headers as Record<string, string>)?.['User-Agent']);
    if (!agent.includes('@')) return new Response(JSON.stringify({ error: 'missing contact' }), { status: 403 });
    if (url.includes('locationforecast')) {
      return new Response(JSON.stringify({ properties: { meta: { updated_at: '2026-06-02T20:00:00Z' }, timeseries: [{ time: '2026-06-02T20:00:00Z', data: { instant: { details: { air_temperature: 12, wind_speed: 4 } } } }] } }));
    }
    return new Response(JSON.stringify({ features: [{ id: 'alert-1', properties: { event: 'rain', awareness_level: '2; yellow', description: 'Regn', onset: '2026-06-02T20:00:00Z', expires: '2026-06-03T20:00:00Z' }, geometry: { type: 'Point', coordinates: [10.39, 63.43] } }] }));
  };
}

it('maps Locationforecast and MetAlerts with contact User-Agent and upstream identities', async () => {
  const signals = await fetchMetSignals({ lat: 63.43, lon: 10.39, userAgent: 'Beredskapsboka/0.1 ops@example.invalid', fetchImpl: metFetchFixture() });
  const weather = signals.find((signal) => signal.kind === 'weather');
  const alert = signals.find((signal) => signal.kind === 'weather-alert');
  expect(weather?.upstreamId).toBe('2026-06-02T20:00:00Z');
  expect(weather?.upstreamHash).toBeTruthy();
  expect(alert?.upstreamId).toBe('alert-1');
  expect(alert?.upstreamHash).toBeTruthy();
  expect(weather?.rawRef).toBe('met:locationforecast');
  expect(alert?.rawRef).toBe('met:alerts-current');
});

it('fails loudly in production when MET_USER_AGENT is missing or placeholder', () => {
  vi.stubEnv('NODE_ENV', 'production');
  delete process.env.MET_USER_AGENT;
  expect(() => getMetUserAgent()).toThrow(/MET_USER_AGENT/);
  process.env.MET_USER_AGENT = 'Beredskapsboka/0.1 contact@example.invalid';
  expect(() => getMetUserAgent()).toThrow(/MET_USER_AGENT/);
  process.env.MET_USER_AGENT = 'Beredskapsboka/0.1 ops@example.com';
  expect(getMetUserAgent()).toContain('ops@example.com');
});

it('rejects malformed weather route coordinates', async () => {
  const response = await GET(new Request('http://localhost/api/context/weather?lat=abc&lon=10'));
  expect(response.status).toBe(400);
});

it('keeps last successful weather source health after failed refresh', async () => {
  const success = await refreshMetSourceHealth({ source: 'met', lastSuccessfulSignals: [] }, { lat: 63.43, lon: 10.39, userAgent: 'Beredskapsboka/0.1 ops@example.invalid', fetchImpl: metFetchFixture() });
  expect(success.lastSuccessfulSignals.length).toBeGreaterThan(0);
  const notModified = await refreshMetSourceHealth(success, { lat: 63.43, lon: 10.39, userAgent: 'Beredskapsboka/0.1 ops@example.invalid', fetchImpl: async () => new Response(null, { status: 304 }) });
  expect(notModified.lastSuccessfulSignals).toEqual(success.lastSuccessfulSignals);
  expect(notModified.lastError).toBeUndefined();

  const forecast304AlertsEmpty = await refreshMetSourceHealth(success, {
    lat: 63.43,
    lon: 10.39,
    userAgent: 'Beredskapsboka/0.1 ops@example.invalid',
    fetchImpl: async (url) => url.includes('locationforecast') ? new Response(null, { status: 304 }) : new Response(JSON.stringify({ features: [] })),
  });
  expect(forecast304AlertsEmpty.lastSuccessfulSignals.map((signal) => signal.kind)).toEqual(['weather']);

  const forecastFreshAlerts304 = await refreshMetSourceHealth(success, {
    lat: 63.43,
    lon: 10.39,
    userAgent: 'Beredskapsboka/0.1 ops@example.invalid',
    fetchImpl: async (url, init) => url.includes('locationforecast') ? metFetchFixture()(url, init) : new Response(null, { status: 304 }),
  });
  expect(forecastFreshAlerts304.lastSuccessfulSignals.map((signal) => signal.kind)).toEqual(['weather', 'weather-alert']);

  const failed = await refreshMetSourceHealth(success, { lat: 63.43, lon: 10.39, userAgent: 'Beredskapsboka/0.1 ops@example.invalid', fetchImpl: async () => { throw new Error('network down'); } });
  expect(failed.lastSuccessfulSignals).toEqual(success.lastSuccessfulSignals);
  expect(failed.lastError).toMatch(/network down/);
});
