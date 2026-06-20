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
  offlineMapCacheSnapshot,
  offlineMapQuotaCopy,
  parseCachedOfflineMapPackage,
  resetCachedOfflineMapPackage,
  subscribeOfflineMapCache,
  writeCachedOfflineMapPackage,
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
import { createMreZonePlanObjects, type MreZonePlanObjects } from '@/lib/maps/mre-zone-plan';
import { createRadiacMeasurementPlanObjects, type RadiacMeasurementPlanObjects } from '@/lib/maps/radiac-measurement-plan';
import { createSearchSectorPlanObjects, type SearchSectorPlanObjects } from '@/lib/maps/search-sector-plan';
import { createWaterSupplyPlanObjects, type WaterSupplyPlanObjects } from '@/lib/maps/water-supply-plan';
import { deriveWaterSupplyAdvisory, deriveSearchSectorAdvisory } from '@/lib/maps/map-advisory';
import { AdvisorySuggestionCard } from '@/components/maps/advisory-suggestion-card';
import { AdvisoryStateCard } from '@/components/maps/advisory-state-card';

import { buildFieldLogEntryFromMapObject } from '@/lib/mission/map-log-link';
import { readSelectedActiveMissionId, selectActiveMission } from '@/lib/mission/active-mission-selection';
import { getMission, listMissions, saveMission } from '@/lib/mission/local-store';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';
import { SchematicMap } from '@/components/offline-map/schematic-map';
import { SENSITIVE_TEXT_EXPLANATIONS, SensitiveTextError, detectSensitiveOperationalText, sensitiveTextFieldError, type SensitiveTextMatch } from '@/lib/privacy/sensitive-text';
import {
  geoJsonImportBlockedMapTextKinds,
  importPrivacyWarning,
  importPrivacyWarningForKinds,
  privacyErrorText,
  type ImportBlockedKind,
} from '@/lib/maps/map-import-privacy';
import { DEFAULT_FIELD_MODE_SETTINGS, FIELD_MODE_STORAGE_EVENT, readFieldModeSettings } from '@/lib/field-mode/field-mode';
import type { FieldLogCategory, MissionContext } from '@/lib/mission/schemas';

const OfflineMapLibreView = dynamic<{ packageManifest?: LocalMapPackageManifest; fallback?: ReactNode }>(
  () => import('@/components/maps/offline-maplibre-view').then((module) => module.OfflineMapLibreView),
  { ssr: false },
);

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

