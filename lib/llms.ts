import { carHref, carTitle, mileageLabel } from '../components/site/car-view';
import { formatNaira } from './money';
import { sectionLabel } from './sections';
import type { PublicCar } from './serialize';
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from './site';

/**
 * The AI-reader files, built from the same `PublicCar` allow-list as the showroom. No office field,
 * no cost line, no enquiry detail and no demo-only state can reach them.
 */
export function buildLlmsTxt(cars: PublicCar[], whatsappNumber: string | null): string {
  const contact = whatsappContact(whatsappNumber);

  return [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    '## Canonical pages',
    `- [Home](${absoluteUrl('/')})`,
    `- [Inventory](${absoluteUrl('/inventory')}) — ${cars.length} ${cars.length === 1 ? 'car' : 'cars'} currently listed`,
    `- [Privacy notice](${absoluteUrl('/privacy')})`,
    `- [Terms of service](${absoluteUrl('/terms')})`,
    '',
    '## What this site is',
    'TrueSpec Automotive is a Nigerian vehicle-import showroom. The public inventory lists cars imported from the USA with one doorstep price in Nigerian naira (NGN). The listed price includes shipping, clearing and delivery to the buyer in Nigeria.',
    '',
    '## How buying works',
    'Browse the inventory, then message the owner on WhatsApp to confirm the car, the price and delivery. No payment is taken on this site.',
    '',
    '## Contact',
    `- WhatsApp: ${contact}`,
    `- Security contact: ${absoluteUrl('/.well-known/security.txt')}`,
    '',
    '## What is not here',
    '- No third-party reviews, ratings or testimonials are published.',
    '- No review or aggregate-rating markup is emitted.',
    '- No financing, insurance, warranty or trade-in programme is claimed.',
    '- No legal entity, registered address, telephone number, tax ID or AutoDealer markup is asserted.',
    '- No payment is taken on this site.',
    '',
    '## Full inventory',
    `The full public inventory text is at ${absoluteUrl('/llms-full.txt')}.`,
    '',
  ].join('\n');
}

export function buildLlmsFullTxt(cars: PublicCar[], whatsappNumber: string | null): string {
  const contact = whatsappContact(whatsappNumber);
  const lines = [
    `# ${SITE_NAME} — full public inventory`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Canonical site: ${absoluteUrl('/')}`,
    `This text is generated from the public showroom. ${cars.length} ${cars.length === 1 ? 'car is' : 'cars are'} currently listed.`,
    '',
    '## Inventory',
    '',
  ];

  for (const car of cars) {
    const title = carTitle(car);
    const link = absoluteUrl(carHref(car));
    const mileage = mileageLabel(car);

    lines.push(`### ${title}`);
    lines.push(`- URL: ${link}`);
    lines.push(`- Reference: ${car.ref}`);
    lines.push(`- Price: ${formatNaira(car.priceKobo)}`);
    lines.push(`- Status: ${sectionLabel(car.section)}`);
    if (mileage) lines.push(`- Mileage: ${mileage}`);
    if (car.exteriorColor) lines.push(`- Exterior: ${car.exteriorColor}`);
    if (car.interiorColor) lines.push(`- Interior: ${car.interiorColor}`);
    if (car.features.length) lines.push(`- Features: ${car.features.join(', ')}`);
    if (car.arrivalNote) lines.push(`- Arrival note: ${car.arrivalNote}`);
    lines.push('');
  }

  lines.push(
    '## Pages',
    '',
    `- [Home](${absoluteUrl('/')})`,
    `- [Inventory](${absoluteUrl('/inventory')})`,
    `- [Privacy notice](${absoluteUrl('/privacy')})`,
    `- [Terms of service](${absoluteUrl('/terms')})`,
    '',
    '## Contact',
    '',
    `- WhatsApp: ${contact}`,
    `- Security contact: ${absoluteUrl('/.well-known/security.txt')}`,
    '',
    '## What is not here',
    '',
    '- No third-party reviews, ratings or testimonials are published.',
    '- No review or aggregate-rating markup is emitted.',
    '- No financing, insurance, warranty or trade-in programme is claimed.',
    '- No legal entity, registered address, telephone number, tax ID or AutoDealer markup is asserted.',
    '- No payment is taken on this site.',
    ''
  );

  return lines.join('\n');
}

function whatsappContact(number: string | null): string {
  const digits = (number ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : 'No WhatsApp number is saved yet.';
}
