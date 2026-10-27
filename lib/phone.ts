/**
 * A valid WhatsApp number, and how it is written down.
 *
 * The rule (owner ruling, task.md:413-416; `specs/office-settings` — "WhatsApp number validated
 * before it saves"):
 *
 * > A valid number is a Nigerian mobile written as `+234…`, `234…`, or `0…`. It SHALL be stored
 * > **normalised to `+234…`** and digits only, because the `wa.me` link the tap button builds only
 * > resolves when the number holds one fixed shape. Anything else — letters, a partial number, a
 * > foreign number without its country code — is invalid and is refused.
 *
 * This module is the **whole** of that rule and it is pure: no store, no session, no Next. That is
 * deliberate — the settings screen validates while the owner types (a `server-only` module cannot be
 * imported by a `"use client"` component) and the Server Action validates again before it writes, and
 * both must mean the same thing or a number can be refused at the field and accepted at the store.
 * There is one reader here, exactly as the car form has one (`lib/car-input.ts`).
 *
 * Two facts it takes for granted, both proven elsewhere: a Nigerian country code is `234`, and a
 * Nigerian **mobile**'s national number is ten digits beginning 7, 8 or 9 (a number beginning 1, 2…6
 * is a landline, and this screen's number is the one every chat button opens — a landline there is a
 * dead button too).
 *
 * The three accepted shapes are three writings of one number:
 *
 *   `0803 123 4567` → `2348031234567` → `+2348031234567`
 *   `2348031234567` → `2348031234567` → `+2348031234567`
 *   `+234 803 123 4567` → `2348031234567` → `+2348031234567`
 */

export type NormalisedMobile = { ok: true; value: string } | { ok: false; reason: string };

/** What a `wa.me` link carries: the digits of a stored number, with the sign and every
 * separator taken off. `wa.me/2348031234567` — one fixed shape, or the chat does not open. */
export function waMeDigits(stored: string): string {
  return stored.replace(/\D/g, '');
}

/** `+234` — the country code every accepted form is rewritten to. */
const COUNTRY = '234';

/** The ten-digit national number of a Nigerian mobile begins 7, 8 or 9. */
const MOBILE = /^[789]/;

/** A phone number may hold digits and separators — never letters, never a `+` anywhere but the
 * front (checked separately, by what is left after it). */
const SEPARABLE = /^[0-9\s\-().]+$/;

export function normaliseNigerianMobile(raw: string): NormalisedMobile {
  const input = typeof raw === 'string' ? raw.trim() : '';
  if (input === '') return { ok: false, reason: 'Enter a WhatsApp number.' };

  if (/[a-z]/i.test(input)) {
    return { ok: false, reason: 'A WhatsApp number is digits only — that has letters in it.' };
  }

  const hasPlus = input.startsWith('+');
  const body = hasPlus ? input.slice(1) : input;
  if (!SEPARABLE.test(body)) {
    return {
      ok: false,
      reason: 'A WhatsApp number is digits only — that has other characters in it.',
    };
  }
  const digits = body.replace(/\D/g, '');

  let national: string;
  if (hasPlus) {
    // A country code was written, so it had better be Nigeria's — `+234`, not the trunk `0`.
    if (!digits.startsWith(COUNTRY)) {
      return { ok: false, reason: "That number does not carry Nigeria's country code, +234." };
    }
    national = digits.slice(COUNTRY.length);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else if (digits.startsWith(COUNTRY)) {
    national = digits.slice(COUNTRY.length);
  } else {
    return { ok: false, reason: 'That is not a Nigerian number — write it as +234…, 234…, or 0….' };
  }

  if (national.length < 10) {
    return { ok: false, reason: 'That number is incomplete — write it as +234…, 234…, or 0….' };
  }
  if (national.length > 10) {
    return {
      ok: false,
      reason: 'That number has too many digits — write it as +234…, 234…, or 0….',
    };
  }
  if (!MOBILE.test(national)) {
    return {
      ok: false,
      reason: 'That is not a Nigerian mobile number — write it as +234…, 234…, or 0….',
    };
  }

  return { ok: true, value: `+${COUNTRY}${national}` };
}
