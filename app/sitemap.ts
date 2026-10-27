import type { MetadataRoute } from "next";

import { carHref } from "@/components/site/car-view";
import { getPublicCars } from "@/lib/public-cars";
import { absoluteUrl } from "@/lib/site";

/**
 * The sitemap is dynamic: a car that is sold, deleted or unlisted must leave it on the next
 * request. `getPublicCars` is the one public read path and already applies those filters.
 *
 * `/terms` is added by Task 13 once the page exists.
 */
export const dynamic = "force-dynamic";

const PUBLIC_PAGES = ["/", "/inventory", "/privacy", "/terms"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cars = await getPublicCars();

  return [
    ...PUBLIC_PAGES.map((path) => ({ url: absoluteUrl(path) })),
    ...cars.map((car) => ({ url: absoluteUrl(carHref(car)) })),
  ];
}
