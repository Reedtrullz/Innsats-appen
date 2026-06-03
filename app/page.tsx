import Link from 'next/link';
import { DecisionSupportNotice } from '@/components/decision-support-notice';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <section className="rounded-3xl bg-sky-950 p-6 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">Sivilforsvaret</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Beredskapsboka</h1>
        <p className="mt-3 text-lg text-sky-100">
          Mobilførst, offline-klar og kildebelagt støtte før, under og etter innsats.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-sky-950" href="/hurtigkort">
            Åpne hurtigkort
          </Link>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 px-4 text-sm font-black text-white" href="/oppdrag/ny">
            Start lokalt oppdrag
          </Link>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 px-4 text-sm font-black text-white sm:col-span-2" href="/release">
            Release readiness
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link className="rounded-3xl bg-white p-4 text-sm font-bold text-slate-900 shadow-sm" href="/for">Før innsats</Link>
        <Link className="rounded-3xl bg-white p-4 text-sm font-bold text-slate-900 shadow-sm" href="/under">Under innsats</Link>
        <Link className="rounded-3xl bg-white p-4 text-sm font-bold text-slate-900 shadow-sm" href="/etter">Etter innsats</Link>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
        Lokal MVP: ingen innlogging, ingen sentral hendelsesdatabase, ingen pasient/persondata og ingen private/skjermede tilfluktsromlister. Alt oppdragsinnhold lagres lokalt i nettleseren.
      </section>

      <DecisionSupportNotice />
    </main>
  );
}
