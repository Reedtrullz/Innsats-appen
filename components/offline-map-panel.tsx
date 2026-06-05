'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { OfflineMapLibreView } from '@/components/maps/offline-maplibre-view';
import {
  OFFLINE_MAP_ATTRIBUTION,
  OFFLINE_MAP_LIMITATION_COPY,
  OFFLINE_MAP_PACKAGES,
  cacheSizeWarningForPackage,
  getOfflineMapPackage,
  getRenderableMapFeatures,
  offlineMapCacheSnapshot,
  parseCachedOfflineMapPackage,
  resetCachedOfflineMapPackage,
  subscribeOfflineMapCache,
  writeCachedOfflineMapPackage,
  type SchematicMapFeatureKind,
} from '@/lib/maps/offline-map';
import {
  approvedLocalMapPackages,
  localMapPackageForId,
} from '@/lib/maps/offline-map-package-manifest';
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
  buildMapImageSvg,
  createMissionMapDrawing,
  createMissionMapMarker,
  filterMissionMapStateByLayers,
  geoJsonExportText,
  importGeoJsonText,
  measureDrawingDistance,
  measurePolygonArea,
  mergeMissionMapState,
  missionMapStateSnapshot,
  mapStateForMission,
  normalizeMissionMapState,
  operationItemsForRender,
  resetMissionMapState,
  subscribeMissionMapState,
  writeMissionMapState,
  type MapDrawingKind,
  type MapLayerKey,
  type MapMarkerKind,
  type MissionMapDrawing,
  type MissionMapState,
} from '@/lib/maps/operations-map';

import { buildFieldLogEntryFromMapObject } from '@/lib/mission/map-log-link';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { getMission, listMissions, saveMission } from '@/lib/mission/local-store';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { DEFAULT_FIELD_MODE_SETTINGS, FIELD_MODE_STORAGE_EVENT, readFieldModeSettings } from '@/lib/field-mode/field-mode';
import type { FieldLogCategory, MissionContext } from '@/lib/mission/schemas';

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

type MapPackageOption = {
  id: string;
  title: string;
  estimatedSizeMb: number;
  version: string;
  runtimeFormat: 'schematic' | 'pmtiles';
  district?: string;
  description?: string;
  url?: string;
  styleUrl?: string;
};

function mapPackageOptionForId(packageId: string | null | undefined, options: MapPackageOption[]) {
  return options.find((mapPackage) => mapPackage.id === packageId);
}

