export type FivePointOrderTemplateId =
  | 'lagleder-lagforer'
  | 'fig-leder'
  | 'mfe'
  | 'lia-liaison'
  | 'beredskapsvakt';

export interface FivePointOrderTemplateGuidance {
  situasjon: string;
  oppdrag: string;
  utforelse: string;
  administrasjonForsyning: string;
  ledelseSamband: string;
}

export interface FivePointOrderRoleTemplate {
  id: FivePointOrderTemplateId;
  label: string;
  description: string;
  sourceIds: string[];
  guidance: FivePointOrderTemplateGuidance;
}

export interface FivePointOrderInput {
  templateId?: FivePointOrderTemplateId;
  situasjon: string;
  oppdrag: string;
  utforelse: string;
  administrasjonForsyning: string;
  ledelseSamband: string;
  notes?: string;
  readbackConfirmed?: boolean;
  generatedAt?: string;
  contentVersion?: string;
}

export interface CommsPlanInput {
  kanalTalegruppe: string;
  kallesignal: string;
  telefonIssi?: string;
  notes?: string;
}

const ORDER_SOURCE_IDS = ['src-5-punktsordre'];
const COMMS_SOURCE_IDS = ['src-kommunikasjons-og-sambandsdiagram'];
const FIVE_POINT_ORDER_SCHEMA_VERSION = 'five-point-order.v1';
const DEFAULT_CONTENT_VERSION = 'local-mvp';

export const EXPORT_SENSITIVITY_WARNING = 'Eksporterte filer kan inneholde operasjonelt sensitiv informasjon. Lagres bare lokalt; del, lagre og slett etter lokale rutiner. Ikke legg inn persondata eller pasientdata.';

