import type { ExternalContextSignal, MissionContext } from './schemas';

export const MAX_CONTEXT_SIGNAL_HISTORY_ENTRIES = 50;

function signalHistoryKey(signal: ExternalContextSignal) {
  const stableIdentity = signal.upstreamId ?? signal.upstreamHash;
  if (stableIdentity) return [signal.source, signal.kind, stableIdentity].join('|');
  return [signal.source, signal.kind, signal.rawRef, signal.fetchedAt].join('|');
}

export function appendExternalContextSignalHistory(
  mission: MissionContext,
  signals: ExternalContextSignal[],
  limit = MAX_CONTEXT_SIGNAL_HISTORY_ENTRIES,
): MissionContext {
  const existing = mission.externalSignalHistory ?? [];
  const merged = [...signals, ...existing];
  const seen = new Set<string>();
  const externalSignalHistory = merged
    .filter((signal) => {
      const key = signalHistoryKey(signal);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))
    .slice(0, limit)
    .map((signal) => ({ ...signal, staleness: signal.staleness === 'unavailable' ? 'unavailable' as const : 'stale' as const }));
  return { ...mission, externalSignals: signals, externalSignalHistory };
}
