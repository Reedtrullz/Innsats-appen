import { getChecklists } from '@/lib/content/load-content';
import { RunbookView } from '@/components/runbook/runbook-view';

export const revalidate = 3600;

export default function RunbookPage() {
  return <RunbookView checklists={getChecklists()} />;
}
