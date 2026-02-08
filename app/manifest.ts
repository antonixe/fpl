import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FPLGRID — Data-Driven FPL Analysis',
    short_name: 'FPLGRID',
    description: 'Analyze FPL players, optimize your team, and dominate your mini-leagues with data-driven insights.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#D45A00',
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
  };
}
