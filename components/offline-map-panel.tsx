'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import {
  OFFLINE_MAP_ATTRIBUTION,
  OFFLINE_MAP_LIMITATION_COPY,
  OFFLINE_MAP_PACKAGES,
  cacheSizeWarningForPackage,
  getOfflineMapPackage,
  getRenderableMapFeatures,
  offlineMapCacheSnapshot,
  offlineMapQuotaCopy,
  parseCachedOfflineMapPackage,
  resetCachedOfflineMapPackage,
  subscribeOfflineMapCache,
  writeCachedOfflineMapPackage,
  type SchematicMapFeatureKind,
} from '@/lib/maps/offline-map';
import {
  approvedLocalMapPackages,
  localMapPackageForId,
  type LocalMapPackageManifest,
} from '@/lib/maps/offline-map-package-manifest';
import { cacheLocalMapPackageAssets } from '@/lib/maps/map-package-cache';
import {
  BLUE_FORCE_TRACKING_RESEARCH,
  DEFAULT_ENABLED_MAP_LAYERS,
  KML_IMPORT_EVALUATION,
  LOCATION_EXPORT_PRIVACY_WARNING,
  MAP_DRAWING_KINDS,
  MAP_DRAWING_LABELS,
  MAP_MARKER_KINDS,
  MAP_MARKER_LABELS,
  QR_SECTOR_IMPORT_DESIGN,
  SCHEMATIC_GEOJSON_COORDINATE_SYSTEM,
  buildMapImageSvg,
  createMissionMapDrawing,
  createMissionMapMarker,
  deleteMissionMapObject,
  filterMissionMapStateByLayers,
  geoJsonExportText,
  importGeoJsonText,
  measureDrawingDistance,
  measurePolygonArea,
  mergeMissionMapState,
  missionMapStateSnapshot,
  mapStateForMission,
  normalizeSchematicPoint,
  normalizeMissionMapState,
  operationItemsForRender,
  parseCoordinateText,
  resetMissionMapState,
  subscribeMissionMapState,
  updateMissionMapDrawing,
  updateMissionMapMarker,
  writeMissionMapState,
  type MapDrawingKind,
  type MapLayerKey,
  type MapMarkerKind,
  type MissionMapDrawing,
  type MissionMapMarker,
  type MissionMapState,
} from '@/lib/maps/operations-map';

import { buildFieldLogEntryFromMapObject } from '@/lib/mission/map-log-link';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { getMission, listMissions, saveMission } from '@/lib/mission/local-store';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { detectSensitiveOperationalText } from '@/lib/privacy/sensitive-text';
import { DEFAULT_FIELD_MODE_SETTINGS, FIELD_MODE_STORAGE_EVENT, readFieldModeSettings } from '@/lib/field-mode/field-mode';
import type { FieldLogCategory, MissionContext } from '@/lib/mission/schemas';

const OfflineMapLibreView = dynamic<{ packageManifest?: LocalMapPackageManifest; fallback?: ReactNode }>(
  () => import('@/components/maps/offline-maplibre-view').then((module) => module.OfflineMapLibreView),
  { ssr: false },
);

const featureStyles: Record<SchematicMapFeatureKind, { fill: string; stroke: string }> = {
  depot: { fill: '#0f172a', stroke: '#ffffff' },
  'meeting-point': { fill: '#0369a1', stroke: '#ffffff' },
  'risk-area': { fill: '#f97316', stroke: '#7c2d12' },
  route: { fill: '#16a34a', stroke: '#052e16' },
  resource: { fill: '#7c3aed', stroke: '#ffffff' },
};

const markerColors: Record<MapMarkerKind, string> = {
  'incident-site': '#dc2626',
  hazard: '#f97316',
  resource: '#7c3aed',
  'meeting-point': '#0369a1',
  'il-ko': '#0f172a',
  'pump-location': '#0891b2',
  observation: '#16a34a',
};

type MarkerEditDraft = {
  label: string;
  x: string;
  y: string;
  note: string;
};

type DrawingEditDraft = {
  label: string;
  coordinates: string;
  note: string;
};

function operationMeasurement(drawing: MissionMapDrawing | undefined) {
  if (!drawing) return 'Ingen tegning målt ennå.';
  const distance = measureDrawingDistance(drawing.points, drawing.kind === 'polygon' || drawing.kind === 'sector').toFixed(1);
  const area = (drawing.kind === 'polygon' || drawing.kind === 'sector') ? measurePolygonArea(drawing.points).toFixed(1) : '0.0';
  return `${MAP_DRAWING_LABELS[drawing.kind]}: avstand ${distance} skjematiske enheter, areal ${area}.`;
}

const importPrivacyWarning = 'Noen importerte kartobjekter ble stoppet lokalt fordi de kan inneholde persondata, pasientdata, kontaktinfo eller skjermet/privat lokasjon.';

function missingMissionAction() {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>Opprett eller velg et aktivt oppdrag først.</span>
      <Link href="/oppdrag/ny" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 font-black text-white text-sm">Nytt oppdrag</Link>
      <Link href="/oppdrag" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950 text-sm">Velg oppdrag</Link>
    </span>
  );
}

function privacyErrorText(error: unknown) {
  return error instanceof Error && /persondata|pasientdata|private|skjermet|identifikator|kontakt|unsupported map text value/i.test(error.message)
    ? 'Karttekst ble stoppet lokalt fordi den kan inneholde persondata, pasientdata, kontaktinfo eller skjermet/privat lokasjon.'
    : 'Kunne ikke lagre lokal karttekst. Kontroller innholdet og prøv igjen.';
}

function isImportMapTextValue(value: unknown): value is string | number | null | undefined {
  return value === undefined || value === null || typeof value === 'string' || typeof value === 'number';
}

