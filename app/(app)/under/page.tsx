import { PhasePageContent } from '@/components/action-card-list';
import { getActionCards, getChecklists } from '@/lib/content/load-content';

export default function Page() {
  return <PhasePageContent phase="under" cards={getActionCards()} checklists={getChecklists()} />;
}
