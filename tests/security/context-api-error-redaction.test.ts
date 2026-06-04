import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/met', () => ({ fetchMetSignals: vi.fn() }));
vi.mock('@/lib/integrations/kartverket', () => ({ fetchKartverketSignals: vi.fn() }));
vi.mock('@/lib/integrations/nve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/integrations/nve')>();
  return { ...actual, fetchNveHazardSignals: vi.fn() };
});

import { GET as weatherGET } from '@/app/api/context/weather/route';
import { GET as geocodeGET } from '@/app/api/context/geocode/route';
import { GET as hazardsGET } from '@/app/api/context/hazards/route';
import { fetchMetSignals } from '@/lib/integrations/met';
import { fetchKartverketSignals } from '@/lib/integrations/kartverket';
import { fetchNveHazardSignals } from '@/lib/integrations/nve';

afterEach(() => vi.clearAllMocks());

it('redacts upstream error details from weather responses', async () => {
  vi.mocked(fetchMetSignals).mockRejectedValueOnce(new Error('MET_USER_AGENT must include real contact information in production'));

  const response = await weatherGET(new Request('http://test/api/context/weather?lat=63&lon=10'));
  const jsonText = await response.clone().text();

  expect(response.status).toBe(502);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toEqual({ error: 'weather unavailable' });
  expect(jsonText).not.toMatch(/MET_USER_AGENT|contact information|api\.met\.no|weatherapi/i);
});

it('redacts upstream path and URL details from geocode responses', async () => {
  vi.mocked(fetchKartverketSignals).mockRejectedValueOnce(new Error('Kartverket returned 502 for /kommuneinfo/v1/sok?knavn=Trondheim https://api.kartverket.no/kommuneinfo/v1/sok'));

  const response = await geocodeGET(new Request('http://test/api/context/geocode?q=Trondheim'));
  const jsonText = await response.clone().text();

  expect(response.status).toBe(502);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toEqual({ error: 'geocode unavailable' });
  expect(jsonText).not.toMatch(/kommuneinfo|api\.kartverket\.no|Trondheim/);
});

it('redacts upstream path details from hazards responses', async () => {
  vi.mocked(fetchNveHazardSignals).mockRejectedValueOnce(new Error('NVE returned 503 for /api/Warning/Municipality/5001/1/2026-06-02/2026-06-03'));

  const response = await hazardsGET(new Request('http://test/api/context/hazards?municipality=5001&start=2026-06-02&end=2026-06-03'));
  const jsonText = await response.clone().text();

  expect(response.status).toBe(502);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toEqual({ error: 'hazards unavailable' });
  expect(jsonText).not.toMatch(/Warning\/Municipality|5001|2026-06-02|NVE returned/);
});

it('redacts hazards date range exception details', async () => {
  const response = await hazardsGET(new Request('http://test/api/context/hazards?municipality=5001&start=2026-06-04&end=2026-06-03'));
  const jsonText = await response.clone().text();

  expect(response.status).toBe(400);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(await response.json()).toEqual({ error: 'invalid date range' });
  expect(jsonText).not.toMatch(/2026-06-04|2026-06-03/);
});
