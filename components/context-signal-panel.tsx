import type { ExternalContextSignal } from '@/lib/integrations/types';

export function markStoredContextSignalsStale(signals: ExternalContextSignal[]): ExternalContextSignal[] {
  return signals.map((signal) => ({ ...signal, staleness: signal.staleness === 'unavailable' ? 'unavailable' : 'stale' }));
}

export function ContextSignalPanel({ signals, unavailableSources = [] }: { signals: ExternalContextSignal[]; unavailableSources?: string[] }) {
  const hasStaleSignals = signals.some((signal) => signal.staleness === 'stale');
  return (
    <section role="region" aria-label="Offentlig kontekst" className="rounded-3xl bg-white p-4 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Offentlig kontekst</p>
      <h2 className="text-xl font-black">Kontekstsignaler</h2>
      <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Offentlige API-signaler erstatter ikke offisielle ordre, fagmyndighet eller kildebelagte tiltakskort.</p>
      {hasStaleSignals ? <p className="mt-2 rounded-2xl bg-slate-100 p-3 text-sm font-semibold text-slate-800">Viser sist vellykkede lokale kontekstsignal som stale etter manglende eller feilet oppfrisking.</p> : null}
      {unavailableSources.map((source) => <p key={source} className="mt-2 text-sm font-semibold text-red-800">{source} utilgjengelig – viser eventuelt sist vellykkede signal som stale.</p>)}
      <div className="mt-3 space-y-3">
        {signals.map((signal) => (
          <article key={`${signal.source}-${signal.kind}-${signal.upstreamId ?? signal.title}`} className="rounded-2xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{signal.source}</span>
              <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-bold">{signal.kind}</span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold">{signal.staleness}</span>
            </div>
            <h3 className="mt-2 font-black">{signal.title}</h3>
            <p className="text-sm text-slate-700">{signal.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
