import Link from 'next/link';
import { getActionCards, getTrainingPaths } from '@/lib/content/load-content';
import type { ActionCard, TrainingPath } from '@/lib/content/schemas';
import { roleLabels } from '@/lib/content/taxonomy';

function cardMap(cards: ActionCard[]) {
  return new Map(cards.map((card) => [card.slug, card]));
}

function roleText(path: TrainingPath) {
  return path.targetRoles.map((role) => roleLabels[role]).join(', ');
}

function LinkedCardList({ path, cardsBySlug }: { path: TrainingPath; cardsBySlug: Map<string, ActionCard> }) {
  const linkedCards = path.linkedCardSlugs.map((slug) => cardsBySlug.get(slug)).filter((card): card is ActionCard => Boolean(card));
  return (
    <div className="mt-3 space-y-2">
      <h3 className="font-black">Relevante tiltakskort</h3>
      {linkedCards.length > 0 ? (
        <ul className="space-y-2">
          {linkedCards.map((card) => (
            <li key={card.slug} className="rounded-2xl border border-slate-200 p-3">
              <Link className="font-black text-sky-800" href={`/kort/${card.slug}`}>{card.title}</Link>
              {(card.competenceRequired ?? []).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-700">
                  {(card.competenceRequired ?? []).map((competence) => <span key={competence} className="rounded-full bg-slate-100 px-2.5 py-1">{competence}</span>)}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-700">Ingen lenkede tiltakskort i denne innholdsversjonen.</p>}
    </div>
  );
}

export function TrainingPathsPageContent({ paths, cards }: { paths: TrainingPath[]; cards: ActionCard[] }) {
  const cardsBySlug = cardMap(cards);
  const baseline = paths.find((path) => path.courseCode === 'FIG10');
  const specialists = paths.filter((path) => path.courseCode !== 'FIG10');
  const ordered = baseline ? [baseline, ...specialists] : paths;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-sky-950 p-5 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-100">Kompetanseoversikt</p>
        <h1 className="text-3xl font-black">Opplæring</h1>
        <p className="mt-2 text-sm text-sky-100">FIG10 som baseline for mannskap og videre specialistløp for RADIAC, MRE og MFE.</p>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <h2 className="text-xl font-black">Læringsstøtte</h2>
        <p className="mt-2 text-sm font-semibold">Dette er læringsstøtte og innholdsoversikt, ikke sertifiseringsbevis eller dokumentasjon på godkjent kompetanse.</p>
      </section>

      <section className="space-y-4">
        {ordered.map((path) => (
          <article key={path.slug} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-sky-800">{path.courseCode}</p>
                <h2 className="text-2xl font-black">{path.title}</h2>
              </div>
              {path.courseCode === 'FIG10' ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">Baseline for mannskap</span> : null}
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-3">
                <dt className="font-black">Målrolle</dt>
                <dd>{roleText(path)}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <dt className="font-black">Varighet</dt>
                <dd>{path.duration}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <dt className="font-black">Forutsetninger</dt>
                <dd>{path.prerequisites.length > 0 ? path.prerequisites.join(', ') : 'Ingen registrert'}</dd>
              </div>
            </dl>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-3">
                <h3 className="font-black">Ferdigheter</h3>
                <ul className="mt-2 flex flex-wrap gap-2 text-sm text-slate-700">
                  {path.skills.map((skill) => <li key={skill} className="rounded-full bg-slate-100 px-2.5 py-1">{skill}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3">
                <h3 className="font-black">Kilde-ID-er</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {path.sourceIds.map((sourceId) => <li key={sourceId}>{sourceId}</li>)}
                </ul>
              </div>
            </div>
            <LinkedCardList path={path} cardsBySlug={cardsBySlug} />
          </article>
        ))}
      </section>
    </div>
  );
}

export default function TrainingPathsPage() {
  return <TrainingPathsPageContent paths={getTrainingPaths()} cards={getActionCards()} />;
}
