import { LocalDataBackupPanel } from '@/components/local-data-backup-panel';
import { LocalPrivacyProfilePanel } from '@/components/local-privacy-profile-panel';

export const metadata = {
  title: 'Personvern og lokal profil – Beredskapsboka',
};

export default function PersonvernPage() {
  return (
    <div className="space-y-4">
      <LocalPrivacyProfilePanel />
      <LocalDataBackupPanel />
    </div>
  );
}
