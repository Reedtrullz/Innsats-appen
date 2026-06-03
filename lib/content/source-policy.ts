const baseSensitiveFieldNames = [
  'privateTilfluktsromLocations',
  'privateTilfluktsromList',
  'privateShelterLocations',
  'privateShelterList',
  'skjermedeTilfluktsrom',
  'skjermetTilfluktsromListe',
  'restrictedShelterLocations',
  'shelterCoordinates',
  'shelterAddress',
  'patient',
  'patientName',
  'patientId',
  'patientNotes',
  'medicalRecord',
  'medicalRecordNumber',
  'journalNumber',
  'personnummer',
  'fødselsnummer',
  'fødselsnr',
  'fodselsnummer',
  'fodselsnr',
  'fnr',
  'dNumber',
  'dnummer',
  'nationalId',
  'national_id',
  'personalNumber',
  'ssn',
  'phoneNumber',
  'emailAddress',
  'teamTracking',
  'liveTracking',
  'live_tracking',
  'trackingDeviceId',
  'tracking_device_id',
  'gpsTrack',
  'gpsTrail',
  'currentPosition',
  'deviceId',
  'upstream',
  'url',
] as const;

export const sensitiveFieldNames = [...baseSensitiveFieldNames] as const;

function normalizeNorwegianKey(key: string): string {
  return key
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'o')
    .replace(/å/g, 'a')
    .replace(/Å/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const normalizedSensitiveFieldNames = new Set((sensitiveFieldNames as readonly string[]).map(normalizeNorwegianKey));

export function containsSensitiveStructuredKey(value: unknown): string[] {
  const found = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (normalizedSensitiveFieldNames.has(normalizeNorwegianKey(key))) found.add(key);
      walk(child);
    }
  };
  walk(value);
  return [...found];
}
