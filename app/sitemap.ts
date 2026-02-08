import type { MetadataRoute } from 'next';
import { getBootstrapData } from '@/lib/fpl-server';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fpl-sigma.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/players`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/fixtures`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/live`,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/optimizer`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  // Add individual player pages
  try {
    const bootstrap = await getBootstrapData();
    const playerPages: MetadataRoute.Sitemap = bootstrap.elements.map((p) => ({
      url: `${BASE_URL}/players/${p.id}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));
    return [...staticPages, ...playerPages];
  } catch {
    // If FPL API is down, return static pages only
    return staticPages;
  }
}
