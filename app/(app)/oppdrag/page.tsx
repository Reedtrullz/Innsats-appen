import { CommsPlanForm } from '@/components/forms/comms-plan-form';
import { FivePointOrderForm } from '@/components/forms/five-point-order-form';
import { HashOpeningDetails } from '@/components/hash-opening-details';
import { MissionContextPanel } from '@/components/mission-context-panel';
import { getActionCards, getChecklists, getContentManifest } from '@/lib/content/load-content';

export default function MissionsPage() {
  const contentVersion = getContentManifest().contentVersion;

  return (
    <div className="space-y-6">
      <MissionContextPanel contentVersion={contentVersion} checklists={getChecklists()} actionCards={getActionCards()} />
      <section className="space-y-4" aria-labelledby="ordre-samband-heading">
        <HashOpeningDetails
          targetIds={['5-punktsordre', 'sambandsplan']}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          summary={(
          <summary className="min-h-11 cursor-pointer list-none text-base font-black text-slate-950">
            <span className="block text-xs font-black uppercase tracking-wide text-slate-500">Eksport</span>
            <span id="ordre-samband-heading" className="block text-2xl font-black">Ordre og samband</span>
          </summary>
          )}
        >
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div id="5-punktsordre">
            <FivePointOrderForm contentVersion={contentVersion} />
          </div>
          <div id="sambandsplan">
            <CommsPlanForm contentVersion={contentVersion} />
          </div>
          </div>
        </HashOpeningDetails>
      </section>
    </div>
  );
}
