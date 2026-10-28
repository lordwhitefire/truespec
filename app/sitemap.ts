import type { MetadataRoute } from 'next';

import { getPublicCars } from '@/lib/public-cars';
import { buildSitemap } from '@/lib/sitemap';

/**
 * The sitemap is dynamic: a car that is sold, deleted or unlisted must leave it on the next
 * request. `getPublicCars` is the one public read path and already applies those filters.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(await getPublicCars());
}
