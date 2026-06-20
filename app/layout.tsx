import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { RoleProviderWrapper } from '@/components/role-provider-wrapper';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { ThemeRuntime } from '@/components/theme-runtime';
import { getThemeInitScript } from '@/lib/theme';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Beredskapsboka',
  description: 'Mobilførst og kildebelagt støtte for Sivilforsvaret.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="no" suppressHydrationWarning className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        {/*
          No-flash theme init: must run before paint, so it is an inline script in the
          root layout (the standard Next.js pattern). In development, React logs
          "Encountered a script tag while rendering React component" on client navigations;
          this is a dev-only console warning (stripped from production builds, same as the
          React eval()/CSP dev warnings) and does not affect the deployed app.
        */}
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
        <ThemeRuntime />
        <ServiceWorkerRegistration />
        <RoleProviderWrapper>{children}</RoleProviderWrapper>
      </body>
    </html>
  );
}
