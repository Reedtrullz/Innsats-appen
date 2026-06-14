import { describe, expect, it } from 'vitest';

import {
  geoJsonImportBlockedMapTextKinds,
  importMapTextBlockedKind,
  isSupportedImportDrawingFeature,
} from '@/lib/maps/map-import-privacy';

const SCHEMATIC = 'schematic-0-100-local-only';

function featureCollection(features: unknown[]) {
  return JSON.stringify({ type: 'FeatureCollection', coordinateSystem: SCHEMATIC, features });
}

const markerFeature = (label: string, note?: string) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [10, 20] },
  properties: { itemType: 'marker', kind: 'resource', label, ...(note !== undefined ? { note } : {}) },
});

describe('map import privacy (extracted from offline-map-panel)', () => {
  it('flags sensitive text in an importable feature label', () => {
    const kinds = geoJsonImportBlockedMapTextKinds(featureCollection([markerFeature('Skadd 01017000027')]));
    expect(kinds.length).toBeGreaterThan(0);
  });

  it('passes a clean importable feature through with no blocked kinds', () => {
    expect(geoJsonImportBlockedMapTextKinds(featureCollection([markerFeature('Pumpe sektor 3')]))).toEqual([]);
  });

  it('ignores collections that are not the schematic local coordinate system', () => {
    const foreign = JSON.stringify({ type: 'FeatureCollection', coordinateSystem: 'wgs84', features: [markerFeature('Skadd 01017000027')] });
    expect(geoJsonImportBlockedMapTextKinds(foreign)).toEqual([]);
  });

  it('returns no kinds for malformed JSON instead of throwing', () => {
    expect(geoJsonImportBlockedMapTextKinds('{ not json')).toEqual([]);
  });

  it('treats non-text property values as unsupported', () => {
    expect(importMapTextBlockedKind({ nested: true })).toBe('unsupported-value');
    expect(importMapTextBlockedKind('Pumpe sektor 3')).toBeNull();
  });

  it('enforces minimum point counts per drawing kind', () => {
    expect(isSupportedImportDrawingFeature('point', { type: 'Point', coordinates: [10, 20] })).toBe(true);
    expect(isSupportedImportDrawingFeature('line', { type: 'LineString', coordinates: [[10, 20]] })).toBe(false);
    expect(isSupportedImportDrawingFeature('line', { type: 'LineString', coordinates: [[10, 20], [30, 40]] })).toBe(true);
    expect(isSupportedImportDrawingFeature('polygon', { type: 'Polygon', coordinates: [[[0, 0], [10, 0]]] })).toBe(false);
  });
});
