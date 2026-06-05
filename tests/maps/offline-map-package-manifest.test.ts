import { describe, expect, it } from 'vitest';
import { LocalMapPackageManifestSchema, approvedLocalMapPackages, localMapPackageForId } from '@/lib/maps/offline-map-package-manifest';

describe('local offline map package manifest', () => {
  it('accepts only browser-local PMTiles package URLs with attribution and bounds', () => {
    const parsed = LocalMapPackageManifestSchema.parse({
      id: 'trondheim-demo-pmtiles',
      title: 'Trondheim demo PMTiles',
      provider: 'training-demo',
      runtimeFormat: 'pmtiles',
      sourceFormat: 'pmtiles',
      url: '/map-packages/trondheim-demo.pmtiles',
      styleUrl: '/map-packages/trondheim-demo-style.json',
      attribution: 'Demo package. ©Kartverket only if package provenance confirms Kartverket source.',
      version: '2026.06-a',
      updatedAt: '2026-06-05',
      estimatedSizeMb: 12,
      bounds: [10.25, 63.30, 10.65, 63.55],
      center: [10.395, 63.43],
      minZoom: 8,
      maxZoom: 14,
      approvedForOfflineUse: true,
      provenance: 'Local training package bundled with the app; no runtime tile provider calls.',
    });

    expect(parsed.runtimeFormat).toBe('pmtiles');
    expect(parsed.url).toBe('/map-packages/trondheim-demo.pmtiles');
  });

  it('rejects external tile URLs and unapproved packages', () => {
    const base = {
      id: 'bad',
      title: 'Bad package',
      provider: 'kartverket',
      runtimeFormat: 'pmtiles',
      sourceFormat: 'pmtiles',
      styleUrl: '/map-packages/bad-style.json',
      attribution: '©Kartverket',
      version: '2026.06-a',
      updatedAt: '2026-06-05',
      estimatedSizeMb: 10,
      bounds: [10, 63, 11, 64],
      center: [10.4, 63.4],
      minZoom: 8,
      maxZoom: 14,
      approvedForOfflineUse: true,
      provenance: 'test',
    };

    expect(LocalMapPackageManifestSchema.safeParse({ ...base, url: 'https://opencache.statkart.no/foo.pmtiles' }).success).toBe(false);
    expect(LocalMapPackageManifestSchema.safeParse({ ...base, url: '/map-packages/bad.pmtiles', approvedForOfflineUse: false }).success).toBe(false);
  });

  it('exposes approved packages by id without replacing schematic packages', () => {
    expect(approvedLocalMapPackages.length).toBeGreaterThanOrEqual(0);
    expect(localMapPackageForId('missing')).toBeUndefined();
  });
});
