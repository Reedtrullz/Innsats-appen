import { describe, expect, it } from 'vitest';
import {
  SENSITIVE_TEXT_EXPLANATIONS,
  SensitiveTextError,
  assertNoSensitiveOperationalText,
  assertNoSensitiveOperationalTextInValue,
  detectSensitiveOperationalText,
  findSensitiveOperationalTextInValue,
  sensitiveTextFieldError,
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

  it.each([
    ['valid fødselsnummer without keyword', '01017000027'],
    ['valid D-number without keyword', '41017000010'],
    ['phone number with operational note', '+47 987 65 432 observert ved møteplass'],
    ['email address in local note', 'kontakt ola.nordmann@example.com'],
  ])('rejects high-confidence personal/contact data: %s', (_label, text) => {
    expect(detectSensitiveOperationalText(text)).not.toBeNull();
    expect(() => assertNoSensitiveOperationalText(text, 'fieldLog.text')).toThrow(/persondata|pasientdata|private|kontakt|identifikator/i);
  });

  it.each(['Objekt 010170 uten komplett identifikator', 'Kanal 12 status ok', 'Skjematisk punkt 10,20'])(
    'still allows safe operational shorthand: %s',
    (text) => {
      expect(detectSensitiveOperationalText(text)).toBeNull();
    },
  );

  it('exposes the matched category and field path for field-anchored UI errors', () => {
    const found = findSensitiveOperationalTextInValue(
      { mission: { notes: 'fødselsnummer 01017012345' } },
      'localImport',
    );
    expect(found).toEqual({ context: 'localImport.mission.notes', kind: 'national-id' });
    expect(findSensitiveOperationalTextInValue({ notes: 'Observasjon uten persondata' })).toBeNull();

    try {
      assertNoSensitiveOperationalText('pasient Ola Nordmann', 'fieldLog.text');
      expect.unreachable('expected SensitiveTextError');
    } catch (error) {
      expect(error).toBeInstanceOf(SensitiveTextError);
      expect((error as SensitiveTextError).kind).toBe('patient-reference');
      expect((error as SensitiveTextError).context).toBe('fieldLog.text');
    }
  });

  it('keeps the persondata-class invariant words in every field-level explanation', () => {
    for (const kind of Object.keys(SENSITIVE_TEXT_EXPLANATIONS) as (keyof typeof SENSITIVE_TEXT_EXPLANATIONS)[]) {
      const message = sensitiveTextFieldError(kind);
      // UI alerts built from these must keep matching the privacy-boundary
      // regex used across component tests.
      expect(message).toMatch(/persondata|pasientdata|skjermet/i);
      // The explanation itself must not trip the detector when displayed
      // alongside user input or persisted in an audit log.
      expect(detectSensitiveOperationalText(message)).toBeNull();
    }
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
