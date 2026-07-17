import { getActionCards, getTrainingPaths } from '@/lib/content/load-content';
import { TrainingPathsPageContent } from '@/components/training-paths-page-content';

export default function TrainingPathsPage() {
  return <TrainingPathsPageContent paths={getTrainingPaths()} cards={getActionCards()} />;
}
