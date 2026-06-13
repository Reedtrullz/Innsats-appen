/**
 * Pure import sanitization + privacy detection for the offline map panel.
 *
 * Extracted from components/offline-map-panel.tsx so this privacy-critical
 * parsing (which GeoJSON features are supported, and which carry text that
 * trips the sensitive-text detector) is independently unit-testable. No React,
 * no component state — only pure functions over imported GeoJSON.
 */
import {
  MAP_DRAWING_KINDS,
  MAP_MARKER_KINDS,
  SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
  normalizeSchematicPoint,
  type MapDrawingKind,
  type MapMarkerKind,
} from '@/lib/maps/operations-map';
import {
  SENSITIVE_TEXT_EXPLANATIONS,
  SensitiveTextError,
  detectSensitiveOperationalText,
  sensitiveTextFieldError,
  type SensitiveTextMatch,
} from '@/lib/privacy/sensitive-text';

export type ImportBlockedKind = SensitiveTextMatch['kind'] | 'unsupported-value';

export const importPrivacyWarning = 'Noen importerte kartobjekter ble stoppet lokalt fordi de kan inneholde persondata, pasientdata, kontaktinfo eller skjermet/privat lokasjon.';

export function importPrivacyWarningForKinds(kinds: ImportBlockedKind[]) {
  const labels = [...new Set(kinds.filter((kind): kind is SensitiveTextMatch['kind'] => kind !== 'unsupported-value'))]
    .map((kind) => SENSITIVE_TEXT_EXPLANATIONS[kind].label);
  if (labels.length === 0) return importPrivacyWarning;
  return `Noen importerte kartobjekter ble stoppet lokalt (${labels.join('; ')}). Persondata og pasientdata skal ikke lagres i kartet.`;
}

export function privacyErrorText(error: unknown) {
  if (error instanceof SensitiveTextError) {
    return `Karttekst ble stoppet lokalt: ${sensitiveTextFieldError(error.kind)}`;
  }
  return error instanceof Error && /persondata|pasientdata|private|skjermet|identifikator|kontakt|unsupported map text value/i.test(error.message)
    ? 'Karttekst ble stoppet lokalt fordi den kan inneholde persondata, pasientdata, kontaktinfo eller skjermet/privat lokasjon.'
    : 'Kunne ikke lagre lokal karttekst. Kontroller innholdet og prøv igjen.';
}

export function isImportMapTextValue(value: unknown): value is string | number | null | undefined {
  return value === undefined || value === null || typeof value === 'string' || typeof value === 'number';
}

export function normalizeImportMapTextForDetection(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function importMapTextBlockedKind(value: unknown, _maxLength?: number): ImportBlockedKind | null {
  void _maxLength;
  if (!isImportMapTextValue(value)) return 'unsupported-value';
  return detectSensitiveOperationalText(normalizeImportMapTextForDetection(value))?.kind ?? null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export function importPointFromCoordinates(coordinates: unknown) {
  return Array.isArray(coordinates) ? normalizeSchematicPoint({ x: coordinates[0], y: coordinates[1] }) : null;
}

export function supportedImportDrawingPointCount(kind: MapDrawingKind, geometry: Record<string, unknown>) {
  if (kind === 'point') {
    return geometry.type === 'Point' && importPointFromCoordinates(geometry.coordinates) ? 1 : 0;
  }
  if (kind === 'line') {
    if (geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) return 0;
    return geometry.coordinates.filter((coords) => importPointFromCoordinates(coords)).length;
  }
  if (geometry.type !== 'Polygon' || !Array.isArray(geometry.coordinates) || !Array.isArray(geometry.coordinates[0])) return 0;
  const points = geometry.coordinates[0]
    .map((coords) => importPointFromCoordinates(coords))
    .filter((point): point is NonNullable<ReturnType<typeof importPointFromCoordinates>> => Boolean(point));
  const withoutClosingDuplicate = points.length > 1
    && points[0]?.x === points.at(-1)?.x
    && points[0]?.y === points.at(-1)?.y
    ? points.slice(0, -1)
    : points;
  return withoutClosingDuplicate.length;
}

export function isSupportedImportDrawingFeature(kind: MapDrawingKind, geometry: Record<string, unknown>) {
  const minimumPoints = kind === 'point' ? 1 : kind === 'line' ? 2 : 3;
  return supportedImportDrawingPointCount(kind, geometry) >= minimumPoints;
}

export function importFeatureBlockedMapTextKinds(feature: unknown): ImportBlockedKind[] {
  if (!isRecord(feature) || feature.type !== 'Feature' || !isRecord(feature.geometry) || !isRecord(feature.properties)) return [];
  const { geometry, properties } = feature;
  const markerFeature = properties.itemType === 'marker'
    && MAP_MARKER_KINDS.includes(properties.kind as MapMarkerKind)
    && geometry.type === 'Point'
    && Boolean(importPointFromCoordinates(geometry.coordinates));
  const drawingFeature = properties.itemType === 'drawing'
    && MAP_DRAWING_KINDS.includes(properties.kind as MapDrawingKind)
    && isSupportedImportDrawingFeature(properties.kind as MapDrawingKind, geometry);
  if (!markerFeature && !drawingFeature) return [];
  return [importMapTextBlockedKind(properties.label), importMapTextBlockedKind(properties.note, 240)]
    .filter((kind): kind is ImportBlockedKind => kind !== null);
}

export function geoJsonImportBlockedMapTextKinds(text: string): ImportBlockedKind[] {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)
      || parsed.type !== 'FeatureCollection'
      || parsed.coordinateSystem !== SCHEMATIC_GEOJSON_COORDINATE_SYSTEM
      || !Array.isArray(parsed.features)) return [];
    return [...new Set(parsed.features.flatMap(importFeatureBlockedMapTextKinds))];
  } catch {
    return [];
  }
}
