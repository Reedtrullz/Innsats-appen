import { EXTERNAL_SOURCE_CONTRACTS, getMetNowcastSupport, getNveAvalancheSupport } from '@/lib/integrations/source-contracts';

it('documents verified public external source contracts and disabled capabilities', () => {
  expect(EXTERNAL_SOURCE_CONTRACTS.map((contract) => contract.source)).toEqual(['kartverket', 'met', 'nve']);
  expect(EXTERNAL_SOURCE_CONTRACTS.every((contract) => contract.verifiedOn === '2026-06-04')).toBe(true);
  expect(EXTERNAL_SOURCE_CONTRACTS.find((contract) => contract.source === 'kartverket')?.enabledEndpoints).toEqual(expect.arrayContaining([
    'https://ws.geonorge.no/adresser/v1/sok',
    'https://api.kartverket.no/stedsnavn/v1/navn',
    'https://api.kartverket.no/kommuneinfo/v1/punkt',
  ]));
  expect(EXTERNAL_SOURCE_CONTRACTS.find((contract) => contract.source === 'met')?.enabledEndpoints).toEqual(expect.arrayContaining([
    'https://api.met.no/weatherapi/locationforecast/2.0/compact',
    'https://api.met.no/weatherapi/metalerts/2.0/current.json',
  ]));
  expect(EXTERNAL_SOURCE_CONTRACTS.find((contract) => contract.source === 'nve')?.enabledEndpoints).toEqual(expect.arrayContaining([
    'https://api01.nve.no/hydrology/forecast/flood/v1.0.10/api/Warning/Municipality/{Kommunenummer}/{Språknøkkel}/{Start}/{Slutt}',
    'https://api01.nve.no/hydrology/forecast/landslide/v1.0.10/api/Warning/Municipality/{Kommunenummer}/{Språknøkkel}/{Start}/{Slutt}',
  ]));
  expect(getMetNowcastSupport()?.status).toBe('deferred');
  expect(getNveAvalancheSupport()?.status).toBe('pending-verification');
});
