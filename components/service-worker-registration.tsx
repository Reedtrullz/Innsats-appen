'use client';

import { useEffect } from 'react';

export async function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return registration;
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    registerServiceWorker().catch(() => undefined);
  }, []);

  return null;
}
