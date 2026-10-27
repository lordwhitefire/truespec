'use server';

import { revalidatePath } from 'next/cache';
import { requireOfficeSession } from '@/lib/session';
import { saveSetting, type SaveSettingResult } from '@/lib/settings';

/**
 * The three settings, saved for real — truth 12, build step 8.
 *
 * Until now this screen was presentational: four cards, each holding its value in the browser and
 * announcing "(demo)" when it was "saved", so a reload put the old value back and the showroom never
 * moved. These three actions are what makes the save real — the value goes to the `setting` row the
 * showroom reads, and the showroom follows.
 *
 * A Server Action is a public endpoint, so **nothing the browser sent is trusted and the rule is
 * re-applied here** — the WhatsApp number is normalised by the same reader the screen validates with
 * (`lib/phone.ts`), and a save that does not pass is refused with its reason and **writes nothing**,
 * which is what keeps the previous number active (`specs/office-settings`).
 *
 * They take the value as a plain argument rather than a `FormData` because there is no form to submit:
 * each card is a button beside a controlled input, and the answer (the stored value, or the reason it
 * was refused) comes back to the card that asked.
 */

/** The pages a setting write changes. The showroom reads all three — the number builds every chat
 *  button, the tagline sits under the brand — so the revalidation is the root layout, which is every
 *  route beneath it, rather than a list that would have to be kept in step with the showroom. */
function revalidateSettingPaths(): void {
  revalidatePath('/', 'layout');
  revalidatePath('/office/settings');
}

/** The WhatsApp number, stored normalised to `+234…`. A refusal returns its reason. */
export async function saveWhatsapp(value: string): Promise<SaveSettingResult> {
  await requireOfficeSession();
  const result = await saveSetting('whatsapp', value);
  if (result.ok) revalidateSettingPaths();
  return result;
}

/** The tagline — one line under the brand. */
export async function saveTagline(value: string): Promise<SaveSettingResult> {
  await requireOfficeSession();
  const result = await saveSetting('tagline', value);
  if (result.ok) revalidateSettingPaths();
  return result;
}

/** The full-tank default — a form prefill only, never a rate and never a real cost. */
export async function saveFullTankDefault(value: string): Promise<SaveSettingResult> {
  await requireOfficeSession();
  const result = await saveSetting('tank', value);
  if (result.ok) revalidateSettingPaths();
  return result;
}
