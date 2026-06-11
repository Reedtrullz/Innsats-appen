'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export const DECISION_SUPPORT_NOTICE_ACK_KEY = 'beredskapsboka-decision-support-notice-ack-v1';

function readAcknowledgedNotice() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DECISION_SUPPORT_NOTICE_ACK_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeAcknowledgedNotice() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DECISION_SUPPORT_NOTICE_ACK_KEY, 'true');
  } catch {
    // Local acknowledgement is only a convenience; the notice remains visible.
  }
}

function BoundaryLinks({ compact }: { compact: boolean }) {
  return (
    <nav aria-label="Grenser og lokal lagring" className={`${compact ? 'mt-2' : 'mt-3'} flex flex-wrap gap-2 text-xs font-black`}>
      <Link href="/begrensninger" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-amber-950 ring-1 ring-amber-200">Grenser</Link>
      <Link href="/kjente-begrensninger" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-amber-950 ring-1 ring-amber-200">Kjente begrensninger</Link>
      <Link href="/data-pa-enheten" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-amber-950 ring-1 ring-amber-200">Data på enheten</Link>
    </nav>
  );
}

export function DecisionSupportNotice({ compact = false }: { compact?: boolean }) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setAcknowledged(readAcknowledgedNotice());
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const acknowledge = () => {
    writeAcknowledgedNotice();
    setAcknowledged(true);
  };

  if (compact) {
    // Slim from first load so the primary action stays reachable. The full
    // boundary text lives on /begrensninger; the one-liner keeps the core
    // invariant (advisory, local-only, no persondata) visible everywhere.
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-950" aria-label="Operativ grense og lokal datalagring">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wide">Grenser og lokal lagring</p>
          {acknowledged ? (
            <Link href="/begrensninger" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-xs font-black text-amber-950 ring-1 ring-amber-200">
              Åpne grenser
            </Link>
          ) : (
            <button type="button" onClick={acknowledge} className="inline-flex min-h-11 items-center rounded-full bg-amber-950 px-4 py-2 text-xs font-black text-white">
              Forstått
            </button>
          )}
        </div>
        <p className="mt-1 text-xs font-semibold leading-5">
          Beslutningsstøtte, ikke et offisielt kommandosystem. Data lagres bare lokalt; ikke legg inn persondata.
        </p>
        {!acknowledged ? <BoundaryLinks compact /> : null}
      </section>
    );
  }

  return (
    <section className={`rounded-2xl border border-amber-200 bg-amber-50 text-amber-950 ${compact ? 'p-3' : 'p-4'}`} aria-label="Operativ grense og lokal datalagring">
      <p className="text-xs font-black uppercase tracking-wide">Operativ grense og lokal lagring</p>
      <p className={`${compact ? 'mt-1 text-xs leading-5' : 'mt-1 text-sm'} font-semibold`}>
        {compact
          ? 'Beslutningsstøtte, ikke et offisielt kommandosystem. Data lagres bare lokalt. Ikke legg inn persondata.'
          : 'Beredskapsboka er beslutningsstøtte og ikke et offisielt kommando-, ordre- eller hendelsessystem. Data lagres bare lokalt i denne nettleseren. Ikke legg inn persondata, pasientdata eller private/skjermede tilfluktsromdata.'}
      </p>
      <p className={`${compact ? 'mt-1 text-xs' : 'mt-2 text-xs'} font-semibold`}>
        Offentlig kontekst fra MET, Kartverket eller NVE brukes bare når en egen funksjon ber om det. Oppdragsnotater, logger og privat tekst forblir på enheten.
      </p>
      <div className={`${compact ? 'mt-2' : 'mt-3'} flex flex-wrap items-center gap-2`}>
        <button
          type="button"
          onClick={acknowledge}
          className="inline-flex min-h-11 items-center rounded-full bg-amber-950 px-4 py-2 text-xs font-black text-white"
        >
          Forstått
        </button>
      </div>
      <BoundaryLinks compact={compact} />
    </section>
  );
}
