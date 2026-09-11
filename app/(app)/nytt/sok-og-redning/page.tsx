import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MustReadAcknowledgementButton } from '@/components/must-read-acknowledgement-button';
import { SourceBadge } from '@/components/source-badge';
import { getActionCards, getChecklists, getMustReadNotices, getSourceDocuments, getStudyGuides } from '@/lib/content/load-content';
import { buildSourceTitleById } from '@/lib/content/source-titles';

export const revalidate = 3600;

const GUIDE_SLUG = 'sok-etter-savnet-2026';

export default function StudyGuidePage() {
  const guide = getStudyGuides().find((item) => item.slug === GUIDE_SLUG);
  if (!guide) notFound();

  const cardsBySlug = new Map(getActionCards().map((card) => [card.slug, card]));
  const checklistsBySlug = new Map(getChecklists().map((checklist) => [checklist.slug, checklist]));
  const sources = getSourceDocuments();
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const sourceTitleById = buildSourceTitleById(sources);
  const source = guide.sourceIds.map((id) => sourcesById.get(id)).find(Boolean);
  const notice = getMustReadNotices().find((item) => item.linkedStudyGuideSlugs?.includes(guide.slug));
  const linkedChecklists = [...new Set(guide.sections.flatMap((section) => section.linkedChecklistSlugs))].flatMap((slug) => {
    const checklist = checklistsBySlug.get(slug);
    return checklist ? [checklist] : [];
  });

  return (
    <div className="space-y-4">
      <Link href="/nytt" className="inline-flex min-h-11 items-center text-sm font-black text-sky-800 underline">← Tilbake til Hva er nytt</Link>

      <section className="rounded-3xl border-2 border-amber-400 bg-amber-50 p-5 shadow-sm" aria-labelledby="study-warning-heading">
        <p className="text-sm font-black uppercase tracking-wide text-red-700">Studiepakke før neste søk</p>
        <h1 id="study-warning-heading" className="mt-1 text-3xl font-black">Dette er nytt – studer søk etter savnet</h1>
        <p className="mt-2 text-sm font-bold leading-6 text-amber-950">Dette er lærings- og lokal beslutningsstøtte, ikke offisiell ordre eller sertifisering. Følg alltid gjeldende lokal ordre, innsatsledelse og fagmyndighet.</p>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Fremhevet studie</p>
        <h2 className="mt-1 text-2xl font-black">{guide.title}</h2>
        <p className="mt-2 text-sm text-slate-700">{guide.summary}</p>
        <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-3">
          <p>Målgruppe: {guide.audienceRoles.join(', ')}</p>
          <p>Estimert tid: {guide.estimatedMinutes} minutter</p>
          <p>Oppdatert: {guide.updatedAt}</p>
        </div>
        {guide.mustStudyBeforeNextSearch ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-black text-red-900">Denne studiepakken gjelder før neste søk.</p> : null}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Anbefalt leserekkefølge</h2>
        <ol className="mt-4 space-y-4">
          {guide.sections.map((section, index) => (
            <li key={section.id} className="rounded-2xl border border-slate-200 p-4">
              <h3 className="text-lg font-black">{index + 1}. {section.title}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-700">{section.summary}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {section.keyPoints.map((point) => <li key={point}>{point}</li>)}
              </ul>
              {section.linkedCardSlugs.some((slug) => cardsBySlug.has(slug)) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {section.linkedCardSlugs.map((slug) => { const card = cardsBySlug.get(slug); return card ? <Link key={slug} href={`/kort/${slug}`} className="rounded-full bg-sky-100 px-3 py-2 text-sm font-black text-sky-900 underline">{card.title}</Link> : null; })}
                </div>
              ) : null}
              {section.linkedChecklistSlugs.some((slug) => checklistsBySlug.has(slug)) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {section.linkedChecklistSlugs.map((slug) => { const checklist = checklistsBySlug.get(slug); return checklist ? <Link key={slug} href={`#sjekkliste-${checklist.slug}`} className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-900 underline">Sjekkliste: {checklist.title}</Link> : null; })}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm" aria-labelledby="study-checklists-heading">
        <h2 id="study-checklists-heading" className="text-xl font-black">Sjekkliste-lesing uten oppdrag</h2>
        <p className="mt-2 text-sm font-semibold text-slate-700">Les innholdet her uten å opprette eller velge en lokal oppdragstavle. Dette er ikke en gjennomført sjekk eller dokumentasjon av faktisk søk.</p>
        <div className="mt-4 space-y-4">
          {linkedChecklists.map((checklist) => (
            <article id={`sjekkliste-${checklist.slug}`} key={checklist.slug} tabIndex={-1} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-lg font-black">{checklist.title}</h3>
              {checklist.warning ? <p className="mt-1 text-sm font-semibold text-amber-900">{checklist.warning}</p> : null}
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
                {checklist.items.map((item) => <li key={item.id}>{item.label}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {source ? <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Kilde og faglig status</h2>
        <p className="mt-2 text-sm font-semibold text-slate-700">{guide.provenanceNote}</p>
        <p className="mt-2 text-sm font-bold text-red-900">Kildestatus: {source.status} · Risiko: {source.reviewRisk} · Faglig gjennomgang: pending-fagperson</p>
        <p className="mt-2 text-sm text-slate-700">Registrert kilde: {sourceTitleById[source.id] ?? source.title}</p>
        <div className="mt-3"><SourceBadge source={source} withAnchor /></div>
        {source.warnings.map((warning) => <p key={warning} className="mt-2 text-sm font-semibold text-amber-900">{warning}</p>)}
      </section> : null}

      {notice ? <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <h2 className="text-xl font-black text-red-950">Må leses lokalt</h2>
        <p className="mt-2 text-sm font-semibold text-red-900">{notice.body}</p>
        <MustReadAcknowledgementButton notice={notice} />
      </section> : null}
    </div>
  );
}
