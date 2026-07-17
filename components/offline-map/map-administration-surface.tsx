import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  OFFLINE_MAP_ATTRIBUTION,
  OFFLINE_MAP_LIMITATION_COPY,
  OFFLINE_MAP_PACKAGES,
  type CachedOfflineMapPackage,
  type OfflineMapPackage,
} from '@/lib/maps/offline-map';
import type { LocalMapPackageManifest } from '@/lib/maps/offline-map-package-manifest';
import {
  BLUE_FORCE_TRACKING_RESEARCH,
  KML_IMPORT_EVALUATION,
  LOCATION_EXPORT_PRIVACY_WARNING,
  QR_SECTOR_IMPORT_DESIGN,
} from '@/lib/maps/operations-map';

export function MapAdministrationSurface({
  selectedSchematicPackage,
  selectedPmtilesPackage,
  approvedPmtilesPackages,
  selectedWarning,
  selectedQuotaCopy,
  cachedPackage,
  cacheSaving,
  showRuntimeStatus,
  statusMessage,
  privacyError,
  imageExport,
  geoJsonExport,
  geoJsonImport,
  primaryButtonClass,
  onSelectSchematicPackage,
  onSelectPmtilesPackage,
  onCacheSelectedPackage,
  onResetCache,
  onExportSvg,
  onExportGeoJson,
  onGeoJsonImportChange,
  onImportGeoJson,
}: {
  selectedSchematicPackage: OfflineMapPackage;
  selectedPmtilesPackage?: LocalMapPackageManifest;
  approvedPmtilesPackages: readonly LocalMapPackageManifest[];
  selectedWarning: string | null;
  selectedQuotaCopy: string | null;
  cachedPackage: CachedOfflineMapPackage | null;
  cacheSaving: boolean;
  showRuntimeStatus: boolean;
  statusMessage: ReactNode;
  privacyError: ReactNode;
  imageExport: string;
  geoJsonExport: string;
  geoJsonImport: string;
  primaryButtonClass: string;
  onSelectSchematicPackage: (packageId: string) => void;
  onSelectPmtilesPackage: (packageId: string) => void;
  onCacheSelectedPackage: () => void;
  onResetCache: () => void;
  onExportSvg: () => void;
  onExportGeoJson: () => void;
  onGeoJsonImportChange: (value: string) => void;
  onImportGeoJson: () => void;
}) {
  const hasApprovedPmtilesPackages = approvedPmtilesPackages.length > 0;

  return (
    <section id="kartdata" className="space-y-4" aria-label="Kartdata og offline">
      <div className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">Kartadministrasjon</p>
        <h2 className="text-2xl font-black">Kartdata og offline</h2>
        <p className="mt-2 text-sm text-sky-100">Velg lokal reserve, lagre godkjente kartpakker og håndter sanitert kartutveksling uten å belaste den operative kartflaten.</p>
        <Link href="/kart" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-black text-sky-950">Tilbake til operativt kart</Link>
      </div>

      {showRuntimeStatus ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700" data-testid="map-administration-status">
          <p className="font-black text-slate-950">Status</p>
          <div className="mt-1">{statusMessage}</div>
        </div>
      ) : null}
      {showRuntimeStatus && privacyError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-900">{privacyError}</p> : null}

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Lokale kartpakker">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Avansert kartoppsett</p>
          <h3 className="text-2xl font-black">Velg skjematisk område og lokal kartpakke</h3>
          <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Skjematiske lokalkart fungerer alltid offline i appen. Godkjente lokale kartpakker kan lagres på enheten for bruk uten nett. Ingen kart deles med oppdrag eller andre enheter.</p>
        </div>
        <label className="block text-sm font-black text-slate-800" htmlFor="offline-schematic-map-package">Velg skjematisk kartpakke</label>
        <select id="offline-schematic-map-package" aria-label="Velg skjematisk kartpakke" value={selectedSchematicPackage.id} onChange={(event) => onSelectSchematicPackage(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950">
          {OFFLINE_MAP_PACKAGES.map((mapPackage) => <option key={mapPackage.id} value={mapPackage.id}>{mapPackage.title} ({mapPackage.estimatedSizeMb} MB skjematisk)</option>)}
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
            <select id="offline-map-package" aria-label="Velg lokal kartpakke" value={selectedPmtilesPackage.id} onChange={(event) => onSelectPmtilesPackage(event.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-950">
              {approvedPmtilesPackages.map((mapPackage) => <option key={mapPackage.id} value={mapPackage.id}>{mapPackage.title} (lokal PMTiles)</option>)}
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
              <button type="button" onClick={onCacheSelectedPackage} disabled={cacheSaving} className="min-h-11 rounded-xl bg-sky-900 px-4 font-black text-white disabled:cursor-wait disabled:bg-slate-500">{cacheSaving ? 'Lagrer kartpakke lokalt...' : 'Lagre valgt kartpakke lokalt'}</button>
              <button type="button" onClick={onResetCache} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-black text-slate-950">Tilbakestill kartcache</button>
            </div>
          </>
        ) : <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">Ingen godkjente lokale kartpakker er tilgjengelige ennå. Det skjematiske lokalkartet fungerer fortsatt offline; full kartpakke krever egen kilde-, lisens- og pilotgodkjenning før lokal lagring.</p>}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700" data-testid="offline-map-cache-status">
          {cachedPackage ? <><p>Lagret lokalt: {cachedPackage.title} ({cachedPackage.estimatedSizeMb} MB), versjon {cachedPackage.version}. Lagret {cachedPackage.cachedAt.slice(0, 10)}.</p><p>Lokal kartpakke aktiv: {cachedPackage.title}{cachedPackage.runtimeFormat === 'pmtiles' ? ' (lokal PMTiles)' : ' (skjematisk reserve)'}</p></> : <p>Ingen kartpakke er lagret lokalt.</p>}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-950" aria-label="Personvern ved kartdata">
        <h3 className="text-xl font-black">Personvern ved kartdata</h3>
        <p>{LOCATION_EXPORT_PRIVACY_WARNING}</p>
        <p>Bruk skjematiske 0-100-koordinater. Ikke skriv ekte adresser, personnavn, pasientdata eller skjermede posisjoner.</p>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Kart eksport og import">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Eksport/import</p>
        <h3 className="text-2xl font-black">Lokal SVG og GeoJSON</h3>
        <p className="rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">{LOCATION_EXPORT_PRIVACY_WARNING}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={onExportSvg} className={`${primaryButtonClass} w-full sm:w-auto`}>Lag kartbilde (SVG)</button>
          <button type="button" onClick={onExportGeoJson} className={`${primaryButtonClass} w-full sm:w-auto`}>Lag GeoJSON eksport</button>
        </div>
        <label className="block text-sm font-bold">Kartbilde SVG<textarea id="map-image-export" readOnly value={imageExport} className="mt-1 min-h-32 w-full rounded-xl border p-3 font-mono text-xs" /></label>
        <label className="block text-sm font-bold">GeoJSON eksport<textarea id="map-geojson-export" readOnly value={geoJsonExport} className="mt-1 min-h-32 w-full rounded-xl border p-3 font-mono text-xs" /></label>
        <label className="block text-sm font-bold">Importer sanitert GeoJSON<textarea aria-label="Importer GeoJSON" value={geoJsonImport} onChange={(event) => onGeoJsonImportChange(event.target.value)} className="mt-1 min-h-32 w-full rounded-xl border p-3 font-mono text-xs" placeholder="Lim inn FeatureCollection med skjematiske 0-100-koordinater" /></label>
        <button type="button" onClick={onImportGeoJson} className="min-h-11 rounded-xl border border-slate-300 px-4 font-black text-slate-950">Importer GeoJSON lokalt</button>
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700" aria-label="Fremtidige kartvalg">
        <h3 className="text-xl font-black text-slate-950">Fremtidige kartvalg</h3>
        <p><span className="font-black">KML:</span> {KML_IMPORT_EVALUATION.decision}</p>
        <p><span className="font-black">QR/fil for sektor:</span> {QR_SECTOR_IMPORT_DESIGN.summary}</p>
        <p><span className="font-black">Blue-force/live posisjon:</span> {BLUE_FORCE_TRACKING_RESEARCH.decision}</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700">
        <h3 className="text-xl font-black text-slate-950">Attribusjon og begrensninger</h3>
        <p className="mt-2">{OFFLINE_MAP_ATTRIBUTION}</p>
        <p className="mt-2">{OFFLINE_MAP_LIMITATION_COPY}</p>
        <p className="mt-2">Appen bruker bare godkjente lokale kartpakker når de er lagret på enheten. Den bruker ikke rå kartdata fra eksterne kilder eller delt live-posisjon.</p>
      </section>
    </section>
  );
}
