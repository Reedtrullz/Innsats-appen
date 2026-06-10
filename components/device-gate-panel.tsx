'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { OperationalIcon } from '@/components/ui/operational-icons';
import {
  CHECK_DEFS,
  type CheckId,
  type CheckStatus,
  type DeviceGateCheck,
  initialDeviceGateChecks,
  loadPersistedGate,
  runAutoDetect,
  runDataRetentionWipeTest,
  persistManualConfirm,
  persistSha,
  resetDeviceGate,
} from '@/lib/release/device-gate';

import type { OperationalIconName } from '@/components/ui/operational-icons';

function statusIcon(status: CheckStatus, manualConfirmed: boolean): { icon: OperationalIconName; tone: string; label: string } {
  const effective = manualConfirmed ? 'pass' : status;
  if (effective === 'pass') return { icon: 'shield', tone: 'text-emerald-700 border-emerald-200 bg-emerald-50', label: 'Bestått' };
  if (effective === 'fail') return { icon: 'alert', tone: 'text-red-700 border-red-200 bg-red-50', label: 'Ikke bestått' };
  return { icon: 'chevron', tone: 'text-amber-600 border-amber-200 bg-amber-50', label: 'Venter' };
}

export function DeviceGatePanel() {
  const [checks, setChecks] = useState<DeviceGateCheck[]>(initialDeviceGateChecks);
  const [sha, setSha] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const persisted = loadPersistedGate();
      setSha(persisted.sha);
      setChecks(CHECK_DEFS.map((def) => {
        const auto = runAutoDetect(def.id);
        return { ...def, autoDetected: auto.status, manualConfirmed: persisted.confirmed[def.id] ?? false, detail: auto.detail };
      }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { version?: string }) => {
        const v = data.version ?? 'local';
        setSha(v);
        persistSha(v);
      })
      .catch(() => {});
  }, []);

  const toggleConfirm = useCallback((id: CheckId, value: boolean) => {
    setChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, manualConfirmed: value } : c)),
    );
    persistManualConfirm(id, value);
  }, []);

  const handleReset = useCallback(() => {
    resetDeviceGate();
    setChecks((prev) =>
      prev.map((c) => ({ ...c, manualConfirmed: false })),
    );
  }, []);

  const handleWipeTest = useCallback(() => {
    const result = runDataRetentionWipeTest();
    setChecks((prev) =>
      prev.map((c) => (c.id === 'data-retention' ? { ...c, autoDetected: result.status, detail: result.detail } : c)),
    );
  }, []);

  const overallReady = useMemo(
    () => checks.every((c) => c.manualConfirmed || c.autoDetected === 'pass'),
    [checks],
  );

  const passedCount = checks.filter((c) => c.manualConfirmed || c.autoDetected === 'pass').length;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-6 pt-3 sm:px-6">
      <header className="flex items-center justify-between gap-3 rounded-2xl border-2 bg-white p-4"
        style={{ borderColor: overallReady ? '#059669' : '#dc2626' }}
      >
        <div>
          <h1 className="text-xl font-black tracking-tight">Pilotklar sjekkliste</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {passedCount}/{checks.length} bestått{overallReady ? ' — PILOTKLAR' : ''}
          </p>
          {sha ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
              <OperationalIcon name="shield" className="h-3 w-3" />
              SHA: {sha}
            </p>
          ) : null}
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 text-center text-sm font-black"
          style={{
            borderColor: overallReady ? '#059669' : '#dc2626',
            backgroundColor: overallReady ? '#ecfdf5' : '#fef2f2',
            color: overallReady ? '#065f46' : '#991b1b',
          }}
        >
          {overallReady ? 'KLAR' : 'VENT'}
        </div>
      </header>

      <div className="mt-4 grid gap-3">
        {checks.map((check) => {
          const { icon, tone } = statusIcon(check.autoDetected, check.manualConfirmed);
          const effectivePass = check.manualConfirmed || check.autoDetected === 'pass';
          return (
            <article
              key={check.id}
              className={`rounded-2xl border p-3 ${effectivePass ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-sm font-black ${tone}`}>
                  <OperationalIcon name={icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black">{check.label}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{check.description}</p>
                  <p className={`mt-1 text-xs font-bold ${effectivePass ? 'text-emerald-700' : 'text-red-700'}`}>
                    {check.autoDetected === 'skip' && !check.manualConfirmed
                      ? 'Venter på test...'
                      : check.detail}
                  </p>
                </div>
                <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black ring-1 ring-slate-200">
                  <input
                    type="checkbox"
                    checked={check.manualConfirmed}
                    onChange={(e) => toggleConfirm(check.id, e.target.checked)}
                    className="h-4 w-4 rounded accent-emerald-600"
                  />
                  Bekreft
                </label>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleWipeTest}
          className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-black text-amber-900"
        >
          Test sletting
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black"
        >
          Nullstill bekreftelser
        </button>
      </div>
    </section>
  );
}
