import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'cloudflare-static.spec.ts',
  retries: 0,
  webServer: {
    command: 'npx wrangler dev --config dist/server/wrangler.json --port 8787',
    url: 'http://127.0.0.1:8787/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:8787',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
  },
});
