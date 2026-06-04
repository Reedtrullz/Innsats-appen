import { expect, test } from '@playwright/test';

const rejectedContextUrls = [
  '/api/context/geocode?url=https://example.invalid',
  '/api/context/weather?lat=abc&lon=10',
  '/api/context/hazards?municipality=abc',
];

test.describe('context API cache privacy', () => {
  for (const url of rejectedContextUrls) {
    test(`${url} is private no-store when rejected`, async ({ request }) => {
      const response = await request.get(url);
      const cacheControl = response.headers()['cache-control'];

      expect(response.status()).toBe(400);
      expect(cacheControl).toBe('private, no-store');
      expect(cacheControl).not.toMatch(/s-maxage|stale-while-revalidate/i);
    });
  }
});
