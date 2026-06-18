import fs from 'node:fs';
import yaml from 'js-yaml';
import { competenceCodes, competenceLabels, equipmentLabels, equipmentTerms } from '@/lib/content/taxonomy';
import { stepSearchText } from '@/lib/content/steps';

const readYaml = (path: string) => yaml.load(fs.readFileSync(path, 'utf8')) as any[];

const group5ACompetenceLabels: Record<string, RegExp> = {
  FIG10: /FIG10|grunnkurs/i,
  FIG20: /FIG20|lagfører/i,
  FIG30: /FIG30|leder/i,
  FIG31: /FIG31|videregående/i,
  MFE10: /MFE10|mobil forsterkningsenhet/i,
  MRE10: /MRE10|mobil renseenhet/i,
  MRE30: /MRE30|lagfører.*MRE|leder.*MRE/i,
  RAD10: /RAD10|RADIAC/i,
  RAD30: /RAD30|RADIAC/i,
  ATV: /ATV/i,
  BAT: /båt|BAT/i,
  LETT_LASTEBIL: /lett lastebil/i,
  SPS40: /SPS40|samvirke på skadested/i,
  SPS41: /SPS41|forurenset skadested|CBRN/i,
};

const group5ATrainingCodes = [
  'FIG20',
  'FIG30',
  'FIG31',
  'RAD30',
  'MRE30',
  'ATV',
  'BAT',
  'LETT_LASTEBIL',
  'SPS40',
  'SPS41',
];

const group5BEquipmentIds = [
  'personlig-utrustning',
  'verneutstyr',
  'kjoretoy',
  'slangeutlegg',
  'telt',
  'varmeapparat',
  'pumpe',
  'aggregat',
  'belysning',
  'samband',
] as const;

const group5CMbkChecklists: Record<string, string[]> = {
  'mbk-kjoretoy': ['kjoretoy'],
  'mbk-brann-slange': ['slangeutlegg'],
  'mbk-telt': ['telt'],
  'mbk-varmeapparat': ['varmeapparat'],
  'mbk-pumpe': ['pumpe'],
  'mbk-aggregat': ['aggregat'],
  'mbk-belysning': ['belysning'],
  'mbk-samband': ['samband'],
  'mbk-personlig-utstyr': ['personlig-utrustning', 'verneutstyr'],
};

const unsafeEquipmentTaxonomyTerms = [
  /\b(?:serienummer|serial\s*number|s\/n)\b/i,
  /\b(?:materiellnummer|inventarnummer|utstyrsnummer)\b/i,
  /\b(?:privat|skjermet|sensitiv)(?:e)?\s+(?:depot|lager|lokasjon|adresse|plassering|sted)(?:er)?\b/i,
  /\b(?:personnummer|fødselsnummer|fodselsnummer|persondata|personopplysninger)\b/i,
  /\b(?:ISSI[-\s]?(?:liste|lister)|abonnent(?:liste|lister)|Nødnett-abonnent|Nodnett-abonnent)\b/i,
];

const highRiskCompetenceScenarios = new Set(['cbrn-cbrne', 'radiac-nedfall', 'mfe-stotte', 'skogbrann', 'skred', 'samleplass-skadde']);

const group4ActionCardSlugs = [
  'oppdragsanalyse',
  'obbo-beslutningssloyfe',
  'ledelse-kommando-kontroll',
  'presse-og-mediahandtering',
  'etikk-og-rollegrenser',
  'alvorlig-ulykke-dod-eget-personell',
  'akutt-113-livreddende-forstehjelp',
  'psykologisk-forstehjelp-sekvens',
  'psykososial-ikke-tvungen-debrief',
  'skogbrann-startkort',
  'skogbrann-vannforsyningsplan',
  'brann-vannforsyning-slange',
  'sok-og-redning-startkort',
  'soketeig-sektor',
  'flom-pumpe-vannforsyning',
  'skred-sikkerhet-samvirke',
  'evakueringsstotte',
  'samleplass-skadde-utvidet',
  'tilfluktsrom-offentlig-beredskap',
  'cbrne-soneinndeling',
  'cbrne-verneutstyr-stoppkriterier',
  'mre-ren-uren-side-grovrens',
  'radiac-malepunkt',
  'radiac-oppholdstid-rullering',
  'mfe-anmodning-mottak-oppfolging',
  'posisjonsrapport-kart-kompass-gps',
  'rute-og-evakueringsvei',
  'kjoretoy-transportberedskap',
  'atv-bat-transportlogistikk',
  'pumpe-stromfare',
  'kontaminert-utstyr-handtering',
];

const cardText = (card: any) => [
  card.title,
  card.slug,
  ...(card.steps ?? []).map(stepSearchText),
  ...(card.safety ?? []),
  // doNot included: P1-2 dedup moved prohibition lines out of safety, but the
  // guidance still surfaces on the card via the "Ikke gjør" box.
  ...(card.doNot ?? []),
  ...(card.reporting ?? []),
  card.warning ?? '',
].join('\n');

const sensitiveDataTerms = [
  /\b(?:personnummer|fødselsnummer|fodselsnummer)\b/i,
  /\bpasientjournal\w*\b/i,
  /\bISSI[-\s]?list(?:e|er)?\b/i,
  /\babonnentlist(?:e|er)?\b/i,
  /\bpersonidentifiserende\s+(?:detaljer|informasjon|opplysninger)\b/i,
  /\b(?:hemmelig|gradert)(?:e)?(?:\s+(?:innhold|informasjon|dokumenter?|opplysninger?))?\b/i,
  /\b(?:private?|skjermede?|sensitive?)(?:\/(?:private?|skjermede?|sensitive?))*\s+(?:lokasjoner?|adresser?|rom|steder?|lokasjonsdata)\b/i,
];

const unsafeSensitiveDataActionPattern =
  '(?:lagre|registrer(?:e|er)?|del(?:e|er)?|send(?:e|er)?|publiser(?:e|er)?|loggfør(?:e|er)?|noter(?:e|er)?|oppgi|legg\\s+inn|før\\s+inn)';
const unsafeSensitiveDataActions = new RegExp(`\\b${unsafeSensitiveDataActionPattern}\\b`, 'i');
const clauseBoundaries = ['\n', ',', '.', ';', ':', '!', '?'];

const globalTerm = (term: RegExp) => new RegExp(term.source, 'gi');

