export type MediaSafetyNote = {
  status: 'deferred-mvp';
  title: string;
  summary: string;
  requirementsBeforeImplementation: string[];
};

export const MEDIA_ATTACHMENT_SAFETY_NOTES = {
  photo: {
    status: 'deferred-mvp',
    title: 'Foto-vedlegg i logg',
    summary: 'Foto/video-vedlegg er utsatt i MVP. Lokal lagring og eksport av bilder kan lekke persondata, pasientdata, skjermede lokasjoner og tekniske metadata.',
    requirementsBeforeImplementation: [
      'EXIF/GPS-metadata må fjernes før forhåndsvisning, lokal lagring eller eksport.',
      'Brukeren må se lagringsstørrelse og få advarsel om at mediefiler raskt kan fylle lokal nettleserlagring.',
      'Eksport må kreve eksplisitt personvernadvarsel før mediefiler inkluderes.',
      'Løsningen må ikke oppmuntre til navn, ID, pasientdata, helsejournal eller andre personopplysninger i logg.',
    ],
  },
  video: {
    status: 'deferred-mvp',
    title: 'Video-vedlegg i logg',
    summary: 'Foto/video-vedlegg er utsatt i MVP. Video gir høyere risiko for persondata, pasientdata, lydopptak og stor lokal lagringsstørrelse.',
    requirementsBeforeImplementation: [
      'EXIF/GPS-metadata og andre container-metadata må fjernes før eksport.',
      'Brukeren må få tydelig lagringsstørrelse-varsel før lokal lagring.',
      'Eksport må kreve eksplisitt personvernadvarsel og aktivt valg om å inkludere media.',
      'Ingen automatisk opplasting, backend-synk eller mediedeling skal legges til i MVP.',
    ],
  },
} as const satisfies Record<'photo' | 'video', MediaSafetyNote>;

export const MAN_DOWN_POST_MVP_NOTE = 'Lokal man-down/inaktivitetsalarm er en sikkerhetskritisk post-MVP-funksjon. Den må behandles som separat produkt- og HMS-design med governance/styring, pålitelighet, falske alarmer, batteribruk, testregime, ansvarslinjer og tydelig fallback før eventuell implementering.';

export function mediaSafetyNotesMarkdown() {
  const lines: string[] = [];
  lines.push('## Media og sikkerhetskritiske funksjoner');
  lines.push('- Foto/video-vedlegg er utsatt i MVP; ingen opplasting, lagring eller eksport av media er aktivert.');
  for (const note of [MEDIA_ATTACHMENT_SAFETY_NOTES.photo, MEDIA_ATTACHMENT_SAFETY_NOTES.video]) {
    lines.push(`- ${note.title}: ${note.summary}`);
    for (const requirement of note.requirementsBeforeImplementation) {
      lines.push(`  - ${requirement}`);
    }
  }
  lines.push(`- ${MAN_DOWN_POST_MVP_NOTE}`);
  return `${lines.join('\n')}\n`;
}