function missingMissionAction() {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>Opprett eller velg et aktivt oppdrag først.</span>
      <Link href="/oppdrag/ny" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 font-black text-white text-sm">Nytt oppdrag</Link>
      <Link href="/oppdrag" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950 text-sm">Velg oppdrag</Link>
    </span>
  );
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
  const [lastWaterSupplyPlan, setLastWaterSupplyPlan] = useState<WaterSupplyPlanObjects | null>(null);
  const [lastRadiacPlan, setLastRadiacPlan] = useState<RadiacMeasurementPlanObjects | null>(null);
  const [lastSearchSectorPlan, setLastSearchSectorPlan] = useState<SearchSectorPlanObjects | null>(null);
  const [lastMreZonePlan, setLastMreZonePlan] = useState<MreZonePlanObjects | null>(null);
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
    setStatusMessage('Lagrer lokal kartpakke på denne enheten.');
    const localPackage = localMapPackageForId(packageToCache.id);
    if (!localPackage) {
      setStatusMessage('Kartpakken kunne ikke forhåndscaches; skjematisk fallback brukes offline.');
      mapPackageCacheSavingRef.current = false;
      setMapPackageCacheSaving(false);
      return;
    }
    try {
      // Field 3G + a 30-40 MB PMTiles package looks hung without feedback;
      // stream the download and surface throttled percent/MB progress.
      let lastReportedStep = -1;
      const result = await cacheLocalMapPackageAssets(localPackage, {
        onProgress: ({ loadedBytes, totalBytes, percent }) => {
          const step = percent !== null ? percent : Math.floor(loadedBytes / (512 * 1024));
          if (step === lastReportedStep) return;
          lastReportedStep = step;
          const loadedMb = (loadedBytes / (1024 * 1024)).toFixed(1);
          setStatusMessage(percent !== null && totalBytes
            ? `Lagrer lokal kartpakke … ${percent} % (${loadedMb} av ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)`
            : `Lagrer lokal kartpakke … ${loadedMb} MB lastet`);
        },
      });
      if (result.cached === 0) {
        setStatusMessage('Kartpakken kunne ikke forhåndscaches; skjematisk fallback brukes offline.');
        return;
      }
      if (latestSelectedPackageIdRef.current !== packageToCache.id) {
        setStatusMessage('Kartcache ble avbrutt fordi valgt pakke endret seg. Velg Lagre på nytt for den aktive kartpakken.');
        return;
      }
      writeCachedOfflineMapPackage(packageToCache.id);
      setStatusMessage('Lokal kartpakke er lagret og aktivert offline.');
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
      setStatusMessage('Opprett aktivt oppdrag før du legger til lokale markører.');
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
      setStatusMessage('Opprett aktivt oppdrag før du redigerer lokale markører.');
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
      setStatusMessage('Opprett aktivt oppdrag før du sletter lokale markører.');
      return;
    }
    persistState(deleteMissionMapObject(mapState, activeMission.id, marker.id), 'Slettet lokal markør.');
    if (editingMarkerId === marker.id) cancelMarkerEdit();
  }

  function addWaterSupplyPlan(formData: FormData) {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage('Opprett aktivt oppdrag før du lager pumpe- og slangeplan.');
      return;
    }
    try {
      setMapPrivacyError(null);
      const plan = createWaterSupplyPlanObjects({
        missionId: activeMission.id,
        label: formData.get('waterPlanLabel'),
        waterSource: { x: formData.get('waterSourceX'), y: formData.get('waterSourceY') },
        pump: { x: formData.get('pumpX'), y: formData.get('pumpY') },
        delivery: { x: formData.get('deliveryX'), y: formData.get('deliveryY') },
        note: formData.get('waterPlanNote'),
      });
      setLastWaterSupplyPlan(plan);
      setLastDrawing(plan.hoseLine);
      persistState({
        markers: [...mapState.markers, ...plan.markers],
        drawings: [...mapState.drawings, plan.hoseLine],
      }, `Lagret pumpe- og slangeplan lokalt (${plan.summary.hoseLengthSchematicUnits} skjematiske enheter).`);
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function addRadiacMeasurementPlan(formData: FormData) {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage('Opprett aktivt oppdrag før du lager RADIAC måleplan.');
      return;
    }
    try {
      setMapPrivacyError(null);
      const plan = createRadiacMeasurementPlanObjects({
        missionId: activeMission.id,
        label: formData.get('radiacPlanLabel'),
        points: parseCoordinateText(String(formData.get('radiacPlanPoints') ?? '')),
        note: formData.get('radiacPlanNote'),
      });
      setLastRadiacPlan(plan);
      setLastDrawing(plan.routeLine);
      persistState({
        markers: [...mapState.markers, ...plan.markers],
        drawings: [...mapState.drawings, plan.routeLine],
      }, `Lagret RADIAC måleplan lokalt (${plan.summary.measurementPointCount} målepunkt).`);
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function addSearchSectorPlan(formData: FormData) {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage('Opprett aktivt oppdrag før du lager søketeig plan.');
      return;
    }
    try {
      setMapPrivacyError(null);
      const plan = createSearchSectorPlanObjects({
        missionId: activeMission.id,
        label: formData.get('searchPlanLabel'),
        sectorPoints: parseCoordinateText(String(formData.get('searchSectorPoints') ?? '')),
        start: { x: formData.get('searchStartX'), y: formData.get('searchStartY') },
        exit: { x: formData.get('searchExitX'), y: formData.get('searchExitY') },
        note: formData.get('searchPlanNote'),
      });
      setLastSearchSectorPlan(plan);
      setLastDrawing(plan.sector);
      persistState({
        markers: [...mapState.markers, ...plan.markers],
        drawings: [...mapState.drawings, plan.sector],
      }, `Lagret søketeig plan lokalt (${plan.summary.boundaryPointCount} grensepunkt).`);
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function addMreZonePlan(formData: FormData) {
    if (!activeMission) {
      setMapPrivacyError(null);
      setStatusMessage('Opprett aktivt oppdrag før du lager MRE soneplan.');
      return;
    }
    try {
      setMapPrivacyError(null);
      const plan = createMreZonePlanObjects({
        missionId: activeMission.id,
        label: formData.get('mrePlanLabel'),
        dirtyZonePoints: parseCoordinateText(String(formData.get('mreDirtyZonePoints') ?? '')),
        cleanZonePoints: parseCoordinateText(String(formData.get('mreCleanZonePoints') ?? '')),
        rinseLinePoints: parseCoordinateText(String(formData.get('mreRinseLinePoints') ?? '')),
        entry: { x: formData.get('mreEntryX'), y: formData.get('mreEntryY') },
        exit: { x: formData.get('mreExitX'), y: formData.get('mreExitY') },
        waste: { x: formData.get('mreWasteX'), y: formData.get('mreWasteY') },
        note: formData.get('mrePlanNote'),
      });
      setLastMreZonePlan(plan);
      setLastDrawing(plan.rinseLine);
      persistState({
        markers: [...mapState.markers, ...plan.markers],
        drawings: [...mapState.drawings, plan.dirtyZone, plan.cleanZone, plan.rinseLine],
      }, `Lagret MRE soneplan lokalt (${plan.summary.zoneCount} soner).`);
    } catch (error) {
      showMapPrivacyError(error);
    }
  }

  function scrollToElement(id: string) {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // "+ Logg" from an advisory card: prefill the field-log text with the
  // recommendation so the user can confirm and save it to the active mission.
  // No persondata or coordinates — only the advisory headline.
  function prefillMapLogFromAdvisory(suggestion: string) {
    setMapLogText(`Rådgivende forslag vurdert: ${suggestion}`);
    scrollToElement('map-log-text');
    setStatusMessage('Forslag lagt i loggtekst — bekreft og lagre på aktivt oppdrag.');
  }

  async function createLogFromMapObject(mapObject: MissionMapMarker | MissionMapDrawing) {
    if (!activeMission) {
      setStatusMessage('Opprett aktivt oppdrag før feltlogg fra kart.');
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
      setStatusMessage('Opprett aktivt oppdrag før du lagrer lokale kartobjekter.');
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
      setStatusMessage('Opprett aktivt oppdrag før du endrer lokale kartobjekter.');
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
      setStatusMessage('Opprett aktivt oppdrag før du sletter lokale kartobjekter.');
      return;
    }
    persistState(deleteMissionMapObject(mapState, activeMission.id, drawing.id), 'Slettet lokal sektor/teig.');
    if (editingDrawingId === drawing.id) cancelDrawingEdit();
    if (lastDrawing?.id === drawing.id) setLastDrawing(undefined);
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
      setMapPrivacyError(null);
      setStatusMessage('Opprett aktivt oppdrag før du eksporterer lokale kartobjekter.');
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
      setStatusMessage('Opprett aktivt oppdrag før du eksporterer lokale kartobjekter.');
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
      setStatusMessage('Opprett aktivt oppdrag før du importerer kartobjekter.');
      return;
    }
    try {
      setMapPrivacyError(null);
      const importBlockedKinds = geoJsonImportBlockedMapTextKinds(geoJsonImport);
      const imported = importGeoJsonText(geoJsonImport, new Date(), activeMission.id);
      const count = imported.markers.length + imported.drawings.length;
      if (count === 0) {
        if (importBlockedKinds.length > 0) {
          const message = importPrivacyWarningForKinds(importBlockedKinds);
          setMapPrivacyError(message);
          setStatusMessage(message);
          return;
        }
        setStatusMessage('Ingen støttede skjematiske GeoJSON-objekter funnet.');
        return;
      }
      persistState(mergeMissionMapState(mapState, imported), `Importerte ${count} lokale kartobjekter fra GeoJSON til aktivt oppdrag.`);
      if (importBlockedKinds.length > 0) setMapPrivacyError(importPrivacyWarningForKinds(importBlockedKinds));
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
          Lokal kartflate for innsatsstøtte. Kart, markører og logger blir på enheten; ikke legg inn persondata eller skjermede posisjoner.
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

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Pumpe- og slangeplanlegger">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Skogbrann vannforsyning</p>
            <h2 className="text-2xl font-black">Pumpe- og slangeplan</h2>
          </div>
          <Link href="/kort/skogbrann-vannforsyningsplan" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-950">
            Åpne tiltakskort
          </Link>
        </div>
        <form action={addWaterSupplyPlan} className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-bold md:col-span-3">Planetikett
            <input name="waterPlanLabel" required defaultValue="Skogbrann vannforsyning" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Vannkilde X-koordinat (0-100)
            <input name="waterSourceX" required type="number" min="0" max="100" defaultValue="12" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Vannkilde Y-koordinat (0-100)
            <input name="waterSourceY" required type="number" min="0" max="100" defaultValue="78" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Pumpeplass X-koordinat (0-100)
            <input name="pumpX" required type="number" min="0" max="100" defaultValue="28" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Pumpeplass Y-koordinat (0-100)
            <input name="pumpY" required type="number" min="0" max="100" defaultValue="62" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Leveringspunkt X-koordinat (0-100)
            <input name="deliveryX" required type="number" min="0" max="100" defaultValue="58" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Leveringspunkt Y-koordinat (0-100)
            <input name="deliveryY" required type="number" min="0" max="100" defaultValue="42" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold md:col-span-3">Planmerknad uten persondata
            <textarea name="waterPlanNote" className="mt-1 min-h-20 w-full rounded-xl border p-3" placeholder="Valgfri lokal merknad" />
          </label>
          <button type="submit" className={`${primaryButtonClass} md:col-span-3`}>Lag pumpe- og slangeplan</button>
        </form>
        <div data-testid="water-supply-plan-summary" className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
          <p className="font-black text-slate-950">
            {lastWaterSupplyPlan
              ? `Slangevei ${lastWaterSupplyPlan.summary.hoseLengthSchematicUnits} skjematiske enheter · ${lastWaterSupplyPlan.summary.markerCount} markører · ${lastWaterSupplyPlan.summary.drawingCount} linje`
              : 'Ingen pumpe- og slangeplan laget i denne kartøkten.'}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {(lastWaterSupplyPlan?.planningPrompts ?? [
              'Avklar vannføring og trykktap med leder/fagressurs.',
              'Vurder trykkforsterkning, seriekjøring eller parallelle utlegg før langt slangeutlegg.',
            ]).map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </div>
        {lastWaterSupplyPlan ? (
          <AdvisorySuggestionCard
            {...deriveWaterSupplyAdvisory(lastWaterSupplyPlan)}
            onLog={() => prefillMapLogFromAdvisory(deriveWaterSupplyAdvisory(lastWaterSupplyPlan).suggestion)}
            onAdjust={() => scrollToElement('water-supply-plan-summary')}
          />
        ) : (
          <AdvisoryStateCard
            state="empty"
            body="Marker vannkilde, pumpeplass og leveringspunkt over — appen foreslår trasé, relébehov og konfidens."
          />
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="RADIAC målepunktplanlegger">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">RADIAC måletjeneste</p>
            <h2 className="text-2xl font-black">RADIAC måleplan</h2>
          </div>
          <Link href="/kort/radiac-maleplan-kart" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-950">
            Åpne tiltakskort
          </Link>
        </div>
        <form action={addRadiacMeasurementPlan} className="grid gap-3">
          <label className="text-sm font-bold">RADIAC planetikett
            <input name="radiacPlanLabel" required defaultValue="RAD måleplan" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Målepunkter som x,y (skjematisk 0-100)
            <textarea name="radiacPlanPoints" required defaultValue="15,30 35,40 55,45" className="mt-1 min-h-20 w-full rounded-xl border p-3 font-mono text-xs" />
          </label>
          <label className="text-sm font-bold">RADIAC planmerknad uten persondata
            <textarea name="radiacPlanNote" className="mt-1 min-h-20 w-full rounded-xl border p-3" placeholder="Valgfri lokal merknad om ordre/rapportformat" />
          </label>
          <button type="submit" className={primaryButtonClass}>Lag RADIAC måleplan</button>
        </form>
        <div data-testid="radiac-measurement-plan-summary" className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
          <p className="font-black text-slate-950">
            {lastRadiacPlan
              ? `${lastRadiacPlan.summary.measurementPointCount} målepunkt · målerute ${lastRadiacPlan.summary.routeLengthSchematicUnits} skjematiske enheter`
              : 'Ingen RADIAC måleplan laget i denne kartøkten.'}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {(lastRadiacPlan?.planningPrompts ?? [
              'Bekreft måleordre, rapporteringsformat og faglig kontakt før avmarsj.',
              'Bruk skjematiske målepunkter; appen beregner ikke dose, oppholdstid eller grenseverdier.',
            ]).map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Søketeig planlegger">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Søk og redning</p>
            <h2 className="text-2xl font-black">Søketeig plan</h2>
          </div>
          <Link href="/kort/soketeig-plan-kart" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-950">
            Åpne tiltakskort
          </Link>
        </div>
        <form action={addSearchSectorPlan} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold md:col-span-2">Søketeig etikett
            <input name="searchPlanLabel" required defaultValue="Teig alfa" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold md:col-span-2">Teiggrense som x,y (skjematisk 0-100)
            <textarea name="searchSectorPoints" required defaultValue="10,20 42,18 48,52 14,58" className="mt-1 min-h-20 w-full rounded-xl border p-3 font-mono text-xs" />
          </label>
          <label className="text-sm font-bold">Startpunkt X-koordinat (0-100)
            <input name="searchStartX" required type="number" min="0" max="100" defaultValue="12" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Startpunkt Y-koordinat (0-100)
            <input name="searchStartY" required type="number" min="0" max="100" defaultValue="22" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Returpunkt X-koordinat (0-100)
            <input name="searchExitX" required type="number" min="0" max="100" defaultValue="40" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Returpunkt Y-koordinat (0-100)
            <input name="searchExitY" required type="number" min="0" max="100" defaultValue="55" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold md:col-span-2">Søketeig planmerknad uten persondata
            <textarea name="searchPlanNote" className="mt-1 min-h-20 w-full rounded-xl border p-3" placeholder="Valgfri lokal merknad om metode eller rapporteringsintervall" />
          </label>
          <button type="submit" className={`${primaryButtonClass} md:col-span-2`}>Lag søketeig plan</button>
        </form>
        <div data-testid="search-sector-plan-summary" className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
          <p className="font-black text-slate-950">
            {lastSearchSectorPlan
              ? `${lastSearchSectorPlan.summary.boundaryPointCount} grensepunkt · ${lastSearchSectorPlan.summary.markerCount} møtepunkt · areal ${lastSearchSectorPlan.summary.areaSchematicUnits} skjematiske enheter`
              : 'Ingen søketeig plan laget i denne kartøkten.'}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {(lastSearchSectorPlan?.planningPrompts ?? [
              'Bekreft teiggrense, metode, lagkontroll og rapporteringsintervall med KO/leder.',
              'Bruk bare skjematiske punkter; ikke registrer navn, identitet, ekte posisjoner eller live tracking.',
            ]).map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </div>
        {lastSearchSectorPlan ? (
          <AdvisorySuggestionCard
            {...deriveSearchSectorAdvisory(lastSearchSectorPlan)}
            onLog={() => prefillMapLogFromAdvisory(deriveSearchSectorAdvisory(lastSearchSectorPlan).suggestion)}
            onAdjust={() => scrollToElement('search-sector-plan-summary')}
          />
        ) : (
          <AdvisoryStateCard
            state="empty"
            body="Tegn teiggrense og start-/returpunkt over — appen foreslår prioritert sone basert på terreng og savnetatferd."
          />
        )}
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="MRE ren/uren-side planlegger">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">CBRN/MRE rens</p>
            <h2 className="text-2xl font-black">MRE soneplan</h2>
          </div>
          <Link href="/kort/mre-soneplan-kart" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-950">
            Åpne tiltakskort
          </Link>
        </div>
        <form action={addMreZonePlan} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold md:col-span-2">MRE planetikett
            <input name="mrePlanLabel" required defaultValue="Rens nord" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold md:col-span-2">Uren side som x,y (skjematisk 0-100)
            <textarea name="mreDirtyZonePoints" required defaultValue="10,20 38,18 36,46 12,48" className="mt-1 min-h-20 w-full rounded-xl border p-3 font-mono text-xs" />
          </label>
          <label className="text-sm font-bold md:col-span-2">Ren side som x,y (skjematisk 0-100)
            <textarea name="mreCleanZonePoints" required defaultValue="48,22 76,22 74,48 50,50" className="mt-1 min-h-20 w-full rounded-xl border p-3 font-mono text-xs" />
          </label>
          <label className="text-sm font-bold md:col-span-2">Renselinje som x,y (skjematisk 0-100)
            <textarea name="mreRinseLinePoints" required defaultValue="40,20 44,52" className="mt-1 min-h-20 w-full rounded-xl border p-3 font-mono text-xs" />
          </label>
          <label className="text-sm font-bold">Innpassering X-koordinat (0-100)
            <input name="mreEntryX" required type="number" min="0" max="100" defaultValue="14" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Innpassering Y-koordinat (0-100)
            <input name="mreEntryY" required type="number" min="0" max="100" defaultValue="24" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Utpassering X-koordinat (0-100)
            <input name="mreExitX" required type="number" min="0" max="100" defaultValue="54" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Utpassering Y-koordinat (0-100)
            <input name="mreExitY" required type="number" min="0" max="100" defaultValue="46" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Avfallspunkt X-koordinat (0-100)
            <input name="mreWasteX" required type="number" min="0" max="100" defaultValue="32" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold">Avfallspunkt Y-koordinat (0-100)
            <input name="mreWasteY" required type="number" min="0" max="100" defaultValue="54" className="mt-1 min-h-11 w-full rounded-xl border px-3" />
          </label>
          <label className="text-sm font-bold md:col-span-2">MRE planmerknad uten persondata
            <textarea name="mrePlanNote" className="mt-1 min-h-20 w-full rounded-xl border p-3" placeholder="Valgfri lokal merknad om samband, stoppkriterier eller kapasitet" />
          </label>
          <button type="submit" className={`${primaryButtonClass} md:col-span-2`}>Lag MRE soneplan</button>
        </form>
        <div data-testid="mre-zone-plan-summary" className="space-y-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
          <p className="font-black text-slate-950">
            {lastMreZonePlan
              ? `${lastMreZonePlan.summary.zoneCount} soner · ${lastMreZonePlan.summary.markerCount} kontrollpunkt · renselinje ${lastMreZonePlan.summary.rinseLineLengthSchematicUnits} skjematiske enheter`
              : 'Ingen MRE soneplan laget i denne kartøkten.'}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {(lastMreZonePlan?.planningPrompts ?? [
              'Avklar ren side, uren side, renselinje og stoppunkt med innsatsleder/fagmyndighet før etablering.',
              'Appen fastsetter ikke stoff, vernenivå, sonegrense eller rensetaktikk; gjeldende ordre styrer.',
            ]).map((prompt) => <li key={prompt}>{prompt}</li>)}
          </ul>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Lokale markører og lag">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Markører</p>
            <h2 className="text-2xl font-black">Lokale hendelsesmarkører</h2>
          </div>
          <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700" data-testid="operations-map-status">{statusMessage}</p>
        </div>
        <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
          Kartarbeid for: {activeMission ? activeMission.title : 'Ingen aktivt lokalt oppdrag funnet'}. Bruk skjematiske 0-100-koordinater. Ikke skriv ekte adresser, personnavn, pasientdata eller skjermede posisjoner.
        </p>
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
                    {/* Focus follows the edit action so keyboard/screen-reader users land in the form. */}
                    <input autoFocus value={markerEditDraft.label} onChange={(event) => setMarkerEditDraft((current) => ({ ...current, label: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border px-3" />
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
                    {/* Focus follows the edit action so keyboard/screen-reader users land in the form. */}
                    <input autoFocus value={drawingEditDraft.label} onChange={(event) => setDrawingEditDraft((current) => ({ ...current, label: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border px-3" />
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

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Lokale kartpakker">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Avansert kartoppsett</p>
          <h2 className="text-2xl font-black">Velg skjematisk område og lokal kartpakke</h2>
          <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
            Skjematiske lokalkart fungerer alltid offline i appen. Godkjente lokale kartpakker kan lagres på enheten for bruk uten nett. Ingen kart deles med oppdrag eller andre enheter.
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
          <p className="mt-3 rounded-xl bg-sky-50 p-3 font-black text-sky-950">Skjematisk kart beholdes som reserve når lokal kartpakke ikke er lagret eller aktivert.</p>
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
              <p className="mt-1">Godkjent lokal kartpakke fra app-lokal fil.</p>
              <p className="mt-1">PMTiles: {selectedPmtilesPackage.url}. Stil: {selectedPmtilesPackage.styleUrl}.</p>
              <p className="mt-1">Skjematisk kart beholdes som reserve når lokal kartpakke ikke er lagret eller aktivert.</p>
              <p className="mt-1">Anslått lokal lagring: {selectedPmtilesPackage.estimatedSizeMb} MB. Versjon: {selectedPmtilesPackage.version}.</p>
              {selectedWarning ? <p className="mt-3 rounded-xl bg-orange-100 p-3 font-black text-orange-950">{selectedWarning}</p> : null}
              <p className="mt-3 rounded-xl bg-sky-50 p-3 font-black text-sky-950" data-testid="offline-map-quota-copy">{selectedQuotaCopy}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void cacheSelectedPackage()} disabled={mapPackageCacheSaving} className="min-h-11 rounded-xl bg-sky-900 px-4 font-black text-white disabled:cursor-wait disabled:bg-slate-500">{mapPackageCacheSaving ? 'Lagrer kartpakke lokalt...' : 'Lagre valgt kartpakke lokalt'}</button>
              <button type="button" onClick={resetCache} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950">Tilbakestill kartcache</button>
            </div>
          </>
        ) : (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
            Ingen godkjente lokale kartpakker er tilgjengelige ennå. Det skjematiske lokalkartet fungerer fortsatt offline; full kartpakke krever egen kilde-, lisens- og pilotgodkjenning før lokal lagring.
          </p>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700" data-testid="offline-map-cache-status">
          {cachedPackage ? (
            <>
              <p>Lagret lokalt: {cachedPackage.title} ({cachedPackage.estimatedSizeMb} MB), versjon {cachedPackage.version}. Lagret {cachedPackage.cachedAt.slice(0, 10)}.</p>
              <p>Lokal kartpakke aktiv: {cachedPackage.title}{cachedPackage.runtimeFormat === 'pmtiles' ? ' (lokal PMTiles)' : ' (skjematisk reserve)'}</p>
            </>
          ) : <p>Ingen kartpakke er lagret lokalt.</p>}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-950" aria-label="Personvern ved kartdata">
        <h2 className="text-xl font-black">Personvern ved kartdata</h2>
        <p>{LOCATION_EXPORT_PRIVACY_WARNING}</p>
        <p>Bruk skjematiske 0-100-koordinater. Ikke skriv ekte adresser, personnavn, pasientdata eller skjermede posisjoner.</p>
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

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700" aria-label="Fremtidige kartvalg">
        <h2 className="text-xl font-black text-slate-950">Fremtidige kartvalg</h2>
        <p><span className="font-black">KML:</span> {KML_IMPORT_EVALUATION.decision}</p>
        <p><span className="font-black">QR/fil for sektor:</span> {QR_SECTOR_IMPORT_DESIGN.summary}</p>
        <p><span className="font-black">Blue-force/live posisjon:</span> {BLUE_FORCE_TRACKING_RESEARCH.decision}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700">
        <h2 className="text-xl font-black text-slate-950">Attribusjon og begrensninger</h2>
        <p className="mt-2">{OFFLINE_MAP_ATTRIBUTION}</p>
        <p className="mt-2">{OFFLINE_MAP_LIMITATION_COPY}</p>
        <p className="mt-2">Appen bruker bare godkjente lokale kartpakker når de er lagret på enheten. Den bruker ikke rå kartdata fra eksterne kilder eller delt live-posisjon.</p>
      </section>
    </section>
  );
}
