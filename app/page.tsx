import { AppShell } from '@/components/app-shell';
import { HomeActiveMission } from '@/components/home-active-mission';
import { HomeRoleContent } from '@/components/home-role-content';

export default function Home() {
  return (
    <AppShell currentPath="/">
      <HomeActiveMission />
      <HomeRoleContent />
    </AppShell>
  );
}
