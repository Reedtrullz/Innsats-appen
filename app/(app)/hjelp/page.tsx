import type { Metadata } from 'next';
import Link from 'next/link';
import { HelpDemoPanel } from '@/components/help-demo-panel';
import { OperationalIcon } from '@/components/ui/operational-icons';
import { CommandCard, StatusPill } from '@/components/ui/operational-primitives';
import { getContentManifest } from '@/lib/content/load-content';

export const metadata: Metadata = {
  title: 'Hjelp og demo | Beredskapsboka',
  description: 'Lær flytene i Beredskapsboka og start en lokal demohendelse.',
};

const whatNowCards = [
  {
    title: 'Jeg er ny',
    body: 'Start med rolle, aktivt oppdrag og de tre hovedvalgene på hjemskjermen.',
    href: '/hjelp#start-her',
    cta: 'Se startflyt',
  },
  {
    title: 'Jeg er på vei ut',
    body: 'Klargjør oppdrag, offline innhold, kart og feltmodus før avmarsj.',
    href: '/for',
    cta: 'Gå til Før',
  },
  {
    title: 'Jeg står i innsats',
    body: 'Bruk oppdragstavle, hurtiglogg, søk, kart og lokale statusvalg.',
    href: '/under',
    cta: 'Gå til Under',
  },
  {
    title: 'Jeg må finne noe raskt',
    body: 'Søk i tiltak, kilder, moduler og begreper. Treff vises før filtre.',
    href: '/sok',
    cta: 'Åpne søk',
  },
  {
    title: 'Jeg må logge eller markere',
    body: 'Bruk aktivt oppdrag og kart for lokale markører, feltlogg og eksport.',
    href: '/kart',
    cta: 'Åpne kart',
  },
  {
    title: 'Jeg skal avslutte',
    body: 'Eksporter oppdragsmappe, etterrapport og rydd lokal data etter øving.',
    href: '/etter',
    cta: 'Gå til Etter',
  },
] as const;

const flowSections = [
  {
    title: '1. Start trygt',
    items: ['Velg rolle på hjemskjermen.', 'Åpne eller opprett aktivt oppdrag.', 'Bekreft at appen er beslutningsstøtte og lokal lagring.'],
  },
  {
    title: '2. Jobb operativt',
    items: ['Bruk søk eller hurtigkort for tiltak.', 'Logg korte observasjoner uten persondata.', 'Bruk kart med skjematiske 0-100-koordinater.'],
  },
  {
    title: '3. Del riktig',
    items: ['Eksporter manuelt når du trenger status ut av appen.', 'Bruk ordinære systemer for ordre, journal og personopplysninger.', 'Slett demo eller lokale data når øving er ferdig.'],
  },
] as const;

const roleTrainingFlows = [
  {
    id: 'tren-mannskap',
    role: 'Mannskap',
    title: 'Treningsflyt for mannskap',
    promise: 'Lær å finne riktig tiltak, følge aktivt oppdrag og melde korte observasjoner uten persondata.',
    difference: 'Mannskap bruker appen som støtte i egen oppgave. Du skal lese, utføre, melde tilbake og ikke bygge ordregrunnlaget alene.',
    steps: [
      {
        label: 'Finn tiltak raskt',
        body: 'Start med hurtigkort eller søk. Øv på å lese tiltak, grenser og kilde før du handler.',
        href: '/sok?q=samband',
        cta: 'Søk som mannskap',
      },
      {
        label: 'Følg aktivt oppdrag',
        body: 'Åpne oppdragstavlen, finn tildelte oppgaver og bruk hurtiglogg når noe må meldes videre.',
        href: '/oppdrag#hurtiglogg',
        cta: 'Øv hurtiglogg',
      },
      {
        label: 'Jobb ute og offline',
        body: 'Test feltmodus, større trykkflater og hva som finnes på enheten før du mister dekning.',
        href: '/feltmodus',
        cta: 'Test feltmodus',
      },
    ],
  },
  {
    id: 'tren-lagforer',
    role: 'Lagfører',
    title: 'Treningsflyt for lagfører',
    promise: 'Lær å holde laget samlet rundt aktivt oppdrag, kart, sjekklister, ressursbehov og enkel eksport.',
    difference: 'Lagfører bruker appen til å koordinere laget. Du prioriterer oppgaver, markerer lokale funn og gjør status lett å dele manuelt.',
    steps: [
      {
        label: 'Start laget på samme bilde',
        body: 'Åpne aktivt oppdrag, sjekk Nå-fanen og se hva som haster før du fordeler arbeid.',
        href: '/oppdrag',
        cta: 'Åpne oppdrag',
      },
      {
        label: 'Koble kart og logg',
        body: 'Legg inn skjematiske markører, opprett feltlogg fra kart og hold markeringslisten ryddig.',
        href: '/kart',
        cta: 'Øv kart',
      },
      {
        label: 'Bygg delbar status',
        body: 'Øv på 5-punktsordre, sambandsplan og oppdragsmappe før ekte innsats.',
        href: '/oppdrag#5-punktsordre',
        cta: 'Øv ordre',
      },
    ],
  },
  {
    id: 'tren-leder',
    role: 'Leder',
    title: 'Treningsflyt for leder',
    promise: 'Lær å bruke appen til oversikt, prioritering, kildesjekk og trygg overlevering uten å gjøre appen til journal.',
    difference: 'Leder bruker appen som beslutningsstøtte. Du ser etter status, risiko, mangler og hva som må videre til ordinære systemer.',
    steps: [
      {
        label: 'Se status og risiko',
        body: 'Bruk oppdragstavlen til å lese statuslogg, ressursbehov, RUH, velferd og åpne punkter.',
        href: '/oppdrag#ruh-velferd',
        cta: 'Se lederstatus',
      },
      {
        label: 'Sjekk grunnlaget',
        body: 'Bruk kilder og begrensninger når du trenger å vite hvor rådet kommer fra og hva appen ikke avgjør.',
        href: '/kilder',
        cta: 'Åpne kilder',
      },
      {
        label: 'Del og avslutt ryddig',
        body: 'Øv på etterrapport, oppdragsmappe, manuell eksport og lokal opprydding etter øving.',
        href: '/etter',
        cta: 'Øv avslutning',
      },
    ],
  },
] as const;

