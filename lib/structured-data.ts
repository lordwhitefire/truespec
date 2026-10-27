import { carHref, carTitle } from '../components/site/car-view';
import { sizedPhotoUrl } from './photo-url';
import type { PublicCar } from './serialize';
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_ORIGIN } from './site';

const SCHEMA = 'https://schema.org';

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
    seller: { '@type': 'AutoDealer'; name: string; url: string };
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
      seller: { '@type': 'AutoDealer', name: SITE_NAME, url: SITE_ORIGIN },
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
