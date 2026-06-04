export type ContextSource = 'kartverket' | 'met' | 'nve';
export type ContextStaleness = 'fresh' | 'stale' | 'unavailable';
export type ContextSeverity = 'info' | 'yellow' | 'orange' | 'red' | 'unknown';

export interface ExternalContextSignal {
  source: ContextSource;
  kind: string;
  severity: ContextSeverity;
  title: string;
  summary: string;
  validFrom: string | null;
  validTo: string | null;
  fetchedAt: string;
  staleness: ContextStaleness;
  upstreamId?: string;
  upstreamVersion?: string;
  etag?: string;
  upstreamHash?: string;
  rawRef: string;
}

export interface GuardOk<T> { ok: true; value: T }
export interface GuardError { ok: false; status: number; error: string }
export type GuardResult<T> = GuardOk<T> | GuardError;
