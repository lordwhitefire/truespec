import { carHref, carTitle } from '../components/site/car-view';
import { sizedPhotoUrl } from './photo-url';
import type { PublicCar } from './serialize';
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from './site';

const SCHEMA = 'https://schema.org';

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

/**
 * The public Vehicle/Offer graph for a car page.
 *
 * Built only from the `PublicCar` the page already renders, so no office-only value can leak in.
 * A sold car keeps its Vehicle node but its Offer is `SoldOut`, never `InStock`.
 */
export type CarJsonLd = {
  '@context': string;
  '@type': 'Vehicle';
  name: string;
  sku: string;
  brand?: { '@type': 'Brand'; name: string };
  model?: string;
  vehicleModelDate?: string;
  mileageFromOdometer?: {
    '@type': 'QuantitativeValue';
    value: number;
    unitCode: 'KMT';
  };
  color?: string;
  vehicleInteriorColor?: string;
  vehicleConfiguration?: string;
  url: string;
  image: string;
  offers: {
    '@type': 'Offer';
    price: number;
    priceCurrency: 'NGN';
    availability: string;
    itemCondition: string;
    url: string;
    seller: { '@type': 'Organization'; '@id': string; name: string; url: string };
  };
};

function availabilityFor(car: PublicCar): string {
  if (car.sold || car.section === 'sold') return `${SCHEMA}/SoldOut`;
  if (car.section === 'on order') return `${SCHEMA}/PreOrder`;
  return `${SCHEMA}/InStock`;
}

export function buildCarJsonLd(car: PublicCar): CarJsonLd {
  const url = absoluteUrl(carHref(car));
  const image = car.photos[0]
    ? sizedPhotoUrl(car.photos[0], 1200, 630)
    : absoluteUrl(DEFAULT_OG_IMAGE);

  const jsonLd: CarJsonLd = {
    '@context': SCHEMA,
    '@type': 'Vehicle',
    name: carTitle(car),
    sku: car.ref,
    url,
    image,
    offers: {
      '@type': 'Offer',
      price: car.priceKobo / 100,
      priceCurrency: 'NGN',
      availability: availabilityFor(car),
      itemCondition: `${SCHEMA}/UsedCondition`,
      url,
      seller: {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_ORIGIN,
      },
    },
  };

  if (car.brand) jsonLd.brand = { '@type': 'Brand', name: car.brand };
  if (car.model) jsonLd.model = car.model;
  if (car.year !== null) jsonLd.vehicleModelDate = String(car.year);
  if (car.mileageKm !== null) {
    jsonLd.mileageFromOdometer = {
      '@type': 'QuantitativeValue',
      value: car.mileageKm,
      unitCode: 'KMT',
    };
  }
  if (car.exteriorColor) jsonLd.color = car.exteriorColor;
  if (car.interiorColor) jsonLd.vehicleInteriorColor = car.interiorColor;
  if (car.trim) jsonLd.vehicleConfiguration = car.trim;

  return jsonLd;
}

/**
 * The site-wide Organization node. Minimal on purpose: the MVP is not a registered business, so
 * there is no address, telephone, geo, tax ID or AutoDealer type to assert.
 */
export type OrganizationJsonLd = {
  '@context': string;
  '@type': 'Organization';
  '@id': string;
  name: string;
  url: string;
  description: string;
};

export function buildOrganizationJsonLd(): OrganizationJsonLd {
  return {
    '@context': SCHEMA,
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    description: SITE_DESCRIPTION,
  };
}

/**
 * The site-wide WebSite node. No `SearchAction`: the public site has no real search endpoint, and a
 * fake one would promise a capability that does not exist.
 */
export type WebSiteJsonLd = {
  '@context': string;
  '@type': 'WebSite';
  '@id': string;
  url: string;
  name: string;
  description: string;
  inLanguage: string;
  publisher: { '@id': string };
};

export function buildWebSiteJsonLd(): WebSiteJsonLd {
  return {
    '@context': SCHEMA,
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_ORIGIN,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-NG',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export type BreadcrumbItem = { name: string; path: string };

export type BreadcrumbListJsonLd = {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }>;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): BreadcrumbListJsonLd {
  return {
    '@context': SCHEMA,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export type InventoryJsonLd = {
  '@context': string;
  '@type': 'ItemList';
  name: string;
  numberOfItems: number;
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    url: string;
    name: string;
  }>;
};

export function buildInventoryJsonLd(cars: PublicCar[]): InventoryJsonLd {
  return {
    '@context': SCHEMA,
    '@type': 'ItemList',
    name: `${SITE_NAME} inventory`,
    numberOfItems: cars.length,
    itemListElement: cars.map((car, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(carHref(car)),
      name: carTitle(car),
    })),
  };
}