export const FIVE_POINT_ORDER_ROLE_TEMPLATES: FivePointOrderRoleTemplate[] = [
  {
    id: 'lagleder-lagforer',
    label: 'Lagleder/lagfører',
    description: 'Generisk mal for å omsette en mottatt ordre til tydelige rammer for eget lag.',
    sourceIds: ORDER_SOURCE_IDS,
    guidance: {
      situasjon: 'Kort lokal status: hva har skjedd, hvilke rammer gjelder, og hva er avklart/ikke avklart for laget.',
      oppdrag: 'Formuler lagets konkrete oppdrag med ønsket effekt, avgrensning og hvem som støttes.',
      utforelse: 'Beskriv enkel gjennomføring: prioritet, deloppgaver, sikkerhetspunkt og når laget melder endring.',
      administrasjonForsyning: 'Noter lokale behov for materiell, forpleining, transport, hvile og andre praktiske rammer.',
      ledelseSamband: 'Angi hvem laget forholder seg til, generisk kontaktvei etter lokal plan og tidspunkt for statusmeldinger.',
    },
  },
  {
    id: 'fig-leder',
    label: 'FIG-leder',
    description: 'Generisk mal for overordnet koordinering av FIG-ressurser uten operative detaljer.',
    sourceIds: ORDER_SOURCE_IDS,
    guidance: {
      situasjon: 'Overordnet status for innsatsområdet, ressurser, avklarte rammer og kjente lokale begrensninger.',
      oppdrag: 'Definer FIG-bidragets formål, prioriterte støttebehov og hva som skal avklares med innsatsledelse.',
      utforelse: 'Fordel hovedoppgaver på lag/funksjoner, angi beslutningspunkter og rutine for å fange endringer.',
      administrasjonForsyning: 'Oppsummer bemanning, logistikk, utholdenhet, avløsning og lokale støttebehov på et ikke-sensitivt nivå.',
      ledelseSamband: 'Beskriv ledelseslinje, møtepunkter og generiske meldings-/kontaktflater etter lokal plan.',
    },
  },
  {
    id: 'mfe',
    label: 'MFE',
    description: 'Generisk mal for mobil forsterkningsenhet med vekt på avklarte rammer og støttebehov.',
    sourceIds: ORDER_SOURCE_IDS,
    guidance: {
      situasjon: 'Status for anmodning, mottakssted, lokale rammer og hvilke behov som er avklart med oppdragsgiver.',
      oppdrag: 'Beskriv hvilken støtte MFE skal gi, ønsket effekt og avgrensninger som må avklares før innsats.',
      utforelse: 'Skisser etablering, samvirke, prioriterte oppgaver og enkel sikkerhets-/statusrutine uten sensitive detaljer.',
      administrasjonForsyning: 'Noter transport, materiell, utholdenhet, hvile og forsyning som lokale avklaringspunkter.',
      ledelseSamband: 'Angi kontaktpunkt, rapporteringsrytme og generisk kommunikasjonsvei etter lokal plan.',
    },
  },
  {
    id: 'lia-liaison',
    label: 'LIA/liaison',
    description: 'Generisk mal for liaisonfunksjon med åpne avklaringer, kontaktpunkt og informasjonsflyt.',
    sourceIds: ORDER_SOURCE_IDS,
    guidance: {
      situasjon: 'Status hos mottakende/støttet aktør, lokale rammer, kontaktpunkt og åpne avklaringer.',
      oppdrag: 'Formuler liaisonoppdraget: hva skal avklares, hvem støttes, og hvilken informasjon skal deles tilbake.',
      utforelse: 'Beskriv møtepunkter, informasjonsflyt, beslutninger som må løftes og hvordan endringer meldes.',
      administrasjonForsyning: 'Noter praktiske forhold for tilstedeværelse, adgang etter lokale rutiner, hvile og dokumentasjon.',
      ledelseSamband: 'Angi generisk kontaktvei, rapporteringsrytme og hvem som skal informeres ved nye avklaringer.',
    },
  },
  {
    id: 'beredskapsvakt',
    label: 'Beredskapsvakt',
    description: 'Generisk mal for mottak, logging og videreformidling av en ordre på lokalt nivå.',
    sourceIds: ORDER_SOURCE_IDS,
    guidance: {
      situasjon: 'Status ved mottak: hendelse, tidspunkt, lokale rammer, hastegrad og hva som fortsatt er uavklart.',
      oppdrag: 'Oppsummer hva vakten skal iverksette eller videreformidle, inkludert frister og mottaker.',
      utforelse: 'Beskriv trinn for varsling, logging, oppfølging av avklaringer og når ansvar overføres.',
      administrasjonForsyning: 'Noter lokale ressurs-, materiell- og logistikkbehov som må avklares før eller under oppdraget.',
      ledelseSamband: 'Angi hvem som kontaktes, generisk kontaktvei etter lokal plan og hvordan tilbakemelding dokumenteres.',
    },
  },
];

function clean(value: string | undefined) {
  return value?.trim() ?? '';
}

function pushOptional(lines: string[], label: string, value?: string) {
  const text = clean(value);
  if (text) lines.push(`- ${label}: ${text}`);
}

function selectedFivePointOrderTemplate(templateId?: FivePointOrderTemplateId) {
  return FIVE_POINT_ORDER_ROLE_TEMPLATES.find((template) => template.id === templateId) ?? FIVE_POINT_ORDER_ROLE_TEMPLATES[0];
}

function generatedAt(input: FivePointOrderInput) {
  return input.generatedAt ?? new Date().toISOString();
}

