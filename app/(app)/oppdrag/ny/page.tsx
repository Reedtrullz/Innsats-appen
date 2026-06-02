import { MissionContextPanel } from '@/components/mission-context-panel';
import { getChecklists, getContentManifest } from '@/lib/content/load-content';

export default function NewMissionPage() {
  return <MissionContextPanel mode="create" contentVersion={getContentManifest().contentVersion} checklists={getChecklists()} />;
}
