'use client';

import type { OperationalChecklist } from '@/lib/content/schemas';
import { CommandCard } from '@/components/ui/operational-primitives';
import { PersonalPrepChecklist } from '@/components/personlig/personal-prep-checklist';

/**
 * Personlig modus home (board section 05, "Forberedelse hjemme — roligere
 * tempo"). Calmer than the Innsats home: a soft green accent, the pakk-sekken
 * progress front and centre, and quiet links into the egenberedskap hub.
 * Forberedelse, ikke kommando.
 */
export function PersonalHome({
  packingChecklist,
  sourceTitleById = {},
}: {
  packingChecklist?: OperationalChecklist;
  sourceTitleById?: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#34d399]/30 bg-[var(--surface)] p-6" aria-labelledby="personlig-home-heading">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[#34d399]">Personlig · ikke tidskritisk</p>
        <h1 id="personlig-home-heading" className="mt-1 text-3xl font-black text-[var(--text-primary)]">Klar før vakt</h1>
        <p className="mt-2 text-base font-semibold leading-6 text-[var(--text-secondary)]">
          Gjør deg klar hjemme — pakk sekken, egenberedskap og utstyr før utkalling.
          Roligere tempo. Bytt til Innsats i «Mer» når du rykker ut.
        </p>
      </section>

      {packingChecklist ? (
        <PersonalPrepChecklist checklist={packingChecklist} sourceTitleById={sourceTitleById} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <CommandCard
          eyebrow="🎒 Egenberedskap"
          title="Hele egenberedskap-oversikten"
          tone="success"
          href="/egenberedskap"
          ctaLabel="Åpne egenberedskap"
        >
          Pakkeoversikt, verneutstyr, helse og varsling — samlet.
        </CommandCard>
        <CommandCard
          eyebrow="📟 Varsling"
          title="Når du blir varslet"
          tone="success"
          href="/for"
          ctaLabel="Til før-innsats"
        >
          Hva du gjør, steg for steg, fra utkalling til avmarsj.
        </CommandCard>
      </div>
    </div>
  );
}
