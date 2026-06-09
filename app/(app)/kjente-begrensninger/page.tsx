export default function KnownLimitationsPage() {
  return (
    <article className="space-y-4">
      <section className="rounded-3xl bg-slate-950 p-6 text-white">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-300">MVP</p>
        <h1 className="mt-2 text-3xl font-black">Kjente begrensninger</h1>
        <p className="mt-3 text-sm font-semibold text-slate-200">Bruk listen som en rask sjekk før appen brukes i en operativ arbeidsflate.</p>
      </section>
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <ul className="list-disc space-y-2 pl-5 text-sm font-semibold text-slate-700">
          <li>Ingen backend, ingen innlogging, ingen synkronisering, ingen live tracking i MVP. Må leses og innholdsendringer er ikke Nødvarsel, ikke pushvarsel og ikke offisiell befolkningsvarsling.</li>
          <li>Post-MVP: kontekstoppslag (posisjon/søk til MET/Kartverket/NVE) vil introdusere begrenset datautveksling med offentlige API-er. Kun valgt posisjon eller søketekst sendes; oppdragsdata forblir lokale.</li>
          <li>Ingen pasient/persondata skal registreres. Bruk godkjente systemer for personopplysninger, pasientopplysninger og hendelseslogg.</li>
          <li>Ingen private/skjermede tilfluktsrom eller ikke-offentlig lokasjonsdata publiseres eller lagres som statisk innhold.</li>
          <li>Eksterne kontekstsignaler kan være forsinket, utilgjengelige eller generaliserte. Kontroller mot primærkilde og lokale meldinger.</li>
          <li>Eksport er en lokal Markdown-kopi og kan inneholde operasjonelt sensitiv informasjon fra det brukeren selv skriver inn.</li>
        </ul>
      </section>
    </article>
  );
}
