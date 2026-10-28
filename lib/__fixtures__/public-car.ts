import type { PublicCar } from '../serialize';

/** A complete public car for tests that need the real allow-list shape, not a partial mock. */
export const baseCar: PublicCar = {
  ref: 'TS-1001',
  brand: 'Toyota',
  model: 'Camry',
  trim: 'XSE V6',
  year: 2021,
  exteriorColor: 'Obsidian black',
  interiorColor: 'Black',
  mileageKm: 31000,
  features: ['Leather seats'],
  photos: ['https://cdn.sanity.io/images/c2lc8g8n/production/abc-1200x800.jpg'],
  priceKobo: 3450000000,
  wasPriceKobo: null,
  section: 'available',
  isNewArrival: false,
  arrivalNote: null,
  sold: false,
  soldAt: null,
};

export function withCar(overrides: Partial<PublicCar>): PublicCar {
  return { ...baseCar, ...overrides };
}
