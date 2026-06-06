import { GET } from '@/app/api/context/hazards/route';
import { guardExternalContextSignals } from '@/lib/integrations/route-guards';
import { fetchNveHazardSignals, getNveAvalancheSourceStatus, refreshNveSourceHealth } from '@/lib/integrations/nve';

function nveFetchFixture() {
  return async (url: string) => {
    if (url.includes('/avalanche/')) {
      return new Response(JSON.stringify({ error: `unsupported avalanche fetch ${url}` }), { status: 500 });
    }
    if (!url.includes('/api/Warning/Municipality/5001/1/2026-06-02/2026-06-03')) {
      return new Response(JSON.stringify({ error: `unexpected url ${url}` }), { status: 404 });
    }
    if (url.includes('/flood/')) {
      return new Response(JSON.stringify([{ EventId: 'xxx', Area: 'Trondheim', ActivityLevel: 3, LevelMeaningText: 'Betydelig', DangerTypeName: 'Flomfare', MainText: 'Varsel om flom', ValidFrom: '02/06/2026 07:00:00', ValidTo: '03/06/2026 07:00:00' }]));
    }
    if (url.includes('/landslide/')) {
      return new Response(JSON.stringify([{ EventId: 'xxx', Area: 'Trondheim', ActivityLevel: 2, LevelMeaningText: 'Moderat', DangerTypeName: 'Jordskredfare', MainText: 'Varsel om jordskred', ValidFrom: '02/06/2026 07:00:00', ValidTo: '03/06/2026 07:00:00' }]));
    }
    return new Response(JSON.stringify({ error: 'unknown NVE endpoint' }), { status: 404 });
  };
}

it('maps NVE flood and landslide warnings as context signals, not action cards', async () => {
  const seenUrls: string[] = [];
  const fixture = nveFetchFixture();
  const signals = await fetchNveHazardSignals({ municipality: '5001', start: '2026-06-02', end: '2026-06-03', fetchImpl: async (url) => { seenUrls.push(url); return fixture(url); } });
  expect(signals.map((signal) => signal.kind)).toEqual(expect.arrayContaining(['flood-warning', 'landslide-warning']));
  expect(seenUrls.some((url) => url.includes('/avalanche/'))).toBe(false);
  expect(signals[0]?.source).toBe('nve');
  expect(signals.every((signal) => signal.upstreamId && signal.upstreamHash)).toBe(true);
  expect(new Set(signals.map((signal) => signal.upstreamId)).size).toBe(signals.length);
  expect(signals.every((signal) => !signal.upstreamId?.includes('xxx'))).toBe(true);
  expect(signals.some((signal: any) => signal.steps)).toBe(false);
  expect(signals.map((signal) => signal.rawRef)).toEqual(expect.arrayContaining(['nve:flood-warning', 'nve:landslide-warning']));
});

