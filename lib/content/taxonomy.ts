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

export const priorityLabels = {
  high: 'Høy',
  medium: 'Middels',
  low: 'Lav',
} as const;
