export const phases = ['for', 'under', 'etter'] as const;
export type Phase = (typeof phases)[number];

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

export const competenceCodes = ['FIG10', 'RAD10', 'MRE10', 'MFE10', 'FIG20', 'FIG30', 'FIG31', 'RAD30', 'MRE30'] as const;
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
  FIG10: 'FIG10 grunnkurs',
  RAD10: 'RAD10 RADIAC mannskap',
  MRE10: 'MRE10 mobil renseenhet',
  MFE10: 'MFE10 mobil forsterkningsenhet',
  FIG20: 'FIG20 lagfører FIG/FIGP',
  FIG30: 'FIG30 leder FIG/FIGP',
  FIG31: 'FIG31 videregående leder/nestleder',
  RAD30: 'RAD30 lagfører RADIAC',
  MRE30: 'MRE30 lagfører/leder MRE',
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
};

export const priorityLabels = {
  high: 'Høy',
  medium: 'Middels',
  low: 'Lav',
} as const;
