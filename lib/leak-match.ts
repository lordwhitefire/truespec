/**
 * The one rule the leak-check's value search uses: does a public response carry a private value?
 *
 * A plain `includes` is right for a *word* and wrong for a *number*. The office holds a car's total
 * cost as raw kobo; a cost of ₦55,000 is `5500000`, and the showroom legitimately prints another
 * car's price as `4550000000`. `includes` finds `5500000` **inside** `4550000000` and reports a
 * leak that is not there — the digits merely collide, the same way "cat" sits inside "location".
 *
 * So a digits-only value is a hit only when it is not flanked by another digit; anything else
 * (a formatted value, which carries the naira sign and grouping) is matched exactly as written. The
 * check keeps its teeth: a genuine raw-kobo total printed on its own still trips it.
 */

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** A value made only of digits — the shape a number takes once stringified. */
export function isAllDigits(value: string): boolean {
  if (value === '') return false;
  for (const ch of value) {
    if (!isDigit(ch)) return false;
  }
  return true;
}

/**
 * Does `body` mention `value` as a value of its own?
 *
 * - digits-only: present only where no other digit touches it on either side (so `5500000` is not
 *   found inside `4550000000`, and not inside `15500000` either);
 * - anything else: present wherever it appears verbatim.
 */
export function mentionsValue(body: string, value: string): boolean {
  if (value === '') return false;
  if (!isAllDigits(value)) return body.includes(value);

  for (let from = 0; ;) {
    const at = body.indexOf(value, from);
    if (at === -1) return false;
    const before = at === 0 ? '' : body[at - 1];
    const after = at + value.length >= body.length ? '' : body[at + value.length];
    if (!isDigit(before) && !isDigit(after)) return true;
    from = at + 1;
  }
}
