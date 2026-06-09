import type { Metadata } from 'next';
import { RoleProviderWrapper } from '@/components/role-provider-wrapper';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { getThemeInitScript } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beredskapsboka',
  description: 'Mobilførst og kildebelagt støtte for Sivilforsvaret.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="no" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <ServiceWorkerRegistration />
        <RoleProviderWrapper>{children}</RoleProviderWrapper>
      </body>
    </html>
  );
}
