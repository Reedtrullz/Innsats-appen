import type { ContextSource, ExternalContextSignal } from './types';

export type ExternalDataSourceSettings = Record<ContextSource, boolean>;

export const EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY = 'beredskapsboka-external-data-sources-v1';
export const EXTERNAL_DATA_SOURCE_SETTINGS_EVENT = 'beredskapsboka:external-data-source-settings';
export const EXTERNAL_CONTEXT_SOURCES: ContextSource[] = ['kartverket', 'met', 'nve'];

export const DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS: ExternalDataSourceSettings = {
  kartverket: true,
  met: true,
  nve: true,
};

export function normalizeExternalDataSourceSettings(value: unknown): ExternalDataSourceSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS };
  const record = value as Partial<Record<ContextSource, unknown>>;
  return {
    kartverket: typeof record.kartverket === 'boolean' ? record.kartverket : DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS.kartverket,
    met: typeof record.met === 'boolean' ? record.met : DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS.met,
    nve: typeof record.nve === 'boolean' ? record.nve : DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS.nve,
  };
}

export function parseExternalDataSourceSettings(raw: string | null): ExternalDataSourceSettings {
  if (!raw) return { ...DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS };
  try {
    return normalizeExternalDataSourceSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS };
  }
}

function getBrowserLocalStorage(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function readExternalDataSourceSettings(storage?: Pick<Storage, 'getItem'>): ExternalDataSourceSettings {
  try {
    const resolvedStorage = storage ?? getBrowserLocalStorage();
    return parseExternalDataSourceSettings(resolvedStorage?.getItem(EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY) ?? null);
  } catch {
    return { ...DEFAULT_EXTERNAL_DATA_SOURCE_SETTINGS };
  }
}

export function writeExternalDataSourceSettings(settings: ExternalDataSourceSettings, storage?: Pick<Storage, 'setItem'>) {
  const normalized = normalizeExternalDataSourceSettings(settings);
  try {
    const resolvedStorage = storage ?? getBrowserLocalStorage();
    resolvedStorage?.setItem(EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Browser storage can be blocked or quota-limited in private/restricted modes. Keep the UI usable.
  }
  if (!storage && typeof window !== 'undefined') window.dispatchEvent(new Event(EXTERNAL_DATA_SOURCE_SETTINGS_EVENT));
  return normalized;
}

export function externalDataSourceSettingsSnapshot() {
  return JSON.stringify(readExternalDataSourceSettings());
}

export function subscribeExternalDataSourceSettings(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === EXTERNAL_DATA_SOURCE_SETTINGS_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EXTERNAL_DATA_SOURCE_SETTINGS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EXTERNAL_DATA_SOURCE_SETTINGS_EVENT, callback);
  };
}

export function setExternalDataSourceEnabled(settings: ExternalDataSourceSettings, source: ContextSource, enabled: boolean): ExternalDataSourceSettings {
  return { ...settings, [source]: enabled };
}

export function disabledExternalDataSources(settings: ExternalDataSourceSettings): ContextSource[] {
  return EXTERNAL_CONTEXT_SOURCES.filter((source) => !settings[source]);
}

export function displaySignalsForExternalDataSourceSettings(
  signals: ExternalContextSignal[],
  settings: ExternalDataSourceSettings,
): ExternalContextSignal[] {
  return signals.flatMap((signal) => {
    if (settings[signal.source]) return [signal];
    if (signal.staleness === 'fresh') return [{ ...signal, staleness: 'stale' as const }];
    return [signal];
  });
}

export function activeSignalsForExternalDataSourceSettings(
  signals: ExternalContextSignal[],
  settings: ExternalDataSourceSettings,
): ExternalContextSignal[] {
  return signals.filter((signal) => settings[signal.source]);
}
