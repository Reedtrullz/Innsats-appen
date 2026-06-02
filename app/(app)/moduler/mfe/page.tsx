import { SpecialistModuleContent, specialistModuleConfigs } from '@/components/specialist-module-page';
import { getActionCards } from '@/lib/content/load-content';
import type { ActionCard } from '@/lib/content/schemas';

export function MfeModuleContent({ cards }: { cards: ActionCard[] }) {
  return <SpecialistModuleContent cards={cards} config={specialistModuleConfigs.mfe} />;
}

export default function MfeModulePage() {
  return <MfeModuleContent cards={getActionCards()} />;
}
