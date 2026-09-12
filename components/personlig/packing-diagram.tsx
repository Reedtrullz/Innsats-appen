import type { ReactNode } from 'react';

/**
 * "Slik pakker du" — a calm, illustrative placement aid for the personal
 * preparation flow. It separates what belongs on the body, in the day pack,
 * and in the clothing bag without pretending to be a photograph or a local
 * issue list.
 *
 * Læringsstøtte, ikke en utstyrsordre — the April 2026 baseline and current
 * local packing plan remain authoritative.
 */

export type PackingZone = {
  /** Number shown on the schematic and in the legend. */
  no: number;
  /** Short placement name, e.g. "I ryggsekk". */
  name: string;
  /** What goes in this zone. */
  contents: string;
  /** Grid placement on the schematic placement aid. */
  area: string;
  /** Accent the main compartment a little differently. */
  emphasis?: boolean;
};

export const INNSATSBEKLEDNING_BAG_ZONES: PackingZone[] = [
  { no: 1, name: 'På kropp', contents: 'Innsatsjakke og -bukse, feltstøvler, refleksvest, ullundertøy etter årstid, caps/oransje vinterlue, lommepakning, arbeidshansker og multiverktøy', area: 'body', emphasis: true },
  { no: 2, name: 'I ryggsekk', contents: 'Fleece-/ulljakke, hals/headover, flammehemmede vinterhansker, drikke etter lokal utlevering, matpakke, kopp, hodelykt med reservebatterier, vernebrille og hjelm under topplokk', area: 'backpack', emphasis: true },
  { no: 3, name: 'I bag', contents: 'Vernemaske med reservefilter og CBRN-tilbehør, påvisnings-/sporingspapir, Fullers jord, vind-/ullvotter, ullgenser, resterende ullundertøy og skift ved skogbrann', area: 'bag' },
];

export function PackingDiagram({
  title = 'Slik pakker du',
  subtitle = 'På kropp, i ryggsekk og i bag — en rolig før-oppmøte-sjekk',
  zones = INNSATSBEKLEDNING_BAG_ZONES,
  tip,
}: {
  title?: string;
  subtitle?: string;
  zones?: PackingZone[];
  tip?: ReactNode;
}) {
  const tipContent = tip ?? (
    <>
      Hold plasseringen enkel: ha det du trenger først tilgjengelig på kroppen og i ryggsekken.
      Sikre hjelmen under topplokket og samle maske-/CBRN-utstyret i bagen. Kontroller alltid mot gjeldende lokal pakkeplan.
    </>
  );

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="packing-diagram-heading">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[#34d399]">Personlig · forberedelse</p>
      <h2 id="packing-diagram-heading" className="text-2xl font-black text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">{subtitle}</p>

      {/* Schematic placement aid — the grid is decorative; the list below is authoritative for reading. */}
      <div
        className="mt-4 grid gap-2"
        style={{
          gridTemplateColumns: '1fr',
          gridTemplateAreas: `
            "body"
            "backpack"
            "bag"
          `,
        }}
        aria-hidden="true"
      >
        {zones.map((zone) => (
          <div
            key={zone.no}
            style={{ gridArea: zone.area }}
            className={`flex min-h-14 flex-col justify-center rounded-2xl border p-3 ${
              zone.emphasis
                ? 'border-[#34d399]/40 bg-[var(--success-surface)]'
                : 'border-[var(--border)] bg-[var(--surface-muted)]'
            }`}
          >
            <span className="font-mono text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              {zone.no} · {zone.name}
            </span>
          </div>
        ))}
      </div>

      {/* Legend — readable as a real list (the grid above is decorative). */}
      <ol className="mt-4 space-y-2">
        {zones.map((zone) => (
          <li key={zone.no} className="flex gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] font-mono text-xs font-bold text-[var(--text-secondary)]">
              {zone.no}
            </span>
            <span className="text-sm leading-5 text-[var(--text-secondary)]">
              <span className="font-bold text-[var(--text-primary)]">{zone.name}</span> — {zone.contents}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex gap-3 rounded-2xl border border-[#34d399]/30 bg-[var(--success-surface)] p-3">
        <span aria-hidden="true" className="text-lg">💡</span>
        <div>
          <p className="font-mono text-[0.6rem] font-bold uppercase tracking-widest text-[var(--success-fg)]">Slik får du plass</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-[var(--success-fg)]">{tipContent}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold leading-5 text-[var(--text-muted)]">
        Plasseringshjelp basert på «Klar til innsats» (vedlagt PDF med dokumentmetadata fra 2024). Den kan avvike fra gjeldende lokal pakkeplan og er ikke en komplett utstyrsliste.
      </p>
    </section>
  );
}
