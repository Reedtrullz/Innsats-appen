import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { OperationalStatusPills } from '@/components/operational-status-pills';

const phaseLinks = [
  { label: 'Før innsats', href: '/for', description: 'Avklar risiko, kilder og første tiltak før oppstart.' },
  { label: 'Under innsats', href: '/under', description: 'Finn operative sjekker og tiltak mens situasjonen pågår.' },
  { label: 'Etter innsats', href: '/etter', description: 'Støtt debrief, oppfølging og læring etter hendelsen.' },
] as const;

const criticalLinks = [
  { label: 'Alvorlig ulykke / død', href: '/kort/alvorlig-ulykke-dod-eget-personell' },
  { label: 'Psykologisk førstehjelp', href: '/kort/psykologisk-forstehjelp-sekvens' },
  { label: 'Samband / ordre', href: '/kort/sambandsplan-start' },
  { label: 'Søk i kildebelagte tiltak', href: '/sok' },
] as const;

export default function Home() {
  return (
    <AppShell currentPath="/">
      <section className="rounded-3xl bg-sky-950 p-6 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">Sivilforsvaret</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Beredskapsboka</h1>
        <p className="mt-3 text-lg text-sky-100">
          Kildebelagt beslutningsstøtte før, under og etter innsats.
        </p>
        <h2 className="mt-6 text-2xl font-black tracking-tight">Hva står du i nå?</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-sky-950"
            href="/oppdrag/ny"
          >
            Start lokalt oppdrag
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 px-4 text-sm font-black text-white"
            href="/sok"
          >
            Finn tiltak raskt
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Velg fase">
        {phaseLinks.map((link) => (
          <Link
            key={link.href}
            aria-label={link.label}
            className="rounded-3xl bg-white p-4 text-sm font-bold text-slate-900 shadow-sm ring-1 ring-slate-200"
            href={link.href}
          >
            <span className="block text-base font-black">{link.label}</span>
            <span className="mt-2 block text-sm font-semibold text-slate-600">{link.description}</span>
          </Link>
        ))}
      </section>

      <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">Kritiske snarveier</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Direkte til ofte brukte kort og søk når tid er avgjørende.
            </p>
          </div>
          <Link className="text-sm font-black text-sky-800 underline-offset-4 hover:underline" href="/kilder">
            Kilder
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {criticalLinks.map((link) => (
            <Link
              key={link.href}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-950"
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
        <h2 className="text-xl font-black tracking-tight">Lokal status og grenser</h2>
        <p className="mt-2 text-sm font-semibold">
          Lokal MVP: ingen innlogging, ingen sentral hendelsesdatabase, ingen pasient- eller persondata og ingen private/skjermede tilfluktsromlister. Bruk dette som beslutningsstøtte; ordre og kommando må gå i etablerte linjer.
        </p>
        <OperationalStatusPills className="mt-3" />
      </section>
    </AppShell>
  );
}
