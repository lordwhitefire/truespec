/**
 * The office session's limits, executable.
 *
 * These pin design D4 / D17 and `specs/office-access`:
 *   - valid iff `now < expires_at` (7 days total),
 *   - and idle no more than 12 hours,
 *   - with `last_seen_at` refreshed on a 5-minute cooldown.
 *
 * Only the pure rules are tested here. The store-bound half (`lib/session.ts`)
 * touches Clerk and the database and is exercised by the door's refusal proof
 * (`developer-workspace/scripts/task-004/`) instead.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  LAST_SEEN_REFRESH_MS,
  SESSION_IDLE_MS,
  SESSION_TOTAL_MS,
  expiryFrom,
  isSessionValid,
  shouldRefreshLastSeen,
  type SessionWindow,
} from "./session-rules";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A window created `at`, whose idle clock starts then, with the 7-day expiry. */
function windowCreatedAt(at: Date): SessionWindow {
  return { lastSeenAt: at, expiresAt: expiryFrom(at) };
}

test("the stated numbers are the ruled ones", () => {
  assert.equal(SESSION_TOTAL_MS, 7 * DAY);
  assert.equal(SESSION_IDLE_MS, 12 * HOUR);
  assert.equal(LAST_SEEN_REFRESH_MS, 5 * MINUTE);
});

test("expiryFrom stamps exactly created_at + 7 days", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  assert.equal(expiryFrom(created).toISOString(), "2026-10-21T09:00:00.000Z");
});

test("a fresh session is valid", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  const now = new Date(created.getTime() + MINUTE);
  assert.equal(isSessionValid(windowCreatedAt(created), now), true);
});

test("the idle window is inclusive at exactly 12 hours", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  const atLimit = new Date(created.getTime() + 12 * HOUR);
  assert.equal(isSessionValid(windowCreatedAt(created), atLimit), true);

  const justOver = new Date(atLimit.getTime() + 1);
  assert.equal(isSessionValid(windowCreatedAt(created), justOver), false);
});

test("the 7-day cap is strict — expired the instant it is reached", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  const expiry = expiryFrom(created);
  const justBefore = new Date(expiry.getTime() - 1);
  // seen a minute ago, so the total cap is what is being measured, not the idle one
  const window: SessionWindow = {
    expiresAt: expiry,
    lastSeenAt: new Date(justBefore.getTime() - MINUTE),
  };
  assert.equal(isSessionValid(window, justBefore), true);
  assert.equal(isSessionValid(window, expiry), false);
});

test("a refreshed session outlives its original creation, up to the 7-day cap", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  const window = windowCreatedAt(created);
  // activity every 6 hours: idle never exceeds 12h, so it stays valid until 7 days
  window.lastSeenAt = new Date(created.getTime() + 6 * DAY);
  assert.equal(isSessionValid(window, new Date(created.getTime() + 6 * DAY + HOUR)), true);
  // but not past the total cap, however recently it was seen
  assert.equal(isSessionValid(window, new Date(created.getTime() + 7 * DAY)), false);
});

test("last_seen_at is refreshed on the 5-minute cooldown, and not before", () => {
  const seen = new Date("2026-10-14T09:00:00.000Z");
  assert.equal(shouldRefreshLastSeen(seen, new Date(seen.getTime() + 4 * MINUTE + 59_999)), false);
  assert.equal(shouldRefreshLastSeen(seen, new Date(seen.getTime() + 5 * MINUTE)), true);
  assert.equal(shouldRefreshLastSeen(seen, new Date(seen.getTime() + HOUR)), true);
});
