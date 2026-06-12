'use client';

import { useEffect, useState, type ReactNode } from 'react';

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
  generatedAt?: string | null;
  lastFallbackUrl?: string;
};

function contentAgeText(generatedAt: string | null | undefined, now = Date.now()) {
  if (!generatedAt) return null;
  const generatedMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedMs) || generatedMs > now) return null;
  const days = Math.floor((now - generatedMs) / (24 * 60 * 60 * 1000));
  return days < 1 ? 'under ett døgn gammelt' : days === 1 ? '1 dag gammelt' : `${days} dager gammelt`;
}

function warningText(state: OfflineStatusState) {
  if (state.fallbackGeneratedContent) return 'Reserveinnhold er aktivt — kontroller mot gjeldende ordre når du er tilkoblet.';
  if (state.staleGeneratedContent) {
    // A concrete age beats a binary "kan være utdatert": six days stale and
    // one day stale call for different field judgement.
    const age = contentAgeText(state.generatedAt);
    return age
      ? `Innhold fra buffer kan være utdatert (${age}) — kontroller mot gjeldende ordre når du er tilkoblet.`
      : 'Innhold fra buffer kan være utdatert — kontroller mot gjeldende ordre når du er tilkoblet.';
  }
  return null;
}

export function OfflineStatus({ compact = false, children }: { compact?: boolean; children?: ReactNode }) {
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
          generatedAt,
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
  const connectivityLabel = state.online ? 'Tilkoblet' : 'Frakoblet – bufret innhold kan brukes';
  const diagnostics = `Tjenestearbeider ${state.ready ? 'klar' : 'starter'} · buffer ${shortOfflineVersion(state.cacheVersion || SW_CACHE_NAME)}`;

  if (compact) {
    // Shell chrome: one always-visible connectivity line; pills and
    // diagnostics fold behind the disclosure. Live warnings stay visible.
    return (
      <div data-testid="offline-status" aria-live="polite" className="text-[0.7rem] font-semibold text-slate-600">
        <details>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5">
            <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${state.online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="truncate">{connectivityLabel}</span>
            <span className="ml-auto shrink-0 text-[0.66rem] font-bold text-slate-500">Detaljer</span>
          </summary>
          <div className="pb-2">
            {children}
            <p className="mt-1.5 text-[0.66rem] font-semibold text-slate-500">{diagnostics}</p>
          </div>
        </details>
        {warning ? (
          <p data-testid="content-cache-stale-warning" className="pb-1.5 font-black text-amber-800">
            {warning}{state.lastFallbackUrl ? ` (${new URL(state.lastFallbackUrl, window.location.href).pathname})` : ''}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div data-testid="offline-status" aria-live="polite" className="text-xs font-semibold text-slate-700">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className={`h-2 w-2 rounded-full ${state.online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {connectivityLabel}
      </span>
      {warning ? (
        <span data-testid="content-cache-stale-warning" className="ml-2 font-black text-amber-800">
          {warning}{state.lastFallbackUrl ? ` (${new URL(state.lastFallbackUrl, window.location.href).pathname})` : ''}
        </span>
      ) : null}
      <details className="mt-0.5">
        <summary className="cursor-pointer list-none text-[0.66rem] font-bold text-slate-500">Diagnostikk</summary>
        <span className="text-[0.66rem] font-semibold text-slate-500">{diagnostics}</span>
      </details>
    </div>
  );
}
