import {
  classifySourceHealth,
  recordSourceFailure,
  recordSourceSuccess,
  staleLastSuccessfulSignals,
} from '@/lib/integrations/source-health';
import type { ExternalContextSignal } from '@/lib/integrations/types';

const signal: ExternalContextSignal = {
  source: 'met',
  kind: 'weather',
  severity: 'info',
  title: 'Vær',
  summary: 'OK',
  validFrom: null,
  validTo: null,
  fetchedAt: '2026-06-02T20:00:00.000Z',
  staleness: 'fresh',
  upstreamHash: 'abc123',
  rawRef: 'met:locationforecast',
};

it('success updates lastSuccessAt and clears previous errors', () => {
  const success = recordSourceSuccess(
    { source: 'met', lastErrorAt: '2026-06-02T19:00:00.000Z', lastError: 'old error', lastSuccessfulSignals: [] },
    [signal],
    '2026-06-02T20:00:00.000Z',
  );
  expect(success.lastSuccessAt).toBe('2026-06-02T20:00:00.000Z');
  expect(success.lastErrorAt).toBeUndefined();
  expect(success.lastError).toBeUndefined();
  expect(success.lastSuccessfulSignals).toHaveLength(1);
});

it('failure records the error but keeps last successful signals', () => {
  const success = recordSourceSuccess({ source: 'met', lastSuccessfulSignals: [] }, [signal], '2026-06-02T20:00:00.000Z');
  const failed = recordSourceFailure(success, 'downstream failed', '2026-06-02T20:10:00.000Z');
  expect(failed.lastSuccessfulSignals).toEqual([signal]);
  expect(failed.lastErrorAt).toBe('2026-06-02T20:10:00.000Z');
  expect(failed.lastError).toBe('downstream failed');
});

it('classifies stale by configured max age and exposes stored signals as stale', () => {
  const success = recordSourceSuccess({ source: 'met', lastSuccessfulSignals: [] }, [signal], '2026-06-02T20:00:00.000Z');
  expect(classifySourceHealth(success, '2026-06-02T20:00:30.000Z', 60_000).staleness).toBe('fresh');
  expect(classifySourceHealth(success, '2026-06-02T20:02:00.000Z', 60_000).staleness).toBe('stale');
  expect(classifySourceHealth({ source: 'met', lastSuccessfulSignals: [] }, '2026-06-02T20:02:00.000Z').staleness).toBe('unavailable');
  expect(staleLastSuccessfulSignals(success)[0]?.staleness).toBe('stale');
});