it('normalizes invalid NVE dates to null and malformed activity levels to unknown', async () => {
  const signals = await fetchNveHazardSignals({
    municipality: '5001',
    start: '2026-06-02',
    end: '2026-06-03',
    fetchImpl: async (url) => {
      if (!url.includes('/api/Warning/Municipality/5001/1/2026-06-02/2026-06-03')) {
        return new Response(JSON.stringify({ error: `unexpected url ${url}` }), { status: 404 });
      }
      if (url.includes('/flood/')) {
        return new Response(JSON.stringify([
          { EventId: 'xxx', ActivityLevel: '', DangerTypeName: 'Flomfare', MainText: 'Ugyldig dato og tomt nivå', ValidFrom: '30/02/2026 07:00:00', ValidTo: '03/06/2026 25:00:00' },
          { EventId: 'xxx', ActivityLevel: 2.5, DangerTypeName: 'Flomfare', MainText: 'Ikke-heltallsnivå', ValidFrom: '02/06/2026 07:00:00', ValidTo: '03/06/2026 07:00:00' },
          { EventId: 'xxx', ActivityLevel: 5, DangerTypeName: 'Flomfare', MainText: 'For høyt nivå', ValidFrom: '02/06/2026 07:00:00', ValidTo: '03/06/2026 07:00:00' },
          { EventId: 'xxx', ActivityLevel: '3', DangerTypeName: 'Flomfare', MainText: 'Gyldig dato og tekstnivå', ValidFrom: '02/06/2026 07:00:00', ValidTo: '03/06/2026 07:00:00' },
        ]));
      }
      if (url.includes('/landslide/')) {
        return new Response(JSON.stringify([
          { EventId: 'xxx', DangerTypeName: 'Jordskredfare', MainText: 'Manglende nivå', ValidFrom: 'ikke en dato', ValidTo: null },
          { EventId: 'xxx', ActivityLevel: 999, DangerTypeName: 'Jordskredfare', MainText: 'Ekstremt høyt ukjent nivå', ValidFrom: '02/06/2026 07:00:00', ValidTo: '03/06/2026 07:00:00' },
        ]));
      }
      return new Response(JSON.stringify({ error: 'unknown NVE endpoint' }), { status: 404 });
    },
  });

  expect(guardExternalContextSignals(signals).ok).toBe(true);
  expect(signals).toHaveLength(6);
  expect(signals.filter((signal) => signal.severity === 'unknown')).toHaveLength(5);
  expect(signals.find((signal) => signal.summary === 'Ikke-heltallsnivå')?.severity).toBe('unknown');
  expect(signals.find((signal) => signal.summary === 'For høyt nivå')?.severity).toBe('unknown');
  expect(signals.find((signal) => signal.summary === 'Ekstremt høyt ukjent nivå')?.severity).toBe('unknown');
  expect(signals.find((signal) => signal.summary === 'Gyldig dato og tekstnivå')?.severity).toBe('orange');
  expect(signals.find((signal) => signal.summary === 'Gyldig dato og tekstnivå')?.validFrom).toBe('2026-06-02T07:00:00Z');
  expect(signals.find((signal) => signal.summary === 'Ugyldig dato og tomt nivå')?.validFrom).toBeNull();
  expect(signals.find((signal) => signal.summary === 'Ugyldig dato og tomt nivå')?.validTo).toBeNull();
  expect(signals.find((signal) => signal.summary === 'Manglende nivå')?.validFrom).toBeNull();
  expect(signals.find((signal) => signal.summary === 'Manglende nivå')?.validTo).toBeNull();
  expect(signals.every((signal) => !signal.upstreamId?.includes('30/02/2026') && !signal.upstreamId?.includes('ikke en dato'))).toBe(true);
});

it('rejects malformed hazard route queries', async () => {
  for (const query of ['url=https://evil.example', 'municipality=abc', 'municipality=0000', 'municipality=5001&municipality=5002', 'municipality=5001&start=bad-date', 'municipality=5001&start=2026-99-99', 'municipality=5001&start=2026-06-04&end=2026-06-03', 'municipality=5001&start=2026-06-02&end=2026-06-20', 'municipality=5001&start=2030-01-01']) {
    const response = await GET(new Request(`http://localhost/api/context/hazards?${query}`));
    expect(response.status).toBe(400);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  }
});

it('keeps last successful NVE source health after failed snapshot', async () => {
  const success = await refreshNveSourceHealth({ source: 'nve', lastSuccessfulSignals: [] }, { municipality: '5001', start: '2026-06-02', end: '2026-06-03', fetchImpl: nveFetchFixture() });
  expect(success.lastSuccessfulSignals.length).toBeGreaterThan(0);
  const failed = await refreshNveSourceHealth(success, { municipality: '5001', start: '2026-06-02', end: '2026-06-03', fetchImpl: async () => new Response('{}', { status: 502 }) });
  expect(failed.lastSuccessfulSignals).toEqual(success.lastSuccessfulSignals);
  expect(failed.lastError).toMatch(/NVE returned/);
});

it('documents avalanche as pending and preserves NVE cache on 429', async () => {
  expect(getNveAvalancheSourceStatus()?.status).toBe('pending-verification');
  const success = await refreshNveSourceHealth({ source: 'nve', lastSuccessfulSignals: [] }, { municipality: '5001', start: '2026-06-02', end: '2026-06-03', fetchImpl: nveFetchFixture() });
  const rateLimited = await refreshNveSourceHealth(success, { municipality: '5001', start: '2026-06-02', end: '2026-06-03', fetchImpl: async () => new Response('{}', { status: 429, headers: { 'Retry-After': '45' } }) });
  expect(rateLimited.lastSuccessfulSignals).toEqual(success.lastSuccessfulSignals);
  expect(rateLimited.lastErrorStatus).toBe(429);
  expect(rateLimited.retryAfterSeconds).toBe(45);
});
