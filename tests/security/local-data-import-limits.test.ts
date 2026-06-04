import { expect, it, vi } from 'vitest';
import { FIELD_MODE_STORAGE_KEY } from '@/lib/field-mode/field-mode';
import {
  LOCAL_DATA_EXPORT_KIND,
  MAX_LOCAL_IMPORT_CHECKLIST_RUNS,
  MAX_LOCAL_IMPORT_DEPTH,
  MAX_LOCAL_IMPORT_MISSIONS,
  MAX_LOCAL_IMPORT_TEXT_CHARS,
  applyLocalDataImport,
  parseLocalDataImport,
} from '@/lib/local-data/local-data';

function currentExport(overrides: Record<string, unknown> = {}) {
  return {
    kind: LOCAL_DATA_EXPORT_KIND,
    exportVersion: 1,
    schemaVersion: 1,
    exportedAt: '2026-06-04T12:00:00.000Z',
    localStorage: {},
    indexedDb: { missions: [], checklistRuns: [] },
    ...overrides,
  };
}

function makeDeepObject(depth: number): unknown {
  let value: unknown = 'leaf';
  for (let index = 0; index < depth; index += 1) {
    value = { nested: value };
  }
  return value;
}

it('rejects oversized local-data import text before JSON.parse', () => {
  const parseSpy = vi.spyOn(JSON, 'parse');
  try {
    expect(() => parseLocalDataImport(' '.repeat(MAX_LOCAL_IMPORT_TEXT_CHARS + 1))).toThrow(/too large/i);
    expect(parseSpy).not.toHaveBeenCalled();
  } finally {
    parseSpy.mockRestore();
  }
});

it('rejects deeply nested local-data imports before normalization/application', () => {
  const text = JSON.stringify(currentExport({ extra: makeDeepObject(MAX_LOCAL_IMPORT_DEPTH + 1) }));

  expect(() => parseLocalDataImport(text)).toThrow(/too deep/i);
});

it('rejects deeply nested JSON inside allowlisted localStorage values before dangerous-field recursion', () => {
  const text = JSON.stringify(currentExport({
    localStorage: {
      [FIELD_MODE_STORAGE_KEY]: JSON.stringify(makeDeepObject(MAX_LOCAL_IMPORT_DEPTH + 1)),
    },
  }));

  expect(() => parseLocalDataImport(text)).toThrow(/too deep/i);
});

it('rejects local-data imports with too many missions before applying them', () => {
  const text = JSON.stringify(currentExport({
    indexedDb: {
      missions: Array.from({ length: MAX_LOCAL_IMPORT_MISSIONS + 1 }, () => ({})),
      checklistRuns: [],
    },
  }));

  expect(() => parseLocalDataImport(text)).toThrow(/too many missions/i);
});

it('rejects object local-data imports with too many missions before replacing local data', async () => {
  const replaceMissionData = vi.fn(async () => ({ missions: 0, checklistRuns: 0 }));

  await expect(applyLocalDataImport(currentExport({
    indexedDb: {
      missions: Array.from({ length: MAX_LOCAL_IMPORT_MISSIONS + 1 }, () => ({})),
      checklistRuns: [],
    },
  }) as unknown as Parameters<typeof applyLocalDataImport>[0], {
    confirmLocalOnly: true,
    confirmReplaceExistingLocalData: true,
    replaceMissionData,
  })).rejects.toThrow(/too many missions/i);
  expect(replaceMissionData).not.toHaveBeenCalled();
});

it('rejects local-data imports with too many checklist runs before applying them', () => {
  const text = JSON.stringify(currentExport({
    indexedDb: {
      missions: [],
      checklistRuns: Array.from({ length: MAX_LOCAL_IMPORT_CHECKLIST_RUNS + 1 }, () => ({})),
    },
  }));

  expect(() => parseLocalDataImport(text)).toThrow(/too many checklist runs/i);
});
