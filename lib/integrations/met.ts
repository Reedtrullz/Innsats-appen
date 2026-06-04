// Official docs verified 2026-06-02:
// - Locationforecast 2.0 compact endpoint: https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=...&lon=...
// - MET requires a unique non-generic User-Agent with contact information; generic clients may get 403.
// - MET recommends coordinate precision of <= 4 decimals for cache efficiency/rate friendliness.
// - Locationforecast responses are cacheable; clients should respect HTTP cache/Expires headers instead of tight polling.
// - MetAlerts 2.0 current endpoint: https://api.met.no/weatherapi/metalerts/2.0/current.json?lat=...&lon=...&lang=no.
// - MetAlerts CAP files are immutable once issued; do not repeatedly refetch the same CAP file. MVP keeps warnings as context only.
import { createHash } from 'node:crypto';
import { ExternalApiError, recordSourceFailure, recordSourceSuccess, retryAfterSecondsFromHeaders, sourceFailureDetailsFromError, type SourceHealthState } from './source-health';
import type { ExternalContextSignal } from './types';

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type MetSignalKind = 'weather' | 'weather-alert';

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function severityFromLevel(level: unknown): ExternalContextSignal['severity'] {
  const raw = String(level ?? '').toLowerCase();
  if (raw.includes('red')) return 'red';
  if (raw.includes('orange')) return 'orange';
  if (raw.includes('yellow')) return 'yellow';
  return 'info';
}

function isGenericMetUserAgent(ua: string) {
  const normalized = ua.toLowerCase();
  return [
    'example.invalid',
    'example.com',
    'contact@example',
    'support@example',
    'your-email',
    'yourdomain',
    'localhost',
    'change-me',
    'changeme',
    'test@example',
    'node',
    'undici',
    'curl',
    'mozilla',
  ].some((placeholder) => normalized.includes(placeholder));
}

function hasContactBearingMetUserAgent(ua: string) {
  return /\S+@\S+\.\S+/.test(ua) || /https?:\/\/\S+\.\S+/.test(ua);
}

export function getMetUserAgent() {
  const ua = process.env.MET_USER_AGENT ?? 'Beredskapsboka/0.1 contact@example.invalid';
  if (process.env.NODE_ENV === 'production' && (!process.env.MET_USER_AGENT || !hasContactBearingMetUserAgent(ua) || isGenericMetUserAgent(ua))) {
    throw new Error('MET_USER_AGENT must include real contact information in production');
  }
  return ua;
}

async function fetchMetSignalsDetailed({ lat, lon, userAgent = getMetUserAgent(), fetchImpl = fetch }: { lat: number; lon: number; userAgent?: string; fetchImpl?: FetchLike }): Promise<{ signals: ExternalContextSignal[]; notModifiedKinds: MetSignalKind[] }> {
  const roundedLat = Number(lat.toFixed(4));
  const roundedLon = Number(lon.toFixed(4));
  const headers = { 'User-Agent': userAgent };
  const fetchedAt = new Date().toISOString();
  const forecastUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${roundedLat}&lon=${roundedLon}`;
  const alertUrl = `https://api.met.no/weatherapi/metalerts/2.0/current.json?lat=${roundedLat}&lon=${roundedLon}&lang=no`;
  const [forecastRes, alertRes] = await Promise.all([fetchImpl(forecastUrl, { headers }), fetchImpl(alertUrl, { headers })]);
  if (!forecastRes.ok && forecastRes.status !== 304) {
    throw new ExternalApiError(`MET locationforecast returned ${forecastRes.status}`, forecastRes.status, retryAfterSecondsFromHeaders(forecastRes.headers));
  }
  if (!alertRes.ok && alertRes.status !== 304) {
    throw new ExternalApiError(`MET alerts returned ${alertRes.status}`, alertRes.status, retryAfterSecondsFromHeaders(alertRes.headers));
  }

  const signals: ExternalContextSignal[] = [];
  const notModifiedKinds: MetSignalKind[] = [];
  if (forecastRes.status === 304) {
    notModifiedKinds.push('weather');
  } else if (forecastRes.ok) {
    const forecast = await forecastRes.json();
    const timeseries = forecast.properties?.timeseries ?? [];
    const first = timeseries[0];
    const details = first?.data?.instant?.details ?? {};
    if (first) {
      signals.push({
        source: 'met',
        kind: 'weather',
        severity: 'info',
        title: 'Værvarsel',
        summary: `Temperatur ${details.air_temperature ?? '?'}°C, vind ${details.wind_speed ?? '?'} m/s`,
        validFrom: first.time ?? null,
        validTo: timeseries[1]?.time ?? null,
        fetchedAt,
        staleness: 'fresh',
        upstreamId: first.time ?? forecast.properties?.meta?.updated_at,
        upstreamVersion: forecast.properties?.meta?.updated_at,
        upstreamHash: hash(forecast),
        rawRef: 'met:locationforecast',
      });
    }
  }

  if (alertRes.status === 304) {
    notModifiedKinds.push('weather-alert');
  } else if (alertRes.ok) {
    const alerts = await alertRes.json();
    for (const feature of alerts.features ?? []) {
      const props = feature.properties ?? {};
      signals.push({
        source: 'met',
        kind: 'weather-alert',
        severity: severityFromLevel(props.awareness_level),
        title: props.event ?? props.incidentName ?? 'Farevarsel',
        summary: props.description ?? props.instruction ?? 'MET farevarsel',
        validFrom: props.onset ?? props.effective ?? null,
        validTo: props.expires ?? null,
        fetchedAt,
        staleness: 'fresh',
        upstreamId: String(feature.id ?? props.identifier ?? props.capId ?? hash(feature)),
        upstreamHash: hash(feature),
        rawRef: 'met:alerts-current',
      });
    }
  }
  return { signals, notModifiedKinds };
}

export async function fetchMetSignals(options: { lat: number; lon: number; userAgent?: string; fetchImpl?: FetchLike }): Promise<ExternalContextSignal[]> {
  return (await fetchMetSignalsDetailed(options)).signals;
}

export async function refreshMetSourceHealth(
  state: SourceHealthState,
  options: Parameters<typeof fetchMetSignals>[0],
): Promise<SourceHealthState> {
  try {
    const { signals, notModifiedKinds } = await fetchMetSignalsDetailed(options);
    const preserved = state.lastSuccessfulSignals.filter((signal) => signal.source === 'met' && notModifiedKinds.includes(signal.kind as MetSignalKind));
    return recordSourceSuccess(state, [...signals, ...preserved]);
  } catch (error) {
    return recordSourceFailure(state, error instanceof Error ? error.message : 'MET refresh failed', new Date().toISOString(), sourceFailureDetailsFromError(error));
  }
}
