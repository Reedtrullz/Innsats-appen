'use client';

import type { ReactNode } from 'react';

type ContextNoticeVariant = 'local-support' | 'privacy' | 'export-review' | 'not-official' | 'blocked-sensitive-content';

const variantStyles: Record<ContextNoticeVariant, string> = {
  'local-support': 'border-sky-200 bg-sky-50 text-sky-950',
  privacy: 'border-amber-200 bg-amber-50 text-amber-950',
  'export-review': 'border-emerald-200 bg-emerald-50 text-emerald-950',
  'not-official': 'border-slate-200 bg-slate-50 text-slate-800',
  'blocked-sensitive-content': 'border-red-200 bg-red-50 text-red-950',
};

const variantCopy: Record<ContextNoticeVariant, string> = {
  'local-support': 'Lokal beslutningsstøtte. Kontroller mot gjeldende ordre og lokale rutiner.',
  privacy: 'Lokal arbeidsflate. Bruk korte, sanitere notater uten persondata, pasientdata eller skjermet informasjon.',
  'export-review': 'Se over lokal eksport før bruk eller deling.',
  'not-official': 'Ikke offisiell innsending, inventarliste, journal eller kommandosystem.',
  'blocked-sensitive-content': 'Innholdet ble stoppet fordi det kan inneholde persondata, pasientdata eller skjermet informasjon.',
};

export function ContextNotice({
  variant,
  children,
  className = '',
}: {
  variant: ContextNoticeVariant;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p className={`rounded-xl border p-3 text-sm font-semibold ${variantStyles[variant]} ${className}`}>
      {children ?? variantCopy[variant]}
    </p>
  );
}
