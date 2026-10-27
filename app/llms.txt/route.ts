import { getPublicCars, getSetting } from '@/lib/public-cars';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/site';

/**
 * The public truth for AI readers. Only the same public read path the showroom uses, plus the
 * saved WhatsApp number. No office surface, no cost line, no enquiry detail and no demo-only state.
 *
 * `/terms` links here after Task 13, when the page exists.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const [cars, number] = await Promise.all([getPublicCars(), getSetting('whatsapp_number')]);
  const digits = (number ?? '').replace(/\D/g, '');
  const contact = digits ? `https://wa.me/${digits}` : 'No WhatsApp number is saved yet.';

  const body = [
    SITE_NAME,
    '',
    SITE_DESCRIPTION,
    '',
    `Home: ${absoluteUrl('/')}`,
    `Inventory: ${absoluteUrl('/inventory')} (${cars.length} cars currently listed)`,
    `Privacy: ${absoluteUrl('/privacy')}`,
    `Terms: ${absoluteUrl('/terms')}`,
    '',
    'Prices are in Nigerian naira (NGN). The listed price is the full amount to your door in Nigeria; shipping, clearing and delivery are included.',
    '',
    `WhatsApp: ${contact}`,
    'Buying and questions happen on WhatsApp.',
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
