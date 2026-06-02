import { defineConfig } from '@playwright/test';

const prod = process.env.PLAYWRIGHT_PROD === '1';

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: prod
      ? 'source ~/.nvm/nvm.sh && nvm use 22 && npm run start'
      : 'source ~/.nvm/nvm.sh && nvm use 22 && npm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !prod,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3000',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
});
