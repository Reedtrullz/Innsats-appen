'use client';

import { useEffect, useRef, useState } from 'react';
import type { LocalMapPackageManifest } from '@/lib/maps/offline-map-package-manifest';
import { registerPmtilesProtocolOnce } from '@/lib/maps/maplibre-runtime';

type MapInstanceLike = { remove: () => void };

export function OfflineMapLibreView({ packageManifest }: { packageManifest?: LocalMapPackageManifest }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState('Klargjør lokal kartpakke.');

  useEffect(() => {
    if (!packageManifest || !containerRef.current) return undefined;

    let map: MapInstanceLike | undefined;
    let disposed = false;

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
        setStatus(`Lokal kartpakke aktiv: ${packageManifest.title}.`);
      } catch {
        setStatus('Kunne ikke åpne lokal kartpakke. Skjematisk kart brukes som fallback.');
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

  return (
    <figure className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-sm" aria-label="Lokal offline kartpakke">
      <div ref={containerRef} data-testid="offline-maplibre-container" className="h-80 w-full" />
      <figcaption className="space-y-1 border-t border-slate-700 bg-slate-950 p-4 text-xs font-semibold text-slate-200">
        <p>{status}</p>
        <p>{packageManifest.attribution}</p>
        <p>Ikke autoritativ navigasjon. Lokale markører og sektorer er beslutningsstøtte og lagres bare i nettleseren.</p>
      </figcaption>
    </figure>
  );
}
