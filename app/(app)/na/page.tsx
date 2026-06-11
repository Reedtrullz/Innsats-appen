import { getChecklists, getSourceDocuments } from '@/lib/content/load-content';
import { isHighRiskSource } from '@/lib/content/source-review';
import { RunbookView } from '@/components/runbook/runbook-view';

export const revalidate = 3600;

export default function RunbookPage() {
  const sources = getSourceDocuments();
  const sourceTitleById = Object.fromEntries(sources.map((source) => [source.id, source.title]));
  const sourceRiskById = Object.fromEntries(sources.map((source) => [source.id, isHighRiskSource(source) ? 'caution' : 'ok'] as const));
  return <RunbookView checklists={getChecklists()} sourceTitleById={sourceTitleById} sourceRiskById={sourceRiskById} />;
}
