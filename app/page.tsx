import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { HomeActiveMission } from '@/components/home-active-mission';
import { OperationalStatusPills } from '@/components/operational-status-pills';
import { QuickActionButton, SectionCard } from '@/components/ui/operational-primitives';
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
      <HomeActiveMission />

      <section className="overflow-hidden rounded-[1.35rem] bg-[#082F49] text-white shadow-sm">
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="mt-1 text-3xl font-black tracking-tight">Beredskapsboka</h1>
              <p className="mt-1 text-sm font-semibold leading-6 text-sky-100">Lokal, kildebelagt beslutningsstøtte.</p>
            </div>
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <OperationalIcon name="shield" className="h-7 w-7 text-sky-100" />
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight">Hva trenger du nå?</h2>
          </div>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-3" data-primary-actions="home">
          <Link
            className="group flex min-h-20 items-center justify-between gap-4 bg-[#082F49] px-5 py-4 text-left font-black transition hover:bg-sky-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white"
            href="/oppdrag"
          >
            <span>
              <span className="block text-base">Fortsett/start oppdrag</span>
              <span className="mt-1 block text-xs font-semibold text-sky-100">Oppdrag, sjekkliste og logg.</span>
            </span>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#082F49]">
              <OperationalIcon name="chevron" className="h-5 w-5" />
            </span>
          </Link>
          <Link
            className="group flex min-h-20 items-center justify-between gap-4 bg-white px-5 py-4 text-left font-black text-[#082F49] transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#082F49]"
            href="/kort/alvorlig-ulykke-dod-eget-personell"
          >
            <span>
              <span className="block text-base">Finn kritisk tiltak</span>
              <span className="mt-1 block text-xs font-semibold text-slate-600">Gå rett til første tiltak.</span>
            </span>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700">
              <OperationalIcon name="alert" className="h-5 w-5" />
            </span>
          </Link>
          <Link
            className="group flex min-h-20 items-center justify-between gap-4 bg-white px-5 py-4 text-left font-black text-[#082F49] transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#082F49]"
            href="/sok"
          >
            <span>
              <span className="block text-base">Søk</span>
              <span className="mt-1 block text-xs font-semibold text-slate-600">Kort, moduler og kilder.</span>
            </span>
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-[#082F49]">
              <OperationalIcon name="search" className="h-5 w-5" />
            </span>
          </Link>
        </div>
      </section>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <OperationalStatusPills className="justify-between gap-1" />
      </div>

      <SectionCard className="mt-5 bg-white" labelledBy="critical-shortcuts-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="critical-shortcuts-heading" className="text-xl font-black tracking-tight">Kritisk nå</h2>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {criticalLinks.map((link) => (
            <QuickActionButton key={link.href} href={link.href} label={link.label} description={link.description} icon={link.icon} tone={link.tone} />
          ))}
        </div>
      </SectionCard>

      <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">Faser og kilder</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {phaseLinks.map((link) => (
            <Link
              key={link.href}
              aria-label={link.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 transition hover:border-sky-200 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]"
              href={link.href}
            >
              <span className="block text-base font-black">{link.label}</span>
              <span className="mt-1 block text-sm font-semibold text-slate-600">{link.description}</span>
            </Link>
          ))}
          <Link className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-base font-black text-slate-900" href="/kilder">Kilder</Link>
        </div>
      </details>
    </AppShell>
  );
}
