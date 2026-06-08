import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { OperationalStatusPills } from '@/components/operational-status-pills';
import { CommandCard, CriticalNotice, QuickActionButton, SectionCard } from '@/components/ui/operational-primitives';
import { OperationalIcon } from '@/components/ui/operational-icons';

const phaseLinks = [
  { label: 'Før innsats', href: '/for', description: 'Avklar risiko, kilder og første tiltak før oppstart.' },
  { label: 'Under innsats', href: '/under', description: 'Finn operative sjekker og tiltak mens situasjonen pågår.' },
  { label: 'Etter innsats', href: '/etter', description: 'Støtt debrief, oppfølging og læring etter hendelsen.' },
] as const;

const criticalLinks = [
  { label: 'Alvorlig ulykke / død', description: 'Sikring, varsling og ivaretakelse', href: '/kort/alvorlig-ulykke-dod-eget-personell', icon: 'alert', tone: 'critical' },
  { label: 'Psykologisk førstehjelp', description: 'Akutt støtte og oppfølging', href: '/kort/psykologisk-forstehjelp-sekvens', icon: 'shield', tone: 'sky' },
  { label: 'Samband / ordre', description: 'Mal for 5-punktsordre og samband', href: '/kort/sambandsplan-start', icon: 'radio', tone: 'warning' },
  { label: 'Søk i kildebelagte tiltak', description: 'Søk i alle tiltak og kilder', href: '/sok', icon: 'search', tone: 'slate' },
] as const;

export default function Home() {
  return (
    <AppShell currentPath="/">
      <section className="overflow-hidden rounded-[1.35rem] bg-[#082F49] text-white shadow-sm">
        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-sky-200">Sivilforsvaret · lokal MVP</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight">Beredskapsboka</h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-sky-100">
                Kildebelagt beslutningsstøtte før, under og etter innsats.
              </p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <OperationalIcon name="shield" className="h-7 w-7 text-sky-100" />
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight">Hva står du i nå?</h2>
            <p className="mt-1 text-sm font-semibold text-sky-100">Velg det som passer situasjonen, og hold data lokalt på enheten.</p>
          </div>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-2">
          <Link
            className="group flex min-h-20 items-center justify-between gap-4 bg-[#082F49] px-5 py-4 text-left font-black transition hover:bg-sky-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
            href="/oppdrag/ny"
          >
            <span>
              <span className="block text-base">Start lokalt oppdrag</span>
              <span className="mt-1 block text-xs font-semibold text-sky-100">Opprett lokal kontekst, rolle, sjekklister og eksport.</span>
            </span>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#082F49]">
              <OperationalIcon name="chevron" className="h-5 w-5" />
            </span>
          </Link>
          <Link
            className="group flex min-h-20 items-center justify-between gap-4 bg-white px-5 py-4 text-left font-black text-[#082F49] transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#082F49]"
            href="/sok"
          >
            <span>
              <span className="block text-base">Finn tiltak raskt</span>
              <span className="mt-1 block text-xs font-semibold text-slate-600">Søk i kort, moduler og kilder.</span>
            </span>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#082F49]">
              <OperationalIcon name="search" className="h-5 w-5" />
            </span>
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Velg fase">
        {phaseLinks.map((link) => (
          <Link
            key={link.href}
            aria-label={link.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]"
            href={link.href}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-800">
              <OperationalIcon name={link.href === '/for' ? 'checklist' : link.href === '/under' ? 'status' : 'archive'} className="h-5 w-5" />
            </span>
            <span className="mt-3 block text-base font-black">{link.label}</span>
            <span className="mt-2 block text-sm font-semibold text-slate-600">{link.description}</span>
          </Link>
        ))}
      </section>

      <SectionCard className="mt-5 bg-white" labelledBy="critical-shortcuts-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="critical-shortcuts-heading" className="text-xl font-black tracking-tight">Kritiske snarveier</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Direkte til ofte brukte kort og søk når tid er avgjørende.
            </p>
          </div>
          <Link className="inline-flex min-h-11 items-center rounded-full bg-sky-50 px-4 text-sm font-black text-sky-800 underline-offset-4 hover:underline" href="/kilder">
            Kilder
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {criticalLinks.map((link) => (
            <QuickActionButton key={link.href} href={link.href} label={link.label} description={link.description} icon={link.icon} tone={link.tone} />
          ))}
        </div>
      </SectionCard>

      <SectionCard className="mt-5 bg-white" labelledBy="status-heading">
        <h2 id="status-heading" className="text-xl font-black tracking-tight">Lokal status og grenser</h2>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          Lokal MVP: ingen innlogging, ingen sentral hendelsesdatabase, ingen pasient- eller persondata og ingen private/skjermede tilfluktsromlister. Bruk dette som beslutningsstøtte; ordre og kommando må gå i etablerte linjer.
        </p>
        <OperationalStatusPills className="mt-3" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <CommandCard title="Offline-klar" icon="status" tone="success">Appen fungerer med lokal cache når nett mangler.</CommandCard>
          <CommandCard title="Ikke kommandosystem" icon="info" tone="warning">Støtteverktøy, ikke offisiell ordre eller innsending.</CommandCard>
        </div>
      </SectionCard>

      <div className="mt-5">
        <CriticalNotice title="Operativ kontroll" tone="warning">
          Kontroller alltid mot gjeldende ordre, innsatsleder og godkjente kilder før tiltak settes i verk.
        </CriticalNotice>
      </div>
    </AppShell>
  );
}
