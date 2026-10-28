import { buildLlmsTxt } from '@/lib/llms';
import { getPublicCars, getSetting } from '@/lib/public-cars';

/**
 * The public truth for AI readers. Only the same public read path the showroom uses, plus the
 * saved WhatsApp number. No office surface, no cost line, no enquiry detail and no demo-only state.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const [cars, number] = await Promise.all([getPublicCars(), getSetting('whatsapp_number')]);
  return new Response(buildLlmsTxt(cars, number), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
