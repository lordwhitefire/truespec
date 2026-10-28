import type { MetadataRoute } from 'next';

import { carHref } from '../components/site/car-view';
import type { PublicCar } from './serialize';
import { absoluteUrl, PRIVACY_LAST_UPDATED_ISO, TERMS_LAST_UPDATED_ISO } from './site';

/**
 * The sitemap's content, separated from the live store read so it can be tested without a database.
 *
 * Static pages carry a last-modified only where the page itself states one. Cars carry their public
 * photos as image-sitemap entries; a car with no photo simply has no image entry.
 */
export function buildSitemap(cars: PublicCar[]): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/') },
    { url: absoluteUrl('/inventory') },
    { url: absoluteUrl('/privacy'), lastModified: PRIVACY_LAST_UPDATED_ISO },
    { url: absoluteUrl('/terms'), lastModified: TERMS_LAST_UPDATED_ISO },
    ...cars.map((car) => ({
      url: absoluteUrl(carHref(car)),
      // The original public photo URL. A derivative query string would carry `&`, which the
      // sitemap serializer does not XML-escape; the original is valid XML and still the real image.
      ...(car.photos.length ? { images: car.photos } : {}),
    })),
  ];
}
