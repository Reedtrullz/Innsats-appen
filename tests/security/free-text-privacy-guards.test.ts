import { describe, expect, it } from 'vitest';
import {
  assertNoSensitiveOperationalText,
  assertNoSensitiveOperationalTextInValue,
  detectSensitiveOperationalText,
} from '@/lib/privacy/sensitive-text';

describe('sensitive operational free-text guards', () => {
  it.each(['fødselsnummer 01017012345', 'pasient Ola Nordmann', 'Pasient Ola Nordmann', 'Patient John Doe', 'skjermet tilfluktsrom adresse'])(
    'rejects sensitive free text: %s',
    (text) => {
      expect(() => assertNoSensitiveOperationalText(text, 'fieldLog.text')).toThrow(/persondata|pasientdata|skjermet/i);
    },
  );

  it.each([
    'Observasjon uten persondata',
    'Ikke legg inn persondata',
    'Skjematisk punkt 22,33',
    'Pasientdata skal rapporteres i ordinært system',
    'pasient skal rapporteres i ordinært system',
    'patient status updated',
    'pasient med behov for bistand',
    'Ikke registrer navn, ID, pasientdata eller persondata',
    'Ikke legg inn navn, ID, pasient-/helseopplysninger, sensitive private lokasjoner eller skjermet operativ informasjon.',
  ])('allows safe warning or operational phrase: %s', (text) => {
    expect(detectSensitiveOperationalText(text)).toBeNull();
    expect(() => assertNoSensitiveOperationalText(text, 'safe.copy')).not.toThrow();
  });

  it('reports recursive context labels without echoing full sensitive input', () => {
    const sensitiveText = 'fødselsnummer 01017012345';

    expect(() => assertNoSensitiveOperationalTextInValue({ mission: { notes: sensitiveText } }, 'localImport'))
      .toThrow(/localImport\.mission\.notes/i);
    expect(() => assertNoSensitiveOperationalTextInValue({ mission: { notes: sensitiveText } }, 'localImport'))
      .toThrow(/persondata|pasientdata|skjermet|private-location/i);
    expect(() => assertNoSensitiveOperationalTextInValue({ mission: { notes: sensitiveText } }, 'localImport'))
      .not.toThrow(sensitiveText);
  });
});
