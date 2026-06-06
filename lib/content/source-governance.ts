type SourceLike = {
  id: string;
  title?: string;
  status: string;
  reviewRisk?: string;
  warnings?: string[];
  pilotReviewStatus?: string;
  publicationStatus?: string;
  body?: string;
};

type ChecklistItemLike = {
  id: string;
  label?: string;
  sourceIds?: string[];
};

type ReferencingItem = {
  slug?: string;
  id?: string;
  term?: string;
  title?: string;
  sourceIds?: string[];
  items?: ChecklistItemLike[];
};

export type BuildSourceGovernanceReportInput = {
  sources: SourceLike[];
  publicSources?: SourceLike[];
  cards: ReferencingItem[];
  checklists: ReferencingItem[];
  trainingPaths: ReferencingItem[];
  protectionMeasures?: ReferencingItem[];
  glossary?: ReferencingItem[];
};

export type SourceGovernanceFinding = {
  sourceId: string;
  title: string;
  status: string;
  pilotReviewStatus: string;
  publicationStatus: string;
  reviewRisk: string;
  warnings: string[];
  reason: string;
  referencedBy: string[];
};

export type SourceGovernanceReport = {
  summary: {
    sourceCount: number;
    referencedSourceCount: number;
    pilotApprovedReferencedSourceCount: number;
    pilotBlockingReferencedSourceCount: number;
    publicBodyBlockingSourceCount: number;
  };
  findings: {
    pilotBlockingReferencedSources: SourceGovernanceFinding[];
    highRiskPilotBlockingReferencedSources: SourceGovernanceFinding[];
    publicBodyBlockingSources: SourceGovernanceFinding[];
  };
};

function addReferences(references: Map<string, string[]>, sourceIds: string[] | undefined, label: string) {
  for (const sourceId of sourceIds ?? []) {
    const existing = references.get(sourceId);
    if (existing) {
      existing.push(label);
    } else {
      references.set(sourceId, [label]);
    }
  }
}

function referenceKey(item: ReferencingItem) {
  return item.slug ?? item.term ?? item.id ?? 'unknown';
}

function sourceReferences(input: BuildSourceGovernanceReportInput) {
  const references = new Map<string, string[]>();

  for (const card of input.cards) addReferences(references, card.sourceIds, `card:${referenceKey(card)}`);

  for (const checklist of input.checklists) {
    addReferences(references, checklist.sourceIds, `checklist:${referenceKey(checklist)}`);
    for (const item of checklist.items ?? []) addReferences(references, item.sourceIds, `checklist:${referenceKey(checklist)}:item:${item.id}`);
  }

  for (const trainingPath of input.trainingPaths) addReferences(references, trainingPath.sourceIds, `training:${referenceKey(trainingPath)}`);

  for (const protection of input.protectionMeasures ?? []) addReferences(references, protection.sourceIds, `protection:${referenceKey(protection)}`);

  for (const glossary of input.glossary ?? []) addReferences(references, glossary.sourceIds, `glossary:${referenceKey(glossary)}`);

  return references;
}

function normalizedPilotReviewStatus(source: SourceLike) {
  return source.pilotReviewStatus ?? 'not-reviewed';
}

function normalizedPublicationStatus(source: SourceLike) {
  return source.publicationStatus ?? 'needs-permission';
}

function normalizedReviewRisk(source: SourceLike) {
  return source.reviewRisk ?? 'medium';
}

function pilotBlockingReason(source: SourceLike) {
  if (source.status !== 'verified') return `source status is ${source.status}`;

  const pilotReviewStatus = normalizedPilotReviewStatus(source);
  if (pilotReviewStatus !== 'approved-for-pilot') return `pilot review status is ${pilotReviewStatus}`;

  const publicationStatus = normalizedPublicationStatus(source);
  if (publicationStatus !== 'approved-public') return `publication status is ${publicationStatus}`;

  return undefined;
}

function isPilotApproved(source: SourceLike) {
  return source.status === 'verified' && normalizedPilotReviewStatus(source) === 'approved-for-pilot' && normalizedPublicationStatus(source) === 'approved-public';
}

function hasPublicBodyWithoutApproval(source: SourceLike) {
  return normalizedPublicationStatus(source) !== 'approved-public' && String(source.body ?? '').trim().length > 0;
}

function toFinding(source: SourceLike, reason: string, referencedBy: string[]): SourceGovernanceFinding {
  return {
    sourceId: source.id,
    title: source.title ?? '',
    status: source.status,
    pilotReviewStatus: normalizedPilotReviewStatus(source),
    publicationStatus: normalizedPublicationStatus(source),
    reviewRisk: normalizedReviewRisk(source),
    warnings: [...(source.warnings ?? [])],
    reason,
    referencedBy: [...referencedBy],
  };
}

export function buildSourceGovernanceReport(input: BuildSourceGovernanceReportInput): SourceGovernanceReport {
  const references = sourceReferences(input);
  const referencedSources = input.sources.filter((source) => references.has(source.id));
  const publicSources = input.publicSources ?? [];
  const pilotBlockingReferencedSources = referencedSources.flatMap((source) => {
    const reason = pilotBlockingReason(source);
    if (!reason) return [];
    return [toFinding(source, reason, references.get(source.id) ?? [])];
  });
  const publicBodyBlockingSources = publicSources.flatMap((source) => {
    if (!hasPublicBodyWithoutApproval(source)) return [];
    return [
      toFinding(
        source,
        `public body is present while publication status is ${normalizedPublicationStatus(source)}`,
        references.get(source.id) ?? [],
      ),
    ];
  });

  return {
    summary: {
      sourceCount: input.sources.length,
      referencedSourceCount: referencedSources.length,
      pilotApprovedReferencedSourceCount: referencedSources.filter(isPilotApproved).length,
      pilotBlockingReferencedSourceCount: pilotBlockingReferencedSources.length,
      publicBodyBlockingSourceCount: publicBodyBlockingSources.length,
    },
    findings: {
      pilotBlockingReferencedSources,
      highRiskPilotBlockingReferencedSources: pilotBlockingReferencedSources.filter((source) => source.reviewRisk === 'high'),
      publicBodyBlockingSources,
    },
  };
}
