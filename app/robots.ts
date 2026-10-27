import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/lib/site';

/**
 * The public crawler rule. This is a request to crawlers, not access control: the office shell
 * still enforces its own session, and the API routes still enforce their own checks.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/office/', '/api/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