const actionSensitiveSegmentBefore = (line: string, index: number) => {
  const punctuationStart = clauseBoundaries.reduce(
    (start, boundary) => Math.max(start, line.lastIndexOf(boundary, index - 1) + 1),
    0,
  );
  const clausePrefix = line.slice(punctuationStart, index);
  const positiveConjunction = /\bog\b/gi;
  let segmentStart = 0;

  for (const match of clausePrefix.matchAll(positiveConjunction)) {
    if (match.index !== undefined) segmentStart = match.index + match[0].length;
  }

  return clausePrefix.slice(segmentStart);
};

const hasQualifiedSafeSensitiveDataBoundary = (segmentBeforeSensitiveTerm: string) => {
  const actionMatches = [...segmentBeforeSensitiveTerm.matchAll(new RegExp(`\\b${unsafeSensitiveDataActionPattern}\\b`, 'gi'))];
  const lastAction = actionMatches.at(-1);
  if (!lastAction || lastAction.index === undefined) return true;

  const beforeAction = segmentBeforeSensitiveTerm.slice(0, lastAction.index);
  const afterAction = segmentBeforeSensitiveTerm.slice(lastAction.index + lastAction[0].length);

  return (
    /\bikke\b/i.test(beforeAction) ||
    /\bikke\b/i.test(afterAction) ||
    /\b(?:ingen|uten|bare\s+offentlig|kun\s+anonymisert|anonymiser(?:t|e))\b[^\n,.;:!?]*$/i.test(afterAction)
  );
};

const hasUnsafeSensitiveDataInstruction = (line: string) => {
  for (const term of sensitiveDataTerms) {
    for (const match of line.matchAll(globalTerm(term))) {
      if (match.index === undefined) continue;

      const segmentBeforeSensitiveTerm = actionSensitiveSegmentBefore(line, match.index);
      const usesUnsafeActionBeforeTerm = unsafeSensitiveDataActions.test(segmentBeforeSensitiveTerm);

      if (usesUnsafeActionBeforeTerm && !hasQualifiedSafeSensitiveDataBoundary(segmentBeforeSensitiveTerm)) {
        return true;
      }
    }
  }

  return false;
};

const expectNoUnsafeSensitiveDataInstruction = (slug: string, content: string) => {
  for (const line of content.split('\n')) {
    expect(
      hasUnsafeSensitiveDataInstruction(line),
      `${slug} must not positively store/share sensitive data: ${line}`,
    ).toBe(false);
  }
};

it('unsafe-sensitive-data guard requires a qualified safe boundary', () => {
  expect(hasUnsafeSensitiveDataInstruction('Registrer private adresser uten forsinkelse')).toBe(true);
  expect(hasUnsafeSensitiveDataInstruction('Lagre gradert informasjon, ikke slett den')).toBe(true);
  expect(hasUnsafeSensitiveDataInstruction('Lagre gradert informasjon og send rapport uten gradert informasjon')).toBe(true);
  expect(hasUnsafeSensitiveDataInstruction('Ikke registrer private adresser og lagre gradert informasjon')).toBe(true);
  expect(hasUnsafeSensitiveDataInstruction('Lagre ikke noe og registrer private adresser')).toBe(true);
  expect(hasUnsafeSensitiveDataInstruction('Ikke del sensitive lokasjoner og publiser gradert informasjon')).toBe(true);
  expect(hasUnsafeSensitiveDataInstruction('Ikke registrer private adresser')).toBe(false);
  expect(hasUnsafeSensitiveDataInstruction('Rapporter status uten personidentifiserende detaljer')).toBe(false);
  expect(hasUnsafeSensitiveDataInstruction('Loggfør status uten personidentifiserende detaljer')).toBe(false);
});

it('curated YAML includes required starter slugs', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const training = readYaml('content/curated/training-paths.yaml');
  const exportTemplates = readYaml('content/curated/export-templates.yaml');
  const cardSlugs = cards.map((card) => card.slug);
  const exportTemplateIds = exportTemplates.map((template) => template.id);
  expect(cardSlugs).toContain('fem-punktsordre');
  expect(cardSlugs).toContain('sambandsplan-start');
  expect(cardSlugs).toContain('tilfluktsrom-klargjoring');
  expect(cardSlugs).toContain('cbrne-startkort');
  expect(cardSlugs).toContain('radiac-dosekontroll');
  expect(cardSlugs).toContain('mfe-anmodning');
  expect(training.map((path) => path.slug)).toContain('fig10-grunnkurs');
  expect(exportTemplateIds).toEqual(expect.arrayContaining([
    'fem-punktsordre-markdown',
    'fem-punktsordre-json',
    'fem-punktsordre-pdf',
    'sambandsplan-markdown',
    'sambandsplan-json',
    'sambandsplan-pdf',
  ]));
  for (const id of ['fem-punktsordre-markdown', 'fem-punktsordre-json', 'fem-punktsordre-pdf']) {
    const template = exportTemplates.find((item) => item.id === id);
    expect(template?.sourceIds).toEqual(['src-5-punktsordre']);
    expect(template?.audienceRoles).toEqual(expect.arrayContaining(['lagforer', 'leder', 'mfe', 'beredskapsvakt']));
  }
  for (const id of ['sambandsplan-markdown', 'sambandsplan-json', 'sambandsplan-pdf']) {
    const template = exportTemplates.find((item) => item.id === id);
    expect(template?.sourceIds).toEqual(['src-kommunikasjons-og-sambandsdiagram']);
    expect(template?.audienceRoles).toEqual(expect.arrayContaining(['lagforer', 'leder', 'mfe', 'liaison', 'beredskapsvakt']));
    expect(template?.description).toMatch(/lokal|PDF-klar|JSON|Markdown/i);
  }
});

it('curated pilot/public content does not cite rejected-for-pilot deep-research sources', () => {
  const sources = readYaml('content/generated/source-documents.json');
  const rejectedSourceIds = new Set(
    sources
      .filter((source) => source.pilotReviewStatus === 'rejected-for-pilot')
      .map((source) => source.id),
  );
  const files = [
    'content/curated/action-cards.yaml',
    'content/curated/checklists.yaml',
    'content/curated/protection-measures.yaml',
    'content/curated/glossary.yaml',
    'content/curated/faq.yaml',
    'content/curated/must-read.yaml',
    'content/curated/changelog.yaml',
    'content/curated/equipment-taxonomy.yaml',
  ];
  const rejectedReferences: string[] = [];

  const collect = (file: string, label: string, item: any) => {
    for (const sourceId of item.sourceIds ?? []) {
      if (rejectedSourceIds.has(sourceId)) rejectedReferences.push(`${file}:${label}:${sourceId}`);
    }
  };

  for (const file of files) {
    const records = readYaml(file);
    for (const record of records) {
      const label = record.slug ?? record.id ?? record.term ?? record.title ?? 'unknown';
      collect(file, label, record);
      for (const item of record.items ?? []) collect(file, `${label}:item:${item.id ?? item.label}`, item);
    }
  }

  expect(rejectedReferences).toEqual([]);
});

