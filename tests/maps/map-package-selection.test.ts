import { afterEach, expect, it } from 'vitest';

import {
  MAP_PACKAGE_SELECTION_STORAGE_KEY,
  mapPackageSelectionSnapshot,
  parseMapPackageSelection,
  writeMapPackageSelection,
} from '@/lib/maps/map-package-selection';

afterEach(() => {
  localStorage.clear();
});

it('persists the selected schematic package for the operational map route', () => {
  writeMapPackageSelection({ schematicPackageId: 'trondelag-oversikt', pmtilesPackageId: 'trondheim-osm' });

  expect(localStorage.getItem(MAP_PACKAGE_SELECTION_STORAGE_KEY)).toContain('trondelag-oversikt');
  expect(parseMapPackageSelection(mapPackageSelectionSnapshot())).toEqual({
    schematicPackageId: 'trondelag-oversikt',
    pmtilesPackageId: 'trondheim-osm',
  });
});

it('falls back safely when stored package selection is malformed', () => {
  localStorage.setItem(MAP_PACKAGE_SELECTION_STORAGE_KEY, '{not-json');

  expect(parseMapPackageSelection(mapPackageSelectionSnapshot())).toEqual({});
});

it('drops package ids that are not present in the governed manifests', () => {
  writeMapPackageSelection({ schematicPackageId: 'not-approved', pmtilesPackageId: 'remote-package' });

  expect(parseMapPackageSelection(mapPackageSelectionSnapshot())).toEqual({});
});
