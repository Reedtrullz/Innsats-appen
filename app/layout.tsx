import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beredskapsboka',
  description: 'Mobilførst og kildebelagt støtte for Sivilforsvaret.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="no">
      <body>{children}</body>
    </html>
  );
}
