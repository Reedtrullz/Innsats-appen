import type { MustReadNotice } from './schemas';

export const MUST_READ_ACKNOWLEDGEMENT_KEY = 'beredskapsboka-must-read-ack-v1';

type Acknowledgements = Record<string, string>;
type MustReadIdentity = Pick<MustReadNotice, 'id' | 'changedAt' | 'severity'>;

function storage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function mustReadAcknowledgementSnapshot(): string {
  try {
    return storage()?.getItem(MUST_READ_ACKNOWLEDGEMENT_KEY) ?? '{}';
  } catch {
    return '{}';
  }
}

export function parseMustReadAcknowledgements(snapshot: string): Acknowledgements {
  try {
    const value = JSON.parse(snapshot);
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Acknowledgements : {};
  } catch {
    return {};
  }
}

export function unacknowledgedCriticalNotices(notices: MustReadIdentity[], snapshot: string) {
  const acknowledged = parseMustReadAcknowledgements(snapshot);
  return notices.filter((notice) => notice.severity === 'critical' && acknowledged[notice.id] !== notice.changedAt);
}

export function acknowledgeMustReadNotice(notice: Pick<MustReadNotice, 'id' | 'changedAt'>) {
  const next = { ...parseMustReadAcknowledgements(mustReadAcknowledgementSnapshot()), [notice.id]: notice.changedAt };
  try {
    storage()?.setItem(MUST_READ_ACKNOWLEDGEMENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('beredskapsboka-must-read-change'));
  } catch {
    // Acknowledgement is a local convenience; content remains available.
  }
}

export function subscribeMustReadAcknowledgements(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === MUST_READ_ACKNOWLEDGEMENT_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('beredskapsboka-must-read-change', listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('beredskapsboka-must-read-change', listener);
  };
}
