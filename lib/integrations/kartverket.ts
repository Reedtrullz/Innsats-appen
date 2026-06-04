// Official docs verified 2026-06-02:
// - Address API: https://ws.geonorge.no/adresser/v1/ (base ws.geonorge.no/adresser/v1, GET /sok, /punktsok)
// - Stedsnavn API recommends new endpoint: https://api.kartverket.no/stedsnavn/v1 (GET /navn, /punkt)
// - Kommuneinfo API recommends new endpoint: https://api.kartverket.no/kommuneinfo/v1 (GET /punkt, /sok; name search uses knavn=...)
import { createHash } from 'node:crypto';
import type { ExternalContextSignal } from './types';

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function now() {
  return new Date().toISOString();
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

async function fetchJson(fetchImpl: FetchLike, url: string, timeoutMs = 6_000) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  try {
    const response = await fetchImpl(url, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) throw new Error(`Kartverket returned ${response.status} for ${new URL(url).pathname}`);
    return await response.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function fulfilled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

export async function fetchKartverketSignals({ q, lat, lon, fetchImpl = fetch }: { q?: string; lat?: number; lon?: number; fetchImpl?: FetchLike }): Promise<ExternalContextSignal[]> {
  const fetchedAt = now();
  const signals: ExternalContextSignal[] = [];
  if (q) {
    const addressUrl = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(q)}&treffPerSide=5`;
    const placeUrl = `https://api.kartverket.no/stedsnavn/v1/navn?sok=${encodeURIComponent(q)}&treffPerSide=5`;
    const municipalityUrl = `https://api.kartverket.no/kommuneinfo/v1/sok?knavn=${encodeURIComponent(q)}`;
    const [addressResult, placeResult, municipalityResult] = await Promise.allSettled([
      fetchJson(fetchImpl, addressUrl),
      fetchJson(fetchImpl, placeUrl),
      fetchJson(fetchImpl, municipalityUrl),
    ]);
    const address = fulfilled(addressResult);
    const place = fulfilled(placeResult);
    const municipality = fulfilled(municipalityResult);
    const firstAddress = address?.adresser?.[0];
    if (firstAddress) {
      signals.push({
        source: 'kartverket',
        kind: 'geocode',
        severity: 'info',
        title: firstAddress.adressetekst ?? q,
        summary: `Adresse i ${firstAddress.kommunenavn ?? 'ukjent kommune'}`,
        validFrom: null,
        validTo: null,
        fetchedAt,
        staleness: 'fresh',
        upstreamId: firstAddress.adressekode?.toString(),
        upstreamHash: hash(firstAddress),
        rawRef: 'kartverket:adresse-sok',
      });
    }
    const firstPlace = place?.navn?.[0] ?? place?.items?.[0];
    if (firstPlace) {
      signals.push({
        source: 'kartverket',
        kind: 'geocode',
        severity: 'info',
        title: firstPlace.skrivemåte ?? firstPlace.skrivemate ?? q,
        summary: firstPlace.navneobjekttype ?? 'Stedsnavn',
        validFrom: null,
        validTo: null,
        fetchedAt,
        staleness: 'fresh',
        upstreamId: firstPlace.stedsnummer?.toString() ?? firstPlace.stednummer?.toString(),
        upstreamHash: hash(firstPlace),
        rawRef: 'kartverket:stedsnavn-sok',
      });
    }
    const firstMunicipality = municipality?.kommuner?.[0] ?? municipality;
    const municipalityName = nonEmptyString(firstMunicipality?.kommunenavn) ?? nonEmptyString(firstMunicipality?.navn);
    const municipalityNumber = nonEmptyString(firstMunicipality?.kommunenummer) ?? nonEmptyString(municipality?.kommunenummer);
    if (municipalityName) {
      signals.push({
        source: 'kartverket',
        kind: 'administrative-area',
        severity: 'info',
        title: municipalityName,
        summary: `Kommune ${municipalityNumber ?? ''}`.trim(),
        validFrom: null,
        validTo: null,
        fetchedAt,
        staleness: 'fresh',
        upstreamId: municipalityNumber?.toString(),
        upstreamHash: hash(firstMunicipality),
        rawRef: 'kartverket:kommune-sok',
      });
    }
    if (signals.length === 0 && [addressResult, placeResult, municipalityResult].every((result) => result.status === 'rejected')) {
      const firstError = [addressResult, placeResult, municipalityResult].find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
      throw new Error(firstError?.reason instanceof Error ? firstError.reason.message : 'Kartverket context unavailable');
    }
  } else if (typeof lat === 'number' && typeof lon === 'number') {
    const url = `https://api.kartverket.no/kommuneinfo/v1/punkt?nord=${lat}&ost=${lon}&koordsys=4326`;
    const data = await fetchJson(fetchImpl, url);
    signals.push({
      source: 'kartverket',
      kind: 'administrative-area',
      severity: 'info',
      title: data.kommunenavn ?? 'Ukjent kommune',
      summary: `Kommune ${data.kommunenummer ?? ''}`.trim(),
      validFrom: null,
      validTo: null,
      fetchedAt,
      staleness: 'fresh',
      upstreamId: data.kommunenummer?.toString(),
      upstreamHash: hash(data),
      rawRef: 'kartverket:kommune-punkt',
    });
  }
  return signals;
}
