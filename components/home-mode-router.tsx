'use client';

import type { OperationalChecklist } from '@/lib/content/schemas';
import { useMode } from '@/lib/mode/mode-context';
import { HomeActiveMission } from '@/components/home-active-mission';
import { HomeRoleContent } from '@/components/home-role-content';
import { PersonalHome } from '@/components/personlig/personal-home';

/**
 * Switches the home surface by app mode (board: "Hardt skille ved oppstart,
 * delt grunnmur"). Shared bottom nav and design foundation; only the home
 * content and tempo change. Innsats keeps the operational home; Personlig
 * shows the calm preparation landing.
 */
export function HomeModeRouter({
  packingChecklist,
  sourceTitleById = {},
}: {
  packingChecklist?: OperationalChecklist;
  sourceTitleById?: Record<string, string>;
}) {
  const { mode } = useMode();

  if (mode === 'personlig') {
    return <PersonalHome packingChecklist={packingChecklist} sourceTitleById={sourceTitleById} />;
  }

  return (
    <>
      <HomeActiveMission />
      <HomeRoleContent />
    </>
  );
}
