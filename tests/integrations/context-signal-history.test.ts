import { appendExternalContextSignalHistory } from '@/lib/mission/context-signal-history';
import type { ExternalContextSignal, MissionContext } from '@/lib/mission/schemas';

const signal = (title: string, fetchedAt: string): ExternalContextSignal => ({
  source: 'met',
  kind: 'weather',
  severity: 'info',
  title,
  summary: 'OK',
  validFrom: null,
  validTo: null,
  fetchedAt,
  staleness: 'fresh',
  upstreamHash: title,
  rawRef: 'met:locationforecast',
});

const mission: MissionContext = {
  id: 'm-history',
  title: 'Historikk',
  createdAt: '2026-06-04T08:00:00.000Z',
  updatedAt: '2026-06-04T08:00:00.000Z',
  phase: 'under',
  role: 'lagforer',
  scenario: 'generelt',
  locationText: 'Trondheim',
  externalSignals: [],
  externalSignalHistory: [],
  activeChecklistIds: [],
  notes: '',
  tasks: [],
  statusLog: [],
  resourceRequests: [],
  fieldLogEntries: [],
  ruhReports: [],
  welfareChecks: [],
  contentVersion: 'test-v1',
  schemaVersion: 1,
};

it('keeps per-mission external context signal history as stale sanitized entries', () => {
  const first = appendExternalContextSignalHistory(mission, [signal('Første', '2026-06-04T08:00:00.000Z')]);
  const second = appendExternalContextSignalHistory(first, [signal('Andre', '2026-06-04T09:00:00.000Z')]);
  expect(second.externalSignals.map((item) => item.title)).toEqual(['Andre']);
  expect(second.externalSignalHistory.map((item) => item.title)).toEqual(['Andre', 'Første']);
  expect(second.externalSignalHistory.every((item) => item.staleness === 'stale')).toBe(true);
  expect(second.externalSignalHistory.some((item: any) => item.rawPayload || item.steps)).toBe(false);
});

it('deduplicates repeated upstream context by stable identity instead of fetch time', () => {
  const first = appendExternalContextSignalHistory(mission, [{ ...signal('Regn', '2026-06-04T08:00:00.000Z'), upstreamId: 'alert-1', upstreamHash: 'hash-1' }]);
  const second = appendExternalContextSignalHistory(first, [{ ...signal('Regn oppdatert', '2026-06-04T09:00:00.000Z'), upstreamId: 'alert-1', upstreamHash: 'hash-1' }]);
  expect(second.externalSignalHistory.map((item) => item.title)).toEqual(['Regn oppdatert']);
  expect(second.externalSignalHistory).toHaveLength(1);
});