it('keeps pilot-approved tilfluktsrom cards free of stale source-approval warnings', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const sources = readYaml('content/generated/source-documents.json');
  const source = sources.find((item) => item.id === 'src-operativt-konsept-for-sivilforsvaret');
  const tilfluktsromCardSlugs = ['tilfluktsrom-klargjoring', 'tilfluktsrom-offentlig-beredskap'];

  expect(source?.pilotReviewStatus).toBe('approved-for-pilot');

  for (const slug of tilfluktsromCardSlugs) {
    const card = cards.find((item) => item.slug === slug);
    const warning = card?.warning ?? '';
    const cardBoundaryText = [warning, ...(card?.safety ?? []), ...((card?.steps ?? []).map(stepSearchText))].join('\n');

    expect(card, `missing tilfluktsrom action card ${slug}`).toBeTruthy();
    expect(card?.sourceIds).toContain('src-operativt-konsept-for-sivilforsvaret');
    expect(warning, `${slug} must not carry stale source approval warning`).not.toMatch(/Ikke kildegodkjent for pilot/i);
    expect(cardBoundaryText, `${slug} must keep private/sheltered-location caveats`).toMatch(/private|skjermede?|skjermet/i);
    expect(cardBoundaryText, `${slug} must keep official-authority/order caveats`).toMatch(/ikke offisiell ordre|ikke.*fullstendig oversikt|ansvarlig myndighet|ordre/i);
  }
});

it('taxonomy includes Group 5A competence codes with Norwegian labels', () => {
  for (const [code, labelPattern] of Object.entries(group5ACompetenceLabels)) {
    expect(competenceCodes, `missing competence code ${code}`).toContain(code);
    expect(competenceLabels[code as keyof typeof competenceLabels], `${code} must have a Norwegian label`).toMatch(labelPattern);
  }
});

it('curated equipment taxonomy covers every equipment term and required Group 5B equipment groups', () => {
  const equipmentTaxonomy = readYaml('content/curated/equipment-taxonomy.yaml');
  const sourceIds = new Set(readYaml('content/generated/source-documents.json').map((source) => source.id));
  const recordsById = new Map(equipmentTaxonomy.map((record) => [record.id, record]));

  expect(equipmentTaxonomy.map((record) => record.id)).toHaveLength(recordsById.size);
  expect(equipmentTerms).toEqual(expect.arrayContaining([...group5BEquipmentIds]));

  for (const id of equipmentTerms) {
    const label = equipmentLabels[id];
    const record = recordsById.get(id);

    expect(label, `${id} must have a label in equipmentLabels`).toEqual(expect.any(String));
    expect(label.length, `${id} label must not be empty`).toBeGreaterThan(0);
    expect(record, `${id} must have a curated equipment-taxonomy record`).toBeTruthy();
    expect(record?.label, `${id} record label must match equipmentLabels`).toBe(label);
  }

  for (const id of group5BEquipmentIds) {
    expect(recordsById.has(id), `missing Group 5B equipment taxonomy record ${id}`).toBe(true);
  }

  for (const record of equipmentTaxonomy) {
    expect(record.approvedForPublicUse, `${record.id} must be public-approved`).toBe(true);
    expect(record.sourceIds?.length, `${record.id} must cite at least one source`).toBeGreaterThan(0);
    for (const sourceId of record.sourceIds ?? []) {
      expect(sourceIds, `${record.id} references missing source ${sourceId}`).toContain(sourceId);
    }
  }
});

it('curated equipment taxonomy avoids private inventories and sensitive samband list language', () => {
  const equipmentTaxonomy = readYaml('content/curated/equipment-taxonomy.yaml');

  for (const record of equipmentTaxonomy) {
    const recordText = [record.id, record.label, record.category, ...(record.aliases ?? [])].join('\n');
    for (const unsafeTerm of unsafeEquipmentTaxonomyTerms) {
      expect(recordText, `${record.id} contains unsafe equipment taxonomy language matching ${unsafeTerm}`).not.toMatch(
        unsafeTerm,
      );
    }
  }
});

it('curated training paths include Group 5A competence records with source IDs and useful card links', () => {
  const training = readYaml('content/curated/training-paths.yaml');
  const cards = readYaml('content/curated/action-cards.yaml');
  const sourceIds = new Set(readYaml('content/generated/source-documents.json').map((source) => source.id));
  const cardSlugs = new Set(cards.map((card) => card.slug));
  const byCode = new Map(training.map((path) => [path.courseCode, path]));

  expect([...byCode.keys()]).toEqual(expect.arrayContaining([...Object.keys(group5ACompetenceLabels)]));

  for (const code of group5ATrainingCodes) {
    const path = byCode.get(code);
    expect(path, `missing training path for ${code}`).toBeTruthy();
    expect(path.slug, `${code} slug`).toEqual(expect.any(String));
    expect(path.title, `${code} title`).toMatch(group5ACompetenceLabels[code]);
    expect(path.sourceIds?.length, `${code} must cite at least one existing source`).toBeGreaterThan(0);
    for (const sourceId of path.sourceIds ?? []) {
      expect(sourceIds, `${code} references missing source ${sourceId}`).toContain(sourceId);
    }
    for (const linkedSlug of path.linkedCardSlugs ?? []) {
      expect(cardSlugs, `${code} links missing action card ${linkedSlug}`).toContain(linkedSlug);
    }
  }

  expect(byCode.get('FIG20')?.linkedCardSlugs).toEqual(expect.arrayContaining(['oppdragsanalyse', 'ledelse-kommando-kontroll']));
  expect(byCode.get('RAD30')?.linkedCardSlugs).toEqual(expect.arrayContaining(['radiac-malepunkt', 'radiac-oppholdstid-rullering']));
  expect(byCode.get('MRE30')?.linkedCardSlugs).toEqual(expect.arrayContaining(['mre-ren-uren-side-grovrens']));
  expect(byCode.get('ATV')?.linkedCardSlugs).toEqual(expect.arrayContaining(['atv-bat-transportlogistikk', 'kjoretoy-transportberedskap']));
  expect(byCode.get('BAT')?.linkedCardSlugs).toEqual(expect.arrayContaining(['atv-bat-transportlogistikk', 'evakueringsstotte']));
  expect(byCode.get('LETT_LASTEBIL')?.linkedCardSlugs).toEqual(expect.arrayContaining(['atv-bat-transportlogistikk', 'kjoretoy-transportberedskap']));
  expect(byCode.get('SPS41')?.linkedCardSlugs).toEqual(expect.arrayContaining(['cbrne-soneinndeling']));
  expect(byCode.get('SPS40')?.targetRoles).toEqual(['lagforer', 'leder']);
  expect(byCode.get('SPS41')?.targetRoles).toEqual(['lagforer', 'leder']);
});

