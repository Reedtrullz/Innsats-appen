import type { ReactNode } from 'react';
import { OperationalIcon } from '../ui/operational-icons';

/**
 * Rådgivende resultatkort — the advisory suggestion card from the redesign
 * board (section 08, "Kart som rådgir — aldri bestemmer").
 *
 * Shared anatomy, reused by both map tools (vannforsyning/pumpeplan and
 * søkeplanlegging):
 *  - Rådgivende-stripe: yellow, always on top — the card is never an order.
 *  - Datakilde-merke: "Fra kartdata" vs "Assistert/manuell" — what the
 *    suggestion rests on.
 *  - Forslag + hvorfor: one-line rationale, never a black box.
 *  - Forutsetninger: mono chips with the parameters behind the suggestion.
 *  - Konfidens: low/medium/high with an honest uncertainty note.
 *  - Overstyr + logg: always a path to manual adjustment and to the field log.
 *
 * Decision support — never a command. Manual override is an equal, not an
 * exception.
 */

export type AdvisoryConfidence = 'low' | 'medium' | 'high';
export type AdvisorySourceBasis = 'map-data' | 'assisted' | 'sourced';

const confidenceLabels: Record<AdvisoryConfidence, string> = {
  low: 'Lav',
  medium: 'Middels',
  high: 'Høy',
};

const confidenceDotClass: Record<AdvisoryConfidence, string> = {
  low: 'bg-[#f87171]',
  medium: 'bg-[#fbbf24]',
  high: 'bg-[#34d399]',
};

const sourceBasisLabels: Record<AdvisorySourceBasis, string> = {
  'map-data': 'Fra kartdata',
  assisted: 'Assistert',
  sourced: 'Kildebelagt',
};

export function AdvisorySuggestionCard({
  suggestion,
  why,
  assumptions = [],
  confidence,
  confidenceNote,
  sourceBasis,
  sourceNote,
  updated = false,
  onAdjust,
  onLog,
  adjustLabel = 'Juster manuelt',
  logLabel = '+ Logg',
  compact = false,
  className = '',
}: {
  /** The headline recommendation, e.g. "Tjern NV → relé ved 240 m". */
  suggestion: string;
  /** One-line rationale shown under a "HVORFOR" eyebrow. */
  why: ReactNode;
  /** Mono parameter chips the suggestion rests on. */
  assumptions?: string[];
  confidence: AdvisoryConfidence;
  /** Honest uncertainty note shown next to the confidence level. */
  confidenceNote?: string;
  sourceBasis: AdvisorySourceBasis;
  /** Optional source/governance line (e.g. "Kilde: …"). */
  sourceNote?: string;
  /** When the suggestion was recomputed after new input — adds "OPPDATERT". */
  updated?: boolean;
  onAdjust?: () => void;
  onLog?: () => void;
  adjustLabel?: string;
  logLabel?: string;
  /**
   * Feltmodus: strip to the essentials — suggestion, confidence, and the two
   * actions. Hides assumption chips, the hvorfor detail and the source note so
   * a gloved user sees only what they act on. (Board §08, "⬡ Feltmodus · kart".)
   */
  compact?: boolean;
  className?: string;
}) {
  return (
    <section
      aria-label="Rådgivende forslag"
      className={`overflow-hidden rounded-2xl border border-[#fbbf24]/40 bg-[var(--surface)] shadow-sm ${className}`}
    >
      {/* Rådgivende-stripe — always on top, yellow; the card is never an order. */}
      <p className="flex items-center gap-2 bg-[var(--warning-surface)] px-4 py-2 font-mono text-[0.65rem] font-bold uppercase tracking-widest text-[var(--warning-fg)]">
        <OperationalIcon name="alert" className="h-3.5 w-3.5" />
        Rådgivende forslag
        {updated ? <span className="opacity-70">· Oppdatert</span> : null}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[var(--text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {sourceBasisLabels[sourceBasis]}
        </span>
      </p>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-base font-black leading-tight text-[var(--text-primary)]">{suggestion}</h3>
          {!compact ? (
            <>
              <p className="mt-2 font-mono text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Hvorfor
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-5 text-[var(--text-secondary)]">{why}</p>
            </>
          ) : null}
        </div>

        {!compact && assumptions.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {assumptions.map((chip) => (
              <li
                key={chip}
                className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 font-mono text-[0.7rem] font-semibold text-[var(--text-secondary)]"
              >
                {chip}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.6rem] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              Konfidens
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)]">
              <span className={`h-2 w-2 rounded-full ${confidenceDotClass[confidence]}`} aria-hidden="true" />
              {confidenceLabels[confidence]}
            </span>
          </div>
          {confidenceNote ? (
            <p className="mt-1.5 text-xs font-semibold leading-4 text-[var(--text-muted)]">{confidenceNote}</p>
          ) : null}
        </div>

        {!compact && sourceNote ? (
          <p className="font-mono text-[0.7rem] leading-4 text-[var(--text-muted)]">{sourceNote}</p>
        ) : null}

        {/* Overstyr + logg — always a path to manual adjustment and field log. */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAdjust}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--text-primary)] transition hover:border-[#38bdf8]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]"
          >
            {adjustLabel}
          </button>
          <button
            type="button"
            onClick={onLog}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--command-bg)] px-3 text-sm font-bold text-[var(--command-fg)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]"
          >
            <OperationalIcon name="clipboard" className="h-4 w-4" />
            {logLabel}
          </button>
        </div>
      </div>
    </section>
  );
}
