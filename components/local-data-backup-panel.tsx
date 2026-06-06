'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  LOCAL_DATA_EXPORT_VERSION,
  LOCAL_DATA_LARGE_IMPORT_WARNING_CHARS,
  LOCAL_DATA_SCHEMA_VERSION,
  applyLocalDataImport,
  buildBrowserLocalDataExport,
  estimateStorageQuota,
  parseLocalDataImport,
  serializeLocalDataExport,
  type LocalDataExport,
  type StorageQuotaStatus,
} from '@/lib/local-data/local-data';
import { appendLocalAuditEntry } from '@/lib/privacy/local-profile';

type ImportCounts = { localStorageKeys: number; missions: number; checklistRuns: number };

type LocalDataBackupPanelProps = {
  buildExport?: () => Promise<LocalDataExport>;
  applyImport?: (text: string, confirmLocalOnly: boolean, confirmReplaceExistingLocalData: boolean) => Promise<ImportCounts>;
  estimateQuota?: () => Promise<StorageQuotaStatus>;
};

const unknownQuota: StorageQuotaStatus = {
  level: 'unknown',
  formatted: 'Lagringskvote er ukjent i denne nettleseren.',
  message: 'Nettleseren oppgir ikke lokal lagringskvote. Eksport/import er fortsatt manuell og lokal.',
};

function quotaTone(level: StorageQuotaStatus['level']) {
  if (level === 'critical') return 'border-red-300 bg-red-50 text-red-950';
  if (level === 'warning') return 'border-amber-300 bg-amber-50 text-amber-950';
  if (level === 'ok') return 'border-emerald-300 bg-emerald-50 text-emerald-950';
  return 'border-slate-300 bg-slate-50 text-slate-800';
}