it('high-risk action cards declare competence requirements or an explicit competence rationale', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const highRiskCards = cards.filter(
    (card) => card.priority === 'high' || (card.scenarios ?? []).some((scenario: string) => highRiskCompetenceScenarios.has(scenario)),
  );

  expect(highRiskCards.length).toBeGreaterThan(0);
  for (const card of highRiskCards) {
    const hasCompetence = (card.competenceRequired ?? []).length > 0;
    const hasRationale = typeof card.competenceRationale === 'string' && card.competenceRationale.trim().length > 0;
    expect(hasCompetence || hasRationale, `${card.slug} must have competenceRequired or competenceRationale`).toBe(true);
  }
});

it('curated sambandsjekk checklist covers required local-only samband controls', () => {
  const checklists = readYaml('content/curated/checklists.yaml');
  const bySlug = new Map(checklists.map((checklist) => [checklist.slug, checklist]));
  const sambandsjekk = bySlug.get('sambandsjekk');

  expect(sambandsjekk?.sourceIds).toEqual(['src-kommunikasjons-og-sambandsdiagram']);
  expect(sambandsjekk?.warning).toMatch(/ingen sensitive sambandstabeller/i);
  expect(sambandsjekk?.warning).toMatch(/ISSI-lister/i);
  expect(sambandsjekk?.warning).toMatch(/persondata/i);
  expect(sambandsjekk?.items.map((item: any) => item.id)).toEqual([
    'primaer-kanal-talegruppe-kontrollert',
    'fallback-kanal-kontaktmetode-kontrollert',
    'kallesignal-avklart',
    'il-ko-kontakt-avklart',
    'distrikt-beredskapsvakt-kontakt-avklart',
    'innsjekkingsintervall-avklart',
    'lost-comms-prosedyre-avklart',
    'batteri-lading-kontrollert',
  ]);
  for (const item of sambandsjekk?.items ?? []) {
    expect(item.sourceIds).toContain('src-kommunikasjons-og-sambandsdiagram');
  }
});

it('curated Group 5C MBK checklists cover grouped equipment status without unsafe inventory language', () => {
  const checklists = readYaml('content/curated/checklists.yaml');
  const sourceIds = new Set(readYaml('content/generated/source-documents.json').map((source) => source.id));
  const bySlug = new Map(checklists.map((checklist) => [checklist.slug, checklist]));

  for (const [slug, requiredEquipment] of Object.entries(group5CMbkChecklists)) {
    const checklist = bySlug.get(slug);
    expect(checklist, `missing Group 5C MBK checklist ${slug}`).toBeTruthy();
    expect(checklist.phase, `${slug} phase`).toMatch(/^(for|etter)$/);
    expect(checklist.roles, `${slug} roles`).toEqual(expect.arrayContaining(['materiellansvarlig', 'lagforer', 'stab-logistikk']));
    expect(checklist.scenarios, `${slug} scenarios`).toEqual(['generelt']);
    expect(checklist.equipmentRequired, `${slug} equipmentRequired`).toEqual(expect.arrayContaining(requiredEquipment));
    expect(checklist.warning, `${slug} warning`).toMatch(/lokal/i);
    expect(checklist.warning, `${slug} warning`).toMatch(/ikke offisiell inventarliste|ingen sentral/i);
    expect(checklist.items?.length, `${slug} items`).toBeGreaterThanOrEqual(4);
    expect(checklist.items?.map((item: any) => item.id), `${slug} required controls`).toEqual(expect.arrayContaining([
      'status-kontrollert',
      'mangler-skade-forbruk-notert-lokalt',
      'vask-service-karantene-vurdert',
      'klarstatus-rapportert',
    ]));
    for (const sourceId of checklist.sourceIds ?? []) {
      expect(sourceIds, `${slug} references missing source ${sourceId}`).toContain(sourceId);
    }
    for (const item of checklist.items ?? []) {
      expect(item.required, `${slug}/${item.id} should be required`).toBe(true);
      expect(item.sourceIds?.length, `${slug}/${item.id} sourceIds`).toBeGreaterThan(0);
    }
    const text = [checklist.slug, checklist.title, checklist.warning, ...(checklist.items ?? []).map((item: any) => item.label)].join('\n');
    expect(text, `${slug} should mention status states`).toMatch(/klar|mangler|skadet|forbrukt|vask|service|karantene/i);
    expect(text, `${slug} must not include sensitive inventory words`).not.toMatch(/serienummer|serial|materiellnummer|inventarnummer|depot|lager|ISSI|abonnentliste|Nødnett-detalj/i);
    expectNoUnsafeSensitiveDataInstruction(slug, text);
  }
});

