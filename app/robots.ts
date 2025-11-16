import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://monaghans.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/kitchen/', '/timeclock/', '/portal/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

