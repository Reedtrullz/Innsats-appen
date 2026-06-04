import { expect, test } from '@playwright/test';

const rejectedContextUrls = [
  '/api/context/geocode?url=https://example.invalid',
  '/api/context/weather?lat=abc&lon=10',
  '/api/context/hazards?municipality=abc',
  '/api/context/hazards?municipality=5001&start=2026-06-04&end=2026-06-02',
];

const publicLeakPattern = /MET_USER_AGENT|api\.met\.no|api\.kartverket\.no|Warning\/Municipality|https?:\/\/|locationforecast|kommuneinfo|2026-06-02/i;

async function readPublicJson(response: { text: () => Promise<string> }) {
  const text = await response.text();
  expect(text).not.toMatch(publicLeakPattern);
  return JSON.parse(text) as unknown;
}

test.describe('context API cache privacy', () => {
  for (const url of rejectedContextUrls) {
    test(`${url} is private no-store when rejected`, async ({ request }) => {
      const response = await request.get(url);
      const cacheControl = response.headers()['cache-control'];

      expect(response.status()).toBe(400);
      expect(cacheControl).toBe('private, no-store');
      expect(cacheControl).not.toMatch(/s-maxage|stale-while-revalidate/i);
      expect(await readPublicJson(response)).toHaveProperty('error');
    });
  }
});
