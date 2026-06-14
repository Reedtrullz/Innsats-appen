import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    // Several component tests drive userEvent typing / git subprocess fixtures
    // that legitimately run multiple seconds. The 5s default flakes under full
    // parallel-suite load (and on shared CI runners). Raise the ceiling so a
    // slow-but-correct test passes; genuine hangs and assertion failures are
    // unaffected.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
