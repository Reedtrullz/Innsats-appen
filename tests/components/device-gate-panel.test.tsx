import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DeviceGatePanel } from '@/components/device-gate-panel';
import { CHECK_DEFS, DEVICE_GATE_PENDING_DETAIL, DEVICE_GATE_STORAGE_KEY, initialDeviceGateChecks } from '@/lib/release/device-gate';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

it('builds a deterministic pending device-gate state for the first render', () => {
  expect(initialDeviceGateChecks()).toEqual(CHECK_DEFS.map((def) => ({
    ...def,
    autoDetected: 'skip',
    manualConfirmed: false,
    detail: DEVICE_GATE_PENDING_DETAIL,
  })));
});

it('hydrates persisted manual confirmations and SHA after mount', async () => {
  localStorage.setItem(DEVICE_GATE_STORAGE_KEY, JSON.stringify({
    sha: 'persisted-sha',
    manualConfirmed: { 'pin-set': true },
  }));
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ version: 'abc1234' }),
  })) as unknown as typeof fetch;

  render(<DeviceGatePanel />);

  await waitFor(() => expect(screen.getByText('SHA: abc1234')).toBeInTheDocument());
  const pinSetArticle = screen.getByRole('heading', { name: /PIN er satt/i }).closest('article');
  expect(pinSetArticle).not.toBeNull();
  expect(pinSetArticle!.querySelector('input[type="checkbox"]')).toBeChecked();
});
