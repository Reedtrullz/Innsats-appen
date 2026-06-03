import { GET } from '@/app/api/context/hazards/route';
import { fetchNveHazardSignals, refreshNveSourceHealth } from '@/lib/integrations/nve';

function nveFetchFixture() {
  return async (url: string) => {
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
  const signals = await fetchNveHazardSignals({ municipality: '5001', start: '2026-06-02', end: '2026-06-03', fetchImpl: nveFetchFixture() });
  expect(signals.map((signal) => signal.kind)).toEqual(expect.arrayContaining(['flood-warning', 'landslide-warning']));
  expect(signals[0]?.source).toBe('nve');
  expect(signals.every((signal) => signal.upstreamId && signal.upstreamHash)).toBe(true);
  expect(new Set(signals.map((signal) => signal.upstreamId)).size).toBe(signals.length);
  expect(signals.every((signal) => !signal.upstreamId?.includes('xxx'))).toBe(true);
  expect(signals.some((signal: any) => signal.steps)).toBe(false);
  expect(signals.map((signal) => signal.rawRef)).toEqual(expect.arrayContaining(['nve:flood-warning', 'nve:landslide-warning']));
});

it('rejects malformed hazard route queries', async () => {
  for (const query of ['url=https://evil.example', 'municipality=abc', 'municipality=0000', 'municipality=5001&municipality=5002', 'municipality=5001&start=bad-date', 'municipality=5001&start=2026-99-99', 'municipality=5001&start=2026-06-04&end=2026-06-03', 'municipality=5001&start=2026-06-02&end=2026-06-20', 'municipality=5001&start=2030-01-01']) {
    const response = await GET(new Request(`http://localhost/api/context/hazards?${query}`));
    expect(response.status).toBe(400);
  }
});

it('keeps last successful NVE source health after failed snapshot', async () => {
  const success = await refreshNveSourceHealth({ source: 'nve', lastSuccessfulSignals: [] }, { municipality: '5001', start: '2026-06-02', end: '2026-06-03', fetchImpl: nveFetchFixture() });
  expect(success.lastSuccessfulSignals.length).toBeGreaterThan(0);
  const failed = await refreshNveSourceHealth(success, { municipality: '5001', start: '2026-06-02', end: '2026-06-03', fetchImpl: async () => new Response('{}', { status: 502 }) });
  expect(failed.lastSuccessfulSignals).toEqual(success.lastSuccessfulSignals);
  expect(failed.lastError).toMatch(/NVE returned/);
});
