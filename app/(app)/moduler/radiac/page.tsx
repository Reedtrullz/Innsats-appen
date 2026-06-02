import { SpecialistModuleContent, specialistModuleConfigs } from '@/components/specialist-module-page';
import { getActionCards } from '@/lib/content/load-content';
import type { ActionCard } from '@/lib/content/schemas';

export function RadiacModuleContent({ cards }: { cards: ActionCard[] }) {
  return <SpecialistModuleContent cards={cards} config={specialistModuleConfigs.radiac} />;
}

export default function RadiacModulePage() {
  return <RadiacModuleContent cards={getActionCards()} />;
}
