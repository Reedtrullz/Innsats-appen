import { LocalDataBackupPanel } from '@/components/local-data-backup-panel';
import { OfflineMapPanel } from '@/components/offline-map-panel';

export default function DataOnDevicePage() {
  return (
    <article className="space-y-4">
      <section className="rounded-3xl bg-emerald-950 p-6 text-white">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-200">Lokal lagring</p>
        <h1 className="mt-2 text-3xl font-black">Data lagret på denne enheten</h1>
        <p className="mt-3 text-sm font-semibold text-emerald-100">MVP-en bruker bare nettleserlagring på enheten du har åpen. Det finnes ingen konto, serverkopi eller synkronisering.</p>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-black">Hva lagres lokalt</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-semibold text-slate-700">
          <li>IndexedDB: lokale oppdragstavler, valgte sjekklister, avkrysninger, notater og cachede kontekstsignaler for arbeidsflaten.</li>
          <li>localStorage: release-readiness arbeidskopi og andre små brukerinnstillinger som bare gjelder denne nettleseren.</li>
          <li>Service worker/cache: statiske sider og generert offentlig innhold for offline bruk.</li>
        </ul>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-950">
        <h2 className="text-xl font-black">Retensjon, reset og eksport</h2>
        <p className="mt-2">Data blir liggende til du sletter lokale data i appen, tømmer nettleserdata eller avinstallerer PWA-en. Eksporterte filer er manuell lokal JSON og kan inneholde operasjonelt sensitiv informasjon. Del, lagre og slett eksporterte filer etter lokale rutiner.</p>
      </section>
      <LocalDataBackupPanel />
      <OfflineMapPanel variant="administration" />
    </article>
  );
}
