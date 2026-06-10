/**
 * Explains the two independent source axes (verification status vs. review
 * risk) and the derived freshness/risk badge, so users don't read a
 * "verified" source carrying a "Høy kilde-risiko" badge as a contradiction.
 */
export function SourceStatusLegend({ className = '' }: { className?: string }) {
  return (
    <dl className={`grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-3 ${className}`}>
      <div>
        <dt className="font-black text-slate-800">Status</dt>
        <dd>Verifiseringsnivå for kilden (verifisert, uverifisert, historisk, utkast eller utløpt).</dd>
      </div>
      <div>
        <dt className="font-black text-slate-800">Risiko</dt>
        <dd>Faglig gjennomgangsrisiko satt manuelt (lav, medium eller høy).</dd>
      </div>
      <div>
        <dt className="font-black text-slate-800">Fersk-/risikomerke</dt>
        <dd>Utledet av status, risiko og gjennomgangsdato. «Høy kilde-risiko» kan komme fra enten uverifisert status eller høy risiko – en kilde kan derfor være verifisert og samtidig merket med risiko.</dd>
      </div>
    </dl>
  );
}
