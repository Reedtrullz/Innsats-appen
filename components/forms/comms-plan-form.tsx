'use client';

import { useState } from 'react';
import { exportCommsPlanMarkdown } from '@/lib/mission/order-export';

function value(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}

export function CommsPlanForm() {
  const [markdown, setMarkdown] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMarkdown(exportCommsPlanMarkdown({
      kanalTalegruppe: value(form, 'kanalTalegruppe'),
      kallesignal: value(form, 'kallesignal'),
      telefonIssi: value(form, 'telefonIssi'),
      notes: value(form, 'notes'),
    }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Lokal samband</p>
        <h2 className="text-2xl font-black">Sambandsplan</h2>
        <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Kontroller mot lokal sambandsplan. Ikke legg inn sensitive abonnentlister.</p>
      </div>
      <label className="block text-sm font-bold">Kanal/talegruppe<input name="kanalTalegruppe" required className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Kallesignal<input name="kallesignal" required className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Telefon/ISSI<input name="telefonIssi" className="mt-1 min-h-12 w-full rounded-2xl border px-3" /></label>
      <label className="block text-sm font-bold">Notes<textarea name="notes" className="mt-1 min-h-20 w-full rounded-2xl border px-3 py-2" /></label>
      <button type="submit" className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-bold text-white">Eksporter sambandsplan</button>
      {markdown ? <pre className="whitespace-pre-wrap rounded-2xl bg-slate-100 p-3 text-sm">{markdown}</pre> : null}
    </form>
  );
}
