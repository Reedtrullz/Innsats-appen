import type { ContextSource } from './types';

export type ExternalSourceCapabilityStatus = 'enabled' | 'deferred' | 'pending-verification';

export interface ExternalSourceContract {
  source: ContextSource;
  verifiedOn: string;
  officialDocs: string[];
  enabledEndpoints: string[];
  deferredCapabilities: Array<{
    id: string;
    status: ExternalSourceCapabilityStatus;
    reason: string;
    evidenceUrls: string[];
  }>;
}

export const EXTERNAL_SOURCE_CONTRACTS: ExternalSourceContract[] = [
  {
    source: 'kartverket',
    verifiedOn: '2026-06-04',
    officialDocs: [
      'https://ws.geonorge.no/adresser/v1/',
      'https://api.kartverket.no/stedsnavn/v1/openapi.json',
      'https://api.kartverket.no/kommuneinfo/v1/openapi.json',
    ],
    enabledEndpoints: [
      'https://ws.geonorge.no/adresser/v1/sok',
      'https://api.kartverket.no/stedsnavn/v1/navn',
      'https://api.kartverket.no/kommuneinfo/v1/sok',
      'https://api.kartverket.no/kommuneinfo/v1/punkt',
    ],
    deferredCapabilities: [],
  },
  {
    source: 'met',
    verifiedOn: '2026-06-04',
    officialDocs: [
      'https://api.met.no/doc/GettingStarted',
      'https://api.met.no/weatherapi/locationforecast/2.0/documentation',
      'https://api.met.no/weatherapi/metalerts/2.0/documentation',
      'https://api.met.no/weatherapi/nowcast/2.0/documentation',
    ],
    enabledEndpoints: [
      'https://api.met.no/weatherapi/locationforecast/2.0/compact',
      'https://api.met.no/weatherapi/metalerts/2.0/current.json',
    ],
    deferredCapabilities: [
      {
        id: 'met-nowcast',
        status: 'deferred',
        reason: 'Official Nowcast is public and useful for immediate precipitation in Nordic/radar coverage, but this MVP has no target-location refresh workflow and must avoid 5-minute polling/rate-limit pressure until a user-initiated UX exists.',
        evidenceUrls: ['https://api.met.no/weatherapi/nowcast/2.0/documentation'],
      },
    ],
  },
  {
    source: 'nve',
    verifiedOn: '2026-06-04',
    officialDocs: [
      'https://api.nve.no/doc/flomvarsling/',
      'https://api.nve.no/doc/jordskredvarsling/',
      'https://github.com/NVE/python-varsom-avalanche-client',
    ],
    enabledEndpoints: [
      'https://api01.nve.no/hydrology/forecast/flood/v1.0.10/api/Warning/Municipality/{Kommunenummer}/{Språknøkkel}/{Start}/{Slutt}',
      'https://api01.nve.no/hydrology/forecast/landslide/v1.0.10/api/Warning/Municipality/{Kommunenummer}/{Språknøkkel}/{Start}/{Slutt}',
    ],
    deferredCapabilities: [
      {
        id: 'nve-avalanche',
        status: 'pending-verification',
        reason: 'NVE GitHub documents an avalanche forecast API, but attempted live base/API URLs returned 404 on 2026-06-04; the app must not make unsupported avalanche fetches until a live official endpoint is verified.',
        evidenceUrls: ['https://github.com/NVE/python-varsom-avalanche-client'],
      },
    ],
  },
];

export function getExternalSourceContract(source: ContextSource) {
  return EXTERNAL_SOURCE_CONTRACTS.find((contract) => contract.source === source);
}

export function getMetNowcastSupport() {
  return getExternalSourceContract('met')?.deferredCapabilities.find((capability) => capability.id === 'met-nowcast');
}

export function getNveAvalancheSupport() {
  return getExternalSourceContract('nve')?.deferredCapabilities.find((capability) => capability.id === 'nve-avalanche');
}
