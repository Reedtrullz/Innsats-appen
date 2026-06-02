import type { ContextSource, ContextStaleness, ExternalContextSignal } from './types';

export interface SourceHealthState {
  source: ContextSource;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  lastSuccessfulSignals: ExternalContextSignal[];
}

export interface ClassifiedSourceHealth extends SourceHealthState {
  staleness: ContextStaleness;
}

export function recordSourceSuccess(state: SourceHealthState, signals: ExternalContextSignal[], at = new Date().toISOString()): SourceHealthState {
  return { ...state, lastSuccessAt: at, lastErrorAt: undefined, lastError: undefined, lastSuccessfulSignals: signals };
}

export function recordSourceFailure(state: SourceHealthState, error: string, at = new Date().toISOString()): SourceHealthState {
  return { ...state, lastErrorAt: at, lastError: error, lastSuccessfulSignals: state.lastSuccessfulSignals ?? [] };
}

export function classifySourceHealth(state: SourceHealthState, now = new Date().toISOString(), maxAgeMs = 30 * 60 * 1000): ClassifiedSourceHealth {
  if (!state.lastSuccessAt) return { ...state, staleness: 'unavailable' };
  const lastSuccess = Date.parse(state.lastSuccessAt);
  const current = Date.parse(now);
  if (Number.isNaN(lastSuccess) || Number.isNaN(current)) return { ...state, staleness: 'unavailable' };
  const age = current - lastSuccess;
  return { ...state, staleness: age > maxAgeMs || Boolean(state.lastErrorAt) ? 'stale' : 'fresh' };
}

export function staleLastSuccessfulSignals(state: Pick<SourceHealthState, 'lastSuccessfulSignals'>): ExternalContextSignal[] {
  return (state.lastSuccessfulSignals ?? []).map((signal) => ({ ...signal, staleness: 'stale' }));
}
