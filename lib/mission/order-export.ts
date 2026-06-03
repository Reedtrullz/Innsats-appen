export interface FivePointOrderInput {
  situasjon: string;
  oppdrag: string;
  utforelse: string;
  administrasjonForsyning: string;
  ledelseSamband: string;
  notes?: string;
}

export interface CommsPlanInput {
  kanalTalegruppe: string;
  kallesignal: string;
  telefonIssi?: string;
  notes?: string;
}

const ORDER_SOURCE_IDS = ['src-5-punktsordre'];
const COMMS_SOURCE_IDS = ['src-kommunikasjons-og-sambandsdiagram'];
export const EXPORT_SENSITIVITY_WARNING = 'Eksporterte filer kan inneholde operasjonelt sensitiv informasjon. Lagres bare lokalt; del, lagre og slett etter lokale rutiner. Ikke legg inn persondata eller pasientdata.';

function clean(value: string | undefined) {
  return value?.trim() ?? '';
}

function pushOptional(lines: string[], label: string, value?: string) {
  const text = clean(value);
  if (text) lines.push(`- ${label}: ${text}`);
}

export function exportFivePointOrderMarkdown(input: FivePointOrderInput) {
  const lines: string[] = [
    '# 5-punktsordre',
    '',
    '> Beslutningsstøtte for lokal strukturering. Kontroller alltid mot gjeldende ordre, innsatsledelse og lokale systemer før bruk.',
    `> ${EXPORT_SENSITIVITY_WARNING}`,
    '',
    `Kilder: ${ORDER_SOURCE_IDS.join(', ')}`,
    '',
    '## Situasjon',
    clean(input.situasjon),
    '',
    '## Oppdrag',
    clean(input.oppdrag),
    '',
    '## Utførelse',
    clean(input.utforelse),
    '',
    '## Administrasjon/forsyning',
    clean(input.administrasjonForsyning),
    '',
    '## Ledelse/samband',
    clean(input.ledelseSamband),
  ];
  if (clean(input.notes)) {
    lines.push('', '## Notes', clean(input.notes));
  }
  return `${lines.join('\n')}\n`;
}

export function exportCommsPlanMarkdown(input: CommsPlanInput) {
  const lines: string[] = [
    '# Sambandsplan',
    '',
    '> Kontroller mot lokal sambandsplan. Ikke legg inn sensitive abonnentlister eller persondata i MVP-eksporten.',
    `> ${EXPORT_SENSITIVITY_WARNING}`,
    '',
    `Kilder: ${COMMS_SOURCE_IDS.join(', ')}`,
    '',
    '## Samband',
  ];
  pushOptional(lines, 'Kanal/talegruppe', input.kanalTalegruppe);
  pushOptional(lines, 'Kallesignal', input.kallesignal);
  pushOptional(lines, 'Telefon/ISSI', input.telefonIssi);
  pushOptional(lines, 'Notes', input.notes);
  return `${lines.join('\n')}\n`;
}
