import { CommsPlanForm } from '@/components/forms/comms-plan-form';
import { FivePointOrderForm } from '@/components/forms/five-point-order-form';
import { MissionContextPanel } from '@/components/mission-context-panel';
import { getActionCards, getChecklists, getContentManifest } from '@/lib/content/load-content';

export default function MissionsPage() {
  const contentVersion = getContentManifest().contentVersion;

  return (
    <div className="space-y-6">
      <MissionContextPanel contentVersion={contentVersion} checklists={getChecklists()} actionCards={getActionCards()} />
      <section className="space-y-4" aria-labelledby="ordre-samband-heading">
        <div className="rounded-2xl bg-sky-950 p-5 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide text-sky-100">Lokale verktøy</p>
          <h2 id="ordre-samband-heading" className="text-3xl font-black">Ordre og samband</h2>
          <p className="mt-2 text-sm text-sky-100">Strukturer 5-punktsordre og sambandsplan lokalt, og eksporter som Markdown, JSON eller PDF-klar HTML der det støttes.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <FivePointOrderForm contentVersion={contentVersion} />
          <CommsPlanForm />
        </div>
      </section>
    </div>
  );
}
