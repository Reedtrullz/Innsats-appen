import { assertNoSensitiveOperationalTextInValue } from '@/lib/privacy/sensitive-text';

export type FivePointOrderTemplateId =
  | 'lagleder-lagforer'
  | 'fig-leder'
  | 'mfe'
  | 'lia-liaison'
  | 'beredskapsvakt';

export type CommsPlanTemplateId = FivePointOrderTemplateId;

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
  templateId?: CommsPlanTemplateId;
  primaryChannel?: string;
  kanalTalegruppe?: string;
  fallbackChannel?: string;
  kallesignal: string;
  ilKoContact?: string;
  districtContact?: string;
  checkInInterval?: string;
  lostCommsProcedure?: string;
  batteryStatus?: string;
  telefonIssi?: string;
  notes?: string;
  generatedAt?: string;
  contentVersion?: string;
}

export interface CommsPlanTemplateGuidance {
  primaryChannel: string;
  fallbackChannel: string;
  kallesignal: string;
  ilKoContact: string;
  districtContact: string;
  checkInInterval: string;
  lostCommsProcedure: string;
  batteryStatus: string;
}

export interface CommsPlanRoleTemplate {
  id: CommsPlanTemplateId;
  label: string;
  description: string;
  sourceIds: string[];
  guidance: CommsPlanTemplateGuidance;
}

const ORDER_SOURCE_IDS = ['src-5-punktsordre'];
const COMMS_SOURCE_IDS = ['src-kommunikasjons-og-sambandsdiagram'];
const FIVE_POINT_ORDER_SCHEMA_VERSION = 'five-point-order.v1';
const COMMS_PLAN_SCHEMA_VERSION = 'sambandsplan.v1';
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