it('curated Group 2A/2B checklists cover før utrykning, expanded under innsats and first etter innsats workflow steps', () => {
  const checklists = readYaml('content/curated/checklists.yaml');
  const bySlug = new Map(checklists.map((checklist) => [checklist.slug, checklist]));

  const forInnsats = bySlug.get('fig-for-innsats');
  expect(forInnsats?.items.map((item: any) => item.id)).toEqual([
    'kontakt-beredskapsvakt',
    'fremmoteliste',
    'personell-skikkethet-sikkerhet-helse',
    'personlig-utstyr',
    'fellesutstyr',
    'kjoretoy-klar',
    'drivstoff-beredskap',
    'vaer-og-farevurdering',
    'forelopig-plan',
    'ordre-tilbakelesing',
    'logg-startet',
    'klar-til-distrikt',
  ]);

  expect(bySlug.get('for-utrykning-samlet')?.items.map((item: any) => item.id)).toEqual([
    'kontakt-og-mottak',
    'personell-og-sikkerhet',
    'utstyr-kjoretoy-drivstoff',
    'vaer-farer-og-plan',
    'ordre-logg-og-klar',
  ]);

  const personalEquipment = bySlug.get('personlig-utstyr-for-utrykning');
  expect(personalEquipment?.warning).toMatch(/ingen sentral personlig inventarliste/i);
  expect(personalEquipment?.warning).toMatch(/ikke persondata/i);

  const teamEquipment = bySlug.get('lagsutstyr-for-utrykning');
  expect(teamEquipment?.warning).toMatch(/lokal oppdragseksport/i);
  expect(teamEquipment?.items.map((item: any) => item.id)).toEqual(expect.arrayContaining(['fellesutstyr-komplett', 'mangler-notert-lokalt']));

  expect(bySlug.get('fig-under-innsats')?.items.map((item: any) => item.id)).toEqual([
    'ankomst-og-egen-sikkerhet',
    'oppmarsjomrade-plassering',
    'kontakt-innsatsleder',
    'overtakelse-fra-annen-enhet',
    'ressurs-og-utstyr-revurdert',
    'anmod-ekstra-ressurser',
    'kontinuerlig-personellkontroll',
    'kontinuerlig-risikovurdering',
    'lopende-dialog-innsatsleder',
    'ny-analyse-ved-endring',
    'mat-vann-hvile',
    'avlosning-planlagt',
    'psykososial-efok-trigger',
    'overlevering-avmarsj',
  ]);

  const underInnsats = bySlug.get('fig-under-innsats');
  expect(underInnsats?.warning).toMatch(/ikke legg inn navn/i);
  expect(underInnsats?.items.find((item: any) => item.id === 'psykososial-efok-trigger')?.sourceIds).toContain('src-psykososial-oppfolging-og-kollegastotte');
  expect(underInnsats?.items.find((item: any) => item.id === 'lopende-dialog-innsatsleder')?.sourceIds).toContain('src-kommunikasjons-og-sambandsdiagram');

  expect(bySlug.get('fig-etter-innsats')?.items.map((item: any) => item.id)).toEqual([
    'personellkontroll-etter',
    'skade-eller-personellskade-eskalering',
    'defuse-emosjonell-gjennomgang',
    'efok-oppfolging-vurdert',
    'teknisk-gjennomgang',
    'utstyr-retur',
    'vask',
    'mbk-materiellberedskap-vurdert',
    'skriftlig-rapport-paminnelse',
    'oppmote-reisegrunnlag-komplett',
    'tap-skade-melding-paminnelse',
    'dimittering-avklart-distrikt',
    'oppfolging',
  ]);
});

it('curated workflow expansion adds source-backed scenario checklists for flom, search, MFE, MRE and RADIAC', () => {
  const checklists = readYaml('content/curated/checklists.yaml');
  const sourceIds = new Set(readYaml('content/generated/source-documents.json').map((source) => source.id));
  const bySlug = new Map(checklists.map((checklist) => [checklist.slug, checklist]));
  const expected = {
    'flom-pumpe-under-innsats': {
      scenarios: ['flom'],
      sources: ['src-eksempler-pa-utlegg-fra-pumpe', 'src-tiltakskort-under-innsats'],
      terms: /pumpested|slangevei|strømfare|vannstand|avløsning/i,
    },
    'sok-og-redning-sektor-under': {
      scenarios: ['sok-og-redning'],
      sources: ['src-vedlegg-c-operative-forhold', 'src-tiltakskort-under-innsats'],
      terms: /teig|startpunkt|dekningsgrad|observasjoner|KO/i,
    },
    'mfe-mottak-under': {
      scenarios: ['mfe-stotte'],
      sources: ['src-tiltakskort-05-stotte-av-mfe', 'src-tiltakskort-06-oppsettende-mfe-distrikt', 'src-sjekkliste-mobil-forsterkningsenhet-mfe'],
      terms: /oppstartsmøte|liaison|mottak|materiell|demobilisering/i,
    },
    'cbrn-mre-rens-under': {
      scenarios: ['cbrn-cbrne'],
      sources: ['src-veileder-for-sivilforsvarets-renseenheter-cbrn', 'src-sjekkliste-mobil-renseenhet-mre'],
      terms: /ren side|uren side|grovrens|renseflyt|avfall/i,
    },
    'radiac-maleoppdrag-under': {
      scenarios: ['radiac-nedfall'],
      sources: ['src-bestemmelse-radiacmaletjeneste-del-i', 'src-sjekkliste-radiaclag-rad', 'src-grunnopplaering-rad-10-mannskap'],
      terms: /målepunkt|instrument|dosimeter|dosekontrollskjema|GPS/i,
    },
  };

  for (const [slug, expectation] of Object.entries(expected)) {
    const checklist = bySlug.get(slug);
    expect(checklist, `missing workflow checklist ${slug}`).toBeTruthy();
    expect(checklist.phase, `${slug} phase`).toBe('under');
    expect(checklist.scenarios, `${slug} scenarios`).toEqual(expectation.scenarios);
    expect(checklist.sourceIds, `${slug} sources`).toEqual(expect.arrayContaining(expectation.sources));
    expect(checklist.warning, `${slug} warning`).toMatch(/lokal|beslutningsstøtte/i);
    expect(checklist.warning, `${slug} warning`).toMatch(/ordre|innsatsleder|fagmyndighet|ingen persondata/i);
    expect(checklist.items?.length, `${slug} item depth`).toBeGreaterThanOrEqual(5);
    expect(checklist.items?.some((item: any) => item.required), `${slug} required items`).toBe(true);
    const text = [checklist.title, checklist.warning, ...(checklist.items ?? []).map((item: any) => item.label)].join('\n');
    expect(text, `${slug} operational terms`).toMatch(expectation.terms);
    expect(text, `${slug} no rejected source wording`).not.toMatch(/deep research/i);
    expectNoUnsafeSensitiveDataInstruction(slug, text);
    for (const sourceId of checklist.sourceIds ?? []) {
      expect(sourceIds, `${slug} references missing source ${sourceId}`).toContain(sourceId);
    }
    for (const item of checklist.items ?? []) {
      expect(item.sourceIds?.length, `${slug}/${item.id} sourceIds`).toBeGreaterThan(0);
      for (const sourceId of item.sourceIds ?? []) {
        expect(sourceIds, `${slug}/${item.id} references missing source ${sourceId}`).toContain(sourceId);
      }
    }
  }
});

