import { defineConfig } from '@playwright/test';

const prod = process.env.PLAYWRIGHT_PROD === '1';
const withOptionalNvm = (command: string) =>
  `bash -lc 'if [ -s "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh" && nvm use 22 >/dev/null; fi; ${command}'`;

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: prod ? withOptionalNvm('npm run start') : withOptionalNvm('npm run dev'),
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
