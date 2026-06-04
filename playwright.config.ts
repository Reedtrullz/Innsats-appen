import { defineConfig } from '@playwright/test';

const prod = process.env.PLAYWRIGHT_PROD === '1';
const port = process.env.PLAYWRIGHT_PORT ?? '3000';
if (!/^\d+$/.test(port)) throw new Error('PLAYWRIGHT_PORT must be a numeric TCP port');
const baseURL = `http://127.0.0.1:${port}`;
const withOptionalNvm = (command: string) =>
  `bash -lc 'if [ -s "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh" && nvm use 22 >/dev/null; fi; PORT=${port} ${command}'`;

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: prod ? withOptionalNvm('npm run start') : withOptionalNvm('npm run dev'),
    url: baseURL,
    reuseExistingServer: !prod,
    timeout: 120_000,
  },
  use: {
    baseURL,
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
