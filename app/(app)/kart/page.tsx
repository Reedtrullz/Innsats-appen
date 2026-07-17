import { OfflineMapPanel } from '@/components/offline-map-panel';

export const metadata = {
  title: 'Kart | Beredskapsboka',
};

export default function KartPage() {
  return <div className="min-h-[calc(100dvh-10rem)]"><OfflineMapPanel /></div>;
}
