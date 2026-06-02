import { SpecialistModuleContent, specialistModuleConfigs } from '@/components/specialist-module-page';
import { getActionCards } from '@/lib/content/load-content';
import type { ActionCard } from '@/lib/content/schemas';

export function CbrnModuleContent({ cards }: { cards: ActionCard[] }) {
  return <SpecialistModuleContent cards={cards} config={specialistModuleConfigs.cbrn} />;
}

export default function CbrnModulePage() {
  return <CbrnModuleContent cards={getActionCards()} />;
}
