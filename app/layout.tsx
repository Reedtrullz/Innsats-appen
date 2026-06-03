import type { Metadata } from 'next';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beredskapsboka',
  description: 'Mobilførst og kildebelagt støtte for Sivilforsvaret.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="no">
      <body><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
