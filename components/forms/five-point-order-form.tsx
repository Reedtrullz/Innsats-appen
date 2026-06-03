'use client';

import { useState } from 'react';
import { EXPORT_SENSITIVITY_WARNING, exportFivePointOrderMarkdown } from '@/lib/mission/order-export';

function value(form: FormData, key: string) {
  return String(form.get(key) ?? '').trim();
}

export function FivePointOrderForm() {
  const [markdown, setMarkdown] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMarkdown(exportFivePointOrderMarkdown({
      situasjon: value(form, 'situasjon'),
      oppdrag: value(form, 'oppdrag'),
      utforelse: value(form, 'utforelse'),
      administrasjonForsyning: value(form, 'administrasjonForsyning'),
      ledelseSamband: value(form, 'ledelseSamband'),
      notes: value(form, 'notes'),
    }));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Lokal ordre</p>
        <h2 className="text-2xl font-black">5-punktsordre</h2>
        <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">Eksporteres lokalt som beslutningsstøtte. Kontroller mot gjeldende ordre og bruk bare operativt nødvendige opplysninger.</p>
        <p className="mt-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-950">{EXPORT_SENSITIVITY_WARNING}</p>
      </div>
      <label className="block text-sm font-bold">Situasjon<textarea name="situasjon" required className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Oppdrag<textarea name="oppdrag" required className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Utførelse<textarea name="utforelse" required className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Administrasjon/forsyning<textarea name="administrasjonForsyning" required className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Ledelse/samband<textarea name="ledelseSamband" required className="mt-1 min-h-24 w-full rounded-2xl border px-3 py-2" /></label>
      <label className="block text-sm font-bold">Notes<textarea name="notes" className="mt-1 min-h-20 w-full rounded-2xl border px-3 py-2" /></label>
      <button type="submit" className="min-h-12 w-full rounded-2xl bg-slate-950 px-5 font-bold text-white">Eksporter 5-punktsordre</button>
      {markdown ? <pre className="whitespace-pre-wrap rounded-2xl bg-slate-100 p-3 text-sm">{markdown}</pre> : null}
    </form>
  );
}
