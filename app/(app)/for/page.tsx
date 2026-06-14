import { PhasePageContent } from '@/components/action-card-list';
import { getActionCards, getChecklists, getContentChangelog, getMustReadNotices, getSourceDocuments } from '@/lib/content/load-content';
import { buildSourceTitleById } from '@/lib/content/source-titles';

function ForPreparationEntryPoints() {
  return (
    <section className="rounded-3xl bg-sky-950 p-5 text-white" aria-labelledby="for-preparation-actions-heading">
      <p className="text-sm font-black uppercase tracking-wide text-sky-200">Før avmarsj</p>
      <h2 id="for-preparation-actions-heading" className="text-2xl font-black">Klargjør lokal feltpakke</h2>
      <p className="mt-2 text-sm font-semibold text-sky-100">Gjør dette før avmarsj: cache innhold/kart, velg aktivt oppdrag, test feltmodus og eksport.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <a href="/oppdrag/ny" className="rounded-2xl bg-white p-4 font-black text-slate-950">Start lokalt oppdrag</a>
        <a href="/kart" className="rounded-2xl bg-white p-4 font-black text-slate-950">Klargjør offline kart</a>
        <a href="/feltmodus" className="rounded-2xl bg-white p-4 font-black text-slate-950">Test Feltmodus</a>
      </div>
    </section>
  );
}

export default function Page() {
  const latestChange = getContentChangelog().find((entry) => entry.contentRefs.some((ref) => ref.kind === 'checklist' && ['fig-for-innsats', 'for-utrykning-samlet'].includes(ref.id)));
  return (
    <div className="space-y-5">
      <PhasePageContent
        phase="for"
        cards={getActionCards()}
        checklists={getChecklists()}
        latestChange={latestChange}
        mustRead={getMustReadNotices()}
        sourceTitleById={buildSourceTitleById(getSourceDocuments())}
        primaryOperationalContent={<ForPreparationEntryPoints />}
      />
    </div>
  );
}
