import type { ActionCard, SourceDocument } from '@/lib/content/schemas';
import { sourceFreshness } from '@/lib/content/source-review';
import { competenceLabels, phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { SourceBadge } from './source-badge';
import { WarningBanner } from './warning-banner';
import { OperationalIcon } from './ui/operational-icons';
import { DoNotCallout } from './tiltak-card';

type Authority = NonNullable<ActionCard['authority']>;

const authorityLabels: Record<Authority, string> = {
  leder: 'Leder',
  lagforer: 'Lagfører',
  mannskap: 'Mannskap',
  beredskapsvakt: 'Beredskapsvakt',
};

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

function sourceStatusClasses(status: SourceDocument['status']) {
  if (status === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'expired') return 'border-red-200 bg-red-50 text-red-800';
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

function freshnessClasses(tone: ReturnType<typeof sourceFreshness>['tone']) {
  if (tone === 'red') return 'border-red-200 bg-red-50 text-red-700';
  if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function SourceConfidencePanel({ linkedSources, missingSourceIds }: { linkedSources: SourceDocument[]; missingSourceIds: string[] }) {
  const sourceReviews = linkedSources.map((source) => ({ source, freshness: sourceFreshness(source) }));
  const hasVerifiedSourceBase = missingSourceIds.length === 0 && sourceReviews.length > 0 && sourceReviews.every((item) => item.source.status === 'verified' && item.freshness.state === 'current');
  const panelClasses = hasVerifiedSourceBase
    ? 'rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 shadow-sm'
    : 'rounded-3xl border border-amber-300 bg-amber-50 p-5 text-amber-950 shadow-sm';

  return (
    <section className={panelClasses} aria-labelledby="source-confidence-heading">
      <h2 id="source-confidence-heading" className="text-xl font-black">Kildestatus</h2>
      <p className="mt-2 text-base font-black">{hasVerifiedSourceBase ? 'Verifisert kildegrunnlag' : 'Kilde krever kontroll'}</p>
      <p className="mt-2 text-sm font-semibold">
        Kildeutdragene er støtte, ikke fullstendig originalkilde. Kontroller mot gjeldende ordre og ansvarlig myndighet før operativ bruk.
      </p>
      {sourceReviews.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm font-semibold">
          {sourceReviews.map(({ source, freshness }) => (
            <li key={source.id} className="flex flex-wrap items-center gap-2">
              <span className="font-black">{source.id}</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${sourceStatusClasses(source.status)}`}>Status: {source.status}</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-black ${freshnessClasses(freshness.tone)}`}>{freshness.label}</span>
              <span>Sist verifisert: {source.verifiedAt}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm font-semibold">Ingen koblede kilder ble funnet for dette tiltakskortet.</p>
      )}
      {missingSourceIds.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm font-black text-red-800">
          {missingSourceIds.map((id) => <li key={id}>Mangler kilde: {id}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

export function ActionCardDetail({ card, sources }: { card: ActionCard; sources: SourceDocument[] }) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const linkedSources: SourceDocument[] = [];
  const missingSourceIds: string[] = [];
  card.sourceIds.forEach((id) => {
    const source = sourceById.get(id);
    if (source) linkedSources.push(source);
    else missingSourceIds.push(id);
  });
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
      {card.authority ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-600">Beslutningsmyndighet:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#082F49] px-2.5 py-1 text-xs font-black text-white">
            <OperationalIcon name="shield" className="h-3.5 w-3.5" />
            {authorityLabels[card.authority]}
          </span>
        </div>
      ) : null}
      {card.warning ? <WarningBanner>{card.warning}</WarningBanner> : null}
      {linkedSources.flatMap((source) => source.warnings).map((warning) => <WarningBanner key={warning}>{warning}</WarningBanner>)}
      {(card.doNot ?? []).length > 0 ? (
        <section className="rounded-3xl border-2 border-red-300 bg-red-50 p-5 text-red-950 shadow-sm">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <OperationalIcon name="alert" className="h-5 w-5" />
            Ikke gjør
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
            {(card.doNot ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}
      <CompetenceGuardrail card={card} />
      <SourceConfidencePanel linkedSources={linkedSources} missingSourceIds={missingSourceIds} />
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
