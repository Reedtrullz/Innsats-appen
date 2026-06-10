'use client';

import { useEffect, useState } from 'react';
import {
  SW_CACHE_NAME,
  SW_CACHE_VERSION,
  SW_MESSAGE_TYPES,
  parseServiceWorkerClientMessage,
  shortOfflineVersion,
  type ServiceWorkerStatusPayload,
} from '@/lib/offline/service-worker-metadata';

type BrowserSWRegistration = Awaited<ReturnType<ServiceWorkerContainer['register']>>;

type UpdateState = {
  registration?: BrowserSWRegistration;
  updateAvailable: boolean;
  cacheVersion: string;
  installing: boolean;
};

let registrationPromise: Promise<BrowserSWRegistration | undefined> | undefined;
let reloadRequestedForWaitingWorker = false;
let reloadingForControllerChange = false;

export async function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return undefined;
  const serviceWorker = navigator.serviceWorker;
  registrationPromise ??= serviceWorker.register('/sw.js')
    .then(async (registration) => {
      await serviceWorker.ready;
      return registration;
    })
    .catch((error) => {
      registrationPromise = undefined;
      throw error;
    });
  return registrationPromise;
}

export function requestServiceWorkerStatus(registration?: BrowserSWRegistration) {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return;
  const serviceWorker = navigator.serviceWorker;
  const message = { type: SW_MESSAGE_TYPES.getStatus };
  serviceWorker.controller?.postMessage(message);
  registration?.active?.postMessage(message);
}

function statusFromPayload(payload: ServiceWorkerStatusPayload) {
  return `${payload.cacheVersion} · ${payload.state}`;
}

export function ServiceWorkerRegistration() {
  const [state, setState] = useState<UpdateState>({
    updateAvailable: false,
    cacheVersion: SW_CACHE_VERSION,
    installing: false,
  });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) return undefined;
    const serviceWorker = navigator.serviceWorker;
    let mounted = true;

    const markWaiting = (registration: BrowserSWRegistration) => {
      if (!mounted) return;
      setState((current) => ({ ...current, registration, updateAvailable: true, installing: false }));
    };

    const onControllerChange = () => {
      if (!reloadRequestedForWaitingWorker || reloadingForControllerChange) return;
      reloadingForControllerChange = true;
      window.location.reload();
    };

    const onMessage = (event: MessageEvent) => {
      const parsed = parseServiceWorkerClientMessage(event.data);
      if (!parsed) return;
      if (parsed.type === SW_MESSAGE_TYPES.status) {
        setState((current) => ({ ...current, cacheVersion: parsed.payload.cacheVersion }));
        setMessage(`Offline-cache ${statusFromPayload(parsed.payload)}`);
      }
      if (parsed.type === SW_MESSAGE_TYPES.cacheFallback || parsed.type === SW_MESSAGE_TYPES.generatedFallback) {
        setMessage(`Bruker cache/fallback for offline-innhold (${parsed.payload.cacheVersion}).`);
      }
    };

    serviceWorker.addEventListener('controllerchange', onControllerChange);
    serviceWorker.addEventListener('message', onMessage);

    registerServiceWorker()
      .then((registration) => {
        if (!mounted || !registration) return;
        setState((current) => ({ ...current, registration, cacheVersion: SW_CACHE_VERSION }));
        if (registration.waiting && serviceWorker.controller) markWaiting(registration);

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          setState((current) => ({ ...current, registration, installing: true }));
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && serviceWorker.controller) markWaiting(registration);
            if (installingWorker.state === 'activated') {
              setState((current) => ({ ...current, registration, installing: false, updateAvailable: false }));
              requestServiceWorkerStatus(registration);
            }
          });
        });
        requestServiceWorkerStatus(registration);
      })
      .catch(() => setMessage('Offline-lagring kunne ikke startes. Appen virker fortsatt når nett er tilgjengelig.'));

    return () => {
      mounted = false;
      serviceWorker.removeEventListener('controllerchange', onControllerChange);
      serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  if (!state.updateAvailable) return null;

  const activateUpdate = () => {
    reloadRequestedForWaitingWorker = true;
    state.registration?.waiting?.postMessage({ type: SW_MESSAGE_TYPES.skipWaiting });
    setMessage('Oppdaterer offline-cache …');
  };

  return (
    <div className="fixed inset-x-3 top-3 z-50 mx-auto max-w-3xl rounded-2xl border border-sky-200 bg-white p-3 text-sm font-semibold text-slate-900 shadow-xl" role="status" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black">Ny offline-versjon klar</p>
          <p className="text-xs text-slate-600">
            Aktiv lokal versjon {shortOfflineVersion(state.cacheVersion || SW_CACHE_NAME)}. Oppdaterer bare appens offline-kopi på denne enheten.
          </p>
          {message ? <p className="mt-1 text-xs text-slate-600">{message}</p> : null}
        </div>
        <button type="button" onClick={activateUpdate} className="min-h-12 rounded-xl bg-sky-700 px-4 py-2 text-sm font-black text-white">
          Oppdater offline-kopi
        </button>
      </div>
    </div>
  );
}
