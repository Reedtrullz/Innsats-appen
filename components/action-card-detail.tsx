import type { ActionCard, ImageMetadata, ReferenceVideo, SourceDocument } from '@/lib/content/schemas';
import { normalizeStep } from '@/lib/content/steps';
import { sourceFreshness } from '@/lib/content/source-review';
import { competenceLabels, phaseLabels, roleLabels, scenarioLabels } from '@/lib/content/taxonomy';
import { RecordCardVisit } from './recent-cards';
import { RelatedDemonstrationLinks } from './reference-videos';
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
    <details className="rounded-2xl border border-[#fbbf24]/30 bg-[var(--warning-surface)] text-[var(--warning-fg)] shadow-sm">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-2">
        <OperationalIcon name="shield" className="h-4 w-4 shrink-0" />
        <span className="text-sm font-black">
          {competenceRequired.length > 0 ? 'Kun for trent personell' : 'Kompetansevurdering'}
        </span>
        {competenceRequired.map((competence) => (
          <span key={competence} className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs font-black ring-1 ring-[#fbbf24]/30">
            {competence}
          </span>
        ))}
        <span className="ml-auto text-xs font-bold underline underline-offset-2">Detaljer</span>
      </summary>
      <div className="border-t border-[#fbbf24]/20 px-4 py-3 text-sm font-semibold">
        {competenceRequired.length > 0 ? (
          <>
            <p>Dette tiltakskortet er kompetansegatet. Denne appen gir ikke kompetanse, autorisasjon eller sertifisering.</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs font-black">
              {competenceRequired.map((competence) => (
                <li key={competence} className="rounded-full bg-[var(--surface)] px-2.5 py-1 ring-1 ring-[#fbbf24]/30">
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
  if (status === 'verified') return 'border-[#34d399]/30 bg-[var(--success-surface)] text-[var(--success-fg)]';
  if (status === 'expired') return 'border-[#f87171]/30 bg-[var(--critical-surface)] text-[var(--critical-fg)]';
  return 'border-[#fbbf24]/30 bg-[var(--warning-surface)] text-[var(--warning-fg)]';
}

function freshnessClasses(tone: ReturnType<typeof sourceFreshness>['tone']) {
  if (tone === 'red') return 'border-[#f87171]/30 bg-[var(--critical-surface)] text-[var(--critical-fg)]';
  if (tone === 'amber') return 'border-[#fbbf24]/30 bg-[var(--warning-surface)] text-[var(--warning-fg)]';
  if (tone === 'emerald') return 'border-[#34d399]/30 bg-[var(--success-surface)] text-[var(--success-fg)]';
  return 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]';
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
      className={`rounded-2xl border shadow-sm ${hasVerifiedSourceBase ? 'border-[#34d399]/30 bg-[var(--success-surface)] text-[var(--success-fg)]' : 'border-[#fbbf24]/30 bg-[var(--warning-surface)] text-[var(--warning-fg)]'}`}
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
                  <span className="font-bold">{source.id}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${sourceStatusClasses(source.status)}`}>Status: {source.status}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${freshnessClasses(freshness.tone)}`}>{freshness.label}</span>
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
            {card.roles.map((role) => <span key={role} className="rounded-full bg-[var(--surface)] px-2.5 py-1 ring-1 ring-[var(--border)]">{roleLabels[role]}</span>)}
            {card.scenarios.map((scenario) => <span key={scenario} className="rounded-full bg-[var(--surface)] px-2.5 py-1 ring-1 ring-[#34d399]/30">{scenarioLabels[scenario]}</span>)}
            {(card.equipmentRequired ?? []).map((term) => <span key={term} className="rounded-full bg-[var(--surface)] px-2.5 py-1 ring-1 ring-[#38bdf8]/30">Utstyr: {term}</span>)}
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
export function ActionCardDetail({ card, sources, images = [], referenceVideos = [] }: { card: ActionCard; sources: SourceDocument[]; images?: ImageMetadata[]; referenceVideos?: ReferenceVideo[] }) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const linkedSources: SourceDocument[] = [];
  const missingSourceIds: string[] = [];
  card.sourceIds.forEach((id) => {
    const source = sourceById.get(id);
    if (source) linkedSources.push(source);
    else missingSourceIds.push(id);
  });
  const sourceWarnings = Array.from(new Set(linkedSources.flatMap((source) => source.warnings).filter((warning): warning is string => Boolean(warning) && warning !== card.warning)));
  const normalizedSteps = card.steps.map(normalizeStep);
  const imageById = new Map(images.map((image) => [image.id, image]));
  // Images linked to a specific step render inline under that step; the
  // standalone "Illustrasjon / utlegg" section only shows the rest (P2-2/P1-1).
  const stepReferencedImageIds = new Set(normalizedSteps.flatMap((step) => step.imageIds));
  const overviewImages = images.filter((image) => !stepReferencedImageIds.has(image.id));

  return (
    <article className="space-y-3">
      <RecordCardVisit slug={card.slug} />
      <div className="rounded-3xl bg-[var(--surface)] p-5 shadow-sm">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-widest text-[#38bdf8]">{phaseLabels[card.phase]}</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--text-primary)]">{card.title}</h1>
        {card.authority ? (
          <p className="mt-2 flex items-center gap-2 text-xs font-bold">
            <span className="uppercase tracking-wide text-[var(--text-muted)]">Beslutningsmyndighet:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#082F49] px-2.5 py-1 text-white">
              <OperationalIcon name="shield" className="h-3.5 w-3.5" />
              {authorityLabels[card.authority]}
            </span>
          </p>
        ) : null}
      </div>
      {card.warning ? <WarningBanner>{card.warning}</WarningBanner> : null}
      {card.reviewStatus === 'pending-fagperson' ? (
        <section className="rounded-2xl border border-[#38bdf8]/30 bg-[var(--info-surface)] px-4 py-3 text-[var(--info-fg)] shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-black">
            <OperationalIcon name="shield" className="h-5 w-5" />
            Til faggjennomgang
          </h2>
          <p className="mt-1 text-sm font-semibold">
            Innholdet er utvidet fra kildedokumentene, men er ennå ikke faggodkjent. Bruk det som støtte, ikke som
            fasit, og kontroller alltid mot gjeldende ordre, innsatsledelse og fagmyndighet før operativ bruk.
          </p>
        </section>
      ) : null}
      {(card.doNot ?? []).length > 0 ? (
        <section className="rounded-2xl border-2 border-[#f87171]/30 bg-[var(--critical-surface)] px-4 py-3 text-[var(--critical-fg)] shadow-sm">
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
      <section className="rounded-3xl bg-[var(--surface)] p-5 shadow-sm">
        <h2 className="text-xl font-black text-[var(--text-primary)]">Tiltak</h2>
        <ol className="mt-3 list-decimal space-y-3 pl-6 text-base font-semibold leading-6 text-[var(--text-primary)] marker:font-black marker:text-[#38bdf8]">
          {normalizedSteps.map((step, index) => {
            const stepImages = step.imageIds.map((id) => imageById.get(id)).filter((image): image is ImageMetadata => Boolean(image));
            return (
              <li key={`${index}-${step.action}`} className="pl-1">
                {step.action}
                {step.how ? (
                  <details className="mt-1">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-bold text-[#38bdf8]">Vis hvordan</summary>
                    <p className="mt-1 text-sm font-medium leading-6 text-[var(--text-secondary)]">{step.how}</p>
                  </details>
                ) : null}
                {stepImages.length > 0 ? (
                  <div className="mt-2 space-y-3">
                    {stepImages.map((image) => (
                      <figure key={image.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image.publicPath} alt={image.alt} className="block h-auto w-full" loading="lazy" />
                        {image.caption ? <figcaption className="border-t border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">{image.caption}</figcaption> : null}
                      </figure>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
      {overviewImages.length > 0 ? (
        <section className="rounded-3xl bg-[var(--surface)] p-5 shadow-sm" aria-labelledby="card-illustrations-heading">
          <h2 id="card-illustrations-heading" className="text-xl font-black text-[var(--text-primary)]">Illustrasjon / utlegg</h2>
          <div className="mt-3 space-y-4">
            {overviewImages.map((image) => (
              <figure key={image.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                {/* Plain img is deliberate: assets are same-origin under /content-assets
                    (CSP img-src 'self') and precached by the service worker for offline
                    use; the next/image optimizer route is unavailable offline. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.publicPath} alt={image.alt} className="block h-auto w-full" loading="lazy" />
                {image.caption ? (
                  <figcaption className="border-t border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">{image.caption}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}
      {[...(card.safety ?? []), ...(card.reporting ?? [])].length > 0 ? (
        <section className="rounded-3xl bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-xl font-black text-[var(--text-primary)]">Sikkerhet og rapportering</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[var(--text-secondary)]">
            {[...(card.safety ?? []), ...(card.reporting ?? [])].map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ) : null}
      <RelatedDemonstrationLinks videos={referenceVideos} cardSlug={card.slug} />
      <SourceGovernancePanel card={card} linkedSources={linkedSources} missingSourceIds={missingSourceIds} sourceWarnings={sourceWarnings} />
    </article>
  );
}
