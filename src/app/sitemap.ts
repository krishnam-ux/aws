import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://awssbg-cuup.vercel.app';
  const routes = [
    '',
    '/about',
    '/activities',
    '/events',
    '/resources',
    '/verification',
    '/leadership',
    '/governance',
    '/collaborate',
    '/join',
    '/contact',
    '/updates',
    '/transparency',
    '/verification-request',
    '/faq',
    '/privacy',
    '/terms',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '' ? 1.0 : 0.7,
  }));
}
