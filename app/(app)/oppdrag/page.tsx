import { MissionContextPanel } from '@/components/mission-context-panel';
import { getActionCards, getChecklists, getContentManifest } from '@/lib/content/load-content';

export default function MissionsPage() {
  const contentVersion = getContentManifest().contentVersion;

  return (
    <div className="space-y-6">
      <MissionContextPanel contentVersion={contentVersion} checklists={getChecklists()} actionCards={getActionCards()} />
    </div>
  );
}
