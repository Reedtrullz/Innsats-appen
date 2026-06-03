import type { ActionCard, SourceDocument } from '@/lib/content/schemas';
import { competenceLabels, phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { SourceBadge } from './source-badge';
import { WarningBanner } from './warning-banner';

function CompetenceGuardrail({ card }: { card: ActionCard }) {
  const competenceRequired = card.competenceRequired ?? [];
  if (competenceRequired.length === 0 && !card.competenceRationale) return null;

  return (
    <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm">
      {competenceRequired.length > 0 ? (
        <>
          <h2 className="text-xl font-black">Kun for trent personell</h2>
          <p className="mt-2 text-sm font-semibold">
            Dette tiltakskortet er kompetansegatet. Denne appen gir ikke kompetanse, autorisasjon eller sertifisering.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
            {competenceRequired.map((competence) => (
              <span key={competence} className="rounded-full bg-white px-2.5 py-1 text-amber-950 ring-1 ring-amber-300">
                {competence} · {competenceLabels[competence]}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold">
            Hvis du ikke er trent, riktig utstyrt og under relevant ordre: ikke utfør spesialistoppgaven. Trekk ut ved usikkerhet,
            meld behovet til leder, og avvent trent ressurs eller tydelig lederordre.
          </p>
        </>
      ) : null}
      {card.competenceRationale ? (
        <div className={competenceRequired.length > 0 ? 'mt-4 border-t border-amber-200 pt-3' : undefined}>
          <h2 className="text-xl font-black">Kompetansevurdering</h2>
          <p className="mt-2 text-sm font-semibold">{card.competenceRationale}</p>
        </div>
      ) : null}
    </section>
  );
}

export function ActionCardDetail({ card, sources }: { card: ActionCard; sources: SourceDocument[] }) {
  const linkedSources = card.sourceIds.map((id) => sources.find((source) => source.id === id)).filter(Boolean) as SourceDocument[];
  return (
    <article className="space-y-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">{phaseLabels[card.phase]}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{card.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {card.roles.map((role) => <span key={role} className="rounded-full bg-slate-100 px-2.5 py-1">{roleLabels[role]}</span>)}
          {card.scenarios.map((scenario) => <span key={scenario} className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-950">{scenarioLabels[scenario]}</span>)}
          {(card.equipmentRequired ?? []).map((term) => <span key={term} className="rounded-full bg-indigo-100 px-2.5 py-1 text-indigo-950">Utstyr: {term}</span>)}
        </div>
      </div>
      {card.warning ? <WarningBanner>{card.warning}</WarningBanner> : null}
      {linkedSources.flatMap((source) => source.warnings).map((warning) => <WarningBanner key={warning}>{warning}</WarningBanner>)}
      <CompetenceGuardrail card={card} />
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Tiltak</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-800">
          {card.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Sikkerhet og rapportering</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-800">
          {[...(card.safety ?? []), ...(card.reporting ?? [])].map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Kilder</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">Lenkene går direkte til kildeutdrag med tydelig utdragsvarsel.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {linkedSources.map((source) => <SourceBadge key={source.id} source={source} withAnchor />)}
        </div>
      </section>
    </article>
  );
}
