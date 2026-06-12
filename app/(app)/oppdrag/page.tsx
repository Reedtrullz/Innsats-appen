import { MissionContextPanel } from '@/components/mission-context-panel';
import { getActionCards, getChecklists, getContentManifest, getSourceDocuments } from '@/lib/content/load-content';
import { isHighRiskSource } from '@/lib/content/source-review';

export default function MissionsPage() {
  const contentVersion = getContentManifest().contentVersion;
  const sources = getSourceDocuments();
  const sourceTitleById = Object.fromEntries(sources.map((source) => [source.id, source.title]));
  const sourceRiskById = Object.fromEntries(sources.map((source) => [source.id, isHighRiskSource(source) ? 'caution' : 'ok'] as const));

  return (
    <div className="space-y-6">
      <MissionContextPanel
        contentVersion={contentVersion}
        checklists={getChecklists()}
        actionCards={getActionCards()}
        sourceTitleById={sourceTitleById}
        sourceRiskById={sourceRiskById}
      />
    </div>
  );
}
