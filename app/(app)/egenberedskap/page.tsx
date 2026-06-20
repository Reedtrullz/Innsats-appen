import type { Metadata } from 'next';
import { PackingDiagram } from '@/components/personlig/packing-diagram';
import { CommandCard } from '@/components/ui/operational-primitives';

export const metadata: Metadata = {
  title: 'Egenberedskap | Beredskapsboka',
  description: 'Personlig forberedelse før vakt og utkalling — pakk sekken, verneutstyr, helse og varsling. Roligere tempo, ikke tidskritisk.',
};

const prepCards: Array<{ eyebrow: string; title: string; body: string; href: string; cta: string }> = [
  {
    eyebrow: '🎒 Pakk sekken',
    title: 'Pakk innsatssekken',
    body: 'Tjenestens utstyrskrav, lagt opp som en rolig rekkefølge. Se hvordan alt får plass.',
    href: '#pakking',
    cta: 'Se pakkeoversikt',
  },
  {
    eyebrow: '🛡 Verneutstyr',
    title: 'Personlig verneutstyr',
    body: 'Kontroll og vedlikehold av personlig vern før innsats.',
    href: '/sok?q=personlig%20verneutstyr',
    cta: 'Finn verneutstyr-kort',
  },
  {
    eyebrow: '🌙 Helse',
    title: 'Helse, søvn og utholdenhet',
    body: 'Før og under lange innsatser — hva som holder deg operativ.',
    href: '/sok?q=utholdenhet%20helse',
    cta: 'Finn læringsstøtte',
  },
  {
    eyebrow: '📟 Varsling',
    title: 'Når du blir varslet',
    body: 'Hva du gjør, steg for steg, fra utkalling til avmarsj.',
    href: '/for',
    cta: 'Til før-innsats',
  },
];

export default function Page() {
  return (
    <div className="space-y-5">
      {/* Calm Personlig hero — softer green accent, more air, no alarm red. */}
      <section className="rounded-3xl border border-[#34d399]/30 bg-[var(--surface)] p-6" aria-labelledby="egenberedskap-heading">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[#34d399]">Personlig · ikke tidskritisk</p>
        <h1 id="egenberedskap-heading" className="mt-1 text-3xl font-black text-[var(--text-primary)]">Egenberedskap</h1>
        <p className="mt-2 text-base font-semibold leading-6 text-[var(--text-secondary)]">
          Klar før vakt og utkalling. Roligere tempo enn under innsats — forberedelse, ikke kommando.
          Alt ligger lokalt; ingen pålogging, ingen persondata.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {prepCards.map((card) => (
          <CommandCard
            key={card.title}
            eyebrow={card.eyebrow}
            title={card.title}
            tone="success"
            href={card.href}
            ctaLabel={card.cta}
          >
            {card.body}
          </CommandCard>
        ))}
      </div>

      <div id="pakking" className="scroll-mt-28">
        <PackingDiagram />
      </div>

      <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 font-mono text-xs leading-5 text-[var(--text-muted)]">
        Læringsstøtte og innholdsoversikt, ikke en utstyrsordre eller dokumentasjon på godkjent kompetanse.
        Den autoritative pakkelisten er tjenestens egen.
      </p>
    </div>
  );
}
