import { getActionCards, getChecklists, getProtectionMeasures } from '@/lib/content/load-content';
import { TilfluktsromModuleContent } from '@/components/tilfluktsrom-module-content';

export default function TilfluktsromModulePage() {
  return <TilfluktsromModuleContent cards={getActionCards()} checklists={getChecklists()} protectionMeasures={getProtectionMeasures()} />;
}
