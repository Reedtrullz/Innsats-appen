import { SpecialistModuleContent, specialistModuleConfigs } from '@/components/specialist-module-page';
import { getActionCards } from '@/lib/content/load-content';

export default function CbrnModulePage() {
  return <SpecialistModuleContent cards={getActionCards()} config={specialistModuleConfigs.cbrn} />;
}
