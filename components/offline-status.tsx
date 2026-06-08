'use client';

import { useEffect, useState } from 'react';

import {
  GENERATED_CONTENT_STALE_MS,
  SW_CACHE_NAME,
  SW_CACHE_VERSION,
  SW_MESSAGE_TYPES,
  isGeneratedContentStale,
  parseServiceWorkerClientMessage,
  shortOfflineVersion,
} from '@/lib/offline/service-worker-metadata';
import { registerServiceWorker, requestServiceWorkerStatus } from './service-worker-registration';

type OfflineStatusState = {
  online: boolean;
  ready: boolean;
  contentVersion: string;
  cacheVersion: string;
  staleGeneratedContent: boolean;
  fallbackGeneratedContent: boolean;
  lastFallbackUrl?: string;
};

function warningText(state: OfflineStatusState) {
  if (state.fallbackGeneratedContent) return 'Fallback for generert innhold er aktiv — kontroller mot gjeldende ordre når du er online.';
  if (state.staleGeneratedContent) return 'Stale innhold fra cache — kontroller mot gjeldende ordre når du er online.';
  return null;
}

export function OfflineStatus() {
  const [state, setState] = useState<OfflineStatusState>({
    online: true,
    ready: false,
    contentVersion: 'ukjent',
    cacheVersion: SW_CACHE_VERSION,
    staleGeneratedContent: false,
    fallbackGeneratedContent: false,
  });

  useEffect(() => {
    const updateOnline = () => setState((current) => ({ ...current, online: navigator.onLine }));
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    const onMessage = (event: MessageEvent) => {
      const parsed = parseServiceWorkerClientMessage(event.data);
      if (!parsed) return;
      if (parsed.type === SW_MESSAGE_TYPES.status) {
        setState((current) => ({ ...current, cacheVersion: parsed.payload.cacheVersion }));
        return;
      }
      setState((current) => ({
        ...current,
        cacheVersion: parsed.payload.cacheVersion,
        staleGeneratedContent: current.staleGeneratedContent || parsed.payload.generatedContent || parsed.payload.stale,
        fallbackGeneratedContent: current.fallbackGeneratedContent || parsed.type === SW_MESSAGE_TYPES.generatedFallback || parsed.payload.reason === 'missing-cache',
        lastFallbackUrl: parsed.payload.url,
      }));
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    registerServiceWorker()
      .then((registration) => {
        setState((current) => ({ ...current, ready: Boolean(registration) }));
        requestServiceWorkerStatus(registration);
      })
      .catch(() => setState((current) => ({ ...current, ready: false })));

    fetch('/generated-content/manifest.json')
      .then(async (res) => {
        const cacheFallback = res.headers.get('x-beredskapsboka-cache-fallback') === '1';
        const generatedFallback = res.headers.get('x-beredskapsboka-generated-fallback') === '1';
        const cacheVersion = res.headers.get('x-beredskapsboka-cache-version') || undefined;
        const manifest = await res.json().catch(() => null);
        const generatedAt = typeof manifest?.generatedAt === 'string' ? manifest.generatedAt : null;
        setState((current) => ({
          ...current,
          contentVersion: typeof manifest?.contentVersion === 'string' ? manifest.contentVersion : current.contentVersion,
          cacheVersion: cacheVersion ?? current.cacheVersion,
          staleGeneratedContent: cacheFallback || generatedFallback || isGeneratedContentStale(generatedAt, Date.now(), GENERATED_CONTENT_STALE_MS),
          fallbackGeneratedContent: generatedFallback || manifest?.fallback === true,
        }));
      })
      .catch(() => {
        setState((current) => ({
          ...current,
          contentVersion: 'offline-fallback',
          staleGeneratedContent: true,
          fallbackGeneratedContent: true,
        }));
      });

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  const warning = warningText(state);

  return (
    <div data-testid="offline-status" className="border-b border-slate-200 bg-white px-4 py-2 text-center text-xs font-semibold text-slate-700" aria-live="polite">
      <div>
        {state.online ? 'Online' : 'Offline / frakoblet — cached/stale content allowed'} · SW {state.ready ? 'klar' : 'starter'} · cache {shortOfflineVersion(state.cacheVersion || SW_CACHE_NAME)}
      </div>
      {warning ? (
        <div data-testid="content-cache-stale-warning" className="mt-1 font-black text-amber-800">
          {warning}{state.lastFallbackUrl ? ` (${new URL(state.lastFallbackUrl, window.location.href).pathname})` : ''}
        </div>
      ) : null}
    </div>
  );
}
