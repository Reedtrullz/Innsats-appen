// Official docs verified 2026-06-02:
// - NVE Flomvarsling REST API base: https://api01.nve.no/hydrology/forecast/flood/v1.0.10
//   Per-municipality forecast snapshot endpoint: /api/Warning/Municipality/{Kommunenummer}/{Språknøkkel}/{Start}/{Slutt}
// - NVE Jordskredvarsling REST API base: https://api01.nve.no/hydrology/forecast/landslide/v1.0.6
//   Per-municipality forecast snapshot endpoint: /api/Warning/Municipality/{Kommunenummer}/{Språknøkkel}/{Start}/{Slutt}
// - Responses are context snapshots for a period/area, not durable incident events. Credit flood data as
//   "Varsler fra Flomvarslingen i Norge og www.varsom.no".
import { createHash } from 'node:crypto';
import { recordSourceFailure, recordSourceSuccess, type SourceHealthState } from './source-health';
import type { ExternalContextSignal } from './types';

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

type NveEndpoint = {
  kind: 'flood-warning' | 'landslide-warning';
  base: string;
};

const NVE_ENDPOINTS: NveEndpoint[] = [
  { kind: 'flood-warning', base: 'https://api01.nve.no/hydrology/forecast/flood/v1.0.10' },
  { kind: 'landslide-warning', base: 'https://api01.nve.no/hydrology/forecast/landslide/v1.0.6' },
];

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return parsed;
}

export function normalizeNveDateRange(start: string, end: string) {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (!startDate || !endDate) throw new Error('start/end must use valid YYYY-MM-DD dates');
  if (startDate.getTime() > endDate.getTime()) throw new Error('start must be before or equal to end');
  return { start, end };
}

function parseNveDate(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value);
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (!match) return raw;
  return `${match[3]}-${match[2]}-${match[1]}T${match[4] ?? '00:00:00'}Z`;
}

function severity(level: unknown): ExternalContextSignal['severity'] {
  const n = Number(level);
  if (n >= 4) return 'red';
  if (n === 3) return 'orange';
  if (n === 2) return 'yellow';
  if (n >= 0) return 'info';
  return 'unknown';
}

function endpointUrl(endpoint: NveEndpoint, municipality: string, start: string, end: string) {
  return `${endpoint.base}/api/Warning/Municipality/${encodeURIComponent(municipality)}/1/${encodeURIComponent(start)}/${encodeURIComponent(end)}`;
}

function warningArray(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as any).Warnings)) return (data as any).Warnings;
  return [];
}

function usableWarningId(value: unknown) {
  const raw = String(value ?? '').trim();
  return raw && raw.toLowerCase() !== 'xxx' ? raw : null;
}

function stableWarningId(endpoint: NveEndpoint, municipality: string, warning: any, upstreamHash: string) {
  const directId = usableWarningId(warning.EventId) ?? usableWarningId(warning.Id) ?? usableWarningId(warning.WarningId);
  if (directId) return `${endpoint.kind}:${municipality}:${directId}`;
  return [
    endpoint.kind,
    municipality,
    parseNveDate(warning.ValidFrom) ?? 'unknown-from',
    parseNveDate(warning.ValidTo) ?? 'unknown-to',
    warning.ActivityLevel ?? 'unknown-level',
    upstreamHash,
  ].join(':');
}

export async function fetchNveHazardSignals({
  municipality,
  start = isoDate(new Date()),
  end = isoDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
  fetchImpl = fetch,
}: { municipality: string; start?: string; end?: string; fetchImpl?: FetchLike }): Promise<ExternalContextSignal[]> {
  const range = normalizeNveDateRange(start, end);
  const fetchedAt = new Date().toISOString();
  const groups = await Promise.all(NVE_ENDPOINTS.map(async (endpoint) => {
    const url = endpointUrl(endpoint, municipality, range.start, range.end);
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`NVE returned ${res.status} for ${endpoint.kind}`);
    const data = await res.json();
    return warningArray(data).map((warning) => {
      const upstreamHash = hash(warning);
      return {
        source: 'nve',
        kind: endpoint.kind,
        severity: severity(warning.ActivityLevel),
        title: warning.DangerTypeName ?? (endpoint.kind === 'flood-warning' ? 'Flomvarsel' : 'Jordskredvarsel'),
        summary: warning.MainText ?? warning.LevelMeaningText ?? 'NVE varsel',
        validFrom: parseNveDate(warning.ValidFrom),
        validTo: parseNveDate(warning.ValidTo),
        fetchedAt,
        staleness: 'fresh',
        upstreamId: stableWarningId(endpoint, municipality, warning, upstreamHash),
        upstreamHash,
        geometry: { municipality, area: warning.Area ?? null },
        rawRef: url,
      } satisfies ExternalContextSignal;
    });
  }));
  return groups.flat();
}

export async function refreshNveSourceHealth(
  state: SourceHealthState,
  options: Parameters<typeof fetchNveHazardSignals>[0],
): Promise<SourceHealthState> {
  try {
    return recordSourceSuccess(state, await fetchNveHazardSignals(options));
  } catch (error) {
    return recordSourceFailure(state, error instanceof Error ? error.message : 'NVE refresh failed');
  }
}
