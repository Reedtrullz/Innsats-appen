'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
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
  type OfflineMapPackageId,
  type SchematicMapFeatureKind,
} from '@/lib/maps/offline-map';

const featureStyles: Record<SchematicMapFeatureKind, { fill: string; stroke: string; label: string }> = {
  depot: { fill: '#0f172a', stroke: '#ffffff', label: 'Depot' },
  'meeting-point': { fill: '#0369a1', stroke: '#ffffff', label: 'Møteplass' },
  'risk-area': { fill: '#f97316', stroke: '#7c2d12', label: 'Risiko' },
  route: { fill: '#16a34a', stroke: '#052e16', label: 'Akse' },
  resource: { fill: '#7c3aed', stroke: '#ffffff', label: 'Ressurs' },
};

function SchematicMap({ packageId }: { packageId: OfflineMapPackageId }) {
  const selectedPackage = getOfflineMapPackage(packageId) ?? OFFLINE_MAP_PACKAGES[0];
  const renderedFeatures = getRenderableMapFeatures(selectedPackage);
  const hiddenFeatureCount = Math.max(0, selectedPackage.features.length - renderedFeatures.length);

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
      </svg>
      <figcaption className="space-y-2 border-t border-slate-700 bg-slate-950 p-4 text-xs font-semibold text-slate-200">
        <p>{OFFLINE_MAP_ATTRIBUTION}</p>
        <p>{OFFLINE_MAP_LIMITATION_COPY}</p>
        <p data-testid="map-performance-guard">
          Ytelsesvern: viser maks {renderedFeatures.length} skjematiske markører i SVG-et{hiddenFeatureCount ? ` (${hiddenFeatureCount} skjult)` : ''}.
        </p>
      </figcaption>
    </figure>
  );
}

export function OfflineMapPanel() {
  const cacheSnapshot = useSyncExternalStore(subscribeOfflineMapCache, offlineMapCacheSnapshot, () => 'null');
  const cachedPackage = useMemo(() => parseCachedOfflineMapPackage(cacheSnapshot), [cacheSnapshot]);
  const [selectedPackageId, setSelectedPackageId] = useState<OfflineMapPackageId>(OFFLINE_MAP_PACKAGES[0].id);
  const selectedPackage = getOfflineMapPackage(selectedPackageId) ?? OFFLINE_MAP_PACKAGES[0];
  const selectedWarning = cacheSizeWarningForPackage(selectedPackage);

  function cacheSelectedPackage() {
    writeCachedOfflineMapPackage(selectedPackage.id);
  }

  function resetCache() {
    resetCachedOfflineMapPackage();
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

      <SchematicMap packageId={selectedPackage.id} />

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Lokale kartpakker">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Lokale kartpakker</p>
          <h2 className="text-2xl font-black">Velg og cache område</h2>
          <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
            Valget simulerer en lokal kartpakke-cache i localStorage. Det gjøres ingen nettverksnedlasting, ingen backend sync og ingen deling med oppdrag eller andre enheter.
          </p>
        </div>

        <label className="block text-sm font-black text-slate-800" htmlFor="offline-map-package">
          Velg lokal kartpakke
        </label>
        <select
          id="offline-map-package"
          aria-label="Velg lokal kartpakke"
          value={selectedPackage.id}
          onChange={(event) => setSelectedPackageId(event.target.value as OfflineMapPackageId)}
          className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950"
        >
          {OFFLINE_MAP_PACKAGES.map((mapPackage) => (
            <option key={mapPackage.id} value={mapPackage.id}>
              {mapPackage.title} ({mapPackage.estimatedSizeMb} MB)
            </option>
          ))}
        </select>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <p className="font-black text-slate-950">{selectedPackage.title}</p>
          <p className="mt-1">Område: {selectedPackage.district}</p>
          <p className="mt-1">{selectedPackage.description}</p>
          <p className="mt-1">Anslått lokal cache: {selectedPackage.estimatedSizeMb} MB. Versjon: {selectedPackage.version}.</p>
          {selectedWarning ? <p className="mt-3 rounded-xl bg-orange-100 p-3 font-black text-orange-950">{selectedWarning}</p> : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={cacheSelectedPackage} className="min-h-11 rounded-xl bg-sky-900 px-4 font-black text-white">
            Lagre valgt kartpakke lokalt
          </button>
          <button type="button" onClick={resetCache} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950">
            Tilbakestill kartcache
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700" data-testid="offline-map-cache-status">
          {cachedPackage ? (
            <p>
              Cachet lokalt: {cachedPackage.title} ({cachedPackage.estimatedSizeMb} MB), versjon {cachedPackage.version}. Lagret {cachedPackage.cachedAt.slice(0, 10)}.
            </p>
          ) : (
            <p>Ingen kartpakke er cachet lokalt.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700">
        <h2 className="text-xl font-black text-slate-950">Attribusjon og begrensninger</h2>
        <p className="mt-2">{OFFLINE_MAP_ATTRIBUTION}</p>
        <p className="mt-2">{OFFLINE_MAP_LIMITATION_COPY}</p>
        <p className="mt-2">MVP-en bruker ikke MBTiles, MapLibre, Leaflet, OpenStreetMap-fliser eller rå oppstrømsgeometri.</p>
      </section>
    </section>
  );
}
