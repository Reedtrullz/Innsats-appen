import Link from 'next/link';
import type { ReactNode } from 'react';
import { OperationalIcon, type OperationalIconName } from './operational-icons';

type Tone = 'navy' | 'sky' | 'success' | 'warning' | 'critical' | 'slate';

// Tone classes use CSS variables for dark-mode adaptability.
// Light values are the defaults; dark overrides come from globals.css
const toneClasses: Record<Tone, { pill: string; notice: string; icon: string }> = {
  navy: {
    pill: 'bg-[var(--command-bg)] text-[var(--command-fg)] ring-[var(--command-bg)]',
    notice: 'border-[var(--command-bg)]/20 bg-[var(--command-bg)] text-[var(--command-fg)]',
    icon: 'bg-[var(--command-bg)] text-[var(--command-fg)]',
  },
  sky: {
    pill: 'bg-[var(--info-surface)] text-[var(--info-fg)] ring-[#38bdf8]/30',
    notice: 'border-[#38bdf8]/30 bg-[var(--info-surface)] text-[var(--info-fg)]',
    icon: 'bg-[var(--info-surface)] text-[var(--info-fg)]',
  },
  success: {
    pill: 'bg-[var(--success-surface)] text-[var(--success-fg)] ring-[#34d399]/30',
    notice: 'border-[#34d399]/30 bg-[var(--success-surface)] text-[var(--success-fg)]',
    icon: 'bg-[var(--success-surface)] text-[var(--success-fg)]',
  },
  warning: {
    pill: 'bg-[var(--warning-surface)] text-[var(--warning-fg)] ring-[#fbbf24]/30',
    notice: 'border-[#fbbf24]/30 bg-[var(--warning-surface)] text-[var(--warning-fg)]',
    icon: 'bg-[var(--warning-surface)] text-[var(--warning-fg)]',
  },
  critical: {
    pill: 'bg-red-700 text-white ring-red-700',
    notice: 'border-[#f87171]/30 bg-[var(--critical-surface)] text-[var(--critical-fg)]',
    icon: 'bg-[var(--critical-surface)] text-[var(--critical-fg)]',
  },
  slate: {
    pill: 'bg-[var(--surface-muted)] text-[var(--text-secondary)] ring-[var(--border)]',
    notice: 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]',
    icon: 'bg-[var(--surface-muted)] text-[var(--text-muted)]',
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
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${toneClasses[tone].pill} ${className}`}>
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
          {eyebrow ? <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{eyebrow}</p> : null}
          <h3 className="text-base font-bold leading-tight text-[var(--text-primary)]">{title}</h3>
          {children ? <div className="mt-1 text-sm font-semibold leading-5 text-[var(--text-secondary)]">{children}</div> : null}
        </div>
      </div>
      {href && ctaLabel ? (
        <span className="mt-3 inline-flex min-h-11 w-full items-center justify-between rounded-xl bg-[var(--command-bg)] px-4 text-sm font-bold text-[var(--command-fg)]">
          {ctaLabel}
          <OperationalIcon name="chevron" className="h-4 w-4" />
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[#38bdf8]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8] ${className}`}>
        {content}
      </Link>
    );
  }

  return <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}>{content}</div>;
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
      className="group flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition hover:border-[#38bdf8]/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8]"
    >
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClasses[tone].icon}`}>
        <OperationalIcon name={icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-tight text-[var(--text-primary)]">{label}</span>
        {description ? <span className="mt-0.5 block text-xs font-semibold leading-4 text-[var(--text-muted)]">{description}</span> : null}
      </span>
      <OperationalIcon name="chevron" className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[#38bdf8]" />
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
        <div key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <dt className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--text-muted)]">{item.label}</dt>
          <dd className="mt-1 text-lg font-bold text-[var(--text-primary)]">{item.value}</dd>
          {typeof item.progress === 'number' ? (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]" aria-hidden="true">
              <div
                className={`h-full rounded-full ${item.tone === 'warning' ? 'bg-[#fbbf24]' : item.tone === 'critical' ? 'bg-[#f87171]' : item.tone === 'sky' ? 'bg-[#38bdf8]' : 'bg-[#34d399]'}`}
                style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}
              />
            </div>
          ) : null}
          {item.detail ? <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">{item.detail}</p> : null}
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
