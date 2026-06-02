import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Beredskapsboka',
    short_name: 'Beredskap',
    description: 'Mobilførst offline støtte for Sivilforsvaret.',
    start_url: '/hurtigkort',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#082f49',
    lang: 'no',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
