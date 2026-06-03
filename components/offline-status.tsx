'use client';

import { useEffect, useState } from 'react';

import { registerServiceWorker } from './service-worker-registration';

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [contentVersion, setContentVersion] = useState<string>('ukjent');

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    registerServiceWorker()
      .then((registration) => setReady(Boolean(registration)))
      .catch(() => setReady(false));

    fetch('/generated-content/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((manifest) => {
        if (manifest?.contentVersion) setContentVersion(manifest.contentVersion);
      })
      .catch(() => undefined);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-2 text-center text-xs font-semibold text-slate-700" aria-live="polite">
      {online ? 'Online' : 'Offline / frakoblet — cached/stale content allowed'} · SW {ready ? 'klar' : 'starter'} · contentVersion {contentVersion}
    </div>
  );
}
