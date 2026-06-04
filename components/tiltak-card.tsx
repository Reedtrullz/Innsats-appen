import Link from 'next/link';
import type { ActionCard } from '@/lib/content/schemas';
import { phaseLabels, priorityLabels, scenarioLabels } from '@/lib/content/taxonomy';

type Priority = ActionCard['priority'];
type Phase = ActionCard['phase'];

const priorityTreatment: Record<Priority, string> = {
  high: 'border-red-200 bg-red-50/80 shadow-red-950/5',
  medium: 'border-amber-200 bg-amber-50/80 shadow-amber-950/5',
  low: 'border-slate-200 bg-white shadow-slate-950/5',
};

const priorityBadgeClassName: Record<Priority, string> = {
  high: 'bg-red-700 text-white',
  medium: 'bg-amber-200 text-amber-950',
  low: 'bg-slate-200 text-slate-800',
};

const phaseLongLabels: Record<Phase, string> = {
  for: `${phaseLabels.for} innsats`,
  under: `${phaseLabels.under} innsats`,
  etter: `${phaseLabels.etter} innsats`,
};

type TiltakCardProps = {
  card: ActionCard;
  ctaLabel?: string;
  compact?: boolean;
};

export function TiltakCard({ card, ctaLabel = 'Åpne tiltakskort', compact = false }: TiltakCardProps) {
  const href = `/kort/${card.slug}`;
  const visibleSteps = card.steps.slice(0, compact ? 2 : 3);
  const sourceCount = card.sourceIds.length;

  return (
    <article className={`rounded-3xl border p-4 shadow-sm ${priorityTreatment[card.priority]} ${compact ? 'space-y-3' : 'space-y-4'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${priorityBadgeClassName[card.priority]}`}>{priorityLabels[card.priority]}</span>
        {card.priority === 'high' ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-900 ring-1 ring-red-200">Kritisk støtte</span>
        ) : null}
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-950">{phaseLongLabels[card.phase]}</span>
        {card.scenarios.map((scenario) => (
          <span key={scenario} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">{scenarioLabels[scenario]}</span>
        ))}
        <span className={`rounded-full bg-white px-3 py-1 text-xs font-bold ring-1 ${sourceCount > 0 ? 'text-slate-700 ring-slate-200' : 'text-amber-900 ring-amber-200'}`}>
          {sourceCount > 0 ? 'Kildebelagt' : 'Kilde mangler'}
          {sourceCount > 0 ? <span className="sr-only"> med {sourceCount} kilde{sourceCount === 1 ? '' : 'r'}</span> : null}
        </span>
      </div>

      <div>
        <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-black tracking-tight text-slate-950`}>
          <Link className="inline-flex min-h-11 items-center rounded-xl px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950" href={href}>
            {card.title}
          </Link>
        </h2>
        {card.warning ? <p className="mt-2 rounded-2xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">{card.warning}</p> : null}
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-600">Gjør først</p>
        {visibleSteps.length > 0 ? (
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm font-semibold text-slate-800">
            {visibleSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        ) : (
          <p className="mt-2 text-sm font-semibold text-slate-700">Ingen første steg registrert.</p>
        )}
      </div>

      {!compact && card.safety && card.safety.length > 0 ? (
        <div className="rounded-2xl bg-white/70 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
          <p className="font-black text-slate-900">Sikkerhet</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 font-semibold">
            {card.safety.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      <Link
        aria-label={`${ctaLabel}: ${card.title}`}
        className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"
        href={href}
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