it('curated Group 4 action cards exist with source-backed public/offline boundaries', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const bySlug = new Map(cards.map((card) => [card.slug, card]));

  expect(cards.map((card) => card.slug)).toEqual(expect.arrayContaining(group4ActionCardSlugs));

  for (const slug of group4ActionCardSlugs) {
    const card = bySlug.get(slug);
    expect(card, `missing Group 4 card ${slug}`).toBeTruthy();
    expect(card.sourceIds?.length, `${slug} must have sourceIds`).toBeGreaterThan(0);
    expect(card.steps?.length, `${slug} must have steps`).toBeGreaterThan(0);
    expect(card.warning, `${slug} must have warning text`).toEqual(expect.any(String));
    expect(card.warning.length, `${slug} warning must not be empty`).toBeGreaterThan(0);
    expectNoUnsafeSensitiveDataInstruction(slug, cardText(card));
  }
});

it('curated Group 4 action cards enforce operational safety and data-minimization constraints', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const bySlug = new Map(cards.map((card) => [card.slug, card]));
  const text = (slug: string) => cardText(bySlug.get(slug));

  expect(text('psykososial-ikke-tvungen-debrief')).toMatch(/ikke\s+(gjennomfør|bruk).*tvungen debrief/i);
  expect(text('psykososial-ikke-tvungen-debrief')).toMatch(/ikke\s+press.*detalj/i);
  expect(text('psykologisk-forstehjelp-sekvens')).toMatch(/ro|trygghet/i);
  expect(text('psykologisk-forstehjelp-sekvens')).toMatch(/ikke\s+press/i);

  expect(text('samleplass-skadde-utvidet')).toMatch(/ikke\s+registrer.*journalfelt/i);
  expect(text('samleplass-skadde-utvidet')).toMatch(/uten\s+personidentifiserende/i);

  expect(text('tilfluktsrom-offentlig-beredskap')).toMatch(/bare\s+offentlig/i);
  expect(text('tilfluktsrom-offentlig-beredskap')).toMatch(/ikke\s+lagre.*private/i);
  expect(text('tilfluktsrom-offentlig-beredskap')).toMatch(/skjermede\s+lokasjoner/i);

  for (const slug of [
    'cbrne-soneinndeling',
    'cbrne-verneutstyr-stoppkriterier',
    'mre-ren-uren-side-grovrens',
    'radiac-malepunkt',
    'radiac-oppholdstid-rullering',
  ]) {
    expect(text(slug), `${slug} must include stop/abort criteria`).toMatch(/stopp|stans|avbryt/i);
    expect(text(slug), `${slug} must defer to orders or professional authority`).toMatch(/ordre|fagmyndighet/i);
  }

  expect(text('pumpe-stromfare')).toMatch(/strømfare|elektrisk/i);
  expect(text('pumpe-stromfare')).toMatch(/stans|stopp|avbryt/i);

  for (const slug of ['posisjonsrapport-kart-kompass-gps', 'rute-og-evakueringsvei']) {
    expect(text(slug), `${slug} must be local/offline only`).toMatch(/lokal|offline/i);
    expect(text(slug), `${slug} must ban live tracking`).toMatch(/ikke\s+(lagre|send|bruk|del).*live tracking/i);
    expect(text(slug), `${slug} must ban sensitive-location sharing`).toMatch(
      /ikke\s+(lagre|send|del|publiser).*sensitive lokasjoner/i,
    );
  }

  expect(text('kontaminert-utstyr-handtering')).toMatch(/kontaminert.*skadet|skadet.*kontaminert/i);
  expect(text('kontaminert-utstyr-handtering')).toMatch(/lokal prosedyre/i);
});

