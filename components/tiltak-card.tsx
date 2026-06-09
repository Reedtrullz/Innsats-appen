import Link from 'next/link';
import type { ActionCard } from '@/lib/content/schemas';
import { phaseLabels, priorityLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { OperationalIcon } from './ui/operational-icons';
import { CriticalNotice, StatusPill } from './ui/operational-primitives';

type Priority = ActionCard['priority'];
type Phase = ActionCard['phase'];
type Authority = NonNullable<ActionCard['authority']>;

const authorityLabels: Record<Authority, string> = {
  leder: 'Leder',
  lagforer: 'Lagfører',
  mannskap: 'Mannskap',
  beredskapsvakt: 'Beredskapsvakt',
};

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

function AuthorityBadge({ authority }: { authority: Authority }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#082F49] px-2.5 py-1 text-xs font-black text-white" title={`Beslutningsmyndighet: ${authorityLabels[authority]}`}>
      <OperationalIcon name="shield" className="h-3.5 w-3.5" />
      {authorityLabels[authority]}
    </span>
  );
}

export function DoNotCallout({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-950">
      <p className="flex items-center gap-2 font-black">
        <OperationalIcon name="alert" className="h-4 w-4" />
        Ikke gjør
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 font-semibold">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

type TiltakCardProps = {
  card: ActionCard;
  ctaLabel?: string;
  compact?: boolean;
};

export function TiltakCardRow({ card }: { card: ActionCard }) {
  const href = `/kort/${card.slug}`;
  const priorityTone = card.priority === 'high' ? 'critical' : card.priority === 'medium' ? 'warning' : 'slate';
  const firstStep = card.steps[0] ?? 'Åpne kortet for tiltak.';

  return (
    <Link
      href={href}
      aria-label={`Åpne tiltakskort: ${card.title}`}
      className={`group flex min-h-16 items-start gap-3 rounded-2xl border bg-white p-3 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49] ${card.priority === 'high' ? 'border-red-200 bg-red-50/70' : 'border-slate-200'}`}
    >
      <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${card.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-sky-50 text-sky-800'}`}>
        <OperationalIcon name={card.priority === 'high' ? 'alert' : 'shield'} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black leading-5 text-slate-950">{card.title}</span>
        <span className="mt-1 line-clamp-2 block text-xs font-semibold leading-4 text-slate-600">{firstStep}</span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <StatusPill label={priorityLabels[card.priority]} tone={priorityTone} compact />
          <StatusPill label={phaseLongLabels[card.phase]} tone="sky" compact />
          {card.authority ? <AuthorityBadge authority={card.authority} /> : null}
          {card.sourceIds.length === 0 ? <StatusPill label="Kilde mangler" tone="warning" compact /> : null}
          {card.warning ? <StatusPill label="Varsel" tone="warning" compact /> : null}
          {card.doNot && card.doNot.length > 0 ? <StatusPill label={`${card.doNot.length} nei`} tone="critical" compact /> : null}
        </span>
      </span>
      <OperationalIcon name="chevron" className="mt-4 h-4 w-4 shrink-0 text-slate-400 group-hover:text-sky-800" />
    </Link>
  );
}

export function TiltakCardCompact({ card, ctaLabel = 'Åpne tiltakskort' }: Omit<TiltakCardProps, 'compact'>) {
  const href = `/kort/${card.slug}`;
  const visibleSteps = card.steps.slice(0, 2);
  const sourceCount = card.sourceIds.length;
  const priorityTone = card.priority === 'high' ? 'critical' : card.priority === 'medium' ? 'warning' : 'slate';

  return (
    <article className={`space-y-3 rounded-2xl border p-3 shadow-sm ${priorityTreatment[card.priority]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={priorityLabels[card.priority]} tone={priorityTone} />
        <StatusPill label={phaseLongLabels[card.phase]} tone="sky" />
        {card.authority ? <AuthorityBadge authority={card.authority} /> : null}
        <span className={`inline-flex min-h-8 items-center rounded-full bg-white px-3 py-1 text-xs font-black ring-1 ${sourceCount > 0 ? 'text-slate-700 ring-slate-200' : 'text-amber-900 ring-amber-200'}`}>
          {sourceCount > 0 ? 'Kildebelagt' : 'Kilde mangler'}
          {sourceCount > 0 ? <span className="sr-only"> med {sourceCount} kilde{sourceCount === 1 ? '' : 'r'}</span> : null}
        </span>
      </div>

      <div>
        <h2 className="text-base font-black tracking-tight text-slate-950">
          <Link className="inline-flex min-h-11 items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950" href={href}>
            {card.title}
          </Link>
        </h2>
      </div>

      <DoNotCallout items={card.doNot ?? []} />
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-600">Gjør først</p>
        {visibleSteps.length > 0 ? (
          <ol className="mt-1 space-y-1 text-sm font-semibold text-slate-800">
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

export function TiltakCardFull({ card, ctaLabel = 'Åpne tiltakskort' }: Omit<TiltakCardProps, 'compact'>) {
  const href = `/kort/${card.slug}`;
  const visibleSteps = card.steps.slice(0, 3);
  const sourceCount = card.sourceIds.length;
  const priorityTone = card.priority === 'high' ? 'critical' : card.priority === 'medium' ? 'warning' : 'slate';

  return (
    <article className={`space-y-4 rounded-2xl border p-4 shadow-sm ${priorityTreatment[card.priority]}`}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={priorityLabels[card.priority]} tone={priorityTone} />
        {card.priority === 'high' ? <StatusPill label="Kritisk støtte" tone="critical" /> : null}
        <StatusPill label={phaseLongLabels[card.phase]} tone="sky" />
        {card.authority ? <AuthorityBadge authority={card.authority} /> : null}
        {card.scenarios.map((scenario) => <StatusPill key={scenario} label={scenarioLabels[scenario]} tone="success" />)}
        <span className={`inline-flex min-h-8 items-center rounded-full bg-white px-3 py-1 text-xs font-black ring-1 ${sourceCount > 0 ? 'text-slate-700 ring-slate-200' : 'text-amber-900 ring-amber-200'}`}>
          {sourceCount > 0 ? 'Kildebelagt' : 'Kilde mangler'}
          {sourceCount > 0 ? <span className="sr-only"> med {sourceCount} kilde{sourceCount === 1 ? '' : 'r'}</span> : null}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-black tracking-tight text-slate-950">
          <Link className="inline-flex min-h-11 items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-950" href={href}>
            {card.title}
          </Link>
        </h2>
        {card.warning ? (
          <div className="mt-2">
            <CriticalNotice title="Varsel" tone={card.priority === 'high' ? 'critical' : 'warning'}>{card.warning}</CriticalNotice>
          </div>
        ) : null}
      </div>

      <DoNotCallout items={card.doNot ?? []} />
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-600">Gjør først</p>
        {visibleSteps.length > 0 ? (
          <ol className="mt-2 space-y-2 text-sm font-semibold text-slate-800">
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

      {card.safety && card.safety.length > 0 ? (
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

export function TiltakCard({ card, ctaLabel = 'Åpne tiltakskort', compact = false }: TiltakCardProps) {
  return compact ? <TiltakCardCompact card={card} ctaLabel={ctaLabel} /> : <TiltakCardFull card={card} ctaLabel={ctaLabel} />;
}
