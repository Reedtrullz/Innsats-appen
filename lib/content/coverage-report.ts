import { phases, roles, scenarios } from './taxonomy';

export interface ContentCoverageGraph {
  sources?: any[];
  actionCards?: any[];
  checklists?: any[];
  trainingPaths?: any[];
  protectionMeasures?: any[];
  glossary?: any[];
}

export interface CoverageBucket {
  cardCount: number;
  checklistCount: number;
  trainingPathCount: number;
  protectionMeasureCount: number;
  sourceCount?: number;
}

export interface ReleaseCoverageGap {
  id: string;
  title: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

export interface ContentCoverageReport {
  generatedAt: string;
  linkage: {
    sourcesWithoutReferences: string[];
    cardsWithoutSources: string[];
  };
  risk: {
    highRiskCardsWithoutWarnings: string[];
    highRiskCardsWithoutCompetenceOrRationale: string[];
  };
  glossary: {
    referencedButUndefined: string[];
  };
  coverage: {
    byRole: Record<string, CoverageBucket>;
    byPhase: Record<string, CoverageBucket>;
    byScenario: Record<string, CoverageBucket>;
    byCompetence: Record<string, CoverageBucket>;
    bySourceStatus: Record<string, { sourceCount: number; referencedSourceCount: number }>;
  };
  releaseBoard: {
    gaps: ReleaseCoverageGap[];
  };
}

function collectRefs(item: any): string[] {
  const refs = new Set<string>();
  if (Array.isArray(item?.sourceIds)) item.sourceIds.forEach((id: string) => refs.add(id));
  if (Array.isArray(item?.items)) item.items.forEach((child: any) => child?.sourceIds?.forEach((id: string) => refs.add(id)));
  return [...refs];
}

function sorted(values: Iterable<string>) {
  return [...values].filter(Boolean).sort((a, b) => a.localeCompare(b, 'nb'));
}

function emptyBucket(): CoverageBucket {
  return { cardCount: 0, checklistCount: 0, trainingPathCount: 0, protectionMeasureCount: 0 };
}

function addToBucket(bucket: CoverageBucket, key: keyof CoverageBucket) {
  bucket[key] = (bucket[key] ?? 0) + 1;
}

function textValues(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(textValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(textValues);
  return [];
}

function glossaryRefs(graph: ContentCoverageGraph) {
  const refs = new Set<string>();
  const content = [
    ...(graph.actionCards ?? []),
    ...(graph.checklists ?? []),
    ...(graph.trainingPaths ?? []),
    ...(graph.protectionMeasures ?? []),
  ];
  for (const text of textValues(content)) {
    for (const match of text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) refs.add(match[1].trim());
    for (const match of text.matchAll(/\bglossary:([A-Za-zÆØÅæøå0-9_-]+)/g)) refs.add(match[1].trim());
  }
  return refs;
}

function isHighRiskSource(source: any) {
  return source?.reviewRisk === 'high' || ['unverified', 'historical', 'draft', 'expired'].includes(String(source?.status ?? ''));
}

function cardIsHighRisk(card: any, sourceById: Map<string, any>) {
  return card?.priority === 'high' || collectRefs(card).some((sourceId) => isHighRiskSource(sourceById.get(sourceId)));
}

function addReleaseGap(gaps: ReleaseCoverageGap[], id: string, title: string, count: number, severity: ReleaseCoverageGap['severity'], detail: string) {
  if (count > 0) gaps.push({ id, title, count, severity, detail });
}

export function buildContentCoverageReport(graph: ContentCoverageGraph, generatedAt = new Date().toISOString()): ContentCoverageReport {
  const sources = graph.sources ?? [];
  const actionCards = graph.actionCards ?? [];
  const checklists = graph.checklists ?? [];
  const trainingPaths = graph.trainingPaths ?? [];
  const protectionMeasures = graph.protectionMeasures ?? [];
  const glossary = graph.glossary ?? [];
  const referencedSourceIds = new Set<string>();
  for (const collection of [actionCards, checklists, trainingPaths, protectionMeasures, glossary]) {
    for (const item of collection) collectRefs(item).forEach((id) => referencedSourceIds.add(id));
  }
  const sourceById = new Map(sources.map((source) => [String(source.id), source]));
  const sourcesWithoutReferences = sorted(sources.map((source) => String(source.id)).filter((id) => !referencedSourceIds.has(id)));
  const cardsWithoutSources = sorted(actionCards.filter((card) => collectRefs(card).length === 0).map((card) => String(card.slug ?? 'card')));
  const highRiskCards = actionCards.filter((card) => cardIsHighRisk(card, sourceById));
  const highRiskCardsWithoutWarnings = sorted(highRiskCards.filter((card) => !String(card.warning ?? '').trim()).map((card) => String(card.slug ?? 'card')));
  const highRiskCardsWithoutCompetenceOrRationale = sorted(highRiskCards
    .filter((card) => !Array.isArray(card.competenceRequired) || card.competenceRequired.length === 0)
    .filter((card) => !String(card.competenceRationale ?? '').trim())
    .map((card) => String(card.slug ?? 'card')));

  const definedGlossary = new Set<string>();
  for (const term of glossary) {
    if (term?.term) definedGlossary.add(String(term.term).toLowerCase());
    for (const synonym of term?.synonyms ?? []) definedGlossary.add(String(synonym).toLowerCase());
  }
  const referencedButUndefined = sorted([...glossaryRefs(graph)].filter((ref) => !definedGlossary.has(ref.toLowerCase())));

  const byRole = Object.fromEntries(roles.map((role) => [role, emptyBucket()]));
  const byPhase = Object.fromEntries(phases.map((phase) => [phase, emptyBucket()]));
  const byScenario = Object.fromEntries(scenarios.map((scenario) => [scenario, emptyBucket()]));
  const byCompetence: Record<string, CoverageBucket> = { unassigned: emptyBucket() };
  for (const card of actionCards) {
    if (byPhase[card.phase]) addToBucket(byPhase[card.phase], 'cardCount');
    for (const role of card.roles ?? []) if (byRole[role]) addToBucket(byRole[role], 'cardCount');
    for (const scenario of card.scenarios ?? []) if (byScenario[scenario]) addToBucket(byScenario[scenario], 'cardCount');
    const competence = Array.isArray(card.competenceRequired) && card.competenceRequired.length > 0 ? card.competenceRequired : ['unassigned'];
    for (const requirement of competence) {
      byCompetence[requirement] ??= emptyBucket();
      addToBucket(byCompetence[requirement], 'cardCount');
    }
  }
  for (const checklist of checklists) {
    if (byPhase[checklist.phase]) addToBucket(byPhase[checklist.phase], 'checklistCount');
    for (const role of checklist.roles ?? []) if (byRole[role]) addToBucket(byRole[role], 'checklistCount');
    for (const scenario of checklist.scenarios ?? []) if (byScenario[scenario]) addToBucket(byScenario[scenario], 'checklistCount');
  }
  for (const training of trainingPaths) {
    for (const role of training.targetRoles ?? []) if (byRole[role]) addToBucket(byRole[role], 'trainingPathCount');
    for (const skill of training.skills ?? []) {
      byCompetence[skill] ??= emptyBucket();
      addToBucket(byCompetence[skill], 'trainingPathCount');
    }
  }
  for (const measure of protectionMeasures) {
    for (const sourceId of collectRefs(measure)) referencedSourceIds.add(sourceId);
    const scenario = measure.kind === 'tilfluktsrom' ? 'tilfluktsrom' : measure.kind === 'evakuering' ? 'evakuering' : 'generelt';
    if (byScenario[scenario]) addToBucket(byScenario[scenario], 'protectionMeasureCount');
  }

  const statusValues = ['verified', 'unverified', 'historical', 'draft', 'expired'];
  const bySourceStatus = Object.fromEntries(statusValues.map((status) => [status, { sourceCount: 0, referencedSourceCount: 0 }]));
  for (const source of sources) {
    const status = String(source.status ?? 'unverified');
    bySourceStatus[status] ??= { sourceCount: 0, referencedSourceCount: 0 };
    bySourceStatus[status].sourceCount += 1;
    if (referencedSourceIds.has(String(source.id))) bySourceStatus[status].referencedSourceCount += 1;
  }

  const gaps: ReleaseCoverageGap[] = [];
  addReleaseGap(gaps, 'content-orphan-sources', 'Sources without linked content', sourcesWithoutReferences.length, 'medium', `${sourcesWithoutReferences.length} sources are not linked from cards, checklists, training, protection measures, or glossary.`);
  addReleaseGap(gaps, 'content-cards-without-sources', 'Cards without linked sources', cardsWithoutSources.length, 'high', `${cardsWithoutSources.length} cards have no sourceIds.`);
  addReleaseGap(gaps, 'content-high-risk-card-warnings', 'High-risk cards missing warnings', highRiskCardsWithoutWarnings.length, 'high', `${highRiskCardsWithoutWarnings.length} high-risk cards lack visible warning copy.`);
  addReleaseGap(gaps, 'content-high-risk-card-competence', 'High-risk cards missing competence or rationale', highRiskCardsWithoutCompetenceOrRationale.length, 'medium', `${highRiskCardsWithoutCompetenceOrRationale.length} high-risk cards lack competence requirements or explicit rationale.`);
  addReleaseGap(gaps, 'content-glossary-undefined', 'Glossary references not defined', referencedButUndefined.length, 'medium', `${referencedButUndefined.length} glossary references are not defined.`);

  return {
    generatedAt,
    linkage: { sourcesWithoutReferences, cardsWithoutSources },
    risk: { highRiskCardsWithoutWarnings, highRiskCardsWithoutCompetenceOrRationale },
    glossary: { referencedButUndefined },
    coverage: { byRole, byPhase, byScenario, byCompetence, bySourceStatus },
    releaseBoard: { gaps },
  };
}
