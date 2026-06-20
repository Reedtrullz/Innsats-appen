'use client';

import { APP_MODE_DESCRIPTIONS, APP_MODE_LABELS, useMode } from '@/lib/mode/mode-context';
import { APP_MODES, type AppMode } from '@/lib/privacy/local-profile';

const MODE_GLYPH: Record<AppMode, string> = {
  innsats: '🧭',
  personlig: '🎒',
};

/**
 * Modusbryter (board: Personlig ↔ Innsats). A rare switch, kept on /mer with an
 * always-visible way back. Shared design foundation and the same bottom nav —
 * only home content and tempo change.
 */
export function ModeSwitcher() {
  const { mode, setMode } = useMode();

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5" aria-labelledby="modusbryter-heading">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Modus</p>
      <h2 id="modusbryter-heading" className="text-xl font-black text-[var(--text-primary)]">Personlig eller Innsats</h2>
      <p className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
        Sjeldent bytte — alltid en tydelig vei tilbake. Samme navigasjon; bare innhold og tempo skifter.
      </p>
      <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Velg modus">
        {APP_MODES.map((option) => {
          const active = mode === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(option)}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition ${
                active
                  ? 'border-[#38bdf8] bg-[var(--surface-elevated)] ring-1 ring-[#38bdf8]/40'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[#38bdf8]/40'
              }`}
            >
              <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-lg">
                {MODE_GLYPH[option]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-black text-[var(--text-primary)]">{APP_MODE_LABELS[option]}</span>
                  {active ? <span className="font-mono text-[0.6rem] font-bold uppercase tracking-widest text-[var(--accent-fg)]">Aktiv</span> : null}
                </span>
                <span className="mt-0.5 block text-xs font-semibold leading-4 text-[var(--text-muted)]">{APP_MODE_DESCRIPTIONS[option]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
