/**
 * What a tap is, and everything a tap may carry (truth 8; `specs/dashboard`, `specs/showroom`).
 *
 * > A tap is three facts and no person. A buyer's WhatsApp tap records the **page, the car's
 * > reference and the time** — nothing else: no name, no number, no message, no address.
 *
 * The time is the store's, not the visitor's. Nothing here reads a clock: the row lands with
 * `at timestamptz NOT NULL DEFAULT now()`, so a caller cannot set it, and a wrong client clock cannot
 * write itself into the record.
 *
 * Like `lib/photo-rules.ts`, this module is pure and holds no `server-only`, for two reasons: the
 * same rule runs in the browser (which sends `location.pathname`) and on the server (which decides),
 * and a rule that can be unit-tested is a rule that cannot quietly rot.
 *
 * `readTap` is the allowlist. It reads exactly two fields out of whatever arrives and ignores every
 * other key, so the three facts cannot grow: a future caller that posts a name, a number or a message
 * finds it is never read, never mind stored. The row's own columns are the other half of the
 * guarantee, and the witness checks both.
 */
import { isValidRef } from './refs';

/** Long enough for any path on this site, short enough to refuse a body that is not one. */
export const TAP_PAGE_MAX = 300;

/**
 * Is this a page on this site? A path, never an address: it starts with a single `/`, carries no
 * scheme, no host, no port (no `:`), no whitespace and no backslash. The visitor's
 * `location.pathname` satisfies this by construction; a value that does not is not one of ours.
 */
export function isTapPage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > TAP_PAGE_MAX) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false; // protocol-relative — that is an address
  if (/[\s\\]/.test(value)) return false;
  if (value.includes(':')) return false; // a scheme, a port or a search term's colon: not a path
  return true;
}

/**
 * The car a page stands for, read off its own address: `/car/TS-1001` → `TS-1001`, anything else →
 * `null` (a general tap).
 *
 * This is the second place that knows a car page's path, so it is written once, here, beside the
 * other tap rules, and tested. It resolves by the one reference shape (`isValidRef`), so a path
 * that is not a reference is not a car.
 */
export function carRefInPath(pathname: string): string | null {
  const match = /^\/car\/([^/?#]+)/.exec(pathname);
  if (!match) return null;
  let ref: string;
  try {
    ref = decodeURIComponent(match[1]);
  } catch {
    return null; // a malformed escape is not a reference
  }
  return isValidRef(ref) ? ref : null;
}

export type TapInput = {
  /** The visitor's path — `/` for the home page. */
  page: string;
  /** The `TS-####` the tap named, or `null` for a general tap. */
  carRef: string | null;
};

export type TapRead = { ok: true; value: TapInput } | { ok: false; reason: string };

/**
 * Read a tap out of whatever arrived. Two fields are read and every other key is ignored, so nothing
 * a caller sends beyond the page and the car's reference can reach the row.
 *
 * The reasons are for the developer reading a log, not for the buyer: a tap that is refused must not
 * tell a stranger anything about how the door is shaped.
 */
export function readTap(body: unknown): TapRead {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, reason: 'the body is not an object' };
  }
  const { page, carRef } = body as Record<string, unknown>;

  if (!isTapPage(page)) return { ok: false, reason: 'the page is not a path on this site' };

  if (carRef === undefined || carRef === null || carRef === '') {
    return { ok: true, value: { page, carRef: null } };
  }
  if (typeof carRef !== 'string' || !isValidRef(carRef)) {
    return { ok: false, reason: 'the car reference is not one of ours' };
  }
  return { ok: true, value: { page, carRef } };
}
