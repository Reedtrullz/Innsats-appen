import Link from 'next/link';
import type { MissionContext } from '@/lib/mission/schemas';
import type { MissionMapState } from '@/lib/maps/operations-map';

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function MissionMapSummary({ mission, mapState }: { mission: MissionContext; mapState: MissionMapState }) {
  const fieldLogEntries = mission.fieldLogEntries ?? [];
  const mapLinkedEntries = fieldLogEntries.filter((entry) => Boolean(entry.mapReference));
  const criticalEntries = fieldLogEntries.filter((entry) => entry.criticalObservation || entry.mustBeForwarded);
  const latestMapEntry = [...mapLinkedEntries].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).at(-1);
  const latestMapReference = latestMapEntry?.mapReference;

  return (
    <section id="kart" aria-labelledby="mission-map-summary-heading" className="scroll-mt-28 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-sky-700">Kart og logg</p>
          <h3 id="mission-map-summary-heading" className="text-xl font-black">Kart og logg</h3>
          <p className="mt-1 text-sm font-semibold text-slate-700">Kobler lokale kartobjekter, kartrefererte feltloggpunkt og kritiske observasjoner på oppdragstavlen.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/kart" className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white">Åpne kart</Link>
          <a href="#feltlogg" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-black text-slate-900">Åpne feltlogg</a>
        </div>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-100 p-3">
          <dt className="font-black">Markører</dt>
          <dd>{countLabel(mapState.markers.length, 'markør', 'markører')}</dd>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">
          <dt className="font-black">Tegninger/sektorer</dt>
          <dd>{countLabel(mapState.drawings.length, 'tegning', 'tegninger')}</dd>
        </div>
        <div className="rounded-xl bg-slate-100 p-3">
          <dt className="font-black">Kartkoblet logg</dt>
          <dd>{countLabel(mapLinkedEntries.length, 'kartkoblet logg', 'kartkoblede logger')}</dd>
        </div>
        <div className="rounded-xl bg-red-50 p-3 text-red-950">
          <dt className="font-black">Kritisk</dt>
          <dd>{countLabel(criticalEntries.length, 'kritisk observasjon', 'kritiske observasjoner')}</dd>
        </div>
      </dl>

      {latestMapEntry && latestMapReference ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
          <h4 className="font-black">Siste kartlogg</h4>
          <p className="mt-1 font-semibold">{latestMapReference.label} — skjematisk kartreferanse registrert</p>
          <p className="mt-1 font-semibold text-slate-900">{latestMapEntry.text}</p>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-700">Ingen kartkoblet feltlogg ennå. Opprett logg fra /kart eller legg til kartreferanse i feltloggen.</p>
      )}
    </section>
  );
}
