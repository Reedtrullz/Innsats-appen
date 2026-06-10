import type { Metadata } from 'next';
import { RoleProviderWrapper } from '@/components/role-provider-wrapper';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';
import { ThemeRuntime } from '@/components/theme-runtime';
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