function buildFivePointOrderExport(input: FivePointOrderInput) {
  if (input.readbackConfirmed !== true) {
    throw new Error('readbackConfirmed must be true before exporting a 5-punktsordre');
  }
  const template = selectedFivePointOrderTemplate(input.templateId);
  return {
    title: '5-punktsordre',
    template: {
      id: template.id,
      label: template.label,
      guidance: template.guidance,
    },
    readback: {
      confirmed: true,
      label: 'Tilbakelesing/forstått bekreftet',
    },
    metadata: {
      schemaVersion: FIVE_POINT_ORDER_SCHEMA_VERSION,
      contentVersion: clean(input.contentVersion) || DEFAULT_CONTENT_VERSION,
      generatedAt: generatedAt(input),
      sourceIds: ORDER_SOURCE_IDS,
    },
    points: {
      situasjon: clean(input.situasjon),
      oppdrag: clean(input.oppdrag),
      utforelse: clean(input.utforelse),
      administrasjonForsyning: clean(input.administrasjonForsyning),
      ledelseSamband: clean(input.ledelseSamband),
    },
    notes: clean(input.notes),
    warnings: [
      'Beslutningsstøtte for lokal strukturering. Kontroller alltid mot gjeldende ordre, innsatsledelse og lokale systemer før bruk.',
      EXPORT_SENSITIVITY_WARNING,
      'PDF-klar HTML er bare for nettleserens Skriv ut > Lagre som PDF. Ikke offisiell innsending.',
    ],
  };
}

export function exportFivePointOrderMarkdown(input: FivePointOrderInput) {
  const order = buildFivePointOrderExport(input);
  const lines: string[] = [
    '# 5-punktsordre',
    '',
    '> Beslutningsstøtte for lokal strukturering. Kontroller alltid mot gjeldende ordre, innsatsledelse og lokale systemer før bruk.',
    `> ${EXPORT_SENSITIVITY_WARNING}`,
    '> PDF-klar utskrift: bruk PDF-klar HTML og nettleserens Skriv ut > Lagre som PDF. Ikke offisiell innsending.',
    '',
    '## Metadata',
    `- Mal: ${order.template.label}`,
    `- Tilbakelesing/forstått: ${order.readback.confirmed ? 'Bekreftet' : 'Ikke bekreftet'}`,
    `- Kilder: ${order.metadata.sourceIds.join(', ')}`,
    `- Skjemaversjon: ${order.metadata.schemaVersion}`,
    `- Innholdsversjon: ${order.metadata.contentVersion}`,
    `- Generert: ${order.metadata.generatedAt}`,
    '',
    '## Situasjon',
    order.points.situasjon,
    '',
    '## Oppdrag',
    order.points.oppdrag,
    '',
    '## Utførelse',
    order.points.utforelse,
    '',
    '## Administrasjon/forsyning',
    order.points.administrasjonForsyning,
    '',
    '## Ledelse/samband',
    order.points.ledelseSamband,
  ];
  if (order.notes) {
    lines.push('', '## Notes', order.notes);
  }
  return `${lines.join('\n')}\n`;
}

export function exportFivePointOrderJson(input: FivePointOrderInput) {
  return `${JSON.stringify(buildFivePointOrderExport(input), null, 2)}\n`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function markdownToSafeHtml(markdown: string) {
  return markdown.trim().split('\n').map((line) => {
    if (line.startsWith('# ')) return `<h1>${escapeHtml(line.slice(2))}</h1>`;
    if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
    if (line.startsWith('> ')) return `<blockquote>${escapeHtml(line.slice(2))}</blockquote>`;
    if (line.startsWith('- ')) return `<p>${escapeHtml(line)}</p>`;
    if (line.trim() === '') return '';
    return `<p>${escapeHtml(line)}</p>`;
  }).join('\n');
}

export function exportFivePointOrderPdfReadyHtml(input: FivePointOrderInput) {
  const order = buildFivePointOrderExport(input);
  const markdown = exportFivePointOrderMarkdown(input);
  return `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(`5-punktsordre - ${order.template.label}`)}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; margin: 2rem; color: #0f172a; }
    h1, h2 { page-break-after: avoid; }
    blockquote { border-left: 4px solid #f59e0b; margin: 1rem 0; padding: 0.5rem 1rem; background: #fffbeb; }
    p { margin: 0.35rem 0; }
    @media print { body { margin: 1.2rem; } }
  </style>
</head>
<body>
  <p><strong>PDF-klar HTML / bruk nettleserens Skriv ut &gt; Lagre som PDF</strong></p>
  ${markdownToSafeHtml(markdown)}
</body>
</html>
`;
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
