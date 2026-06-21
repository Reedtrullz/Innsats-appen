import type { ReactNode } from 'react';
import { OperationalIcon } from '../ui/operational-icons';

/**
 * Advisory tool states from the redesign board (section 08, "Tilstander · begge
 * verktøy"). The advisory result is never the terminus — before a usable
 * suggestion exists, the tool tells the user honestly where it stands and keeps
 * a manual path open:
 *
 *  - empty:        "Tomt — start her" — no points placed yet.
 *  - calculating:  "Beregner …" — recomputing; previous result stays until ready.
 *  - insufficient: "Ikke nok grunnlag" — missing map data/params; continue manually.
 *  - conflicting:  "Motstridende inndata" — inputs disagree; confirm before use.
 *
 * Decision support, never a command — manual override is an equal path.
 */

export type AdvisoryState = 'empty' | 'calculating' | 'insufficient' | 'conflicting';

type StateConfig = {
  glyph: string;
  title: string;
  body: string;
  /** warning border for states that need user judgement before trusting input. */
  emphasis: 'neutral' | 'warning';
};

const STATE_CONFIG: Record<AdvisoryState, StateConfig> = {
  empty: {
    glyph: '📍',
    title: 'Tomt — start her',
    body: 'Trykk på kartet eller fyll inn skjematiske punkter for å plassere det første punktet.',
    emphasis: 'neutral',
  },
  calculating: {
    glyph: '⏳',
    title: 'Beregner …',
    body: 'Oppdaterer forslag etter nye inndata. Forrige resultat blir stående til nytt er klart.',
    emphasis: 'neutral',
  },
  insufficient: {
    glyph: '🤷',
    title: 'Ikke nok grunnlag',
    body: 'Mangler kartdata eller parametre for et trygt forslag. Marker selv — vi regner ut fra det.',
    emphasis: 'warning',
  },
  conflicting: {
    glyph: '⚠️',
    title: 'Motstridende inndata',
    body: 'Inndataene peker hver sin vei. Bekreft før forslaget brukes.',
    emphasis: 'warning',
  },
};

export function AdvisoryStateCard({
  state,
  title,
  body,
  action,
  className = '',
}: {
  state: AdvisoryState;
  /** Override the default Norwegian title for this state. */
  title?: string;
  /** Override the default body copy. */
  body?: ReactNode;
  /** Optional manual-continue button. */
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  const config = STATE_CONFIG[state];
  const warning = config.emphasis === 'warning';

  return (
    <div
      role={warning ? 'alert' : 'status'}
      className={`flex gap-3 rounded-2xl border p-4 ${
        warning
          ? 'border-[#fbbf24]/40 bg-[var(--warning-surface)]'
          : 'border-[var(--border)] bg-[var(--surface-muted)]'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
          warning ? 'bg-[var(--surface)]' : 'bg-[var(--surface)]'
        }`}
      >
        {config.glyph}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-black ${warning ? 'text-[var(--warning-fg)]' : 'text-[var(--text-primary)]'}`}>
          {title ?? config.title}
        </p>
        <p className={`mt-1 text-sm font-semibold leading-5 ${warning ? 'text-[var(--warning-fg)]' : 'text-[var(--text-secondary)]'}`}>
          {body ?? config.body}
        </p>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--text-primary)] transition hover:border-[#38bdf8]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]"
          >
            <OperationalIcon name="chevron" className="h-4 w-4" />
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
