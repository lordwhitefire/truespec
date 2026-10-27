/**
 * How the office says *when* — one place, so the two screens that show a time agree.
 *
 * Everything here reads the instant in **UTC** and returns a plain string. That is deliberate:
 * a screen that formatted a date in the browser would say one day while the server said another,
 * and React would then complain that the two renders disagreed. The office's own dates are already
 * UTC everywhere else (a sale date is stored at noon UTC and read back as a UTC day, `lib/car-input.ts`
 * checks a day as a UTC day), so this file follows the same rule rather than inventing a second one.
 *
 * The names are spelled out rather than taken from `Intl`, so the same input produces the same
 * output on any machine, in any locale, in any build — a test can pin it and a screenshot cannot
 * surprise anyone.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

/** The instant's UTC calendar day, as `2026-10-04`. Keys a group of entries. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The instant's UTC time, as `08:42`. */
export function clock(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** The instant's UTC day, as `4 Oct 2026`. */
export function longDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The instant's UTC day with its weekday, as `Saturday 4 Oct 2026`. */
export function weekdayDay(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getUTCDay()]} ${longDay(iso)}`;
}

/** Whole UTC days between an instant and now — the calendar's count, not 24-hour blocks. */
function daysApart(iso: string, now: Date): number {
  const then = new Date(iso);
  const a = Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((b - a) / 86_400_000);
}

/**
 * How long ago, said the way the board says it: minutes and hours on the day itself, then
 * `Yesterday`, then a few days, then the day and month once the week is past.
 */
export function shortAge(iso: string, now: Date): string {
  const days = daysApart(iso, now);

  if (days <= 0) {
    const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr`;
    return 'today';
  }

  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days`;
  return longDay(iso).slice(0, -5);
}

/**
 * The heading a day's entries sit under: `Today`, `Yesterday`, or the weekday and the date once it
 * is older than that.
 */
export function dayTitle(iso: string, now: Date): string {
  const days = daysApart(iso, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return weekdayDay(iso);
}