function operationMeasurement(drawing: MissionMapDrawing | undefined) {
  if (!drawing) return 'Ingen tegning målt ennå.';
  const distance = measureDrawingDistance(drawing.points, drawing.kind === 'polygon' || drawing.kind === 'sector').toFixed(1);
  const area = (drawing.kind === 'polygon' || drawing.kind === 'sector') ? measurePolygonArea(drawing.points).toFixed(1) : '0.0';
  return `${MAP_DRAWING_LABELS[drawing.kind]}: avstand ${distance} skjematiske enheter, areal ${area}.`;
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
            <text x={Math.min(item.point.x + 4, 82)} y={Math.max(item.point.y - 4, 7)} fill="#ffffff" fontSize="3.1" fontWeight="800">{item.label}</text>
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
  const [selectedPackageId, setSelectedPackageId] = useState<string>(OFFLINE_MAP_PACKAGES[0].id);
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
  const [drawingKind, setDrawingKind] = useState<MapDrawingKind>('sector');
  const [drawingCoordinates, setDrawingCoordinates] = useState('12,20 40,22 34,54 16,48');
  const [lastDrawing, setLastDrawing] = useState<MissionMapDrawing | undefined>();
  const [imageExport, setImageExport] = useState('');
  const [geoJsonExport, setGeoJsonExport] = useState('');
  const [geoJsonImport, setGeoJsonImport] = useState('');
  const [statusMessage, setStatusMessage] = useState('Lokale kartlag er klare.');
  const [activeMission, setActiveMission] = useState<MissionContext | null>(null);
  const [mapLogText, setMapLogText] = useState('');
  const [mapLogSaving, setMapLogSaving] = useState(false);
  const mapLogSavingRef = useRef(false);

  const mapPackageOptions: MapPackageOption[] = [
    ...OFFLINE_MAP_PACKAGES.map((item) => ({
      id: item.id,
      title: item.title,
      estimatedSizeMb: item.estimatedSizeMb,
      version: item.version,
      runtimeFormat: 'schematic' as const,
      district: item.district,
      description: item.description,
    })),
    ...approvedLocalMapPackages.map((item) => ({
      id: item.id,
      title: item.title,
      estimatedSizeMb: item.estimatedSizeMb,
      version: item.version,
      runtimeFormat: 'pmtiles' as const,
      url: item.url,
      styleUrl: item.styleUrl,
    })),
  ];
  const selectedPackage = mapPackageOptionForId(selectedPackageId, mapPackageOptions) ?? mapPackageOptions[0];
  const selectedWarning = cacheSizeWarningForPackage(selectedPackage);
  const selectedSchematicPackage = getOfflineMapPackage(selectedPackage.id) ?? OFFLINE_MAP_PACKAGES[0];
  const cachedLocalMapPackage = cachedPackage?.runtimeFormat === 'pmtiles' ? localMapPackageForId(cachedPackage.packageId) : undefined;
  const activeMissionMapState = useMemo(() => activeMission ? mapStateForMission(mapState, activeMission.id) : { markers: [], drawings: [] }, [activeMission, mapState]);
  const filteredState = filterMissionMapStateByLayers(activeMissionMapState, enabledLayers);

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
    setStatusMessage(message);
  }

  function cacheSelectedPackage() {
    writeCachedOfflineMapPackage(selectedPackage.id);
  }

  function resetCache() {
    resetCachedOfflineMapPackage();
  }

  function toggleLayer(layer: MapLayerKey) {
    setEnabledLayers((current) => current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]);
  }

  function addMarker(formData: FormData) {
    if (!activeMission) {
      setStatusMessage('Opprett aktivt oppdrag før du lagrer lokale kartobjekter.');
      return;
    }
    try {
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
      setStatusMessage(error instanceof Error ? error.message : 'Kunne ikke legge til markør.');
    }
  }

  async function createLogFromNewestMarker() {
    const newest = filteredState.markers.at(-1);
    if (!activeMission || !newest) {
      setStatusMessage('Opprett aktivt oppdrag og minst én synlig markør før feltlogg fra kart.');
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
      const category: FieldLogCategory = newest.kind === 'hazard'
        ? 'vaer-fare'
        : newest.kind === 'resource' || newest.kind === 'pump-location'
          ? 'ressursbehov'
          : 'observasjon';
      const entry = buildFieldLogEntryFromMapObject({
        missionId: currentMission.id,
        mapObject: newest,
        category,
        text: mapLogText,
        criticalObservation: newest.kind === 'hazard' || newest.kind === 'incident-site',
        mustBeForwarded: newest.kind === 'hazard' || newest.kind === 'incident-site',
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

  function addDrawing(formData: FormData) {
    if (!activeMission) {
      setStatusMessage('Opprett aktivt oppdrag før du lagrer lokale kartobjekter.');
      return;
    }
    try {
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
      setStatusMessage(error instanceof Error ? error.message : 'Kunne ikke legge til tegning.');
    }
  }

  function resetOperations() {
    if (!activeMission) {
      setStatusMessage('Opprett aktivt oppdrag før du nullstiller lokale kartobjekter.');
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
      setStatusMessage('Opprett aktivt oppdrag før du eksporterer lokale kartobjekter.');
      return;
    }
    setImageExport(buildMapImageSvg(activeMissionMapState));
    appendLocalAuditEntry('export-created', { exportKind: 'map-svg', markerCount: activeMissionMapState.markers.length, drawingCount: activeMissionMapState.drawings.length });
    setStatusMessage('Sanitert SVG kartbilde er generert lokalt for aktivt oppdrag.');
  }

  function exportGeoJson() {
    if (!activeMission) {
      setStatusMessage('Opprett aktivt oppdrag før du eksporterer lokale kartobjekter.');
      return;
    }
    setGeoJsonExport(geoJsonExportText(activeMissionMapState));
    appendLocalAuditEntry('export-created', { exportKind: 'map-geojson', markerCount: activeMissionMapState.markers.length, drawingCount: activeMissionMapState.drawings.length });
    setStatusMessage('Sanitert GeoJSON er generert lokalt for aktivt oppdrag.');
  }

  function importGeoJson() {
    if (!activeMission) {
      setStatusMessage('Opprett aktivt oppdrag før du importerer kartobjekter.');
      return;
    }
    const imported = importGeoJsonText(geoJsonImport, new Date(), activeMission.id);
    const count = imported.markers.length + imported.drawings.length;
    if (count === 0) {
      setStatusMessage('Ingen støttede skjematiske GeoJSON-objekter funnet.');
      return;
    }
    persistState(mergeMissionMapState(mapState, imported), `Importerte ${count} lokale kartobjekter fra GeoJSON til aktivt oppdrag.`);
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
          <h2 className="text-2xl font-black">Velg og cache område</h2>
          <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
            Valget simulerer en lokal kartpakke-cache i localStorage. Det gjøres ingen nettverksnedlasting, ingen backend sync og ingen deling med oppdrag eller andre enheter.
          </p>
        </div>
        <label className="block text-sm font-black text-slate-800" htmlFor="offline-map-package">Velg lokal kartpakke</label>
        <select id="offline-map-package" aria-label="Velg lokal kartpakke" value={selectedPackage.id} onChange={(event) => setSelectedPackageId(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950">
          {mapPackageOptions.map((mapPackage) => (
            <option key={mapPackage.id} value={mapPackage.id}>
              {mapPackage.title} ({mapPackage.runtimeFormat === 'pmtiles' ? 'lokal PMTiles' : `${mapPackage.estimatedSizeMb} MB`})
            </option>
          ))}
        </select>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <p className="font-black text-slate-950">{selectedPackage.title}</p>
          {selectedPackage.runtimeFormat === 'pmtiles' ? (
            <>
              <p className="mt-1">Godkjent lokal PMTiles-pakke fra app-lokal fil.</p>
              <p className="mt-1">PMTiles: {selectedPackage.url}. Stil: {selectedPackage.styleUrl}.</p>
              <p className="mt-1">Skjematisk kart beholdes som fallback når PMTiles ikke er cachet eller aktivert.</p>
            </>
          ) : (
            <>
              <p className="mt-1">Område: {selectedPackage.district}</p>
              <p className="mt-1">{selectedPackage.description}</p>
            </>
          )}
          <p className="mt-1">Anslått lokal cache: {selectedPackage.estimatedSizeMb} MB. Versjon: {selectedPackage.version}.</p>
          {selectedWarning ? <p className="mt-3 rounded-xl bg-orange-100 p-3 font-black text-orange-950">{selectedWarning}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={cacheSelectedPackage} className="min-h-11 rounded-xl bg-sky-900 px-4 font-black text-white">Lagre valgt kartpakke lokalt</button>
          <button type="button" onClick={resetCache} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950">Tilbakestill kartcache</button>
        </div>
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
        <ul className="space-y-1 text-sm font-semibold text-slate-700" data-testid="operations-marker-list">
          {filteredState.markers.length === 0 ? <li>Ingen synlige markører.</li> : filteredState.markers.map((marker) => <li key={marker.id}>{MAP_MARKER_LABELS[marker.kind]} — {marker.label} ({marker.point.x}, {marker.point.y})</li>)}
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Logg fra kartpunkt">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Kart → feltlogg</p>
          <h2 className="text-2xl font-black">Opprett logg fra siste markør</h2>
          <p className="mt-2 text-sm font-semibold text-amber-900">Lagres bare på aktivt lokalt oppdrag. Bruk skjematiske 0-100 koordinater; ikke legg inn persondata eller skjermede posisjoner.</p>
        </div>
        <p className="text-sm font-semibold text-slate-700">Aktivt oppdrag: {activeMission ? activeMission.title : 'Ingen aktivt lokalt oppdrag funnet'}</p>
        <p className="text-sm font-black text-slate-900">Feltlogg går til: {activeMission ? activeMission.title : 'Ingen aktivt lokalt oppdrag funnet'}</p>
        <label className="block text-sm font-black text-slate-800" htmlFor="map-log-text">Loggtekst fra kartpunkt</label>
        <textarea id="map-log-text" value={mapLogText} onChange={(event) => setMapLogText(event.target.value)} className="min-h-28 w-full rounded-2xl border border-slate-300 p-3 text-base" placeholder="Kort observasjon uten persondata" />
        <button type="button" onClick={() => void createLogFromNewestMarker()} disabled={mapLogSaving} className={`${primaryButtonClass} disabled:cursor-wait disabled:bg-slate-500`}>Opprett feltlogg fra kartpunkt</button>
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
        <p className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-800" data-testid="map-measurement-readout">{operationMeasurement(lastDrawing ?? activeMissionMapState.drawings.at(-1))}</p>
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
