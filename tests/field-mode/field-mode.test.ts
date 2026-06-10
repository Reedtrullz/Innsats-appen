import { describe, expect, it, vi } from 'vitest';
import {
  FIELD_TESTING_PROCESS,
  GLOVE_TOUCH_TARGET_PX,
  MIN_TOUCH_TARGET_PX,
  QUICK_ACTIONS,
  VOICE_INPUT_EVALUATION,
  appendFieldFeedbackEntry,
  createFieldFeedbackEntry,
  hasWebSpeechRecognitionSupport,
  normalizeFieldModeSettings,
  parseFieldFeedbackEntries,
  parseFieldModeSettings,
  readFieldFeedbackEntries,
  readFieldModeSettings,
  sanitizeFieldFeedbackText,
  serializeFieldModeSettings,
  writeFieldModeSettings,
} from '@/lib/field-mode/field-mode';

describe('field mode helpers', () => {
  it('normalizes local settings and rejects invalid theme values', () => {
    expect(normalizeFieldModeSettings({ enabled: true, gloveMode: true, theme: 'night', outdoorReadabilityReviewed: true })).toEqual({
      enabled: true,
      gloveMode: true,
      theme: 'night',
      outdoorReadabilityReviewed: true,
    });
    expect(normalizeFieldModeSettings({ enabled: 'yes', gloveMode: 1, theme: 'blue' })).toEqual({
      enabled: false,
      gloveMode: false,
      theme: 'day',
      outdoorReadabilityReviewed: false,
    });
  });

  it('round-trips persisted settings safely', () => {
    const serialized = serializeFieldModeSettings({ enabled: true, gloveMode: false, theme: 'reduced-blue', outdoorReadabilityReviewed: true });
    expect(parseFieldModeSettings(serialized)).toEqual({ enabled: true, gloveMode: false, theme: 'reduced-blue', outdoorReadabilityReviewed: true });
    expect(parseFieldModeSettings('{broken')).toEqual({ enabled: false, gloveMode: false, theme: 'day', outdoorReadabilityReviewed: false });
  });

  it('does not crash when local storage is unavailable or full', () => {
    const throwingStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); },
    } as unknown as Storage;
    const entry = createFieldFeedbackEntry({ observations: 'Hansker fungerte' }, new Date('2026-06-04T10:00:00.000Z'), 'safe-entry');

    expect(readFieldModeSettings(throwingStorage)).toEqual({ enabled: false, gloveMode: false, theme: 'day', outdoorReadabilityReviewed: false });
    expect(() => writeFieldModeSettings({ enabled: true, gloveMode: true, theme: 'night', outdoorReadabilityReviewed: true }, throwingStorage)).not.toThrow();
    expect(readFieldFeedbackEntries(throwingStorage)).toEqual([]);
    expect(appendFieldFeedbackEntry(entry, throwingStorage)).toEqual([entry]);
  });

  it('does not crash when the browser localStorage accessor itself throws', () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const blockedGetter = vi.fn(() => { throw new Error('SecurityError'); });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: blockedGetter });
    const entry = createFieldFeedbackEntry({ observations: 'Offline test' }, new Date('2026-06-04T10:00:00.000Z'), 'blocked-browser-storage');

    try {
      expect(readFieldModeSettings()).toEqual({ enabled: false, gloveMode: false, theme: 'day', outdoorReadabilityReviewed: false });
      expect(() => writeFieldModeSettings({ enabled: true, gloveMode: true, theme: 'night', outdoorReadabilityReviewed: true })).not.toThrow();
      expect(readFieldFeedbackEntries()).toEqual([]);
      expect(appendFieldFeedbackEntry(entry)).toEqual([entry]);
      expect(blockedGetter).toHaveBeenCalled();
    } finally {
      if (originalDescriptor) Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    }
  });

  it('keeps field touch targets at or above 48 px and glove targets larger', () => {
    expect(MIN_TOUCH_TARGET_PX).toBeGreaterThanOrEqual(48);
    expect(GLOVE_TOUCH_TARGET_PX).toBeGreaterThan(MIN_TOUCH_TARGET_PX);
  });

  it('documents Web Speech API support limits and fallback-only voice input', () => {
    expect(hasWebSpeechRecognitionSupport({ SpeechRecognition: function TestSpeech() {} })).toBe(true);
    expect(hasWebSpeechRecognitionSupport({ webkitSpeechRecognition: function WebkitSpeech() {} })).toBe(true);
    expect(hasWebSpeechRecognitionSupport({})).toBe(false);
    expect(VOICE_INPUT_EVALUATION.decision).toBe('optional-deferred-fallback-only');
    expect(VOICE_INPUT_EVALUATION.noRecordingUploadByApp).toBe(true);
    expect(VOICE_INPUT_EVALUATION.accuracyWarning).toMatch(/feiltolke/i);
    expect(VOICE_INPUT_EVALUATION.privacyWarning).toMatch(/laster ikke opp opptak/i);
    expect(VOICE_INPUT_EVALUATION.fallback).toMatch(/fallback/i);
  });

  it('sanitizes local-only field feedback and caps stored entries', () => {
    const sanitized = sanitizeFieldFeedbackText('Ring 99999999 eller test@example.com om pasient og journal\n', 200);
    expect(sanitized).toContain('[fjernet telefon]');
    expect(sanitized).toContain('[fjernet e-post]');
    expect(sanitized).toContain('[fjernet sensitivt ord]');

    const entry = createFieldFeedbackEntry({ conditions: 'Hansker', observations: 'Store knapper fungerte', blockers: 'Små lenker', suggestedChange: 'Mer kontrast' }, new Date('2026-06-04T10:00:00.000Z'), 'field-test');
    expect(entry).toMatchObject({ id: 'field-test', conditions: 'Hansker', observations: 'Store knapper fungerte' });

    const many = Array.from({ length: 30 }, (_, index) => ({ ...entry, id: `entry-${index}`, createdAt: `2026-06-04T10:${String(index).padStart(2, '0')}:00.000Z` }));
    expect(parseFieldFeedbackEntries(JSON.stringify(many))).toHaveLength(25);

    const valid = { ...entry, id: 'valid-entry', createdAt: '2026-06-04T11:00:00.000Z' };
    const invalid = { ...entry, id: 'invalid-entry', createdAt: 'not-a-date' };
    expect(parseFieldFeedbackEntries(JSON.stringify([invalid, valid]))).toEqual([valid]);
  });


  it('prioritizes map and quick-log actions for active field use', () => {
    expect(QUICK_ACTIONS.slice(0, 3).map((action) => action.id)).toEqual(['map', 'quick-log', 'active-mission']);
    expect(QUICK_ACTIONS.find((action) => action.id === 'map')).toMatchObject({ href: '/kart', label: 'Kart' });
    expect(QUICK_ACTIONS.find((action) => action.id === 'quick-log')).toMatchObject({ href: '/oppdrag#hurtiglogg', label: 'Hurtiglogg' });
  });

  it('defines field test process and all required quick actions as local routes', () => {
    expect(FIELD_TESTING_PROCESS.steps.join(' ')).toMatch(/mannskap/i);
    expect(FIELD_TESTING_PROCESS.localOnlyScope).toMatch(/sender ikke inn data/i);
    expect(FIELD_TESTING_PROCESS.localOnlyScope).toMatch(/oppretter ikke personregister/i);
    expect(QUICK_ACTIONS.map((action) => action.id)).toEqual(['map', 'quick-log', 'active-mission', 'run-checklist', 'five-point-order', 'comms-plan', 'export-status', 'search']);
    expect(QUICK_ACTIONS.every((action) => action.href.startsWith('/'))).toBe(true);
    expect(QUICK_ACTIONS.find((action) => action.id === 'five-point-order')?.href).toContain('5-punktsordre');
    expect(QUICK_ACTIONS.find((action) => action.id === 'comms-plan')?.href).toContain('sambandsplan');
  });
});
