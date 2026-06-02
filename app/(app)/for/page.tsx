import { PhasePageContent } from '@/components/action-card-list';
import { getActionCards } from '@/lib/content/load-content';

export default function Page() {
  return <PhasePageContent phase="for" cards={getActionCards()} />;
}
