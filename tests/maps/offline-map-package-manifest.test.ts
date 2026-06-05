import { describe, expect, it } from 'vitest';
import { LocalMapPackageManifestSchema, approvedLocalMapPackages, localMapPackageForId } from '@/lib/maps/offline-map-package-manifest';

const validManifest = {
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
} as const;

describe('local offline map package manifest', () => {
  it('accepts only browser-local PMTiles package URLs with attribution and bounds', () => {
    const parsed = LocalMapPackageManifestSchema.parse(validManifest);

    expect(parsed.runtimeFormat).toBe('pmtiles');
    expect(parsed.url).toBe('/map-packages/trondheim-demo.pmtiles');
  });

  it('rejects external tile URLs and unapproved packages', () => {
    const base = {
      ...validManifest,
      id: 'bad',
      title: 'Bad package',
      provider: 'kartverket',
      url: '/map-packages/bad.pmtiles',
      styleUrl: '/map-packages/bad-style.json',
      attribution: '©Kartverket approved local package attribution.',
      provenance: 'Approved package provenance fixture with documented offline rights.',
    };

    expect(LocalMapPackageManifestSchema.safeParse({ ...base, url: 'https://opencache.statkart.no/foo.pmtiles' }).success).toBe(false);
    expect(LocalMapPackageManifestSchema.safeParse({ ...base, url: '/map-packages/bad.pmtiles', approvedForOfflineUse: false }).success).toBe(false);
  });

  it('rejects dot-segment traversal outside the local map package directory', () => {
    expect(LocalMapPackageManifestSchema.safeParse({ ...validManifest, url: '/map-packages/../escape.pmtiles' }).success).toBe(false);
    expect(LocalMapPackageManifestSchema.safeParse({ ...validManifest, styleUrl: '/map-packages/styles/../escape.json' }).success).toBe(false);
  });

  it('rejects external style URLs and query or hash suffixes on local assets', () => {
    expect(LocalMapPackageManifestSchema.safeParse({ ...validManifest, styleUrl: 'https://example.invalid/style.json' }).success).toBe(false);
    expect(LocalMapPackageManifestSchema.safeParse({ ...validManifest, url: '/map-packages/trondheim-demo.pmtiles?token=secret' }).success).toBe(false);
    expect(LocalMapPackageManifestSchema.safeParse({ ...validManifest, styleUrl: '/map-packages/trondheim-demo-style.json#layer' }).success).toBe(false);
  });

  it('rejects manifests where minZoom exceeds maxZoom', () => {
    expect(LocalMapPackageManifestSchema.safeParse({ ...validManifest, minZoom: 15, maxZoom: 8 }).success).toBe(false);
  });

  it('exposes approved packages by id without replacing schematic packages', () => {
    expect(approvedLocalMapPackages).toHaveLength(0);
    expect(Object.isFrozen(approvedLocalMapPackages)).toBe(true);
    expect(localMapPackageForId('missing')).toBeUndefined();
  });
});
