import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { SW_MESSAGE_TYPES } from '@/lib/offline/service-worker-metadata';

type Listener = (...args: unknown[]) => void;

function makeServiceWorkerTestDouble() {
  const waiting = { postMessage: vi.fn() };
  const active = { postMessage: vi.fn() };
  const registrationListeners = new Map<string, Listener[]>();
  const containerListeners = new Map<string, Listener[]>();
  const registration = {
    waiting,
    active,
    installing: null,
    addEventListener: (name: string, listener: Listener) => {
      registrationListeners.set(name, [...(registrationListeners.get(name) ?? []), listener]);
    },
    removeEventListener: vi.fn(),
  };
  const serviceWorker = {
    controller: active,
    ready: Promise.resolve(registration),
    register: vi.fn(async () => registration),
    addEventListener: (name: string, listener: Listener) => {
      containerListeners.set(name, [...(containerListeners.get(name) ?? []), listener]);
    },
    removeEventListener: vi.fn(),
    dispatchMessage: (data: unknown) => {
      for (const listener of containerListeners.get('message') ?? []) listener({ data });
    },
  };
  return { serviceWorker, registration, waiting, active };
}

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
});

describe('ServiceWorkerRegistration', () => {
  it('shows a non-blocking update banner and sends SKIP_WAITING to the waiting worker', async () => {
    const sw = makeServiceWorkerTestDouble();
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw.serviceWorker });
    await act(async () => {
      render(<ServiceWorkerRegistration />);
    });

    await expect.poll(() => sw.serviceWorker.register.mock.calls.length).toBe(1);
    expect(await screen.findByText(/Ny offline-versjon klar/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Oppdater cache/i }));

    expect(sw.waiting.postMessage).toHaveBeenCalledWith({ type: SW_MESSAGE_TYPES.skipWaiting });
  });

  it('renders neutral markup when service workers are unsupported', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: undefined });
    const { container } = render(<ServiceWorkerRegistration />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