export const COMMS_PLAN_ROLE_TEMPLATES: CommsPlanRoleTemplate[] = [
  {
    id: 'lagleder-lagforer',
    label: 'Lagleder/lagfører',
    description: 'Generisk sambandsplan for eget lag med primær/fallback kontaktvei og enkel statusrytme.',
    sourceIds: COMMS_SOURCE_IDS,
    guidance: {
      primaryChannel: 'Angi primær kanal eller talegruppe slik den er avklart i lokal plan/ordre, uten sensitive tabeller.',
      fallbackChannel: 'Angi fallback kontaktmetode fra lokal plan, for eksempel alternativ kanal eller avtalt vaktkontakt.',
      kallesignal: 'Bruk kallesignal/rollebetegnelse som er avklart lokalt for laget.',
      ilKoContact: 'Noter generisk kontaktpunkt mot IL-KO eller innsatsledelse etter ordre.',
      districtContact: 'Noter kontaktvei til distrikt/beredskapsvakt etter lokal vaktordning.',
      checkInInterval: 'Avklar når laget melder status, ved faste intervaller og ved vesentlige endringer.',
      lostCommsProcedure: 'Beskriv enkel prosedyre ved sambandsbortfall: forsøk fallback, meld når reetablert og møt på avtalt punkt.',
      batteryStatus: 'Kontroller radio, batteri, reservebatteri og lading før innsats.',
    },
  },
  {
    id: 'fig-leder',
    label: 'FIG-leder',
    description: 'Generisk sambandsplan for koordinering av FIG-ressurser på ikke-sensitivt nivå.',
    sourceIds: COMMS_SOURCE_IDS,
    guidance: {
      primaryChannel: 'Avklar primær sambandsflate for ledelse/koordinering mot lokal plan og innsatsledelse.',
      fallbackChannel: 'Avklar fallback kontaktmetode for lederfunksjonen uten å skrive inn lister eller skjermede detaljer.',
      kallesignal: 'Noter lederfunksjonens kallesignal eller rollebetegnelse etter lokal plan.',
      ilKoContact: 'Avklar kontaktpunkt mot IL-KO og hvordan endringer løftes.',
      districtContact: 'Avklar kontaktvei til distrikt/beredskapsvakt for ressurs- og statusmeldinger.',
      checkInInterval: 'Sett statusrytme for lag/funksjoner og når ekstra rapportering kreves.',
      lostCommsProcedure: 'Angi enkel fallback- og samlingsrutine som kan forstås av alle berørte funksjoner.',
      batteryStatus: 'Bekreft at leder-/reserveutstyr har strøm, lader og utholdenhet for planlagt varighet.',
    },
  },
  {
    id: 'mfe',
    label: 'MFE',
    description: 'Generisk sambandsplan for mobil forsterkningsenhet med vekt på mottak, samvirke og statusmeldinger.',
    sourceIds: COMMS_SOURCE_IDS,
    guidance: {
      primaryChannel: 'Avklar primær kontaktvei for MFE med mottakende aktør etter lokal plan.',
      fallbackChannel: 'Avklar fallback for fremføring, mottak og etablering uten sensitive sambandstabeller.',
      kallesignal: 'Bruk avklart MFE-kallesignal eller rollebetegnelse.',
      ilKoContact: 'Noter hvordan MFE kontakter IL-KO eller mottakende innsatsledelse.',
      districtContact: 'Noter kontaktvei til distrikt/beredskapsvakt for ankomst, behov og status.',
      checkInInterval: 'Avklar innsjekking under forflytning, etablering og drift.',
      lostCommsProcedure: 'Beskriv hva enheten gjør ved bortfall av samband under forflytning eller etablering.',
      batteryStatus: 'Kontroller ladestatus, reservebatterier og lademulighet for mobil drift.',
    },
  },
  {
    id: 'lia-liaison',
    label: 'LIA/liaison',
    description: 'Generisk sambandsplan for liaison med tydelige kontaktpunkt og informasjonsflyt.',
    sourceIds: COMMS_SOURCE_IDS,
    guidance: {
      primaryChannel: 'Avklar primær kontaktvei mellom liaison og egen ledelse etter lokal plan.',
      fallbackChannel: 'Avklar fallback kontaktmetode med mottakende/støttet aktør uten skjermede detaljer.',
      kallesignal: 'Noter liaisonens kallesignal eller rollebetegnelse.',
      ilKoContact: 'Noter kontaktpunkt til IL-KO/innsatsledelse og hva som skal meldes videre.',
      districtContact: 'Avklar når distrikt/beredskapsvakt skal orienteres.',
      checkInInterval: 'Sett rytme for status, avklaringer og endringer tilbake til egen ledelse.',
      lostCommsProcedure: 'Beskriv alternativ kontaktvei og hva liaison gjør hvis kontakt ikke oppnås.',
      batteryStatus: 'Kontroller at samband og lademulighet tåler varigheten på liaisonoppdraget.',
    },
  },
  {
    id: 'beredskapsvakt',
    label: 'Beredskapsvakt',
    description: 'Generisk sambandsplan for mottak, logging og videreformidling av sambandspunkter.',
    sourceIds: COMMS_SOURCE_IDS,
    guidance: {
      primaryChannel: 'Noter primær kontaktvei som er avklart i lokal plan eller mottatt ordre.',
      fallbackChannel: 'Noter fallback kontaktmetode for varsling og oppfølging etter lokal vaktordning.',
      kallesignal: 'Avklar kallesignal/rollebetegnelse for vaktfunksjonen og berørte enheter.',
      ilKoContact: 'Noter hvordan IL-KO/innsatsledelse kontaktes eller videreformidles.',
      districtContact: 'Noter distrikts-/beredskapsvaktkontakt etter lokal rutine.',
      checkInInterval: 'Avklar forventet rapporteringsrytme og frister for oppfølging.',
      lostCommsProcedure: 'Beskriv hva vakten gjør når en enhet ikke svarer: fallback, eskalering og logging.',
      batteryStatus: 'Kontroller vakttelefon/radio/lader og eventuell reservekapasitet.',
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

function selectedCommsPlanTemplate(templateId?: CommsPlanTemplateId) {
  return COMMS_PLAN_ROLE_TEMPLATES.find((template) => template.id === templateId) ?? COMMS_PLAN_ROLE_TEMPLATES[0];
}

function generatedAt(input: { generatedAt?: string }) {
  return input.generatedAt ?? new Date().toISOString();
}

function assertExportPayloadSafe(value: unknown, context: string) {
  assertNoSensitiveOperationalTextInValue(value, context);
}

function buildFivePointOrderExport(input: FivePointOrderInput) {
  if (input.readbackConfirmed !== true) {
    throw new Error('readbackConfirmed must be true before exporting a 5-punktsordre');
  }
  const template = selectedFivePointOrderTemplate(input.templateId);
  const order = {
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
  assertExportPayloadSafe({ points: order.points, notes: order.notes }, 'five-point-order');
  return order;
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

const COMMS_PLAN_LOCAL_ONLY_WARNING = 'Kontroller mot lokal sambandsplan. Ikke legg inn sensitive sambandstabeller, abonnentlister, ISSI-lister eller persondata i MVP-eksporten.';

function buildCommsPlanExport(input: CommsPlanInput) {
  const template = selectedCommsPlanTemplate(input.templateId);
  const primaryChannel = clean(input.primaryChannel) || clean(input.kanalTalegruppe);
  const legacyContactReference = clean(input.telefonIssi);
  const plan = {
    title: 'Sambandsplan',
    localOnly: true,
    template: {
      id: template.id,
      label: template.label,
      guidance: template.guidance,
    },
    metadata: {
      schemaVersion: COMMS_PLAN_SCHEMA_VERSION,
      contentVersion: clean(input.contentVersion) || DEFAULT_CONTENT_VERSION,
      generatedAt: generatedAt(input),
      sourceIds: COMMS_SOURCE_IDS,
    },
    fields: {
      primaryChannel,
      fallbackChannel: clean(input.fallbackChannel),
      kallesignal: clean(input.kallesignal),
      ilKoContact: clean(input.ilKoContact),
      districtContact: clean(input.districtContact),
      checkInInterval: clean(input.checkInInterval),
      lostCommsProcedure: clean(input.lostCommsProcedure),
      batteryStatus: clean(input.batteryStatus),
      ...(legacyContactReference ? { legacyContactReference } : {}),
    },
    notes: clean(input.notes),
    warnings: [
      COMMS_PLAN_LOCAL_ONLY_WARNING,
      EXPORT_SENSITIVITY_WARNING,
      'Sambandsplanen er lokal beslutningsstøtte og ikke offisiell innsending eller integrasjon mot kommandosystem.',
      'PDF-klar HTML er bare for nettleserens Skriv ut > Lagre som PDF. Ikke offisiell innsending.',
    ],
  };
  assertExportPayloadSafe({ fields: plan.fields, notes: plan.notes }, 'sambandsplan');
  return plan;
}

export function exportCommsPlanMarkdown(input: CommsPlanInput) {
  const plan = buildCommsPlanExport(input);
  const lines: string[] = [
    '# Sambandsplan',
    '',
    `> ${COMMS_PLAN_LOCAL_ONLY_WARNING}`,
    `> ${EXPORT_SENSITIVITY_WARNING}`,
    '> Lokal beslutningsstøtte; ikke offisiell innsending eller integrasjon mot kommandosystem.',
    '> PDF-klar utskrift: bruk PDF-klar HTML og nettleserens Skriv ut > Lagre som PDF. Ikke offisiell innsending.',
    '',
    '## Metadata',
    `- Mal: ${plan.template.label}`,
    `- Kilder: ${plan.metadata.sourceIds.join(', ')}`,
    `- Skjemaversjon: ${plan.metadata.schemaVersion}`,
    `- Innholdsversjon: ${plan.metadata.contentVersion}`,
    `- Generert: ${plan.metadata.generatedAt}`,
    '',
    '## Samband',
  ];
  pushOptional(lines, 'Primær kanal/talegruppe', plan.fields.primaryChannel);
  pushOptional(lines, 'Fallback kanal/kontaktmetode', plan.fields.fallbackChannel);
  pushOptional(lines, 'Kallesignal', plan.fields.kallesignal);
  pushOptional(lines, 'IL-KO kontakt', plan.fields.ilKoContact);
  pushOptional(lines, 'Distrikt/beredskapsvakt kontakt', plan.fields.districtContact);
  pushOptional(lines, 'Innsjekkingsintervall', plan.fields.checkInInterval);
  pushOptional(lines, 'Prosedyre ved bortfall av samband', plan.fields.lostCommsProcedure);
  pushOptional(lines, 'Batteri-/ladestatus', plan.fields.batteryStatus);
  pushOptional(lines, 'Ekstra lokal kontaktreferanse (legacy)', plan.fields.legacyContactReference);
  if (plan.notes) {
    lines.push('', '## Notes', plan.notes);
  }
  return `${lines.join('\n')}\n`;
}

export function exportCommsPlanJson(input: CommsPlanInput) {
  return `${JSON.stringify(buildCommsPlanExport(input), null, 2)}\n`;
}

export function exportCommsPlanPdfReadyHtml(input: CommsPlanInput) {
  const plan = buildCommsPlanExport(input);
  const markdown = exportCommsPlanMarkdown(input);
  return `<!doctype html>
<html lang="nb">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(`Sambandsplan - ${plan.template.label}`)}</title>
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
