const nbDateTime = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short' });
const nbDate = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium' });

function parse(value: string | number | Date | undefined | null): Date | null {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format an ISO timestamp as a Norwegian date + time for end users.
 * Returns the original value unchanged when it is not a parseable date
 * (e.g. sentinel strings like "ukjent" / "offline-fallback").
 */
export function formatNbDateTime(value: string | number | Date | undefined | null): string {
  const date = parse(value);
  if (!date) return typeof value === 'string' ? value : '';
  return nbDateTime.format(date);
}

/** Format an ISO timestamp as a Norwegian date (no time) for end users. */
export function formatNbDate(value: string | number | Date | undefined | null): string {
  const date = parse(value);
  if (!date) return typeof value === 'string' ? value : '';
  return nbDate.format(date);
}
