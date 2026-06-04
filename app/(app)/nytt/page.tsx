import Link from 'next/link';
import { getContentChangelog, getContentManifest } from '@/lib/content/load-content';
import { buildReleaseNotes } from '@/lib/release/release-notes';

export const revalidate = 3600;

function changeLabel(changeType: string) {
  if (changeType === 'added') return 'Ny';
  if (changeType === 'updated') return 'Oppdatert';
  if (changeType === 'critical') return 'Kritisk';
  return 'Utgår';
}

export default function WhatsNewPage() {
  const notes = buildReleaseNotes({ manifest: getContentManifest(), changelog: getContentChangelog() });

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Hva er nytt</p>
        <h1 className="text-3xl font-black">Hva er nytt</h1>
        <p className="mt-2 text-sm text-slate-700">
          Release-notater generert fra kuratert innhold, manifest og endringslogg. Ikke operativ ordre — kontroller mot lokal ordre,
          samband og offisielle kilder før bruk i felt.
        </p>
        <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-800 sm:grid-cols-2">
          <p><strong>Innholdsversjon:</strong> {notes.contentVersion}</p>
          <p><strong>Release-ID:</strong> {notes.releaseId}</p>
          <p><strong>Må-leses:</strong> {notes.mustReadCount}</p>
          <p><strong>Generert:</strong> {notes.generatedAt}</p>
        </div>
        <Link href="/endringer" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-slate-900 px-4 text-sm font-black text-white">
          Åpne full endringslogg
        </Link>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Oppdateringer i denne versjonen</h2>
        <p className="mt-2 text-sm text-slate-700">{notes.summary}</p>
        <div className="mt-4 space-y-3">
          {notes.entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-black uppercase text-sky-800">{changeLabel(entry.changeType)} · {entry.date}</p>
              <h3 className="mt-1 text-lg font-black">{entry.title}</h3>
              <p className="mt-2 text-sm text-slate-800">{entry.summary}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Må-leses: {entry.mustRead ? 'ja' : 'nei'}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Kilder: {entry.sourceIds.length > 0 ? entry.sourceIds.join(', ') : 'ingen'}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
