import { buildInventoryRss } from '@/lib/feed';
import { getPublicCars } from '@/lib/public-cars';

/**
 * The inventory feed is dynamic for the same reason the sitemap is: a sold or unlisted car must
 * leave it on the next request.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const cars = await getPublicCars();
  return new Response(buildInventoryRss(cars), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  });
}
