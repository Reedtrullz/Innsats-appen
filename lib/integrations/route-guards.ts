import type { ExternalContextSignal, GuardResult } from './types';

const FORBIDDEN_PROXY_PARAMS = new Set(['url', 'upstream', 'proxy', 'target', 'href']);
const SOURCES = new Set(['kartverket', 'met', 'nve']);
const SEVERITIES = new Set(['info', 'yellow', 'orange', 'red', 'unknown']);
const STALENESS = new Set(['fresh', 'stale', 'unavailable']);
const RAW_REF_PATTERN = /^[a-z]+:[a-z0-9-]+$/;
const ALLOWED_SIGNAL_KEYS = new Set([
  'source',
  'kind',
  'severity',
  'title',
  'summary',
  'validFrom',
  'validTo',
  'fetchedAt',
  'staleness',
  'upstreamId',
  'upstreamVersion',
  'etag',
  'upstreamHash',
  'geometry',
  'rawRef',
]);
const MAX_PUBLIC_LOOKUP_LENGTH = 120;
const restrictedShelterLookupPattern = /(?:privat\w*|skjermet\w*|hemmelig\w*|gradert\w*)[^\n]{0,80}tilfluktsrom|tilfluktsrom[^\n]{0,80}(?:liste|data|lokasjon|plassering)/i;

function guardPublicLookupText(value: string): GuardResult<string> {
  const q = value.trim();
  if (!q) return { ok: false, status: 400, error: 'q is required' };
  if (q.length > MAX_PUBLIC_LOOKUP_LENGTH) return { ok: false, status: 400, error: `q must be at most ${MAX_PUBLIC_LOOKUP_LENGTH} characters` };
  if (/[\u0000-\u001F\u007F]/.test(q)) return { ok: false, status: 400, error: 'q must not contain control characters' };
  if (/\b\d{11}\b/.test(q)) return { ok: false, status: 400, error: 'q must not contain national identity numbers' };
  if (restrictedShelterLookupPattern.test(q)) return { ok: false, status: 400, error: 'q must not contain private or restricted shelter references' };
  return { ok: true, value: q };
}

export function guardAllowedQuery(params: URLSearchParams, allowed: readonly string[]): GuardResult<Record<string, string>> {
  const allowedSet = new Set(allowed);
  const seen = new Set<string>();
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    const normalizedKey = key.toLowerCase();
    if (key !== normalizedKey) return { ok: false, status: 400, error: `Query parameter must be lowercase: ${key}` };
    if (FORBIDDEN_PROXY_PARAMS.has(normalizedKey)) return { ok: false, status: 400, error: `Generic proxy parameter rejected: ${key}` };
    if (!allowedSet.has(normalizedKey)) return { ok: false, status: 400, error: `Unsupported query parameter: ${key}` };
    if (seen.has(normalizedKey)) return { ok: false, status: 400, error: `Duplicate query parameter rejected: ${key}` };
    seen.add(normalizedKey);
    if (normalizedKey === 'q') {
      const guardedQ = guardPublicLookupText(value);
      if (!guardedQ.ok) return guardedQ;
      out[normalizedKey] = guardedQ.value;
    } else {
      out[normalizedKey] = value;
    }
  }
  return { ok: true, value: out };
}

export function guardSupportedUpstreamPath(path: string, allowedPaths: readonly string[]): GuardResult<string> {
  if (/^https?:\/\//i.test(path)) return { ok: false, status: 400, error: 'Full upstream URLs are not allowed' };
  if (path.includes('..')) return { ok: false, status: 400, error: 'Unsafe upstream path rejected' };
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!allowedPaths.includes(normalized)) return { ok: false, status: 400, error: `Unsupported upstream path: ${normalized}` };
  return { ok: true, value: normalized };
}

export function guardLatLon(params: URLSearchParams): GuardResult<{ lat: number; lon: number }> {
  if (!params.has('lat') || !params.has('lon')) return { ok: false, status: 400, error: 'lat/lon are required' };
  const rawLat = params.get('lat')?.trim();
  const rawLon = params.get('lon')?.trim();
  if (!rawLat || !rawLon) return { ok: false, status: 400, error: 'lat/lon must be numbers' };
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { ok: false, status: 400, error: 'lat/lon must be numbers' };
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return { ok: false, status: 400, error: 'lat/lon outside allowed range' };
  return { ok: true, value: { lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDateTime(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}

function isOptionalIsoDateTime(value: unknown) {
  return value === null || isIsoDateTime(value);
}

export function guardExternalContextSignals(value: unknown): GuardResult<ExternalContextSignal[]> {
  if (!Array.isArray(value)) return { ok: false, status: 400, error: 'Context signals must be an array' };
  for (const signal of value) {
    if (!isRecord(signal)) return { ok: false, status: 400, error: 'Context signal must be an object' };
    for (const key of Object.keys(signal)) {
      if (!ALLOWED_SIGNAL_KEYS.has(key)) return { ok: false, status: 400, error: `Unknown context signal field rejected: ${key}` };
    }
    if ('steps' in signal || 'sourceIds' in signal) return { ok: false, status: 400, error: 'Action-card-shaped payload rejected' };
    if ('rawPayload' in signal || 'raw' in signal || 'fullRaw' in signal) return { ok: false, status: 400, error: 'Full raw upstream payload rejected' };
    if (typeof signal.source !== 'string' || !SOURCES.has(signal.source)) return { ok: false, status: 400, error: 'Unsupported context source' };
    if (typeof signal.kind !== 'string' || signal.kind.length === 0) return { ok: false, status: 400, error: 'Context signal kind is required' };
    if (typeof signal.severity !== 'string' || !SEVERITIES.has(signal.severity)) return { ok: false, status: 400, error: 'Unsupported context severity' };
    if (typeof signal.title !== 'string' || signal.title.length === 0) return { ok: false, status: 400, error: 'Context signal title is required' };
    if (typeof signal.summary !== 'string' || signal.summary.length === 0) return { ok: false, status: 400, error: 'Context signal summary is required' };
    if (!('validFrom' in signal) || !('validTo' in signal)) return { ok: false, status: 400, error: 'Context signal validity fields are required' };
    if (!isOptionalIsoDateTime(signal.validFrom)) return { ok: false, status: 400, error: 'Context signal validFrom must be ISO datetime or null' };
    if (!isOptionalIsoDateTime(signal.validTo)) return { ok: false, status: 400, error: 'Context signal validTo must be ISO datetime or null' };
    if (!isIsoDateTime(signal.fetchedAt)) return { ok: false, status: 400, error: 'Context signal fetchedAt must be ISO datetime' };
    if (typeof signal.staleness !== 'string' || !STALENESS.has(signal.staleness)) return { ok: false, status: 400, error: 'Unsupported context staleness' };
    for (const optionalField of ['upstreamId', 'upstreamVersion', 'etag', 'upstreamHash'] as const) {
      if (signal[optionalField] !== undefined && typeof signal[optionalField] !== 'string') return { ok: false, status: 400, error: `${optionalField} must be a string when present` };
    }
    if (typeof signal.rawRef !== 'string' || !RAW_REF_PATTERN.test(signal.rawRef)) return { ok: false, status: 400, error: 'Context signal rawRef must be a sanitized source reference' };
  }
  return { ok: true, value: value as ExternalContextSignal[] };
}

export function jsonGuardError(error: GuardResult<unknown>) {
  if (error.ok) throw new Error('jsonGuardError called with ok guard');
  return Response.json({ error: error.error }, { status: error.status });
}
