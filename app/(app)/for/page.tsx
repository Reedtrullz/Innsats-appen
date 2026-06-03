import { PhasePageContent } from '@/components/action-card-list';
import { getActionCards, getChecklists, getContentChangelog, getMustReadNotices } from '@/lib/content/load-content';

export default function Page() {
  const latestChange = getContentChangelog().find((entry) => entry.contentRefs.some((ref) => ref.kind === 'checklist' && ['fig-for-innsats', 'for-utrykning-samlet'].includes(ref.id)));
  return <PhasePageContent phase="for" cards={getActionCards()} checklists={getChecklists()} latestChange={latestChange} mustRead={getMustReadNotices()} />;
}
