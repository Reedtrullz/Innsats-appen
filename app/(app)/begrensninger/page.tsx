export default function BoundaryPage() {
  return (
    <article className="space-y-4">
      <section className="rounded-3xl bg-sky-950 p-6 text-white">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-200">MVP-grense</p>
        <h1 className="mt-2 text-3xl font-black">Operative grenser</h1>
        <p className="mt-3 text-sm font-semibold text-sky-100">
          Beredskapsboka er beslutningsstøtte for lokal strukturering og kildebelagte huskepunkter. Appen er ikke et offisielt kommando-, ordre- eller hendelsessystem.
        </p>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-black">Dette betyr i bruk</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-semibold text-slate-700">
          <li>Følg alltid gjeldende ordre, innsatsledelse, fagmyndighet og lokale sambands-/rapporteringsrutiner foran appens forslag.</li>
          <li>Appen er ikke et ordre-, logg- eller hendelsessystem og erstatter ikke nødnett, loggføring, varsling, samband, kommando- og kontrollverktøy eller etatens godkjente systemer.</li>
          <li>Ingen data sendes til server i MVP. Ikke legg inn persondata, pasientdata eller private/skjermede tilfluktsromdata.</li>
        </ul>
      </section>
    </article>
  );
}
