import { defineConfig } from '@playwright/test';

const prod = process.env.PLAYWRIGHT_PROD === '1';
const port = process.env.PLAYWRIGHT_PORT ?? '3000';
if (!/^\d+$/.test(port)) throw new Error('PLAYWRIGHT_PORT must be a numeric TCP port');
const baseURL = `http://127.0.0.1:${port}`;
const withNode22 = (command: string) =>
  `bash -lc 'unset npm_config_prefix; if [ -s "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh"; nvm use 22 >/dev/null; fi; node -e "if (!/^v22\\./.test(process.version)) process.exit(2)"; PORT=${port} ${command}'`;

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: prod ? withNode22('npm run start') : withNode22('npm run dev'),
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
