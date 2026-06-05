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
  // Keep empty until a real local package file and provenance docs exist.
  // The schematic map remains the production fallback.
];

export const approvedLocalMapPackages: readonly LocalMapPackageManifest[] = Object.freeze(
  z.array(LocalMapPackageManifestSchema).parse(approvedLocalMapPackageManifests),
);

export function localMapPackageForId(id: string | null | undefined) {
  return approvedLocalMapPackages.find((mapPackage) => mapPackage.id === id);
}
