/**
 * What an `activity_event` row *says* — one place, so the activity log and the dashboard's
 * recent-activity panel cannot word the same row two ways (truth 11's rule in words, as
 * `lib/counts.ts` is it in figures).
 *
 * D20 keeps a row to a `kind` and a `subject` and nothing else: no message, no figure. So the wording
 * is composed from the kind here; a kind this build does not yet name reads as itself rather than being
 * guessed at, so a row a later task writes shows up plainly instead of as a blank or a broken chip.
 *
 * Pure, and deliberately importable from both sides — the log is a client component and the dashboard
 * is a server component, and both draw the same rows. Nothing here reads the store or the browser.
 */
import { clock, dayKey, dayTitle, weekdayDay } from "./office-time";

/** One row of the log, as both screens draw it. The day and time arrive preformatted, in UTC. */
export type ActivityEntry = {
  id: string;
  kind: string;
  /** The `TS-####` a car event names, or whatever subject the event carries. */
  subject: string;
  /** The stored instant, ISO — what a panel measures "how long ago" from. */
  at: string;
  /** The UTC day, as `2026-10-04` — the group key. */
  day: string;
  /** `Today`, `Yesterday`, or the weekday and the date once it is older than that. */
  dayTitle: string;
  /** The weekday and the date, always — shown beside Today and Yesterday. */
  dayFull: string;
  /** The UTC time, as `08:42`. */
  clock: string;
  /** The operator's email, or `null` when their account has gone. */
  actor: string | null;
};

/** One row of the store's feed, before the wording and the UTC clock are put on it. */
export type ActivityEvent = {
  id: string;
  kind: string;
  subject: string;
  at: string;
  actor: string | null;
};

/** What each kind says, and which chip it belongs to. One word per kind, used by both screens. */
export const ACTIONS: Record<string, { word: string; category: string }> = {
  "car.created": { word: "Added a car", category: "add" },
  "car.updated": { word: "Edited a car", category: "edit" },
  "car.sold": { word: "Marked a car as Sold", category: "sold" },
  "car.unsold": { word: "Took a car out of Sold", category: "state" },
  "car.deleted": { word: "Deleted a car", category: "del" },
  "car.restored": { word: "Restored a car", category: "del" },
  "car.removed": { word: "Removed a car for good", category: "del" },
};

export const CATEGORIES = [
  { k: "all", label: "All" },
  { k: "add", label: "Added" },
  { k: "edit", label: "Edited" },
  { k: "state", label: "State" },
  { k: "sold", label: "Sold" },
  { k: "del", label: "Deleted" },
  { k: "imp", label: "Imports" },
  { k: "set", label: "Settings" },
] as const;

/** The chip a kind belongs to, or `""` for a kind this build does not yet name. */
export const categoryOf = (kind: string): string => ACTIONS[kind]?.category ?? "";

/** A kind this build names reads as its own word; anything else reads as itself. */
export const wordOf = (kind: string): string => ACTIONS[kind]?.word ?? kind;

/** The chip's own label — `Other` for a kind this build does not yet name. */
export function categoryLabel(kind: string): string {
  return CATEGORIES.find((t) => t.k === categoryOf(kind))?.label ?? "Other";
}

/** The row's avatar — the operator's own initial, and their email on hover. */
export function operator(actor: string | null): { initial: string; title: string } {
  if (!actor) return { initial: "?", title: "An operator whose account has since been removed" };
  return { initial: actor.slice(0, 1).toUpperCase(), title: actor };
}

/**
 * The store's rows, with the wording's day, title and clock put on them.
 *
 * `now` is passed in rather than read here, so one render words every row against the same instant
 * — and so the mapping is a pure function a test can pin.
 */
export function toActivityEntries(events: readonly ActivityEvent[], now: Date): ActivityEntry[] {
  return events.map((e) => ({
    id: e.id,
    kind: e.kind,
    subject: e.subject,
    at: e.at,
    day: dayKey(e.at),
    dayTitle: dayTitle(e.at, now),
    dayFull: weekdayDay(e.at),
    clock: clock(e.at),
    actor: e.actor,
  }));
}
