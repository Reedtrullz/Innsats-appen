import { AppShell } from '@/components/app-shell';
import { HomeModeRouter } from '@/components/home-mode-router';
import { getChecklists, getSourceDocuments } from '@/lib/content/load-content';
import { buildSourceTitleById } from '@/lib/content/source-titles';

/** The pakk-sekken list shown in Personlig modus reuses existing curated content. */
const PACKING_CHECKLIST_SLUG = 'personlig-utstyr-for-utrykning';

export default function Home() {
  const packingChecklist = getChecklists().find((checklist) => checklist.slug === PACKING_CHECKLIST_SLUG);
  const sourceTitleById = buildSourceTitleById(getSourceDocuments());

  return (
    <AppShell currentPath="/">
      <HomeModeRouter packingChecklist={packingChecklist} sourceTitleById={sourceTitleById} />
    </AppShell>
  );
}