it('curated forest-fire water supply content includes source-backed pump and hose planning prompts', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const checklists = readYaml('content/curated/checklists.yaml');
  const glossary = readYaml('content/curated/glossary.yaml');
  const synonyms = readYaml('content/curated/search-synonyms.yaml');
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
  const checklistsBySlug = new Map(checklists.map((checklist) => [checklist.slug, checklist]));
  const glossaryByTerm = new Map(glossary.map((term) => [String(term.term).toLowerCase(), term]));
  const synonymsByCanonical = new Map(synonyms.map((group) => [group.canonical, group]));

  const waterCard = cardsBySlug.get('brann-vannforsyning-slange');
  expect(waterCard?.reviewStatus).toBe('pending-fagperson');
  expect(waterCard?.sourceIds).toEqual(expect.arrayContaining([
    'src-tiltakskort-under-innsats',
    'src-eksempler-pa-utlegg-fra-pumpe',
    'src-kursplan-grunnkurs-fig10',
  ]));
  expect(waterCard?.steps.length).toBeGreaterThanOrEqual(7);
  const waterText = cardText(waterCard);
  expect(waterText).toMatch(/vannkilde/i);
  expect(waterText).toMatch(/pumpeplass/i);
  expect(waterText).toMatch(/slangevei/i);
  expect(waterText).toMatch(/vannføring/i);
  expect(waterText).toMatch(/trykktap/i);
  expect(waterText).toMatch(/trykkforsterkning|seriekjøring/i);
  expect(waterText).toMatch(/friksjonsskader|knekk/i);
  expect(waterText).not.toMatch(/\b\d+\s*(?:l\/min|liter\/min|bar|m3\/t)\b/i);

  const skogbrannChecklist = checklistsBySlug.get('skogbrann-under-innsats');
  const checklistText = [
    skogbrannChecklist?.title,
    ...(skogbrannChecklist?.items ?? []).map((item: any) => item.label),
  ].join('\n');
  expect(skogbrannChecklist?.sourceIds).toContain('src-kursplan-grunnkurs-fig10');
  expect(checklistText).toMatch(/pumpeplass/i);
  expect(checklistText).toMatch(/slangevei/i);
  expect(checklistText).toMatch(/vannføring/i);
  expect(checklistText).toMatch(/trykktap/i);
  expect(checklistText).toMatch(/trykkforsterkning|seriekjøring/i);

  const slangeutlegg = glossaryByTerm.get('slangeutlegg');
  expect(slangeutlegg?.sourceIds).toEqual(expect.arrayContaining([
    'src-eksempler-pa-utlegg-fra-pumpe',
    'src-kursplan-grunnkurs-fig10',
  ]));
  expect(slangeutlegg?.definition).toMatch(/vannkilde|pumpe|trykktap/i);

  const slangeSynonyms = synonymsByCanonical.get('slangeutlegg');
  expect(slangeSynonyms?.aliases).toEqual(expect.arrayContaining([
    'slangevei',
    'vannkilde',
    'pumpeplass',
    'trykktap',
    'trykkforsterkning',
    'seriekjøring',
  ]));
  expect(slangeSynonyms?.cardIds).toEqual(expect.arrayContaining([
    'brann-vannforsyning-slange',
    'skogbrann-vannforsyningsplan',
    'skogbrann-startkort',
    'flom-pumpe-vannforsyning',
  ]));

  const forestWaterPlan = cardsBySlug.get('skogbrann-vannforsyningsplan');
  expect(forestWaterPlan?.priority).toBe('high');
  expect(forestWaterPlan?.reviewStatus).toBe('pending-fagperson');
  expect(forestWaterPlan?.sourceIds).toEqual(expect.arrayContaining([
    'src-tiltakskort-under-innsats',
    'src-5-punktsordre',
    'src-eksempler-pa-utlegg-fra-pumpe',
    'src-kursplan-grunnkurs-fig10',
    'src-operativt-konsept-for-sivilforsvaret',
    'src-grunnopplaering-mfe-10-mannskap',
    'src-sjekkliste-fig-og-figp',
    'src-tiltakskort-05-stotte-av-mfe',
    'src-tiltakskort-03-innsats',
  ]));
  expect(forestWaterPlan?.steps.length).toBeGreaterThanOrEqual(12);
  expect(forestWaterPlan?.steps.some((step: any) => typeof step !== 'string' && /seriekjøring|trykkforsterkning/i.test(step.how ?? ''))).toBe(true);
  expect(forestWaterPlan?.steps.some((step: any) => typeof step !== 'string' && (step.imageIds ?? []).includes('pumpeutlegg-image-1'))).toBe(true);
  const planText = cardText(forestWaterPlan);
  expect(planText).toMatch(/innsatsleder/i);
  expect(planText).toMatch(/vannkilde/i);
  expect(planText).toMatch(/pumpeplass/i);
  expect(planText).toMatch(/slangevei/i);
  expect(planText).toMatch(/trykktap/i);
  expect(planText).toMatch(/trykkforsterkning|seriekjøring/i);
  expect(planText).toMatch(/mellompumpe/i);
  expect(planText).toMatch(/A-utlegg|lett MBS|slangebro|dobbelt utlegg/i);
  expect(planText).toMatch(/samlerør|forgrening/i);
  expect(planText).toMatch(/kavitasjon|ujevnt trykk|luft på sugesiden/i);
  expect(planText).toMatch(/MFE-støtte|oppmøtested|sambandsplan/i);
  expect(planText).toMatch(/0,1 bar/i);
  expect(planText).toMatch(/regnekladde|ikke som fasit|fagressurs/i);
  expect(planText).toMatch(/ikke\s+dimensjoner|tall fra appen/i);
});

it('curated RADIAC measurement planning content supports local map planning without dose advice', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const synonyms = readYaml('content/curated/search-synonyms.yaml');
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
  const synonymsByCanonical = new Map(synonyms.map((group) => [group.canonical, group]));

  const measurementPlan = cardsBySlug.get('radiac-maleplan-kart');
  expect(measurementPlan?.reviewStatus).toBe('pending-fagperson');
  expect(measurementPlan?.sourceIds).toEqual(expect.arrayContaining([
    'src-bestemmelse-radiacmaletjeneste-del-i',
    'src-sjekkliste-radiaclag-rad',
    'src-kommunikasjons-og-sambandsdiagram',
  ]));
  expect(measurementPlan?.scenarios).toContain('radiac-nedfall');
  expect(measurementPlan?.equipmentRequired).toEqual(expect.arrayContaining(['dosimeter', 'maleinstrument', 'samband']));
  const planText = cardText(measurementPlan);
  expect(planText).toMatch(/måleplan|målepunkter/i);
  expect(planText).toMatch(/skjematisk/i);
  expect(planText).toMatch(/rapporteringsformat/i);
  expect(planText).toMatch(/fagmyndighet|ordre/i);
  expect(planText).toMatch(/ikke\s+beregn.*dose|dosegrenser/i);
  expect(planText).not.toMatch(/\b\d+\s*(?:µ?Sv\/h|mSv|dosegrense|oppholdstid)\b/i);

  const radiacSynonyms = synonymsByCanonical.get('radiac-måleplan');
  expect(radiacSynonyms?.aliases).toEqual(expect.arrayContaining([
    'radiac maleplan',
    'målerute',
    'malerute',
    'målepunkter',
    'malepunkter',
  ]));
  expect(radiacSynonyms?.cardIds).toEqual(expect.arrayContaining([
    'radiac-maleplan-kart',
    'radiac-malepunkt',
  ]));
});

it('curated search-sector planning content supports local map planning without live tracking', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const synonyms = readYaml('content/curated/search-synonyms.yaml');
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
  const synonymsByCanonical = new Map(synonyms.map((group) => [group.canonical, group]));

  const searchPlan = cardsBySlug.get('soketeig-plan-kart');
  expect(searchPlan?.reviewStatus).toBe('pending-fagperson');
  expect(searchPlan?.sourceIds).toEqual(expect.arrayContaining([
    'src-vedlegg-c-operative-forhold',
    'src-tiltakskort-under-innsats',
    'src-kommunikasjons-og-sambandsdiagram',
  ]));
  expect(searchPlan?.scenarios).toContain('sok-og-redning');
  expect(searchPlan?.equipmentRequired).toEqual(expect.arrayContaining(['personlig-utrustning', 'samband']));
  const planText = cardText(searchPlan);
  expect(planText).toMatch(/søketeig|søkesektor|teiggrense/i);
  expect(planText).toMatch(/skjematisk/i);
  expect(planText).toMatch(/dekningsgrad|hindringer|avvik/i);
  expect(planText).toMatch(/KO|innsatsleder|ordre/i);
  expect(planText).toMatch(/ikke.*live tracking|ingen.*live tracking/i);
  expect(planText).not.toMatch(/GPS-sporing|blue-force|sanntidsposisjon/i);
  expect(planText).not.toMatch(/savnet person|personnummer|telefonnummer/i);

  const searchSynonyms = synonymsByCanonical.get('søketeig-plan');
  expect(searchSynonyms?.aliases).toEqual(expect.arrayContaining([
    'soketeig plan',
    'søkesektor',
    'sokesektor',
    'teiggrense',
    'dekningsgrad',
  ]));
  expect(searchSynonyms?.cardIds).toEqual(expect.arrayContaining([
    'soketeig-plan-kart',
    'soketeig-sektor',
  ]));
});

