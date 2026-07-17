import Link from 'next/link';
import type { ActionCard, SourceDocument, TrainingPath } from '@/lib/content/schemas';
import { roleLabels } from '@/lib/content/taxonomy';
import { SourceBadge } from './source-badge';

function roleText(path: TrainingPath) {
  return path.targetRoles.map((role) => roleLabels[role]).join(', ');
}

function linkedCards(path: TrainingPath, cards: ActionCard[]) {
  const bySlug = new Map(cards.map((card) => [card.slug, card]));
  return path.linkedCardSlugs.map((slug) => bySlug.get(slug)).filter((card): card is ActionCard => Boolean(card));
}

export function TrainingPathDetail({ path, cards, sources }: { path: TrainingPath; cards: ActionCard[]; sources: SourceDocument[] }) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const pathSources = path.sourceIds.map((sourceId) => sourceById.get(sourceId)).filter((source): source is SourceDocument => Boolean(source));
  const cardsForPath = linkedCards(path, cards);

  return (
    <article className="space-y-4">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <Link className="text-sm font-black text-sky-800" href="/laering">← Til opplæring</Link>
        <p className="mt-4 text-sm font-black uppercase tracking-wide text-sky-800">{path.courseCode}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{path.title}</h1>
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-950">
          Dette er læringsstøtte og innholdsoversikt, ikke sertifiseringsbevis eller dokumentasjon på godkjent kompetanse.
        </p>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Løpsdetaljer</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-black">Målrolle</dt><dd>{roleText(path)}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-black">Varighet</dt><dd>{path.duration}</dd></div>
          <div className="rounded-2xl bg-slate-50 p-3"><dt className="font-black">Forutsetninger</dt><dd>{path.prerequisites.length > 0 ? path.prerequisites.join(', ') : 'Ingen registrert'}</dd></div>
        </dl>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Ferdigheter</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
          {path.skills.map((skill) => <li key={skill} className="rounded-full bg-slate-100 px-2.5 py-1">{skill}</li>)}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Relevante tiltakskort</h2>
        {cardsForPath.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {cardsForPath.map((card) => (
              <li key={card.slug} className="rounded-2xl border border-slate-200 p-3">
                <Link className="font-black text-sky-800" href={`/kort/${card.slug}`}>{card.title}</Link>
                {(card.competenceRequired ?? []).length > 0 ? <p className="mt-1 text-xs font-semibold text-slate-600">Kompetansekrav: {(card.competenceRequired ?? []).join(', ')}</p> : null}
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-slate-700">Ingen lenkede tiltakskort i denne innholdsversjonen.</p>}
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Kilder</h2>
        <div className="mt-3 flex flex-wrap gap-2">{pathSources.map((source) => <SourceBadge key={source.id} source={source} withAnchor />)}</div>
      </section>
    </article>
  );
}
