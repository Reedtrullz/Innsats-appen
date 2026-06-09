import { DeviceGatePanel } from '@/components/device-gate-panel';
import { ReleaseReadinessTool } from '@/components/release-readiness-tool';

export default function ReleaseReadinessPage() {
  return (
    <main className="min-h-screen bg-white">
      <DeviceGatePanel />
      <ReleaseReadinessTool />
    </main>
  );
}