export default function HelpPage() {
  const manifest = getContentManifest();

  return (
    <article className="space-y-5">
      <section className="rounded-3xl bg-[#082F49] p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-wide text-sky-200">Hjelp og øving</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Lær flytene i Innsats-appen</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-sky-100">
              Bruk denne siden for å forstå hva du gjør først, øve på en komplett demohendelse og finne trygge snarveier til de viktigste arbeidsflatene.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill label="Lokal øving" tone="sky" />
            <StatusPill label="Ingen persondata" tone="warning" />
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="what-now-heading">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-sky-800">Hva gjør jeg nå?</p>
          <h2 id="what-now-heading" className="text-2xl font-black text-slate-950">Velg situasjonen din</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {whatNowCards.map((card) => (
            <CommandCard key={card.title} title={card.title} href={card.href} ctaLabel={card.cta} icon="chevron" tone="slate">
              {card.body}
            </CommandCard>
          ))}
        </div>
      </section>

      <section id="start-her" className="space-y-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-labelledby="start-her-heading">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-sky-800">Start her</p>
          <h2 id="start-her-heading" className="text-2xl font-black text-slate-950">Slik henger appen sammen</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Tenk på appen som tre lag: først velger du rolle og oppdrag, så bruker du tiltak/kart/logg mens du jobber, og til slutt eksporterer eller rydder du lokalt.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {flowSections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-labelledby={`${section.title.replace(/\W+/g, '-').toLowerCase()}-heading`}>
              <h3 id={`${section.title.replace(/\W+/g, '-').toLowerCase()}-heading`} className="text-lg font-black text-slate-950">{section.title}</h3>
              <ul className="mt-2 space-y-2 text-sm font-semibold leading-5 text-slate-700">
                {section.items.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section id="treningsflyter" className="space-y-4" aria-labelledby="role-training-heading">
        <div className="flex flex-col gap-3 rounded-3xl bg-[#0F172A] p-5 text-white shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-wide text-sky-200">Rolletrening</p>
            <h2 id="role-training-heading" className="mt-1 text-2xl font-black">Tre separate treningsflyter</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
              Velg rollen du øver som. Flytene viser forskjellen på å utføre, koordinere og lede, og peker deg direkte til verktøyene rollen trenger.
            </p>
          </div>
          <nav aria-label="Velg treningsflyt" className="flex flex-wrap gap-2">
            {roleTrainingFlows.map((flow) => (
              <Link
                key={flow.id}
                href={`/hjelp#${flow.id}`}
                className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-black text-slate-950"
              >
                {flow.role}
              </Link>
            ))}
          </nav>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {roleTrainingFlows.map((flow) => (
            <article key={flow.id} id={flow.id} className="scroll-mt-28 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={`${flow.id}-heading`}>
              <p className="text-xs font-black uppercase tracking-wide text-sky-800">{flow.role}</p>
              <h3 id={`${flow.id}-heading`} className="mt-1 text-xl font-black text-slate-950">{flow.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{flow.promise}</p>
              <div className="mt-3 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm font-bold leading-5 text-amber-950">
                Forskjellen: {flow.difference}
              </div>
              <ol className="mt-4 divide-y divide-slate-200 border-y border-slate-200" aria-label={`${flow.role} øvingssteg`}>
                {flow.steps.map((step, index) => (
                  <li key={step.href} className="py-3">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Øving {index + 1}</p>
                    <h4 className="mt-1 text-base font-black text-slate-950">{step.label}</h4>
                    <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">{step.body}</p>
                    <Link href={step.href} className="mt-3 inline-flex min-h-11 w-full items-center justify-between rounded-xl bg-[#082F49] px-4 text-sm font-black text-white">
                      {step.cta}
                      <OperationalIcon name="chevron" className="h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ol>
              <Link href="/hjelp#demo" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-950">
                Bruk flyten i full demo
              </Link>
            </article>
          ))}
        </div>
      </section>

      <HelpDemoPanel contentVersion={manifest.contentVersion} />

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Trygge snarveier">
        <Link href="/data-pa-enheten" className="rounded-2xl bg-white p-4 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200">Se og rydd data på enheten</Link>
        <Link href="/begrensninger" className="rounded-2xl bg-white p-4 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200">Les operative grenser</Link>
        <Link href="/feltmodus" className="rounded-2xl bg-white p-4 text-sm font-black text-slate-950 shadow-sm ring-1 ring-slate-200">Test feltmodus</Link>
      </section>
    </article>
  );
}
