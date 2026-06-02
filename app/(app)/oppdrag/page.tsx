import { MissionContextPanel } from '@/components/mission-context-panel';
import { getChecklists, getContentManifest } from '@/lib/content/load-content';

export default function MissionsPage() {
  return <MissionContextPanel contentVersion={getContentManifest().contentVersion} checklists={getChecklists()} />;
}
