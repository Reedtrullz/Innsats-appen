'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { LocalMapPackageManifest } from '@/lib/maps/offline-map-package-manifest';
import { registerPmtilesProtocolOnce } from '@/lib/maps/maplibre-runtime';

type MapInstanceLike = {
  remove: () => void;
  on?: (event: 'error' | string, handler: () => void) => void;
};

type MapLibreLoadState = {
  packageId?: string;
  status: string;
  fallbackActive: boolean;
};

export function OfflineMapLibreView({
  packageManifest,
  fallback,
}: {
  packageManifest?: LocalMapPackageManifest;
  fallback?: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadState, setLoadState] = useState<MapLibreLoadState>({
    status: 'Klargjør lokal kartpakke.',
    fallbackActive: false,
  });

  useEffect(() => {
    if (!packageManifest || !containerRef.current) return undefined;

    let map: MapInstanceLike | undefined;
    let disposed = false;
    const packageId = packageManifest.id;
    const activateFallback = () => {
      if (disposed) return;
      setLoadState({
        packageId,
        status: 'Kunne ikke åpne lokal kartpakke. Skjematisk kart brukes som fallback.',
        fallbackActive: true,
      });
    };

    async function boot() {
      try {
        const [{ default: maplibregl }, { Protocol }] = await Promise.all([
          import('maplibre-gl'),
          import('pmtiles'),
        ]);
        if (disposed || !containerRef.current || !packageManifest) return;

        const protocol = new Protocol();
        registerPmtilesProtocolOnce(maplibregl, protocol);
        map = new maplibregl.Map({
          container: containerRef.current,
          style: packageManifest.styleUrl,
          center: packageManifest.center,
          zoom: Math.max(packageManifest.minZoom, Math.min(packageManifest.maxZoom, packageManifest.minZoom + 2)),
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        map.on?.('error', activateFallback);
        if (disposed) return;
        setLoadState({
          packageId,
          status: `Lokal kartpakke aktiv: ${packageManifest.title}.`,
          fallbackActive: false,
        });
      } catch {
        activateFallback();
      }
    }

    void boot();
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [packageManifest]);

  if (!packageManifest) {
    return (
      <p className="rounded-2xl bg-slate-100 p-3 text-sm font-bold text-slate-700">
        Skjematisk kart er aktiv fallback. Ingen godkjent lokal PMTiles-pakke er valgt.
      </p>
    );
  }

  const status = loadState.packageId === packageManifest.id ? loadState.status : 'Klargjør lokal kartpakke.';
  const fallbackActive = loadState.packageId === packageManifest.id && loadState.fallbackActive;

  return (
    <div className="space-y-3">
      <figure className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-sm" aria-label="Lokal offline kartpakke">
        <div ref={containerRef} data-testid="offline-maplibre-container" className="h-80 w-full" />
        <figcaption className="space-y-1 border-t border-slate-700 bg-slate-950 p-4 text-xs font-semibold text-slate-200">
          <p>{status}</p>
          <p>{packageManifest.attribution}</p>
          <p>Ikke autoritativ navigasjon. Lokale markører og sektorer er beslutningsstøtte og lagres bare i nettleseren.</p>
        </figcaption>
      </figure>
      {fallbackActive && fallback ? (
        <div aria-label="Skjematisk kartfallback" className="rounded-3xl border border-amber-200 bg-amber-50 p-3">
          {fallback}
        </div>
      ) : null}
    </div>
  );
}
