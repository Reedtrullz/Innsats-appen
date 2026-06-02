import fs from 'node:fs';
import path from 'node:path';
import { importObsidianSources } from '@/scripts/import-obsidian';

it('copies approved assets and skips generic icons', async () => {
  const publicDir = 'tests/.tmp/public-assets';
  fs.rmSync(publicDir, { recursive: true, force: true });
  const result = await importObsidianSources('tests/fixtures/obsidian-assets', {
    generatedDir: 'tests/.tmp/generated-assets',
    publicAssetsDir: publicDir,
    publicGeneratedDir: 'tests/.tmp/generated-public',
    minRealSourceCount: 0,
  });
  expect(result.copiedAssets).toHaveLength(1);
  expect(fs.existsSync(path.join(publicDir, 'CBRN_1.png'))).toBe(true);
  expect(fs.existsSync(path.join(publicDir, 'i-icon-32.png'))).toBe(false);
});
