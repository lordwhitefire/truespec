import { carHref, carTitle, mileageLabel } from '../components/site/car-view';
import { formatNaira } from './money';
import { sectionLabel } from './sections';
import type { PublicCar } from './serialize';
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from './site';

/**
 * The public inventory feed. Built only from `PublicCar`, the same allow-list the showroom uses,
 * so no office-only field can leak into an RSS reader.
 *
 * Items carry no `pubDate`: the public car record has no honest publication timestamp, and a
 * generated date would claim a freshness the store does not have. The channel's `lastBuildDate`
 * is the one honest time in the document.
 */
export function buildInventoryRss(cars: PublicCar[], generatedAt: Date = new Date()): string {
  const items = cars
    .map((car) => {
      const title = carTitle(car);
      const link = absoluteUrl(carHref(car));
      const mileage = mileageLabel(car);
      const details = [
        formatNaira(car.priceKobo),
        sectionLabel(car.section),
        mileage,
        car.exteriorColor ? `${car.exteriorColor} exterior` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' · ');

      return [
        '    <item>',
        `      <title>${xmlEscape(title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <description>${xmlEscape(`${title} — ${details}.`)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xmlEscape(`${SITE_NAME} inventory`)}</title>`,
    `    <link>${xmlEscape(absoluteUrl('/inventory'))}</link>`,
    `    <description>${xmlEscape(SITE_DESCRIPTION)}</description>`,
    '    <language>en-NG</language>',
    `    <lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${xmlEscape(absoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
