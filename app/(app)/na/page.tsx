import { getChecklists, getSourceDocuments } from '@/lib/content/load-content';
import { RunbookView } from '@/components/runbook/runbook-view';

export const revalidate = 3600;

export default function RunbookPage() {
  const sourceTitleById = Object.fromEntries(getSourceDocuments().map((source) => [source.id, source.title]));
  return <RunbookView checklists={getChecklists()} sourceTitleById={sourceTitleById} />;
}