function normalizeImportMapTextForDetection(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function importMapTextHasBlockedValue(value: unknown, _maxLength?: number) {
  void _maxLength;
  if (!isImportMapTextValue(value)) return true;
  return Boolean(detectSensitiveOperationalText(normalizeImportMapTextForDetection(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function importPointFromCoordinates(coordinates: unknown) {
  return Array.isArray(coordinates) ? normalizeSchematicPoint({ x: coordinates[0], y: coordinates[1] }) : null;
}

function supportedImportDrawingPointCount(kind: MapDrawingKind, geometry: Record<string, unknown>) {
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

function isSupportedImportDrawingFeature(kind: MapDrawingKind, geometry: Record<string, unknown>) {
  const minimumPoints = kind === 'point' ? 1 : kind === 'line' ? 2 : 3;
  return supportedImportDrawingPointCount(kind, geometry) >= minimumPoints;
}

function importFeatureHasBlockedMapText(feature: unknown) {
  if (!isRecord(feature) || feature.type !== 'Feature' || !isRecord(feature.geometry) || !isRecord(feature.properties)) return false;
  const { geometry, properties } = feature;
  const markerFeature = properties.itemType === 'marker'
    && MAP_MARKER_KINDS.includes(properties.kind as MapMarkerKind)
    && geometry.type === 'Point'
    && Boolean(importPointFromCoordinates(geometry.coordinates));
  const drawingFeature = properties.itemType === 'drawing'
    && MAP_DRAWING_KINDS.includes(properties.kind as MapDrawingKind)
    && isSupportedImportDrawingFeature(properties.kind as MapDrawingKind, geometry);
  if (!markerFeature && !drawingFeature) return false;
  return importMapTextHasBlockedValue(properties.label)
    || importMapTextHasBlockedValue(properties.note, 240);
}

function geoJsonImportHasBlockedMapText(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)
      || parsed.type !== 'FeatureCollection'
      || parsed.coordinateSystem !== SCHEMATIC_GEOJSON_COORDINATE_SYSTEM
      || !Array.isArray(parsed.features)) return false;
    return parsed.features.some(importFeatureHasBlockedMapText);
  } catch {
    return false;
  }
}

function markerActionAriaLabel(action: 'Rediger' | 'Slett' | 'Logg herfra', marker: MissionMapMarker) {
  return `${action} ${marker.label} (${marker.kind}, X ${marker.point.x}, Y ${marker.point.y})`;
}

function drawingActionAriaLabel(action: 'Rediger' | 'Slett' | 'Logg herfra', drawing: MissionMapDrawing) {
  const firstPoint = drawing.points[0];
  const coordinateSummary = firstPoint ? `første punkt X ${firstPoint.x}, Y ${firstPoint.y}` : 'uten punktsammendrag';
  return `${action} ${drawing.label} (${MAP_DRAWING_LABELS[drawing.kind]}, ${drawing.points.length} punkt, ${coordinateSummary})`;
}

const mapObjectRowClass = 'flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between';
const mapObjectSummaryClass = 'min-w-0 max-w-full break-words';
const mapObjectActionGroupClass = 'flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:justify-end';
const mapObjectActionButtonBaseClass = 'min-h-11 min-w-0 max-w-full whitespace-normal break-words rounded-xl px-3 text-left font-black';

function categoryForMapObject(mapObject: MissionMapMarker | MissionMapDrawing): FieldLogCategory {
  if (mapObject.itemType === 'drawing') return 'observasjon';
  return mapObject.kind === 'hazard'
    ? 'vaer-fare'
    : mapObject.kind === 'resource' || mapObject.kind === 'pump-location'
      ? 'ressursbehov'
      : 'observasjon';
}

function criticalFlagsForMapObject(mapObject: MissionMapMarker | MissionMapDrawing) {
  const critical = mapObject.itemType === 'marker' && (mapObject.kind === 'hazard' || mapObject.kind === 'incident-site');
  return { criticalObservation: critical, mustBeForwarded: critical };
}

function drawingPointsToCoordinateText(drawing: MissionMapDrawing) {
  return drawing.points.map((point) => `${point.x},${point.y}`).join(' ');
}

function minimumPointCountForDrawing(kind: MapDrawingKind) {
  return kind === 'point' ? 1 : kind === 'line' ? 2 : 3;
}

function parseMarkerEditCoordinate(value: string) {
  if (value.trim() === '') return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= 0 && coordinate <= 100 ? coordinate : null;
}

function SchematicMap({ packageId, state, enabledLayers }: { packageId: string; state: MissionMapState; enabledLayers: MapLayerKey[] }) {
  const selectedPackage = getOfflineMapPackage(packageId) ?? OFFLINE_MAP_PACKAGES[0];
  const renderedFeatures = getRenderableMapFeatures(selectedPackage);
  const hiddenFeatureCount = Math.max(0, selectedPackage.features.length - renderedFeatures.length);
  const filteredState = filterMissionMapStateByLayers(state, enabledLayers);
  const renderedOperations = operationItemsForRender(filteredState);
  const hiddenOperationCount = filteredState.markers.length + filteredState.drawings.length - renderedOperations.length;

  return (
    <figure className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-sm" aria-label="Skjematisk lokalkart">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="offline-map-title offline-map-desc" className="h-72 w-full bg-slate-900">
        <title id="offline-map-title">{`Skjematisk lokalt kart for ${selectedPackage.title}`}</title>
        <desc id="offline-map-desc">Statisk SVG-kart uten eksterne kartfliser eller nettverkskall.</desc>
        <defs>
          <pattern id="offline-map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.35" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#offline-map-grid)" />
        <path d="M 12 78 C 25 62, 39 56, 50 48 S 75 25, 88 14" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 2" />
        <path d="M 16 22 C 31 36, 51 44, 84 75" fill="none" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 3" />
        {renderedFeatures.map((feature) => {
          const style = featureStyles[feature.kind];
          return (
            <g key={feature.id}>
              <circle cx={feature.x} cy={feature.y} r="4.2" fill={style.fill} stroke={style.stroke} strokeWidth="1" />
              <text x={Math.min(feature.x + 5, 82)} y={Math.max(feature.y - 3, 8)} fill="#f8fafc" fontSize="3.3" fontWeight="700">
                {feature.label}
              </text>
            </g>
          );
        })}
        {renderedOperations.map((item) => item.itemType === 'marker' ? (
          <g key={item.id} data-testid={`map-marker-${item.kind}`}>
            <circle cx={item.point.x} cy={item.point.y} r="3.2" fill={markerColors[item.kind]} stroke="#ffffff" strokeWidth="1" />
            <text x={Math.min(item.point.x + 4, 82)} y={Math.max(item.point.y - 4, 7)} fill="#ffffff" fontSize="3.1" fontWeight="800">{MAP_MARKER_LABELS[item.kind]}: {item.label}</text>
          </g>
        ) : (
          <g key={item.id} data-testid={`map-drawing-${item.kind}`}>
            {(item.kind === 'polygon' || item.kind === 'sector') ? (
              <polygon points={item.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="rgba(14,165,233,0.20)" stroke="#38bdf8" strokeWidth="1.1" />
            ) : item.kind === 'line' ? (
              <polyline points={item.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#22c55e" strokeWidth="1.2" />
            ) : (
              <rect x={item.points[0].x - 2.5} y={item.points[0].y - 2.5} width="5" height="5" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
            )}
          </g>
        ))}
      </svg>
      <figcaption className="space-y-2 border-t border-slate-700 bg-slate-950 p-4 text-xs font-semibold text-slate-200">
        <p>{OFFLINE_MAP_ATTRIBUTION}</p>
        <p>{OFFLINE_MAP_LIMITATION_COPY}</p>
        <p data-testid="map-performance-guard">
          Ytelsesvern: viser maks {renderedFeatures.length} skjematiske markører i SVG-et{hiddenFeatureCount ? ` (${hiddenFeatureCount} skjult)` : ''}. Operative lokale lag: {renderedOperations.length}{hiddenOperationCount > 0 ? ` (${hiddenOperationCount} skjult)` : ''}.
        </p>
      </figcaption>
    </figure>
  );
}

export function OfflineMapPanel() {
  const cacheSnapshot = useSyncExternalStore(subscribeOfflineMapCache, offlineMapCacheSnapshot, () => 'null');
  const cachedPackage = useMemo(() => parseCachedOfflineMapPackage(cacheSnapshot), [cacheSnapshot]);
  const [selectedSchematicPackageId, setSelectedSchematicPackageId] = useState<string>(OFFLINE_MAP_PACKAGES[0].id);
  const [selectedPmtilesPackageId, setSelectedPmtilesPackageId] = useState<string>(approvedLocalMapPackages[0]?.id ?? '');
  const mapStateSnapshot = useSyncExternalStore(subscribeMissionMapState, missionMapStateSnapshot, () => JSON.stringify({ markers: [], drawings: [] }));
  const mapState = useMemo(() => {
    try {
      return normalizeMissionMapState(JSON.parse(mapStateSnapshot));
    } catch {
      return { markers: [], drawings: [] };
    }
  }, [mapStateSnapshot]);
  const [fieldMode, setFieldMode] = useState(DEFAULT_FIELD_MODE_SETTINGS);
  const fieldGloveMode = fieldMode.enabled && fieldMode.gloveMode;
  const primaryButtonClass = fieldGloveMode ? 'min-h-16 rounded-xl bg-slate-950 px-5 text-lg font-bold text-white' : 'min-h-12 rounded-xl bg-slate-950 px-4 font-bold text-white';
  const [enabledLayers, setEnabledLayers] = useState<MapLayerKey[]>(DEFAULT_ENABLED_MAP_LAYERS);
  const [markerKind, setMarkerKind] = useState<MapMarkerKind>('incident-site');
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [markerEditDraft, setMarkerEditDraft] = useState<MarkerEditDraft>({ label: '', x: '50', y: '50', note: '' });
  const [drawingKind, setDrawingKind] = useState<MapDrawingKind>('sector');
  const [editingDrawingId, setEditingDrawingId] = useState<string | null>(null);
  const [drawingEditDraft, setDrawingEditDraft] = useState<DrawingEditDraft>({ label: '', coordinates: '', note: '' });
  const [drawingCoordinates, setDrawingCoordinates] = useState('12,20 40,22 34,54 16,48');
  const [lastDrawing, setLastDrawing] = useState<MissionMapDrawing | undefined>();
  const [imageExport, setImageExport] = useState('');
  const [geoJsonExport, setGeoJsonExport] = useState('');
  const [geoJsonImport, setGeoJsonImport] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | ReactNode>('Lokale kartlag er klare.');
  const [mapPrivacyError, setMapPrivacyError] = useState<ReactNode>(null);
  const [activeMission, setActiveMission] = useState<MissionContext | null>(null);
  const [mapLogText, setMapLogText] = useState('');
  const [mapLogSaving, setMapLogSaving] = useState(false);
  const [mapPackageCacheSaving, setMapPackageCacheSaving] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ quota?: number; usage?: number }>({});
  const mapLogSavingRef = useRef(false);
  const mapPackageCacheSavingRef = useRef(false);
  const latestSelectedPackageIdRef = useRef(selectedPmtilesPackageId);

  const selectedSchematicPackage = getOfflineMapPackage(selectedSchematicPackageId) ?? OFFLINE_MAP_PACKAGES[0];
  const selectedPmtilesPackage = approvedLocalMapPackages.find((mapPackage) => mapPackage.id === selectedPmtilesPackageId) ?? approvedLocalMapPackages[0];
  const hasApprovedPmtilesPackages = approvedLocalMapPackages.length > 0;
  const selectedWarning = selectedPmtilesPackage ? cacheSizeWarningForPackage(selectedPmtilesPackage) : null;
  const selectedQuotaCopy = selectedPmtilesPackage ? offlineMapQuotaCopy({
    estimatedSizeMb: selectedPmtilesPackage.estimatedSizeMb,
    quota: storageEstimate.quota,
    usage: storageEstimate.usage,
  }) : null;
  const cachedLocalMapPackage = cachedPackage?.runtimeFormat === 'pmtiles' ? localMapPackageForId(cachedPackage.packageId) : undefined;
  const activeMissionMapState = useMemo(() => activeMission ? mapStateForMission(mapState, activeMission.id) : { markers: [], drawings: [] }, [activeMission, mapState]);
  const filteredState = filterMissionMapStateByLayers(activeMissionMapState, enabledLayers);
  const measuredDrawing = lastDrawing && activeMissionMapState.drawings.some((drawing) => drawing.id === lastDrawing.id)
    ? lastDrawing
    : activeMissionMapState.drawings.at(-1);

  useEffect(() => {
    latestSelectedPackageIdRef.current = selectedPmtilesPackage?.id ?? '';
  }, [selectedPmtilesPackage?.id]);

  useEffect(() => {
    let mounted = true;
    if (typeof navigator === 'undefined' || typeof navigator.storage?.estimate !== 'function') {
      return () => {
        mounted = false;
      };
    }
    navigator.storage.estimate()
      .then((estimate) => {
        if (!mounted) return;
        setStorageEstimate({
          quota: typeof estimate.quota === 'number' && Number.isFinite(estimate.quota) ? estimate.quota : undefined,
          usage: typeof estimate.usage === 'number' && Number.isFinite(estimate.usage) ? estimate.usage : undefined,
        });
      })
      .catch(() => {
        if (mounted) setStorageEstimate({});
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const loadFieldMode = () => {
      const next = readFieldModeSettings();
      setFieldMode((current) => (
        current.enabled === next.enabled
        && current.gloveMode === next.gloveMode
        && current.theme === next.theme
        && current.outdoorReadabilityReviewed === next.outdoorReadabilityReviewed
          ? current
          : next
      ));
    };
    loadFieldMode();
    const onFieldModeChange = () => loadFieldMode();
    window.addEventListener('storage', onFieldModeChange);
    window.addEventListener(FIELD_MODE_STORAGE_EVENT, onFieldModeChange);
    return () => {
      window.removeEventListener('storage', onFieldModeChange);
      window.removeEventListener(FIELD_MODE_STORAGE_EVENT, onFieldModeChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    listMissions()
      .then((missions) => {
        if (mounted) setActiveMission(selectActiveMission(missions, readSelectedActiveMissionId()));
      })
      .catch(() => {
        if (mounted) setActiveMission(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function persistState(next: MissionMapState, message: string) {
    writeMissionMapState(next);
    setMapPrivacyError(null);
    setStatusMessage(message);
  }

  function showMapPrivacyError(error: unknown) {
    const message = privacyErrorText(error);
    setMapPrivacyError(message);
    setStatusMessage(message);
  }

  function selectSchematicPackage(packageId: string) {
    setSelectedSchematicPackageId(packageId);
  }

  function selectPmtilesPackage(packageId: string) {
    latestSelectedPackageIdRef.current = packageId;
    setSelectedPmtilesPackageId(packageId);
  }

  async function cacheSelectedPackage() {
    if (mapPackageCacheSavingRef.current) return;
    const packageToCache = selectedPmtilesPackage;
    if (!packageToCache) {
      setStatusMessage('Ingen godkjente PMTiles-pakker er tilgjengelige for lokal caching.');
      return;
    }

    mapPackageCacheSavingRef.current = true;
    setMapPackageCacheSaving(true);
    setStatusMessage('Forhåndscacher lokal PMTiles-kartpakke til CacheStorage.');
    const localPackage = localMapPackageForId(packageToCache.id);
    if (!localPackage) {
      setStatusMessage('Kartpakken kunne ikke forhåndscaches; skjematisk fallback brukes offline.');
      mapPackageCacheSavingRef.current = false;
      setMapPackageCacheSaving(false);
      return;
    }
    try {
      const result = await cacheLocalMapPackageAssets(localPackage);
      if (result.cached === 0) {
        setStatusMessage('Kartpakken kunne ikke forhåndscaches; skjematisk fallback brukes offline.');
        return;
      }
      if (latestSelectedPackageIdRef.current !== packageToCache.id) {
        setStatusMessage('Kartcache ble avbrutt fordi valgt pakke endret seg. Velg Lagre på nytt for den aktive kartpakken.');
        return;
      }
      writeCachedOfflineMapPackage(packageToCache.id);
      setStatusMessage('Lokal PMTiles-kartpakke er forhåndscachet og aktivert offline.');
    } catch {
      setStatusMessage('Kartpakken kunne ikke forhåndscaches; skjematisk fallback brukes offline.');
    } finally {
      mapPackageCacheSavingRef.current = false;
      setMapPackageCacheSaving(false);
    }
  }

  function resetCache() {
    resetCachedOfflineMapPackage();
  }

  function toggleLayer(layer: MapLayerKey) {
    setEnabledLayers((current) => current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]);
  }

  function addMarker(formData: FormData) {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage(missingMissionAction());
      return;
    }
    try {
      setMapPrivacyError(null);
      const marker = createMissionMapMarker({
        kind: markerKind,
        missionId: activeMission.id,
        label: formData.get('markerLabel'),
        x: formData.get('markerX'),
        y: formData.get('markerY'),
        note: formData.get('markerNote'),
      });
      persistState({ ...mapState, markers: [...mapState.markers, marker] }, `La til ${MAP_MARKER_LABELS[marker.kind]} lokalt.`);
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function startMarkerEdit(marker: MissionMapMarker) {
    setEditingMarkerId(marker.id);
    setMarkerEditDraft({
      label: marker.label,
      x: String(marker.point.x),
      y: String(marker.point.y),
      note: marker.note ?? '',
    });
  }

  function cancelMarkerEdit() {
    setEditingMarkerId(null);
    setMarkerEditDraft({ label: '', x: '50', y: '50', note: '' });
  }

  function saveMarkerEdit(event: FormEvent<HTMLFormElement>, marker: MissionMapMarker) {
    event.preventDefault();
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage(missingMissionAction());
      return;
    }
    const x = parseMarkerEditCoordinate(markerEditDraft.x);
    const y = parseMarkerEditCoordinate(markerEditDraft.y);
    if (x === null || y === null) {
      setMapPrivacyError(null);
      setStatusMessage('Markørkoordinater må være skjematiske verdier fra 0 til 100.');
      return;
    }
    try {
      setMapPrivacyError(null);
      persistState(updateMissionMapMarker(mapState, activeMission.id, marker.id, {
        label: markerEditDraft.label,
        point: { x, y },
        note: markerEditDraft.note,
      }), 'Oppdaterte lokal markør.');
      cancelMarkerEdit();
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function deleteMarker(marker: MissionMapMarker) {
    if (!activeMission) {
      setStatusMessage(missingMissionAction());
      return;
    }
    persistState(deleteMissionMapObject(mapState, activeMission.id, marker.id), 'Slettet lokal markør.');
    if (editingMarkerId === marker.id) cancelMarkerEdit();
  }

  async function createLogFromMapObject(mapObject: MissionMapMarker | MissionMapDrawing) {
    if (!activeMission) {
      setStatusMessage(missingMissionAction());
      return;
    }
    const text = mapLogText.trim();
    if (!text) {
      setStatusMessage('Skriv kort loggtekst før du oppretter feltlogg fra kart.');
      return;
    }
    if (mapLogSavingRef.current) return;
    mapLogSavingRef.current = true;
    setMapLogSaving(true);
    try {
      const currentMission = await getMission(activeMission.id);
      if (!currentMission) {
        setActiveMission(null);
        setStatusMessage('Aktivt lokalt oppdrag ble ikke funnet. Åpne oppdraget på nytt før feltlogg fra kart.');
        return;
      }
      const flags = criticalFlagsForMapObject(mapObject);
      const entry = buildFieldLogEntryFromMapObject({
        missionId: currentMission.id,
        mapObject,
        category: categoryForMapObject(mapObject),
        text,
        criticalObservation: flags.criticalObservation,
        mustBeForwarded: flags.mustBeForwarded,
      });
      const updated = {
        ...currentMission,
        updatedAt: new Date().toISOString(),
        fieldLogEntries: [...(currentMission.fieldLogEntries ?? []), entry],
      };
      await saveMission(updated);
      setActiveMission(updated);
      setMapLogText('');
      appendLocalAuditEntry('status-changed', { missionId: updated.id, statusChangeCount: 0, source: 'map-log' });
      setStatusMessage(`Feltlogg opprettet lokalt på ${updated.title}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Kunne ikke opprette feltlogg fra kart.');
    } finally {
      mapLogSavingRef.current = false;
      setMapLogSaving(false);
    }
  }

  function createLogFromNewestVisibleMarker() {
    const newest = filteredState.markers.at(-1);
    if (!newest) {
      setStatusMessage('Velg et synlig kartobjekt før feltlogg fra kart.');
      return;
    }
    void createLogFromMapObject(newest);
  }

  function addDrawing(formData: FormData) {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage(missingMissionAction());
      return;
    }
    try {
      setMapPrivacyError(null);
      const drawing = createMissionMapDrawing({
        kind: drawingKind,
        missionId: activeMission.id,
        label: formData.get('drawingLabel'),
        coordinates: drawingCoordinates,
        note: formData.get('drawingNote'),
      });
      setLastDrawing(drawing);
      persistState({ ...mapState, drawings: [...mapState.drawings, drawing] }, `Lagret ${MAP_DRAWING_LABELS[drawing.kind]} lokalt.`);
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function startDrawingEdit(drawing: MissionMapDrawing) {
    setEditingDrawingId(drawing.id);
    setDrawingEditDraft({
      label: drawing.label,
      coordinates: drawingPointsToCoordinateText(drawing),
      note: drawing.note ?? '',
    });
  }

  function cancelDrawingEdit() {
    setEditingDrawingId(null);
    setDrawingEditDraft({ label: '', coordinates: '', note: '' });
  }

  function saveDrawingEdit(event: FormEvent<HTMLFormElement>, drawing: MissionMapDrawing) {
    event.preventDefault();
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage(missingMissionAction());
      return;
    }
    try {
      setMapPrivacyError(null);
      const points = parseCoordinateText(drawingEditDraft.coordinates);
      const minimumPoints = minimumPointCountForDrawing(drawing.kind);
      if (points.length < minimumPoints) {
        setStatusMessage(`${MAP_DRAWING_LABELS[drawing.kind]} trenger minst ${minimumPoints} skjematiske punkt.`);
        return;
      }
      const nextState = updateMissionMapDrawing(mapState, activeMission.id, drawing.id, {
        label: drawingEditDraft.label,
        points,
        note: drawingEditDraft.note,
      });
      const updatedDrawing = nextState.drawings.find((item) => item.id === drawing.id && item.missionId === activeMission.id);
      if (updatedDrawing) setLastDrawing(updatedDrawing);
      persistState(nextState, 'Oppdaterte lokal sektor/teig.');
      cancelDrawingEdit();
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function deleteDrawing(drawing: MissionMapDrawing) {
    if (!activeMission) {
      setStatusMessage(missingMissionAction());
      return;
    }
    persistState(deleteMissionMapObject(mapState, activeMission.id, drawing.id), 'Slettet lokal sektor/teig.');
    if (editingDrawingId === drawing.id) cancelDrawingEdit();
    if (lastDrawing?.id === drawing.id) setLastDrawing(undefined);
  }

  function resetOperations() {
    if (!activeMission) {
      setStatusMessage(missingMissionAction());
      return;
    }
    const nextState: MissionMapState = {
      markers: mapState.markers.filter((marker) => marker.missionId !== activeMission.id),
      drawings: mapState.drawings.filter((drawing) => drawing.missionId !== activeMission.id),
    };
    setLastDrawing(undefined);
    if (nextState.markers.length === 0 && nextState.drawings.length === 0) {
      resetMissionMapState();
      setStatusMessage('Lokale sektorer og markører for aktivt oppdrag er nullstilt.');
      return;
    }
    persistState(nextState, 'Lokale sektorer og markører for aktivt oppdrag er nullstilt.');
  }

  function exportSvg() {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage(missingMissionAction());
      return;
    }
    try {
      setMapPrivacyError(null);
      const svg = buildMapImageSvg(activeMissionMapState);
      appendLocalAuditEntry('export-created', { exportKind: 'map-svg', markerCount: activeMissionMapState.markers.length, drawingCount: activeMissionMapState.drawings.length });
      setImageExport(svg);
      setStatusMessage('Sanitert SVG kartbilde er generert lokalt for aktivt oppdrag.');
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function exportGeoJson() {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage(missingMissionAction());
      return;
    }
    try {
      setMapPrivacyError(null);
      const geoJson = geoJsonExportText(activeMissionMapState);
      appendLocalAuditEntry('export-created', { exportKind: 'map-geojson', markerCount: activeMissionMapState.markers.length, drawingCount: activeMissionMapState.drawings.length });
      setGeoJsonExport(geoJson);
      setStatusMessage('Sanitert GeoJSON er generert lokalt for aktivt oppdrag.');
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function importGeoJson() {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage(missingMissionAction());
      return;
    }
    try {
      setMapPrivacyError(null);
      const importHadBlockedMapText = geoJsonImportHasBlockedMapText(geoJsonImport);
      const imported = importGeoJsonText(geoJsonImport, new Date(), activeMission.id);
      const count = imported.markers.length + imported.drawings.length;
      if (count === 0) {
        if (importHadBlockedMapText) {
          showMapPrivacyError(new Error('GeoJSON import rejected persondata/kontakt/private map text.'));
          return;
        }
        setStatusMessage('Ingen støttede skjematiske GeoJSON-objekter funnet.');
        return;
      }
      persistState(mergeMissionMapState(mapState, imported), `Importerte ${count} lokale kartobjekter fra GeoJSON til aktivt oppdrag.`);
      if (importHadBlockedMapText) setMapPrivacyError(importPrivacyWarning);
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  return (
    <section className="space-y-5" aria-label="Offline kart">
      <div className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">Offline kart</p>
        <h1 className="text-3xl font-black">Kart</h1>
        <p className="mt-2 text-sm text-sky-100">
          Statisk, lokal og skjematisk kartflate for innsatsstøtte. Ingen eksterne kartfliser, kart-API-er, backend sync eller persondata.
        </p>
      </div>

      {fieldMode.enabled ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-950">
          Feltmodus aktiv{fieldGloveMode ? ' · hanskemodus gir større kartkontroller' : ''}
        </div>
      ) : null}

      {cachedLocalMapPackage ? (
        <OfflineMapLibreView
          packageManifest={cachedLocalMapPackage}
          fallback={<SchematicMap packageId={selectedSchematicPackage.id} state={filteredState} enabledLayers={enabledLayers} />}
        />
      ) : (
        <SchematicMap packageId={selectedSchematicPackage.id} state={filteredState} enabledLayers={enabledLayers} />
      )}

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Lokale kartpakker">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Lokale kartpakker</p>
          <h2 className="text-2xl font-black">Velg skjematisk område og godkjent PMTiles-cache</h2>
          <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
            Skjematiske lokalkart fungerer alltid offline i appen. App-lokale PMTiles- og stilfiler kan bare forhåndscaches til CacheStorage for offline bruk når en egen kilde-, lisens- og pilotgodkjent pakke finnes i manifestet. Ingen ekstern tile-provider, backend-sync eller deling med oppdrag eller andre enheter brukes.
          </p>
        </div>
        <label className="block text-sm font-black text-slate-800" htmlFor="offline-schematic-map-package">Velg skjematisk kartpakke</label>
        <select id="offline-schematic-map-package" aria-label="Velg skjematisk kartpakke" value={selectedSchematicPackage.id} onChange={(event) => selectSchematicPackage(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950">
          {OFFLINE_MAP_PACKAGES.map((mapPackage) => (
            <option key={mapPackage.id} value={mapPackage.id}>
              {mapPackage.title} ({mapPackage.estimatedSizeMb} MB skjematisk)
            </option>
          ))}
        </select>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <p className="font-black text-slate-950">{selectedSchematicPackage.title}</p>
          <p className="mt-1">Område: {selectedSchematicPackage.district}</p>
          <p className="mt-1">{selectedSchematicPackage.description}</p>
          <p className="mt-1">Skjematisk anslag: {selectedSchematicPackage.estimatedSizeMb} MB. Versjon: {selectedSchematicPackage.version}.</p>
          <p className="mt-3 rounded-xl bg-sky-50 p-3 font-black text-sky-950">Skjematisk kart beholdes som fallback når PMTiles ikke finnes, ikke er cachet eller ikke er aktivert.</p>
        </div>

        {hasApprovedPmtilesPackages && selectedPmtilesPackage ? (
          <>
            <label className="block text-sm font-black text-slate-800" htmlFor="offline-map-package">Velg lokal kartpakke</label>
            <select id="offline-map-package" aria-label="Velg lokal kartpakke" value={selectedPmtilesPackage.id} onChange={(event) => selectPmtilesPackage(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950">
              {approvedLocalMapPackages.map((mapPackage) => (
                <option key={mapPackage.id} value={mapPackage.id}>
                  {mapPackage.title} (lokal PMTiles)
                </option>
              ))}
            </select>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
              <p className="font-black text-slate-950">{selectedPmtilesPackage.title}</p>
              <p className="mt-1">Godkjent lokal PMTiles-pakke fra app-lokal fil.</p>
              <p className="mt-1">PMTiles: {selectedPmtilesPackage.url}. Stil: {selectedPmtilesPackage.styleUrl}.</p>
              <p className="mt-1">Skjematisk kart beholdes som fallback når PMTiles ikke er cachet eller aktivert.</p>
              <p className="mt-1">Anslått lokal cache: {selectedPmtilesPackage.estimatedSizeMb} MB. Versjon: {selectedPmtilesPackage.version}.</p>
              {selectedWarning ? <p className="mt-3 rounded-xl bg-orange-100 p-3 font-black text-orange-950">{selectedWarning}</p> : null}
              <p className="mt-3 rounded-xl bg-sky-50 p-3 font-black text-sky-950" data-testid="offline-map-quota-copy">{selectedQuotaCopy}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void cacheSelectedPackage()} disabled={mapPackageCacheSaving} className="min-h-11 rounded-xl bg-sky-900 px-4 font-black text-white disabled:cursor-wait disabled:bg-slate-500">{mapPackageCacheSaving ? 'Forhåndscacher kartpakke lokalt…' : 'Lagre valgt kartpakke lokalt'}</button>
              <button type="button" onClick={resetCache} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950">Tilbakestill kartcache</button>
            </div>
          </>
        ) : (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
            Ingen godkjente PMTiles-pakker er tilgjengelige ennå. Det skjematiske lokalkartet fungerer fortsatt offline; ekte PMTiles-pakker krever egen kilde-, lisens- og pilotgodkjenning før caching.
          </p>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700" data-testid="offline-map-cache-status">
          {cachedPackage ? (
            <>
              <p>Cachet lokalt: {cachedPackage.title} ({cachedPackage.estimatedSizeMb} MB), versjon {cachedPackage.version}. Lagret {cachedPackage.cachedAt.slice(0, 10)}.</p>
              <p>Lokal kartpakke aktiv: {cachedPackage.title}{cachedPackage.runtimeFormat === 'pmtiles' ? ' (lokal PMTiles)' : ' (skjematisk fallback)'}</p>
            </>
          ) : <p>Ingen kartpakke er cachet lokalt.</p>}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-950" aria-label="Personvern ved kartdata">
        <h2 className="text-xl font-black">Personvernvarsel for lokasjonsdata</h2>
        <p>{LOCATION_EXPORT_PRIVACY_WARNING}</p>
        <p>Bruk skjematiske 0-100-koordinater. Ikke skriv ekte adresser, personnavn, pasientdata eller skjermede posisjoner.</p>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Lokale markører og lag">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Markører</p>
            <h2 className="text-2xl font-black">Lokale hendelsesmarkører</h2>
          </div>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700" data-testid="operations-map-status">{statusMessage}</p>
        </div>
        {mapPrivacyError ? (
          <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
            {mapPrivacyError}
          </p>
        ) : null}
        <form action={addMarker} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold">Type<select aria-label="Markørtype" value={markerKind} onChange={(event) => setMarkerKind(event.target.value as MapMarkerKind)} className="mt-1 min-h-11 w-full rounded-xl border px-3">{MAP_MARKER_KINDS.map((kind) => <option key={kind} value={kind}>{MAP_MARKER_LABELS[kind]}</option>)}</select></label>
          <label className="text-sm font-bold">Etikett<input name="markerLabel" required placeholder="Sanitert lokal etikett" className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label>
          <label className="text-sm font-bold">X 0-100<input name="markerX" required type="number" min="0" max="100" defaultValue="50" className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label>
          <label className="text-sm font-bold">Y 0-100<input name="markerY" required type="number" min="0" max="100" defaultValue="50" className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label>
          <label className="text-sm font-bold md:col-span-2">Notat uten persondata<textarea name="markerNote" className="mt-1 min-h-20 w-full rounded-xl border p-3" placeholder="Valgfritt, kort og sanitert" /></label>
          <button type="submit" className={`${primaryButtonClass} md:col-span-2`}>Legg til lokal markør</button>
        </form>
        <div className="grid gap-2 md:grid-cols-2" aria-label="Kartlag">
          {[...MAP_MARKER_KINDS, ...MAP_DRAWING_KINDS].map((layer) => (
            <label key={layer} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              <input type="checkbox" checked={enabledLayers.includes(layer)} onChange={() => toggleLayer(layer)} />
              {layer in MAP_MARKER_LABELS ? MAP_MARKER_LABELS[layer as MapMarkerKind] : MAP_DRAWING_LABELS[layer as MapDrawingKind]}
            </label>
          ))}
        </div>
        <ul className="space-y-2 text-sm font-semibold text-slate-700" data-testid="operations-marker-list">
          {filteredState.markers.length === 0 ? <li>Ingen synlige markører.</li> : filteredState.markers.map((marker) => (
            <li key={marker.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className={mapObjectRowClass} data-testid="operations-marker-action-row">
                <span className={mapObjectSummaryClass}>{MAP_MARKER_LABELS[marker.kind]} — <span>{marker.label}</span> ({marker.point.x}, {marker.point.y})</span>
                <span className={mapObjectActionGroupClass} data-testid="operations-marker-action-group">
                  <button type="button" aria-label={markerActionAriaLabel('Logg herfra', marker)} onClick={() => void createLogFromMapObject(marker)} disabled={mapLogSaving} className={`${mapObjectActionButtonBaseClass} bg-slate-950 text-white disabled:cursor-wait disabled:bg-slate-500`}>
                    Logg herfra {marker.label}
                  </button>
                  <button type="button" aria-label={markerActionAriaLabel('Rediger', marker)} onClick={() => startMarkerEdit(marker)} className={`${mapObjectActionButtonBaseClass} border border-slate-300 bg-white text-slate-950`}>
                    Rediger {marker.label}
                  </button>
                  <button type="button" aria-label={markerActionAriaLabel('Slett', marker)} onClick={() => deleteMarker(marker)} className={`${mapObjectActionButtonBaseClass} border border-red-300 bg-white text-red-900`}>
                    Slett {marker.label}
                  </button>
                </span>
              </div>
              {editingMarkerId === marker.id ? (
                <form onSubmit={(event) => saveMarkerEdit(event, marker)} className="mt-3 grid gap-3 md:grid-cols-2" aria-label={`Rediger markør ${marker.label}`}>
                  <label className="text-sm font-bold md:col-span-2">Rediger markøretikett
                    <input value={markerEditDraft.label} onChange={(event) => setMarkerEditDraft((current) => ({ ...current, label: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border px-3" />
                  </label>
                  <label className="text-sm font-bold">X 0-100
                    <input aria-label="Rediger markør X 0-100" type="number" min="0" max="100" value={markerEditDraft.x} onChange={(event) => setMarkerEditDraft((current) => ({ ...current, x: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border px-3" />
                  </label>
                  <label className="text-sm font-bold">Y 0-100
                    <input aria-label="Rediger markør Y 0-100" type="number" min="0" max="100" value={markerEditDraft.y} onChange={(event) => setMarkerEditDraft((current) => ({ ...current, y: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border px-3" />
                  </label>
                  <label className="text-sm font-bold md:col-span-2">Rediger markørnotat
                    <textarea value={markerEditDraft.note} onChange={(event) => setMarkerEditDraft((current) => ({ ...current, note: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border p-3" />
                  </label>
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-4 font-black text-white">Lagre markørendring</button>
                    <button type="button" onClick={cancelMarkerEdit} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950">Avbryt</button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Logg fra kartpunkt">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Kart → feltlogg</p>
          <h2 className="text-2xl font-black">Opprett logg fra synlig kartobjekt</h2>
          <p className="mt-2 text-sm font-semibold text-amber-900">Lagres bare på aktivt lokalt oppdrag. Bruk skjematiske 0-100 koordinater; ikke legg inn persondata eller skjermede posisjoner.</p>
        </div>
        <p className="text-sm font-semibold text-slate-700">Aktivt oppdrag: {activeMission ? activeMission.title : 'Ingen aktivt lokalt oppdrag funnet'}</p>
        <p className="text-sm font-black text-slate-900">Feltlogg går til: {activeMission ? activeMission.title : 'Ingen aktivt lokalt oppdrag funnet'}</p>
        <label className="block text-sm font-black text-slate-800" htmlFor="map-log-text">Loggtekst fra kartpunkt</label>
        <textarea id="map-log-text" value={mapLogText} onChange={(event) => setMapLogText(event.target.value)} className="min-h-28 w-full rounded-2xl border border-slate-300 p-3 text-base" placeholder="Kort observasjon uten persondata" />
        <button type="button" onClick={createLogFromNewestVisibleMarker} disabled={mapLogSaving} className={`${primaryButtonClass} disabled:cursor-wait disabled:bg-slate-500`}>Logg fra nyeste synlige markør</button>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Tegneverktøy og sektorer">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Tegning</p>
        <h2 className="text-2xl font-black">Punkt, linje, polygon og sektor/teig</h2>
        <form action={addDrawing} className="grid gap-3">
          <label className="text-sm font-bold">Tegnetype<select aria-label="Tegnetype" value={drawingKind} onChange={(event) => setDrawingKind(event.target.value as MapDrawingKind)} className="mt-1 min-h-11 w-full rounded-xl border px-3">{MAP_DRAWING_KINDS.map((kind) => <option key={kind} value={kind}>{MAP_DRAWING_LABELS[kind]}</option>)}</select></label>
          <label className="text-sm font-bold">Etikett<input name="drawingLabel" required defaultValue="Teig alfa" className="mt-1 min-h-11 w-full rounded-xl border px-3" /></label>
          <label className="text-sm font-bold">Koordinater<textarea value={drawingCoordinates} onChange={(event) => setDrawingCoordinates(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border p-3 font-mono text-xs" aria-label="Tegnekoordinater" /></label>
          <label className="text-sm font-bold">Notat uten persondata<textarea name="drawingNote" className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label>
          <button type="submit" className={primaryButtonClass}>Lagre lokal tegning/sektor</button>
        </form>
        <p className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800" data-testid="map-measurement-readout">{operationMeasurement(measuredDrawing)}</p>
        <ul className="space-y-2 text-sm font-semibold text-slate-700" data-testid="operations-drawing-list">
          {filteredState.drawings.length === 0 ? <li>Ingen synlige sektorer/tegninger.</li> : filteredState.drawings.map((drawing) => (
            <li key={drawing.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className={mapObjectRowClass} data-testid="operations-drawing-action-row">
                <span className={mapObjectSummaryClass}>{MAP_DRAWING_LABELS[drawing.kind]} — <span>{drawing.label}</span> ({drawing.points.length} punkt)</span>
                <span className={mapObjectActionGroupClass} data-testid="operations-drawing-action-group">
                  <button type="button" aria-label={drawingActionAriaLabel('Logg herfra', drawing)} onClick={() => void createLogFromMapObject(drawing)} disabled={mapLogSaving} className={`${mapObjectActionButtonBaseClass} bg-slate-950 text-white disabled:cursor-wait disabled:bg-slate-500`}>
                    Logg herfra {drawing.label}
                  </button>
                  <button type="button" aria-label={drawingActionAriaLabel('Rediger', drawing)} onClick={() => startDrawingEdit(drawing)} className={`${mapObjectActionButtonBaseClass} border border-slate-300 bg-white text-slate-950`}>
                    Rediger {drawing.label}
                  </button>
                  <button type="button" aria-label={drawingActionAriaLabel('Slett', drawing)} onClick={() => deleteDrawing(drawing)} className={`${mapObjectActionButtonBaseClass} border border-red-300 bg-white text-red-900`}>
                    Slett {drawing.label}
                  </button>
                </span>
              </div>
              {editingDrawingId === drawing.id ? (
                <form onSubmit={(event) => saveDrawingEdit(event, drawing)} className="mt-3 grid gap-3" aria-label={`Rediger sektor ${drawing.label}`}>
                  <label className="text-sm font-bold">Rediger sektoretikett
                    <input value={drawingEditDraft.label} onChange={(event) => setDrawingEditDraft((current) => ({ ...current, label: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border px-3" />
                  </label>
                  <label className="text-sm font-bold">Rediger sektorkoordinater
                    <textarea aria-label="Rediger sektorkoordinater" value={drawingEditDraft.coordinates} onChange={(event) => setDrawingEditDraft((current) => ({ ...current, coordinates: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border p-3 font-mono text-xs" />
                  </label>
                  <label className="text-sm font-bold">Rediger sektornotat
                    <textarea value={drawingEditDraft.note} onChange={(event) => setDrawingEditDraft((current) => ({ ...current, note: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border p-3" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-4 font-black text-white">Lagre sektorendring</button>
                    <button type="button" onClick={cancelDrawingEdit} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950">Avbryt</button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={resetOperations} className="min-h-11 rounded-xl border border-red-300 bg-white px-4 font-black text-red-900">Nullstill lokale sektorer/markører</button>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Kart eksport og import">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Eksport/import</p>
        <h2 className="text-2xl font-black">Lokal SVG og GeoJSON</h2>
        <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">{LOCATION_EXPORT_PRIVACY_WARNING}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={exportSvg} className={`${primaryButtonClass} w-full sm:w-auto`}>Lag kartbilde (SVG)</button>
          <button type="button" onClick={exportGeoJson} className={`${primaryButtonClass} w-full sm:w-auto`}>Lag GeoJSON eksport</button>
        </div>
        <label className="block text-sm font-bold">Kartbilde SVG<textarea id="map-image-export" readOnly value={imageExport} className="mt-1 min-h-32 w-full rounded-xl border p-3 font-mono text-xs" /></label>
        <label className="block text-sm font-bold">GeoJSON eksport<textarea id="map-geojson-export" readOnly value={geoJsonExport} className="mt-1 min-h-32 w-full rounded-xl border p-3 font-mono text-xs" /></label>
        <label className="block text-sm font-bold">Importer sanitert GeoJSON<textarea aria-label="Importer GeoJSON" value={geoJsonImport} onChange={(event) => setGeoJsonImport(event.target.value)} className="mt-1 min-h-32 w-full rounded-xl border p-3 font-mono text-xs" placeholder="Lim inn FeatureCollection med skjematiske 0-100-koordinater" /></label>
        <button type="button" onClick={importGeoJson} className="min-h-11 rounded-xl border border-slate-300 px-4 font-black text-slate-950">Importer GeoJSON lokalt</button>
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700" aria-label="Post-MVP kartintegrasjoner">
        <h2 className="text-xl font-black text-slate-950">Post-MVP vurderinger</h2>
        <p><span className="font-black">KML:</span> {KML_IMPORT_EVALUATION.decision}</p>
        <p><span className="font-black">QR/fil for sektor:</span> {QR_SECTOR_IMPORT_DESIGN.summary}</p>
        <p><span className="font-black">Blue-force/live posisjon:</span> {BLUE_FORCE_TRACKING_RESEARCH.decision}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700">
        <h2 className="text-xl font-black text-slate-950">Attribusjon og begrensninger</h2>
        <p className="mt-2">{OFFLINE_MAP_ATTRIBUTION}</p>
        <p className="mt-2">{OFFLINE_MAP_LIMITATION_COPY}</p>
        <p className="mt-2">MVP-en bruker bare godkjente app-lokale PMTiles/MapLibre-pakker når de er cachet; ingen MBTiles-runtime, Leaflet, OpenStreetMap-fliser, rå oppstrømsgeometri eller delt live-posisjon.</p>
      </section>
    </section>
  );
}
