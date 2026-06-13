import {
  OFFLINE_MAP_ATTRIBUTION,
  OFFLINE_MAP_LIMITATION_COPY,
  OFFLINE_MAP_PACKAGES,
  getOfflineMapPackage,
  getRenderableMapFeatures,
  type SchematicMapFeatureKind,
} from '@/lib/maps/offline-map';
import {
  MAP_MARKER_LABELS,
  filterMissionMapStateByLayers,
  operationItemsForRender,
  type MapLayerKey,
  type MapMarkerKind,
  type MissionMapState,
} from '@/lib/maps/operations-map';
import { stackSchematicLabelYs } from '@/lib/maps/schematic-labels';

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

/**
 * Pure, tile-free schematic map render for the offline panel. No hooks, no
 * network — draws the package's static features plus the active mission's
 * markers/drawings, capped by the performance guard. Extracted from
 * offline-map-panel.tsx; behaviour is identical.
 */
export function SchematicMap({ packageId, state, enabledLayers }: { packageId: string; state: MissionMapState; enabledLayers: MapLayerKey[] }) {
  const selectedPackage = getOfflineMapPackage(packageId) ?? OFFLINE_MAP_PACKAGES[0];
  const renderedFeatures = getRenderableMapFeatures(selectedPackage);
  const hiddenFeatureCount = Math.max(0, selectedPackage.features.length - renderedFeatures.length);
  const filteredState = filterMissionMapStateByLayers(state, enabledLayers);
  const renderedOperations = operationItemsForRender(filteredState);
  const hiddenOperationCount = filteredState.markers.length + filteredState.drawings.length - renderedOperations.length;
  // Labels for features and markers share one stacking pass so nearby
  // anchors get distinct rows instead of overprinting each other.
  const renderedMarkers = renderedOperations.filter((item) => item.itemType === 'marker');
  const labelYs = stackSchematicLabelYs([
    ...renderedFeatures.map((feature) => ({ x: feature.x, y: feature.y })),
    ...renderedMarkers.map((item) => ({ x: item.point.x, y: item.point.y })),
  ]);
  const featureLabelY = (index: number) => labelYs[index];
  const markerLabelYById = new Map(renderedMarkers.map((item, index) => [item.id, labelYs[renderedFeatures.length + index]]));

  return (
    <figure className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-sm" aria-label="Skjematisk lokalkart">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="offline-map-title offline-map-desc" className="h-72 w-full bg-slate-900">
        <title id="offline-map-title">{`Skjematisk lokalt kart for ${selectedPackage.title}`}</title>
        <desc id="offline-map-desc">Statisk kartbilde uten eksterne kartkall.</desc>
        <defs>
          <pattern id="offline-map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.35" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#offline-map-grid)" />
        <path d="M 12 78 C 25 62, 39 56, 50 48 S 75 25, 88 14" fill="none" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 2" />
        <path d="M 16 22 C 31 36, 51 44, 84 75" fill="none" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 3" />
        {renderedFeatures.map((feature, index) => {
          const style = featureStyles[feature.kind];
          return (
            <g key={feature.id}>
              <circle cx={feature.x} cy={feature.y} r="4.2" fill={style.fill} stroke={style.stroke} strokeWidth="1" />
              <text x={feature.x > 50 ? feature.x - 5 : feature.x + 5} y={featureLabelY(index)} textAnchor={feature.x > 50 ? 'end' : 'start'} fill="#f8fafc" fontSize="3.3" fontWeight="700">
                {feature.label}
              </text>
            </g>
          );
        })}
        {renderedOperations.map((item) => item.itemType === 'marker' ? (
          <g key={item.id} data-testid={`map-marker-${item.kind}`}>
            <circle cx={item.point.x} cy={item.point.y} r="3.2" fill={markerColors[item.kind]} stroke="#ffffff" strokeWidth="1" />
            <text x={item.point.x > 50 ? item.point.x - 4 : item.point.x + 4} y={markerLabelYById.get(item.id) ?? Math.max(item.point.y - 4, 7)} textAnchor={item.point.x > 50 ? 'end' : 'start'} fill="#ffffff" fontSize="3.1" fontWeight="800">{MAP_MARKER_LABELS[item.kind]}: {item.label}</text>
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
          Ytelsesvern: viser maks {renderedFeatures.length} skjematiske markører i kartbildet{hiddenFeatureCount ? ` (${hiddenFeatureCount} skjult)` : ''}. Operative lokale lag: {renderedOperations.length}{hiddenOperationCount > 0 ? ` (${hiddenOperationCount} skjult)` : ''}.
        </p>
      </figcaption>
    </figure>
  );
}