it('curated MRE zone planning content supports local map planning without CBRN tactical authority claims', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const synonyms = readYaml('content/curated/search-synonyms.yaml');
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
  const synonymsByCanonical = new Map(synonyms.map((group) => [group.canonical, group]));

  const zonePlan = cardsBySlug.get('mre-soneplan-kart');
  expect(zonePlan?.reviewStatus).toBe('pending-fagperson');
  expect(zonePlan?.sourceIds).toEqual(expect.arrayContaining([
    'src-veileder-for-sivilforsvarets-renseenheter-cbrn',
    'src-samvirke-pa-forurenset-skadested-cbrne-sps41',
    'src-sjekkliste-mobil-renseenhet-mre',
  ]));
  expect(zonePlan?.scenarios).toContain('cbrn-cbrne');
  expect(zonePlan?.equipmentRequired).toEqual(expect.arrayContaining(['renseutstyr', 'verneutstyr', 'vann', 'samband']));
  const planText = cardText(zonePlan);
  expect(planText).toMatch(/ren side|uren side|renselinje/i);
  expect(planText).toMatch(/innpassering|utpassering|avfallspunkt/i);
  expect(planText).toMatch(/skjematisk/i);
  expect(planText).toMatch(/fagmyndighet|innsatsleder|ordre/i);
  expect(planText).toMatch(/ikke\s+fastsett.*stoff|ikke\s+fastsetter.*stoff|vernenivå|sonegrense/i);
  expect(planText).not.toMatch(/Level\s*A|nivå\s*A|sarin|klorgass|cyanid|pasientnavn|personnummer/i);

  const mreSynonyms = synonymsByCanonical.get('mre-soneplan');
  expect(mreSynonyms?.aliases).toEqual(expect.arrayContaining([
    'ren uren plan',
    'renseplass plan',
    'soneplan',
    'renselinje',
    'avfallspunkt',
  ]));
  expect(mreSynonyms?.cardIds).toEqual(expect.arrayContaining([
    'mre-soneplan-kart',
    'mre-ren-uren-side-grovrens',
    'cbrne-soneinndeling',
  ]));
});

it('curated MFE reception-board content supports local follow-up without official dispatch claims', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const synonyms = readYaml('content/curated/search-synonyms.yaml');
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
  const synonymsByCanonical = new Map(synonyms.map((group) => [group.canonical, group]));

  const boardCard = cardsBySlug.get('mfe-mottaksboard-lokal');
  expect(boardCard?.reviewStatus).toBe('pending-fagperson');
  expect(boardCard?.sourceIds).toEqual(expect.arrayContaining([
    'src-tiltakskort-05-stotte-av-mfe',
    'src-tiltakskort-06-oppsettende-mfe-distrikt',
    'src-sjekkliste-mobil-forsterkningsenhet-mfe',
  ]));
  expect(boardCard?.scenarios).toContain('mfe-stotte');
  expect(boardCard?.roles).toEqual(expect.arrayContaining(['beredskapsvakt', 'leder', 'mfe', 'stab-logistikk']));
  const boardText = cardText(boardCard);
  expect(boardText).toMatch(/mottaksboard|mottakstavle|mottak/i);
  expect(boardText).toMatch(/kontaktpunkt|første ordre|oppfølging|demobilisering/i);
  expect(boardText).toMatch(/lokal/i);
  expect(boardText).toMatch(/ikke.*offisiell anmodning|ingen.*offisiell anmodning/i);
  expect(boardText).not.toMatch(/dispatch|live tracking|sanntid|GPS-sporing|kjøretøyidentifikator|depotdetalj/i);

  const boardSynonyms = synonymsByCanonical.get('mfe-mottaksboard');
  expect(boardSynonyms?.aliases).toEqual(expect.arrayContaining([
    'mfe mottakstavle',
    'mfe mottak board',
    'forsterkningsenhet mottak',
    'mfe demobilisering',
  ]));
  expect(boardSynonyms?.cardIds).toEqual(expect.arrayContaining([
    'mfe-mottaksboard-lokal',
    'mfe-anmodning-mottak-oppfolging',
  ]));
});

it('curated ATV/BAT transport logistics content supports local planning without tracking or dispatch claims', () => {
  const cards = readYaml('content/curated/action-cards.yaml');
  const synonyms = readYaml('content/curated/search-synonyms.yaml');
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
  const synonymsByCanonical = new Map(synonyms.map((group) => [group.canonical, group]));

  const transportCard = cardsBySlug.get('atv-bat-transportlogistikk');
  expect(transportCard?.reviewStatus).toBe('pending-fagperson');
  expect(transportCard?.sourceIds).toEqual(expect.arrayContaining([
    'src-opplaering-forer-av-atb',
    'src-opplaering-forer-av-bat',
    'src-opplaering-materiellansvarlig-fig',
    'src-sjekkliste-fig-og-figp',
    'src-tiltakskort-for-innsats',
  ]));
  expect(transportCard?.roles).toEqual(expect.arrayContaining(['atv-bat', 'materiellansvarlig', 'stab-logistikk']));
  expect(transportCard?.equipmentRequired).toEqual(expect.arrayContaining(['kjoretoy', 'samband', 'verneutstyr']));
  const transportText = cardText(transportCard);
  expect(transportText).toMatch(/ATV|båt|transport/i);
  expect(transportText).toMatch(/føreropplæring|førerkompetanse|båtførerkompetanse/i);
  expect(transportText).toMatch(/last|passasjerbehov|drivstoff|framkommelighet|MBK/i);
  expect(transportText).toMatch(/ikke.*ruteordre|offisiell.*ressursanmodning|sporingssystem/i);
  expect(transportText).not.toMatch(/dispatch|live tracking|sanntid|GPS-sporing|registreringsnummer|kjennemerke|depotdetalj/i);

  const transportSynonyms = synonymsByCanonical.get('transportlogistikk');
  expect(transportSynonyms?.aliases).toEqual(expect.arrayContaining([
    'transporttavle',
    'ruteavvik',
    'framkommelighet',
    'førerkompetanse',
  ]));
  expect(transportSynonyms?.cardIds).toEqual(expect.arrayContaining([
    'atv-bat-transportlogistikk',
    'kjoretoy-transportberedskap',
  ]));
});
