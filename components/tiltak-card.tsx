import Link from 'next/link';
import type { ActionCard } from '@/lib/content/schemas';
import { phaseLabels, priorityLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { OperationalIcon } from './ui/operational-icons';
import { CriticalNotice, StatusPill } from './ui/operational-primitives';

type Priority = ActionCard['priority'];
type Phase = ActionCard['phase'];

const priorityTreatment: Record<Priority, string> = {
  high: 'border-red-200 bg-gradient-to-b from-red-50 to-white shadow-red-950/5',
  medium: 'border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-amber-950/5',
  low: 'border-slate-200 bg-white shadow-slate-950/5',
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
  const priorityTone = card.priority === 'high' ? 'critical' : card.priority === 'medium' ? 'warning' : 'slate';

  return (
    <article className={`rounded-2xl border shadow-sm ${priorityTreatment[card.priority]} ${compact ? 'p-3' : 'p-4'} ${compact ? 'space-y-3' : 'space-y-4'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={priorityLabels[card.priority]} tone={priorityTone} />
        {card.priority === 'high' ? (
          <StatusPill label="Kritisk støtte" tone="critical" />
        ) : null}
        <StatusPill label={phaseLongLabels[card.phase]} tone="sky" />
        {!compact ? card.scenarios.map((scenario) => (
          <StatusPill key={scenario} label={scenarioLabels[scenario]} tone="success" />
        )) : null}
        <span className={`inline-flex min-h-8 items-center rounded-full bg-white px-3 py-1 text-xs font-black ring-1 ${sourceCount > 0 ? 'text-slate-700 ring-slate-200' : 'text-amber-900 ring-amber-200'}`}>
          {sourceCount > 0 ? 'Kildebelagt' : 'Kilde mangler'}
          {sourceCount > 0 ? <span className="sr-only"> med {sourceCount} kilde{sourceCount === 1 ? '' : 'r'}</span> : null}
        </span>
      </div>

      <div>
        <h2 className={`${compact ? 'text-base' : 'text-xl'} font-black tracking-tight text-slate-950`}>
          <Link className="inline-flex min-h-11 items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950" href={href}>
            {card.title}
          </Link>
        </h2>
        {!compact && card.warning ? (
          <div className="mt-2">
            <CriticalNotice title="Varsel" tone={card.priority === 'high' ? 'critical' : 'warning'}>{card.warning}</CriticalNotice>
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-600">Gjør først</p>
        {visibleSteps.length > 0 ? (
          <ol className={`${compact ? 'mt-1 space-y-1' : 'mt-2 space-y-2'} text-sm font-semibold text-slate-800`}>
            {visibleSteps.map((step, index) => (
              <li key={step} className="grid grid-cols-[1.75rem_1fr] items-start gap-2 rounded-xl bg-white/80 p-2 ring-1 ring-slate-200">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm font-semibold text-slate-700">Ingen første steg registrert.</p>
        )}
      </div>

      {!compact && card.safety && card.safety.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="flex items-center gap-2 font-black">
            <OperationalIcon name="alert" className="h-4 w-4" />
            Sikkerhet
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 font-semibold">
            {card.safety.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}

      <Link
        aria-label={`${ctaLabel}: ${card.title}`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#082F49] px-4 text-sm font-black text-white"
        href={href}
      >
        <span className="flex min-w-0 items-center gap-2">
          {ctaLabel}
          <OperationalIcon name="chevron" className="h-4 w-4" />
        </span>
      </Link>
    </article>
  );
}
