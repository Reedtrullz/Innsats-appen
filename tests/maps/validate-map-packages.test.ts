import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateMapPackageFiles } from '@/scripts/validate-map-packages';

async function tempRoot() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'innsats-map-packages-'));
}

describe('validate map package files', () => {
  it('rejects styles that reference external tile URLs', async () => {
    const root = await tempRoot();
    await fs.mkdir(path.join(root, 'public/map-packages'), { recursive: true });
    await fs.writeFile(path.join(root, 'public/map-packages/trondheim-demo.pmtiles'), 'fixture');
    await fs.writeFile(path.join(root, 'public/map-packages/trondheim-demo-style.json'), JSON.stringify({
      version: 8,
      sources: { base: { type: 'vector', tiles: ['https://tiles.example.test/{z}/{x}/{y}.pbf'] } },
      layers: [],
    }));

    await expect(validateMapPackageFiles({ rootDir: root, packages: [{
      id: 'trondheim-demo-pmtiles',
      url: '/map-packages/trondheim-demo.pmtiles',
      styleUrl: '/map-packages/trondheim-demo-style.json',
    }] })).rejects.toThrow(/external tile URL/i);
  });

  it('passes when referenced package/style files exist and style uses pmtiles only', async () => {
    const root = await tempRoot();
    await fs.mkdir(path.join(root, 'public/map-packages'), { recursive: true });
    await fs.writeFile(path.join(root, 'public/map-packages/trondheim-demo.pmtiles'), 'fixture');
    await fs.writeFile(path.join(root, 'public/map-packages/trondheim-demo-style.json'), JSON.stringify({
      version: 8,
      sources: { base: { type: 'vector', url: 'pmtiles:///map-packages/trondheim-demo.pmtiles' } },
      layers: [],
    }));

    await expect(validateMapPackageFiles({ rootDir: root, packages: [{
      id: 'trondheim-demo-pmtiles',
      url: '/map-packages/trondheim-demo.pmtiles',
      styleUrl: '/map-packages/trondheim-demo-style.json',
    }] })).resolves.toEqual({ checked: 1 });
  });
});
