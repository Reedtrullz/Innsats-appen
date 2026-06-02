import type { ExternalContextSignal, GuardResult } from './types';

const FORBIDDEN_PROXY_PARAMS = new Set(['url', 'upstream', 'proxy', 'target', 'href']);
const SOURCES = new Set(['kartverket', 'met', 'nve']);
const SEVERITIES = new Set(['info', 'yellow', 'orange', 'red', 'unknown']);
const STALENESS = new Set(['fresh', 'stale', 'unavailable']);

export function guardAllowedQuery(params: URLSearchParams, allowed: readonly string[]): GuardResult<Record<string, string>> {
  const allowedSet = new Set(allowed);
  const out: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    const normalizedKey = key.toLowerCase();
    if (FORBIDDEN_PROXY_PARAMS.has(normalizedKey)) return { ok: false, status: 400, error: `Generic proxy parameter rejected: ${key}` };
    if (!allowedSet.has(normalizedKey)) return { ok: false, status: 400, error: `Unsupported query parameter: ${key}` };
    out[normalizedKey] = value;
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

export function guardExternalContextSignals(value: unknown): GuardResult<ExternalContextSignal[]> {
  if (!Array.isArray(value)) return { ok: false, status: 400, error: 'Context signals must be an array' };
  for (const signal of value) {
    if (!isRecord(signal)) return { ok: false, status: 400, error: 'Context signal must be an object' };
    if ('steps' in signal || 'sourceIds' in signal) return { ok: false, status: 400, error: 'Action-card-shaped payload rejected' };
    if ('rawPayload' in signal || 'raw' in signal || 'fullRaw' in signal) return { ok: false, status: 400, error: 'Full raw upstream payload rejected' };
    if (typeof signal.source !== 'string' || !SOURCES.has(signal.source)) return { ok: false, status: 400, error: 'Unsupported context source' };
    if (typeof signal.kind !== 'string' || signal.kind.length === 0) return { ok: false, status: 400, error: 'Context signal kind is required' };
    if (typeof signal.severity !== 'string' || !SEVERITIES.has(signal.severity)) return { ok: false, status: 400, error: 'Unsupported context severity' };
    if (typeof signal.title !== 'string' || signal.title.length === 0) return { ok: false, status: 400, error: 'Context signal title is required' };
    if (typeof signal.summary !== 'string' || signal.summary.length === 0) return { ok: false, status: 400, error: 'Context signal summary is required' };
    if (!('validFrom' in signal) || !('validTo' in signal)) return { ok: false, status: 400, error: 'Context signal validity fields are required' };
    if (signal.validFrom !== null && typeof signal.validFrom !== 'string') return { ok: false, status: 400, error: 'Context signal validFrom must be string or null' };
    if (signal.validTo !== null && typeof signal.validTo !== 'string') return { ok: false, status: 400, error: 'Context signal validTo must be string or null' };
    if (typeof signal.fetchedAt !== 'string' || signal.fetchedAt.length === 0) return { ok: false, status: 400, error: 'Context signal fetchedAt is required' };
    if (typeof signal.staleness !== 'string' || !STALENESS.has(signal.staleness)) return { ok: false, status: 400, error: 'Unsupported context staleness' };
    for (const optionalField of ['upstreamId', 'upstreamVersion', 'etag', 'upstreamHash'] as const) {
      if (signal[optionalField] !== undefined && typeof signal[optionalField] !== 'string') return { ok: false, status: 400, error: `${optionalField} must be a string when present` };
    }
    if (typeof signal.rawRef !== 'string' || signal.rawRef.length === 0) return { ok: false, status: 400, error: 'Context signal rawRef is required' };
  }
  return { ok: true, value: value as ExternalContextSignal[] };
}

export function jsonGuardError(error: GuardResult<unknown>) {
  if (error.ok) throw new Error('jsonGuardError called with ok guard');
  return Response.json({ error: error.error }, { status: error.status });
}
