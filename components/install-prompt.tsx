'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Custom install card: browsers only fire beforeinstallprompt when the PWA is
 * installable and not yet installed, so this renders nothing in every other
 * case (including iOS, which has no install prompt API).
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setMessage('Appen er installert på enheten.');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    setMessage(choice.outcome === 'accepted' ? 'Appen installeres på enheten.' : 'Du kan installere senere fra denne siden.');
  }

  if (!installEvent && !message) return null;

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 shadow-sm" aria-labelledby="install-prompt-heading">
      <p className="text-sm font-black uppercase tracking-wide text-sky-800">Offline-klar app</p>
      <h2 id="install-prompt-heading" className="text-2xl font-black">Installer på enheten</h2>
      <p className="mt-1 text-sm font-semibold">Installert app starter raskere, fungerer offline og får eget ikon på hjemskjermen.</p>
      {installEvent ? (
        <button type="button" onClick={() => void install()} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#082F49] px-5 font-black text-white">
          Installer appen
        </button>
      ) : null}
      {message ? <p role="status" className="mt-2 text-sm font-bold">{message}</p> : null}
    </section>
  );
}
