import type { ActionCard, SourceDocument } from '@/lib/content/schemas';
import { sourceFreshness } from '@/lib/content/source-review';
import { competenceLabels, phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { SourceBadge } from './source-badge';
import { WarningBanner } from './warning-banner';
import { OperationalIcon } from './ui/operational-icons';

type Authority = NonNullable<ActionCard['authority']>;

const authorityLabels: Record<Authority, string> = {
  leder: 'Leder',
  lagforer: 'Lagfører',
  mannskap: 'Mannskap',
  beredskapsvakt: 'Beredskapsvakt',
};

/**
 * Compact competence gate: one always-visible strip names the requirement;
 * the full guidance sits one tap away. The gate must be seen before the
 * steps, but it must not push the steps off the first screen.
 */
function CompetenceGuardrail({ card }: { card: ActionCard }) {
  const competenceRequired = card.competenceRequired ?? [];
  if (competenceRequired.length === 0 && !card.competenceRationale) return null;

  return (
    <details className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 shadow-sm">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-2">
        <OperationalIcon name="shield" className="h-4 w-4 shrink-0" />
        <span className="text-sm font-black">
          {competenceRequired.length > 0 ? 'Kun for trent personell' : 'Kompetansevurdering'}
        </span>
        {competenceRequired.map((competence) => (
          <span key={competence} className="rounded-full bg-white px-2 py-0.5 text-xs font-black ring-1 ring-amber-300">
            {competence}
          </span>
        ))}
        <span className="ml-auto text-xs font-bold underline underline-offset-2">Detaljer</span>
      </summary>
      <div className="border-t border-amber-200 px-4 py-3 text-sm font-semibold">
        {competenceRequired.length > 0 ? (
          <>
            <p>Dette tiltakskortet er kompetansegatet. Denne appen gir ikke kompetanse, autorisasjon eller sertifisering.</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs font-black">
              {competenceRequired.map((competence) => (
                <li key={competence} className="rounded-full bg-white px-2.5 py-1 ring-1 ring-amber-300">
                  {competence} · {competenceLabels[competence]}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              Hvis du ikke er trent, riktig utstyrt og under relevant ordre: ikke utfør spesialistoppgaven. Trekk ut ved usikkerhet,
              meld behovet til leder, og avvent trent ressurs eller tydelig lederordre.
            </p>
          </>
        ) : null}
        {card.competenceRationale ? (
          <div className={competenceRequired.length > 0 ? 'mt-3 border-t border-amber-200 pt-3' : undefined}>
            <p className="font-black">Kompetansevurdering</p>
            <p className="mt-1">{card.competenceRationale}</p>
          </div>
        ) : null}
      </div>
    </details>
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

/**
 * Source governance lives in one collapsed panel below the instructions: the
 * verified/needs-control verdict is always visible in the summary, the
 * per-source detail one tap away. Stays open by default only when something
 * needs control, so a clean card costs no vertical space.
 */
function SourceGovernancePanel({ card, linkedSources, missingSourceIds, sourceWarnings }: { card: ActionCard; linkedSources: SourceDocument[]; missingSourceIds: string[]; sourceWarnings: string[] }) {
  const sourceReviews = linkedSources.map((source) => ({ source, freshness: sourceFreshness(source) }));
  const hasVerifiedSourceBase = missingSourceIds.length === 0 && sourceReviews.length > 0 && sourceReviews.every((item) => item.source.status === 'verified' && item.freshness.state === 'current');

  return (
    <details
      open={!hasVerifiedSourceBase || undefined}
      className={`rounded-2xl border shadow-sm ${hasVerifiedSourceBase ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-300 bg-amber-50 text-amber-950'}`}
    >
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-2">
        <span className="text-sm font-black">{hasVerifiedSourceBase ? 'Verifisert kildegrunnlag' : 'Kilde krever kontroll'}</span>
        <span className="ml-auto text-xs font-bold underline underline-offset-2">Kilder og status</span>
      </summary>
      <div className="space-y-3 border-t px-4 py-3 text-sm font-semibold" style={{ borderColor: 'inherit' }}>
        <section aria-labelledby="source-confidence-heading">
          <h2 id="source-confidence-heading" className="text-base font-black">Kildestatus</h2>
          <p className="mt-1">
            Kildeutdragene er støtte, ikke fullstendig originalkilde. Kontroller mot gjeldende ordre og ansvarlig myndighet før operativ bruk.
          </p>
          {sourceReviews.length > 0 ? (
            <ul className="mt-2 space-y-2">
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
            <p className="mt-2">Ingen koblede kilder ble funnet for dette tiltakskortet.</p>
          )}
          {missingSourceIds.length > 0 ? (
            <ul className="mt-2 space-y-1 font-black text-red-800">
              {missingSourceIds.map((id) => <li key={id}>Mangler kilde: {id}</li>)}
            </ul>
          ) : null}
        </section>
        {sourceWarnings.length > 0 ? (
          <section>
            <h3 className="text-base font-black">Kildevarsler</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {sourceWarnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </section>
        ) : null}
        <section>
          <h3 className="text-base font-black">Kilder</h3>
          <p className="mt-1 text-xs">Lenkene går direkte til kildeutdrag med tydelig utdragsvarsel.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {linkedSources.map((source) => <SourceBadge key={source.id} source={source} withAnchor />)}
          </div>
        </section>
        <section aria-label="Kortets metadata">
          <h3 className="text-base font-black">Gjelder for</h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
            {card.roles.map((role) => <span key={role} className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">{roleLabels[role]}</span>)}
            {card.scenarios.map((scenario) => <span key={scenario} className="rounded-full bg-white px-2.5 py-1 ring-1 ring-emerald-200">{scenarioLabels[scenario]}</span>)}
            {(card.equipmentRequired ?? []).map((term) => <span key={term} className="rounded-full bg-white px-2.5 py-1 ring-1 ring-indigo-200">Utstyr: {term}</span>)}
          </div>
        </section>
      </div>
    </details>
  );
}

/**
 * Instruction-first layout: title, the few safety lines that must be read
 * before acting (compact), then the numbered steps as the visual primary.
 * Source governance and metadata sit collapsed below the instructions.
 */
export function ActionCardDetail({ card, sources }: { card: ActionCard; sources: SourceDocument[] }) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const linkedSources: SourceDocument[] = [];
  const missingSourceIds: string[] = [];
  card.sourceIds.forEach((id) => {
    const source = sourceById.get(id);
    if (source) linkedSources.push(source);
    else missingSourceIds.push(id);
  });
  const sourceWarnings = Array.from(new Set(linkedSources.flatMap((source) => source.warnings).filter((warning): warning is string => Boolean(warning) && warning !== card.warning)));

  return (
    <article className="space-y-3">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-sky-700">{phaseLabels[card.phase]}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{card.title}</h1>
        {card.authority ? (
          <p className="mt-2 flex items-center gap-2 text-xs font-black">
            <span className="uppercase tracking-wide text-slate-600">Beslutningsmyndighet:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#082F49] px-2.5 py-1 text-white">
              <OperationalIcon name="shield" className="h-3.5 w-3.5" />
              {authorityLabels[card.authority]}
            </span>
          </p>
        ) : null}
      </div>
      {card.warning ? <WarningBanner>{card.warning}</WarningBanner> : null}
      {(card.doNot ?? []).length > 0 ? (
        <section className="rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-950 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-black">
            <OperationalIcon name="alert" className="h-5 w-5" />
            Ikke gjør
          </h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm font-semibold">
            {(card.doNot ?? []).map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}
      <CompetenceGuardrail card={card} />
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Tiltak</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-6 text-base font-semibold leading-6 text-slate-900 marker:font-black marker:text-sky-800">
          {card.steps.map((step) => <li key={step} className="pl-1">{step}</li>)}
        </ol>
      </section>
      {[...(card.safety ?? []), ...(card.reporting ?? [])].length > 0 ? (
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Sikkerhet og rapportering</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-800">
            {[...(card.safety ?? []), ...(card.reporting ?? [])].map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}
      <SourceGovernancePanel card={card} linkedSources={linkedSources} missingSourceIds={missingSourceIds} sourceWarnings={sourceWarnings} />
    </article>
  );
}
