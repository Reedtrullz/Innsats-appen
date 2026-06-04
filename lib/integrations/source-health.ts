import type { ContextSource, ContextStaleness, ExternalContextSignal } from './types';

export interface SourceHealthState {
  source: ContextSource;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  lastErrorStatus?: number;
  lastRateLimitAt?: string;
  retryAfterSeconds?: number;
  lastSuccessfulSignals: ExternalContextSignal[];
}

export interface SourceFailureDetails {
  status?: number;
  retryAfterSeconds?: number;
}

export class ExternalApiError extends Error {
  readonly status?: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status?: number, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ExternalApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function retryAfterSecondsFromHeaders(headers: Pick<Headers, 'get'>): number | undefined {
  const raw = headers.get('Retry-After');
  if (!raw) return undefined;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  const parsedDate = Date.parse(raw);
  if (Number.isNaN(parsedDate)) return undefined;
  return Math.max(0, Math.ceil((parsedDate - Date.now()) / 1000));
}

export function sourceFailureDetailsFromError(error: unknown): SourceFailureDetails {
  if (error instanceof ExternalApiError) return { status: error.status, retryAfterSeconds: error.retryAfterSeconds };
  return {};
}

export interface ClassifiedSourceHealth extends SourceHealthState {
  staleness: ContextStaleness;
}

export function recordSourceSuccess(state: SourceHealthState, signals: ExternalContextSignal[], at = new Date().toISOString()): SourceHealthState {
  return {
    ...state,
    lastSuccessAt: at,
    lastErrorAt: undefined,
    lastError: undefined,
    lastErrorStatus: undefined,
    lastRateLimitAt: undefined,
    retryAfterSeconds: undefined,
    lastSuccessfulSignals: signals,
  };
}

export function recordSourceFailure(
  state: SourceHealthState,
  error: string,
  at = new Date().toISOString(),
  details: SourceFailureDetails = {},
): SourceHealthState {
  const isRateLimited = details.status === 429;
  return {
    ...state,
    lastErrorAt: at,
    lastError: error,
    lastErrorStatus: details.status,
    lastRateLimitAt: isRateLimited ? at : state.lastRateLimitAt,
    retryAfterSeconds: isRateLimited ? details.retryAfterSeconds : undefined,
    lastSuccessfulSignals: state.lastSuccessfulSignals ?? [],
  };
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
