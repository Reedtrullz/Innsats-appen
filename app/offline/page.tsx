export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 px-4 py-10">
      <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Offline</p>
      <h1 className="text-4xl font-black tracking-tight">Beredskapsboka er frakoblet</h1>
      <p className="text-lg text-slate-700">App-skall og generert innhold kan brukes fra cache. Stale innhold er beslutningsstøtte og må kontrolleres mot gjeldende ordre.</p>
      <a className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 font-bold text-white" href="/hurtigkort">Åpne hurtigkort</a>
    </main>
  );
}
