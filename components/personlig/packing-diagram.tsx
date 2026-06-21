import type { ReactNode } from 'react';

/**
 * "Slik pakker du" — the schematic packing diagram from the redesign board
 * (section 05, Personlig modus). A calm, illustrative layout of an
 * innsatsbekledning bag: numbered zones with what goes where, plus a
 * "slik får du plass" tip. Schematic on purpose — like the offline map
 * fallback, it teaches the layout without pretending to be a photograph.
 *
 * Læringsstøtte, ikke en utstyrsordre — content mirrors the curated example;
 * the authoritative packing list is the tjeneste's own.
 */

export type PackingZone = {
  /** Number shown on the schematic and in the legend. */
  no: number;
  /** Short zone name, e.g. "Sidelomme topp". */
  name: string;
  /** What goes in this zone. */
  contents: string;
  /** Grid placement on the schematic bag. */
  area: string;
  /** Accent the main compartment a little differently. */
  emphasis?: boolean;
};

export const INNSATSBEKLEDNING_BAG_ZONES: PackingZone[] = [
  { no: 1, name: 'Sidelomme topp', contents: 'Vernemaske CBRN + bæreveske, filter, adapter', area: 'top' },
  { no: 2, name: 'Stor side', contents: 'Hansker, votter, vernebrille', area: 'side-a' },
  { no: 3, name: 'Stor side', contents: 'Lue, vindlue, hals, caps', area: 'side-b' },
  { no: 4, name: 'Stor side', contents: 'Hodelykt, multiverktøy, sanitetspakning, refleksvest', area: 'side-c' },
  { no: 5, name: 'Tynn', contents: 'Notisbok, papirer, navnestriper', area: 'thin' },
  { no: 6, name: 'Hovedrom', contents: 'Rullet tøy + feltstøvel i bunn + liten ryggsekk med hjelm festet', area: 'main', emphasis: true },
  { no: 7, name: 'Sidelomme bunn', contents: 'CBRN forts.: klesbørste, påvisningspapir, fullers jord, termos', area: 'bottom' },
];

export function PackingDiagram({
  title = 'Slik pakker du',
  subtitle = 'Bag for innsatsbekledning — få plass til alt',
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
      Rull tøyet stramt i Hovedrom og legg den lille ryggsekken (med hjelm festet) øverst der.
      Maske og CBRN-kit i sidelommene, hardt smågodt i de tre Stor side, kun papirer i Tynn.
    </>
  );

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="packing-diagram-heading">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[#34d399]">Personlig · forberedelse</p>
      <h2 id="packing-diagram-heading" className="text-2xl font-black text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">{subtitle}</p>

      {/* Schematic bag — zones laid out as a simple labelled grid. */}
      <div
        className="mt-4 grid gap-2"
        style={{
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateAreas: `
            "top top thin"
            "side-a main main"
            "side-b main main"
            "side-c main main"
            "bottom bottom bottom"
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
    </section>
  );
}
