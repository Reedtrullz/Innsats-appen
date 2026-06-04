import { vi } from 'vitest';
import { fetchMetSignals } from '@/lib/integrations/met';
import { fetchNveHazardSignals } from '@/lib/integrations/nve';

function failIfNotRejected<T>(promise: Promise<T>, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(message)), 150);
    }),
  ]);
}

it('times out MET locationforecast when upstream never resolves', async () => {
  let capturedSignal: AbortSignal | undefined;
  const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
    if (_url.includes('locationforecast')) capturedSignal = init?.signal as AbortSignal | undefined;
    return new Promise<Response>(() => undefined);
  });

  await expect(failIfNotRejected(
    fetchMetSignals({
      lat: 63,
      lon: 10,
      userAgent: 'Beredskapsboka/0.1 ops@example.invalid',
      fetchImpl,
      timeoutMs: 10,
    }),
    'MET timeout helper did not reject',
  )).rejects.toThrow(/timed out|aborted/i);
  expect(capturedSignal?.aborted).toBe(true);
});

it('times out NVE hazard fetch when upstream never resolves', async () => {
  let capturedSignal: AbortSignal | undefined;
  const fetchImpl = vi.fn((_url: string, init?: RequestInit) => {
    if (_url.includes('/flood/')) capturedSignal = init?.signal as AbortSignal | undefined;
    return new Promise<Response>(() => undefined);
  });

  await expect(failIfNotRejected(
    fetchNveHazardSignals({
      municipality: '5001',
      start: '2026-06-02',
      end: '2026-06-03',
      fetchImpl,
      timeoutMs: 10,
    }),
    'NVE timeout helper did not reject',
  )).rejects.toThrow(/timed out|aborted/i);
  expect(capturedSignal?.aborted).toBe(true);
});
