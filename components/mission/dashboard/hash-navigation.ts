'use client';

export type MissionMode = 'now' | 'work' | 'export';

export const missionModeLabels: Record<MissionMode, string> = {
  now: 'Nå',
  work: 'Arbeid',
  export: 'Eksport',
};

export const missionDashboardHashTargets = new Set([
  'hurtiglogg',
  'loggoversikt',
  'sjekkliste',
  'ressursmottak',
  'transportlogistikk',
  'kritisk-tiltak',
  '5-punktsordre',
  'sambandsplan',
  'statusrapport',
  'feltlogg',
  'kart',
  'etterrapport',
  'ruh-velferd',
  'oppdragsmappe',
]);

const modeByHashTarget: Record<string, MissionMode> = {
  hurtiglogg: 'now',
  'kritisk-tiltak': 'now',
  sjekkliste: 'work',
  ressursmottak: 'work',
  transportlogistikk: 'work',
  kart: 'work',
  loggoversikt: 'work',
  feltlogg: 'work',
  '5-punktsordre': 'export',
  sambandsplan: 'export',
  'ruh-velferd': 'export',
  etterrapport: 'export',
  oppdragsmappe: 'export',
  statusrapport: 'export',
};

export function modeForHashTarget(targetId: string): MissionMode | undefined {
  return modeByHashTarget[targetId];
}
