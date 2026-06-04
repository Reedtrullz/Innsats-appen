'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS,
  EXTERNAL_CONTEXT_SOURCES,
  disabledExternalDataSources,
  externalDataSourceSettingsSnapshot,
  parseExternalDataSourceSettings,
  setExternalDataSourceEnabled,
  subscribeExternalDataSourceSettings,
  writeExternalDataSourceSettings,
  type ExternalDataSourceSettings,
} from '@/lib/integrations/source-settings';
import { getExternalSourceContract } from '@/lib/integrations/source-contracts';
import type { ContextSource } from '@/lib/integrations/types';

const sourceLabels: Record<ContextSource, string> = {
  kartverket: 'Kartverket',
  met: 'MET Norway',
  nve: 'NVE / Varsom',
};

const sourceSummaries: Record<ContextSource, string> = {
  kartverket: 'Adresse, stedsnavn og kommuneoppslag fra offentlige Kartverket-endepunkter.',
  met: 'Værvarsel og MetAlerts fra api.met.no. Nowcast er dokumentert, men ikke aktivert i denne MVP-en.',
  nve: 'Flom- og jordskredvarsel fra NVE. Snøskred/avalanche står som pending til live endpoint er verifisert.',
};

export function ExternalDataSourcesSettings() {
  const settingsSnapshot = useSyncExternalStore(
    subscribeExternalDataSourceSettings,
    externalDataSourceSettingsSnapshot,
    () => JSON.stringify(DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS),
  );
  const settings = useMemo<ExternalDataSourceSettings>(() => parseExternalDataSourceSettings(settingsSnapshot), [settingsSnapshot]);

  function updateSource(source: ContextSource, enabled: boolean) {
    writeExternalDataSourceSettings(setExternalDataSourceEnabled(settings, source, enabled));
  }

  function reset() {
    writeExternalDataSourceSettings(DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS);
  }

  const disabledSources = disabledExternalDataSources(settings);

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Eksterne datakilder">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Lokale innstillinger</p>
        <h1 className="text-3xl font-black">Eksterne datakilder</h1>
        <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
          Valgene lagres bare i localStorage i denne nettleseren. De synkroniseres ikke til backend, oppdrag eller andre enheter. Avslåtte kilder skal ikke hentes eller vises som fersk aktiv kontekst; sist vellykkede lokale sammendrag kan fortsatt vises tydelig som stale.
        </p>
      </div>

      <div className="grid gap-3">
        {EXTERNAL_CONTEXT_SOURCES.map((source) => {
          const contract = getExternalSourceContract(source);
          return (
            <article key={source} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{sourceLabels[source]}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{sourceSummaries[source]}</p>
                </div>
                <label className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-black">
                  <input
                    type="checkbox"
                    checked={settings[source]}
                    onChange={(event) => updateSource(source, event.target.checked)}
                    aria-label={`${sourceLabels[source]} aktivert`}
                    className="h-5 w-5"
                  />
                  {settings[source] ? 'Aktivert' : 'Avslått'}
                </label>
              </div>
              <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700">
                <p>Verifisert: {contract?.verifiedOn ?? 'ikke registrert'}</p>
                <p className="mt-1">Aktive endepunkter: {contract?.enabledEndpoints.length ? contract.enabledEndpoints.join(', ') : 'Ingen'}</p>
                {contract?.deferredCapabilities.length ? (
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {contract.deferredCapabilities.map((capability) => <li key={capability.id}>{capability.id}: {capability.status} — {capability.reason}</li>)}
                  </ul>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="font-black">Status i denne nettleseren</h2>
        <p className="mt-1 text-sm font-semibold text-slate-700" data-testid="external-source-status">
          {disabledSources.length === 0 ? 'Alle offentlige kontekstkilder er aktivert lokalt.' : `Avslått lokalt: ${disabledSources.map((source) => sourceLabels[source]).join(', ')}`}
        </p>
        <button type="button" onClick={reset} className="mt-3 min-h-11 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-950">Tilbakestill datakilder</button>
      </div>
    </section>
  );
}
