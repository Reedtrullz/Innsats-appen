import { z } from 'zod';

const localAssetPath = z.string().regex(/^\/map-packages\/[A-Za-z0-9._/-]+$/, 'Map package assets must be app-local /map-packages paths');
const lon = z.number().min(-180).max(180);
const lat = z.number().min(-90).max(90);

export const LocalMapPackageManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3).max(80),
  provider: z.enum(['training-demo', 'kartverket', 'osm-derived', 'custom-approved']),
  runtimeFormat: z.literal('pmtiles'),
  sourceFormat: z.enum(['pmtiles', 'mbtiles', 'geojson-derived']),
  url: localAssetPath.regex(/\.pmtiles$/),
  styleUrl: localAssetPath.regex(/\.json$/),
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
});

export type LocalMapPackageManifest = z.infer<typeof LocalMapPackageManifestSchema>;

export const approvedLocalMapPackages: LocalMapPackageManifest[] = [
  // Keep empty until a real local package file and provenance docs exist.
  // The schematic map remains the production fallback.
];

export function localMapPackageForId(id: string | null | undefined) {
  return approvedLocalMapPackages.find((mapPackage) => mapPackage.id === id);
}
