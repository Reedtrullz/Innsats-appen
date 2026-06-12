import { z } from 'zod';

const LOCAL_MAP_PACKAGE_PREFIX = '/map-packages/';
const localAssetPath = (extension: 'pmtiles' | 'json') =>
  z
    .string()
    .regex(
      new RegExp(`^${LOCAL_MAP_PACKAGE_PREFIX}[A-Za-z0-9._/-]+\\.${extension}$`),
      `Map package assets must be app-local /map-packages ${extension} paths`,
    )
    .refine((assetPath) => {
      const relativePath = assetPath.slice(LOCAL_MAP_PACKAGE_PREFIX.length);
      return relativePath.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
    }, 'Map package assets must not contain dot-segment traversal');
const lon = z.number().min(-180).max(180);
const lat = z.number().min(-90).max(90);

export const LocalMapPackageManifestSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(3).max(80),
    provider: z.enum(['training-demo', 'kartverket', 'osm-derived', 'custom-approved']),
    runtimeFormat: z.literal('pmtiles'),
    sourceFormat: z.enum(['pmtiles', 'mbtiles', 'geojson-derived']),
    url: localAssetPath('pmtiles'),
    styleUrl: localAssetPath('json'),
    attribution: z.string().min(5).max(240),
    version: z.string().min(3).max(40),
    updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    estimatedSizeMb: z.number().positive().max(250),
    bounds: z.tuple([lon, lat, lon, lat]),
    center: z.tuple([lon, lat]),
    minZoom: z.number().int().min(0).max(22),
    maxZoom: z.number().int().min(0).max(22),
    approvedForOfflineUse: z.literal(true),
    provenance: z.string().min(12).max(500),
  })
  .refine((manifest) => manifest.minZoom <= manifest.maxZoom, {
    message: 'minZoom must be less than or equal to maxZoom',
    path: ['maxZoom'],
  });

export type LocalMapPackageManifest = z.infer<typeof LocalMapPackageManifestSchema>;

const approvedLocalMapPackageManifests: unknown[] = [
  // OSM-derived extracts from the Protomaps daily build. Binaries are GitHub
  // release assets fetched by `npm run map:fetch` (checksums in
  // scripts/map-packages.sha256); only styles/manifests live in git. The
  // styles deliberately have no text layers yet (no glyph fetches → no false
  // fallback on missing font ranges); labelled styles are a follow-up.
  {
    id: 'trondheim-osm',
    title: 'Trondheim lokal (OSM-utdrag)',
    provider: 'osm-derived',
    runtimeFormat: 'pmtiles',
    sourceFormat: 'pmtiles',
    url: '/map-packages/trondheim-osm.pmtiles',
    styleUrl: '/map-packages/trondheim-osm-style.json',
    attribution: '© OpenStreetMap-bidragsytere (ODbL). Uten tekstlag; ikke autoritativ navigasjon.',
    version: '20260610',
    updatedAt: '2026-06-12',
    estimatedSizeMb: 16,
    bounds: [10.0, 63.3, 10.75, 63.5],
    center: [10.375, 63.4],
    minZoom: 11,
    maxZoom: 15,
    approvedForOfflineUse: true,
    provenance:
      'pmtiles extract https://build.protomaps.com/20260610.pmtiles --bbox=10.0,63.30,10.75,63.50 --maxzoom=15 (Protomaps Basemap v4.14.9, OpenStreetMap/ODbL). sha256-prefiks 0c763de5c6276153. Ingen eksterne kall i runtime.',
  },
  {
    id: 'trondelag-osm',
    title: 'Trøndelag oversikt (OSM-utdrag)',
    provider: 'osm-derived',
    runtimeFormat: 'pmtiles',
    sourceFormat: 'pmtiles',
    url: '/map-packages/trondelag-osm.pmtiles',
    styleUrl: '/map-packages/trondelag-osm-style.json',
    attribution: '© OpenStreetMap-bidragsytere (ODbL). Uten tekstlag; ikke autoritativ navigasjon.',
    version: '20260610',
    updatedAt: '2026-06-12',
    estimatedSizeMb: 69,
    bounds: [7.9, 62.2, 14.5, 65.5],
    center: [10.4, 63.43],
    minZoom: 7,
    maxZoom: 11,
    approvedForOfflineUse: true,
    provenance:
      'pmtiles extract https://build.protomaps.com/20260610.pmtiles --bbox=7.9,62.2,14.5,65.5 --maxzoom=11 (Protomaps Basemap v4.14.9, OpenStreetMap/ODbL). sha256-prefiks 0a62dab7fe56d1cf. Ingen eksterne kall i runtime.',
  },
];

export const approvedLocalMapPackages: readonly LocalMapPackageManifest[] = Object.freeze(
  z.array(LocalMapPackageManifestSchema).parse(approvedLocalMapPackageManifests),
);

export function localMapPackageForId(id: string | null | undefined) {
  return approvedLocalMapPackages.find((mapPackage) => mapPackage.id === id);
}
