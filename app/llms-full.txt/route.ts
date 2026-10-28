import { buildLlmsFullTxt } from '@/lib/llms';
import { getPublicCars, getSetting } from '@/lib/public-cars';

/**
 * The full public inventory for AI readers. Built from the same public allow-list as the showroom;
 * no office-only field can reach it.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const [cars, number] = await Promise.all([getPublicCars(), getSetting('whatsapp_number')]);
  return new Response(buildLlmsFullTxt(cars, number), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
