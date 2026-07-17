import { SpecialistModuleContent, specialistModuleConfigs } from '@/components/specialist-module-page';
import { getActionCards } from '@/lib/content/load-content';

export default function RadiacModulePage() {
  return <SpecialistModuleContent cards={getActionCards()} config={specialistModuleConfigs.radiac} />;
}