export function LocalDataBackupPanel({
  buildExport = buildBrowserLocalDataExport,
  applyImport = (text, confirmLocalOnly, confirmReplaceExistingLocalData) => applyLocalDataImport(text, { confirmLocalOnly, confirmReplaceExistingLocalData }),
  estimateQuota = estimateStorageQuota,
}: LocalDataBackupPanelProps) {
  const [quota, setQuota] = useState<StorageQuotaStatus>(unknownQuota);
  const [backupText, setBackupText] = useState('');
  const [importText, setImportText] = useState('');
  const [confirmLocalOnly, setConfirmLocalOnly] = useState(false);
  const [confirmReplaceExistingLocalData, setConfirmReplaceExistingLocalData] = useState(false);
  const [message, setMessage] = useState('Lag en manuell lokal JSON-backup før du sletter nettleserdata eller bytter enhet.');
  const [isBusy, setIsBusy] = useState(false);

  const refreshQuota = useCallback(async () => {
    try {
      setQuota(await estimateQuota());
    } catch {
      setQuota(unknownQuota);
    }
  }, [estimateQuota]);

  useEffect(() => {
    let cancelled = false;
    estimateQuota()
      .then((nextQuota) => {
        if (!cancelled) setQuota(nextQuota);
      })
      .catch(() => {
        if (!cancelled) setQuota(unknownQuota);
      });
    return () => {
      cancelled = true;
    };
  }, [estimateQuota]);

  async function generateBackup() {
    setIsBusy(true);
    try {
      const exportData = await buildExport();
      const serialized = serializeLocalDataExport(exportData);
      setBackupText(serialized);
      appendLocalAuditEntry('export-created', {
        exportKind: 'local-data-json',
        localStorageKeys: Object.keys(exportData.localStorage).length,
        missions: exportData.indexedDb.missions.length,
        checklistRuns: exportData.indexedDb.checklistRuns.length,
        backupBytes: serialized.length,
      });
      const sizeWarning = serialized.length > LOCAL_DATA_LARGE_IMPORT_WARNING_CHARS ? ' Backupen er stor; test import i samme nettleser før du sletter originaldata.' : '';
      setMessage(`Lokal JSON-backup generert med schema v${exportData.schemaVersion}. Kontroller innholdet manuelt før du lagrer eller deler filen.${sizeWarning}`);
      void refreshQuota();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunne ikke lage lokal backup.');
    } finally {
      setIsBusy(false);
    }
  }

  function previewImport() {
    try {
      const parsed = parseLocalDataImport(importText);
      const sizeWarning = importText.length > LOCAL_DATA_LARGE_IMPORT_WARNING_CHARS ? ' Importteksten er stor; forhåndsvis og test på samme enhet før originaldata slettes.' : '';
      setMessage(`Import klar: schema v${parsed.schemaVersion}, ${parsed.indexedDb.missions.length} oppdrag, ${parsed.indexedDb.checklistRuns.length} sjekklistekjøringer og ${Object.keys(parsed.localStorage).length} localStorage-nøkler. Import erstatter eksisterende lokale appdata på denne enheten etter eksplisitt bekreftelse.${sizeWarning}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunne ikke lese importen.');
    }
  }

  async function importBackup() {
    setIsBusy(true);
    try {
      const counts = await applyImport(importText, confirmLocalOnly, confirmReplaceExistingLocalData);
      appendLocalAuditEntry('local-reset', { resetScope: 'local-data-import', missions: counts.missions, checklistRuns: counts.checklistRuns });
      setMessage(`Import fullført lokalt: ${counts.missions} oppdrag, ${counts.checklistRuns} sjekklistekjøringer og ${counts.localStorageKeys} allowlistede localStorage-nøkler.`);
      setImportText('');
      setConfirmLocalOnly(false);
      setConfirmReplaceExistingLocalData(false);
      void refreshQuota();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunne ikke importere lokal JSON.');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-label="Lokal data backup og import">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">Manuell lokal backup</p>
        <h2 className="text-2xl font-black">Eksport/import av lokale appdata</h2>
        <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
          Backup og import er kun manuell JSON på denne enheten. Ingen opplasting, ingen cloud, ingen synk, ingen konto og ingen offisiell kommandosystem-kobling. Backupfilen inneholder lokal oppdrags-/sjekklistetilstand og allowlistede appinnstillinger fra denne nettleseren. Lokale profilfelt, kallesignal, kompetansepåminnelser og PIN-hash/salt eksporteres ikke. Ikke inkluder eller del persondata, pasientdata, private lokasjoner eller skjermet operativ informasjon.
        </p>
      </div>

      <div data-testid="local-data-quota" className={`rounded-2xl border p-3 text-sm font-semibold ${quotaTone(quota.level)}`}>
        <p className="font-black">Lagringskvote: {quota.formatted}</p>
        <p className="mt-1">{quota.message}</p>
        <button type="button" onClick={refreshQuota} className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-800 ring-1 ring-slate-200">Oppdater kvote</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-black">Lag lokal JSON-backup</h3>
          <p className="text-sm font-semibold text-slate-700">Eksportformat v{LOCAL_DATA_EXPORT_VERSION}, lokal dataschema v{LOCAL_DATA_SCHEMA_VERSION}. Bare allowlistede localStorage-nøkler, oppdrag og sjekklistekjøringer tas med.</p>
          <button type="button" onClick={generateBackup} disabled={isBusy} className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Lag lokal JSON-backup</button>
          <textarea aria-label="Lokal JSON backup" readOnly value={backupText} className="min-h-48 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" placeholder="Backup vises her etter eksplisitt generering." />
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
          <h3 className="text-lg font-black">Importer tidligere lokal backup</h3>
          <p className="text-sm font-semibold text-slate-700">Importer bare JSON du selv eksporterte lokalt. Fremtidige/ustøttede schema-versjoner og farlige felt avvises, og ukjente localStorage-nøkler strippes. Import erstatter eksisterende lokale appdata på denne enheten.</p>
          <textarea aria-label="Importer lokal JSON backup" value={importText} onChange={(event) => setImportText(event.target.value)} className="min-h-48 w-full rounded-xl border border-slate-300 p-3 font-mono text-xs" placeholder="Lim inn lokal JSON-backup her." />
          <label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-950">
            <input type="checkbox" checked={confirmLocalOnly} onChange={(event) => setConfirmLocalOnly(event.target.checked)} className="mt-1 h-5 w-5" />
            Jeg bekrefter at importen er en manuell lokal JSON-fil, at den ikke skal lastes opp eller synkroniseres, og at den ikke inneholder persondata, pasientdata eller private lokasjoner.
          </label>
          <label className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-950">
            <input type="checkbox" checked={confirmReplaceExistingLocalData} onChange={(event) => setConfirmReplaceExistingLocalData(event.target.checked)} className="mt-1 h-5 w-5" />
            Jeg forstår at importen erstatter eksisterende lokale appdata i denne nettleseren, inkludert allowlistede innstillinger, oppdrag og sjekklistekjøringer.
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={previewImport} disabled={!importText || isBusy} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-800 disabled:opacity-50">Sjekk schema</button>
            <button type="button" onClick={importBackup} disabled={!importText || !confirmLocalOnly || !confirmReplaceExistingLocalData || isBusy} className="rounded-full bg-sky-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">Importer JSON lokalt</button>
          </div>
        </div>
      </div>

      <p data-testid="local-data-backup-message" className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">{message}</p>
    </section>
  );
}
