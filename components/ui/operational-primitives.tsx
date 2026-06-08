import Link from 'next/link';
import type { ReactNode } from 'react';
import { OperationalIcon, type OperationalIconName } from './operational-icons';

type Tone = 'navy' | 'sky' | 'success' | 'warning' | 'critical' | 'slate';

const toneClasses: Record<Tone, { pill: string; notice: string; icon: string }> = {
  navy: {
    pill: 'bg-[#082F49] text-white ring-[#082F49]',
    notice: 'border-[#082F49]/20 bg-[#082F49] text-white',
    icon: 'bg-[#082F49] text-white',
  },
  sky: {
    pill: 'bg-sky-100 text-sky-950 ring-sky-200',
    notice: 'border-sky-200 bg-sky-50 text-sky-950',
    icon: 'bg-sky-100 text-sky-900',
  },
  success: {
    pill: 'bg-emerald-100 text-emerald-950 ring-emerald-200',
    notice: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: 'bg-emerald-100 text-emerald-900',
  },
  warning: {
    pill: 'bg-amber-100 text-amber-950 ring-amber-200',
    notice: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'bg-amber-100 text-amber-900',
  },
  critical: {
    pill: 'bg-red-700 text-white ring-red-700',
    notice: 'border-red-200 bg-red-50 text-red-950',
    icon: 'bg-red-100 text-red-700',
  },
  slate: {
    pill: 'bg-slate-100 text-slate-800 ring-slate-200',
    notice: 'border-slate-200 bg-white text-slate-950',
    icon: 'bg-slate-100 text-slate-700',
  },
};

export function StatusPill({
  label,
  detail,
  tone = 'slate',
  compact = false,
  className = '',
}: {
  label: string;
  detail?: string;
  tone?: Tone;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${toneClasses[tone].pill} ${className}`}>
      <span>{label}</span>
      {detail && !compact ? <span className="font-bold opacity-80">{detail}</span> : null}
    </span>
  );
}

export function SectionCard({
  children,
  className = '',
  labelledBy,
  tone = 'slate',
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  tone?: Tone;
}) {
  return (
    <section aria-labelledby={labelledBy} className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone].notice} ${className}`}>
      {children}
    </section>
  );
}

export function CommandCard({
  title,
  eyebrow,
  children,
  icon,
  tone = 'slate',
  href,
  ctaLabel,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
  icon?: OperationalIconName;
  tone?: Tone;
  href?: string;
  ctaLabel?: string;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone].icon}`}>
            <OperationalIcon name={icon} />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-black uppercase tracking-wide text-slate-500">{eyebrow}</p> : null}
          <h3 className="text-base font-black leading-tight text-slate-950">{title}</h3>
          {children ? <div className="mt-1 text-sm font-semibold leading-5 text-slate-600">{children}</div> : null}
        </div>
      </div>
      {href && ctaLabel ? (
        <span className="mt-3 inline-flex min-h-11 w-full items-center justify-between rounded-xl bg-[#082F49] px-4 text-sm font-black text-white">
          {ctaLabel}
          <OperationalIcon name="chevron" className="h-4 w-4" />
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49] ${className}`}>
        {content}
      </Link>
    );
  }

  return <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{content}</div>;
}

export function QuickActionButton({
  href,
  label,
  description,
  icon,
  tone = 'slate',
}: {
  href: string;
  label: string;
  description?: string;
  icon: OperationalIconName;
  tone?: Tone;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-sky-200 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#082F49]"
    >
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone].icon}`}>
        <OperationalIcon name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black leading-tight text-slate-950">{label}</span>
        {description ? <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-600">{description}</span> : null}
      </span>
      <OperationalIcon name="chevron" className="h-4 w-4 text-slate-400 group-hover:text-sky-800" />
    </Link>
  );
}

export function ProgressSummary({
  items,
}: {
  items: Array<{ label: string; value: string; detail?: string; progress?: number; tone?: Tone }>;
}) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <dt className="text-xs font-black uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-1 text-lg font-black text-slate-950">{item.value}</dd>
          {typeof item.progress === 'number' ? (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div className={`h-full rounded-full ${item.tone === 'warning' ? 'bg-amber-500' : item.tone === 'critical' ? 'bg-red-600' : item.tone === 'sky' ? 'bg-sky-600' : 'bg-emerald-600'}`} style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} />
            </div>
          ) : null}
          {item.detail ? <p className="mt-1 text-xs font-semibold text-slate-600">{item.detail}</p> : null}
        </div>
      ))}
    </dl>
  );
}

export function CriticalNotice({
  title,
  children,
  tone = 'warning',
  icon = 'alert',
}: {
  title: string;
  children: ReactNode;
  tone?: Extract<Tone, 'warning' | 'critical' | 'sky' | 'success'>;
  icon?: OperationalIconName;
}) {
  return (
    <div className={`flex gap-3 rounded-2xl border p-3 ${toneClasses[tone].notice}`}>
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone].icon}`}>
        <OperationalIcon name={icon} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-black">{title}</p>
        <div className="mt-1 text-sm font-semibold leading-5">{children}</div>
      </div>
    </div>
  );
}
