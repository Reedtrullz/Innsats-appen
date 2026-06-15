export const phases = ['for', 'under', 'etter'] as const;
export type Phase = (typeof phases)[number];

/** The phase after `phase` in authored order, or null for the terminal phase ('etter'). */
export function nextPhase(phase: Phase): Phase | null {
  const index = phases.indexOf(phase);
  return index >= 0 && index < phases.length - 1 ? phases[index + 1] : null;
}

/** The phase before `phase` in authored order, or null for the first phase ('for'). */
export function prevPhase(phase: Phase): Phase | null {
  const index = phases.indexOf(phase);
  return index > 0 ? phases[index - 1] : null;
}

export const roles = [
  'mannskap',
  'lagforer',
  'leder',
  'beredskapsvakt',
  'mre',
  'rad',
  'mfe',
  'liaison',
  'materiellansvarlig',
  'atv-bat',
  'stab-logistikk',
] as const;
export type Role = (typeof roles)[number];

export const scenarios = [
  'brann',
  'skogbrann',
  'sok-og-redning',
  'flom',
  'skred',
  'cbrn-cbrne',
  'radiac-nedfall',
  'evakuering',
  'tilfluktsrom',
  'samleplass-skadde',
  'mfe-stotte',
  'psykososial',
  'generelt',
] as const;
export type Scenario = (typeof scenarios)[number];

export const competenceCodes = [
  'FIG10',
  'FIG20',
  'FIG30',
  'FIG31',
  'MFE10',
  'MRE10',
  'MRE30',
  'RAD10',
  'RAD30',
  'ATV',
  'BAT',
  'LETT_LASTEBIL',
  'SPS40',
  'SPS41',
] as const;
export type CompetenceCode = (typeof competenceCodes)[number];

export const equipmentTerms = [
  'personlig-utrustning',
  'verneutstyr',
  'samband',
  'dosimeter',
  'maleinstrument',
  'pumpe',
  'slangeutlegg',
  'ventilasjon',
  'nodstrom',
  'vann',
  'sanitaer',
  'belysning',
  'renseutstyr',
  'kjoretoy',
  'telt',
  'varmeapparat',
  'aggregat',
] as const;
export type EquipmentTerm = (typeof equipmentTerms)[number];

export const phaseLabels: Record<Phase, string> = {
  for: 'Før',
  under: 'Under',
  etter: 'Etter',
};

export const roleLabels: Record<Role, string> = {
  mannskap: 'Mannskap',
  lagforer: 'Lagfører',
  leder: 'Leder',
  beredskapsvakt: 'Beredskapsvakt',
  mre: 'MRE',
  rad: 'RADIAC',
  mfe: 'MFE',
  liaison: 'LIA/liaison',
  materiellansvarlig: 'Materiellansvarlig',
  'atv-bat': 'ATV/båt',
  'stab-logistikk': 'Stab/logistikk',
};

export const scenarioLabels: Record<Scenario, string> = {
  brann: 'Brann',
  skogbrann: 'Skogbrann',
  'sok-og-redning': 'Søk og redning',
  flom: 'Flom',
  skred: 'Skred',
  'cbrn-cbrne': 'CBRN/CBRNE',
  'radiac-nedfall': 'RADIAC/nedfall',
  evakuering: 'Evakuering',
  tilfluktsrom: 'Tilfluktsrom',
  'samleplass-skadde': 'Samleplass skadde',
  'mfe-stotte': 'MFE-støtte',
  psykososial: 'Psykososial oppfølging',
  generelt: 'Generelt',
};

export const competenceLabels: Record<CompetenceCode, string> = {
  FIG10: 'FIG10 grunnkurs FIG/FIGP',
  FIG20: 'FIG20 lagfører FIG/FIGP',
  FIG30: 'FIG30 leder FIG/FIGP',
  FIG31: 'FIG31 videregående leder/nestleder',
  MFE10: 'MFE10 mobil forsterkningsenhet',
  MRE10: 'MRE10 mobil renseenhet',
  MRE30: 'MRE30 lagfører/leder MRE',
  RAD10: 'RAD10 RADIAC mannskap',
  RAD30: 'RAD30 lagfører RADIAC',
  ATV: 'ATV føreropplæring',
  BAT: 'Båtføreropplæring',
  LETT_LASTEBIL: 'Fører lett lastebil med tilhenger',
  SPS40: 'SPS40 samvirke på skadested',
  SPS41: 'SPS41 samvirke på forurenset skadested CBRN/E',
};

export const equipmentLabels: Record<EquipmentTerm, string> = {
  'personlig-utrustning': 'Personlig utrustning',
  verneutstyr: 'Verneutstyr',
  samband: 'Samband',
  dosimeter: 'Dosimeter',
  maleinstrument: 'Måleinstrument',
  pumpe: 'Pumpe',
  slangeutlegg: 'Slangeutlegg',
  ventilasjon: 'Ventilasjon',
  nodstrom: 'Nødstrøm',
  vann: 'Vann',
  sanitaer: 'Sanitær',
  belysning: 'Belysning',
  renseutstyr: 'Renseutstyr',
  kjoretoy: 'Kjøretøy',
  telt: 'Telt',
  varmeapparat: 'Varmeapparat',
  aggregat: 'Aggregat',
};

export const priorityLabels = {
  high: 'Høy',
  medium: 'Middels',
  low: 'Lav',
} as const;
