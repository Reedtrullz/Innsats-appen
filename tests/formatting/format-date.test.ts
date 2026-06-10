import { expect, it } from 'vitest';
import { formatNbDate, formatNbDateTime } from '@/lib/formatting/format-date';

it('formats an ISO timestamp as a Norwegian date and time, not a raw ISO string', () => {
  const formatted = formatNbDateTime('2026-06-10T13:39:51.568Z');
  expect(formatted).not.toContain('T');
  expect(formatted).not.toContain('Z');
  expect(formatted).toMatch(/2026/);
});

it('formats date-only without a time component', () => {
  const formatted = formatNbDate('2026-06-10T13:39:51.568Z');
  expect(formatted).toMatch(/2026/);
  expect(formatted).not.toMatch(/\d{2}:\d{2}/);
});

it('returns sentinel/non-date strings unchanged instead of "Invalid Date"', () => {
  expect(formatNbDateTime('offline-fallback')).toBe('offline-fallback');
  expect(formatNbDateTime('ukjent')).toBe('ukjent');
  expect(formatNbDateTime(undefined)).toBe('');
  expect(formatNbDateTime('')).toBe('');
});
