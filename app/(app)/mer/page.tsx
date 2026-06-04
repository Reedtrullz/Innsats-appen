import Link from 'next/link';

const operationalLinks = [
  {
    href: '/kilder',
    label: 'Kilder',
    description: 'Kildebank og kildevarsler for innholdet i Beredskapsboka.',
  },
  {
    href: '/laering',
    label: 'Moduler og læring',
    description: 'Opplæringsmoduler, fagspor og øvingsstøtte for egen gjennomgang.',
  },
  {
    href: '/kart',
    label: 'Kart',
    description: 'Offline-kart og enkel lokal orientering uten sentral sporing.',
  },
  {
    href: '/feltmodus',
    label: 'Feltmodus',
    description: 'Lesbarhet, mørk modus og hanskevennlige berøringsmål på enheten.',
  },
  {
    href: '/personvern',
    label: 'Personvern',
    description: 'Hva MVP-en samler inn, ikke samler inn og hvordan data holdes lokalt.',
  },
  {
    href: '/data-pa-enheten',
    label: 'Data på enheten',
    description: 'Se, eksporter eller slett lokale arbeidsdata fra denne nettleseren.',
  },
];

const adminLinks = [
  {
    href: '/release',
    label: 'Release readiness',
    description: 'Sjekk publiseringsklarhet og lokale release-notater før utsending.',
  },
  {
    href: '/kildegjennomgang',
    label: 'Kildegjennomgang',
    description: 'Administrativ oversikt over kildestatus, hull og oppfølgingspunkter.',
  },
  {
    href: '/datakilder',
    label: 'Datakilder',
    description: 'Innstillinger for eksterne datakilder og lokale integrasjoner.',
  },
  {
    href: '/endringer',
    label: 'Endringer',
    description: 'Full endringslogg for innhold, kildegrunnlag og publiserte oppdateringer.',
  },
];

function LinkCard({ href, label, description }: { href: string; label: string; description: string }) {
  const idBase = `more-link-${href.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '-')}`;
  const labelId = `${idBase}-label`;
  const descriptionId = `${idBase}-description`;

  return (
    <Link
      href={href}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
    >
      <span id={labelId} className="text-base font-black text-slate-950">{label}</span>
      <span id={descriptionId} className="mt-1 block text-sm font-semibold text-slate-700">{description}</span>
    </Link>
  );
}

export default function MorePage() {
  return (
    <article className="space-y-5">
      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-300">Sekundære flater</p>
        <h1 className="mt-2 text-3xl font-black">Mer</h1>
        <p className="mt-3 text-sm font-semibold text-slate-200">
          Kilder, læring, innstillinger og administrative kontroller samlet utenfor den feltvendte hovedflyten.
        </p>
      </section>

      <section className="space-y-3" aria-labelledby="more-operational-heading">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-sky-800">Operasjonell støtte</p>
          <h2 id="more-operational-heading" className="text-2xl font-black text-slate-950">Oppslag og lokale valg</h2>
          <p className="mt-1 text-sm font-semibold text-slate-700">Trygge støtteflater for oppslag, læring, kart og enhetsdata.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {operationalLinks.map((link) => <LinkCard key={link.href} {...link} />)}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="more-admin-heading">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-amber-900">Admin/release</p>
          <h2 id="more-admin-heading" className="text-2xl font-black text-amber-950">Publisering og kildekontroll</h2>
          <p className="mt-1 text-sm font-semibold text-amber-950">
            Administrative lenker for kvalitet, datakilder og release. Dette er ikke for feltbeslutninger.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {adminLinks.map((link) => <LinkCard key={link.href} {...link} />)}
        </div>
      </section>
    </article>
  );
}
