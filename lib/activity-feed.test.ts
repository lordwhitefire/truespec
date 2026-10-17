import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACTIONS,
  CATEGORIES,
  categoryLabel,
  categoryOf,
  countOf,
  operator,
  toActivityEntries,
  wordOf,
  type ActivityEntry,
  type ActivityEvent,
} from "./activity-feed";

// R-WORD: the wording of an activity row is one rule, and this is it. The log screen and the
// dashboard's recent-activity panel both draw these — so a kind must word the same in both, and a
// kind nobody has named yet must read as itself rather than be guessed at or dropped.

test("a named kind reads as its own word and belongs to its own chip", () => {
  for (const [kind, { word, category }] of Object.entries(ACTIONS)) {
    assert.equal(wordOf(kind), word);
    assert.equal(categoryOf(kind), category);
    assert.ok(
      CATEGORIES.some((c) => c.k === category),
      `${kind}'s chip "${category}" is not one the filter offers`,
    );
    assert.notEqual(categoryLabel(kind), "Other", `${kind} should not read as Other`);
  }
});

test("a kind this build does not yet name reads as itself, chip and all", () => {
  assert.equal(wordOf("car.imported"), "car.imported");
  assert.equal(categoryOf("car.imported"), "");
  assert.equal(categoryLabel("car.imported"), "Other");
});

test("every car kind the store can hold is worded", () => {
  // The kinds `app/office/actions/car.ts` writes. A new one must be added here and to ACTIONS,
  // or the screens would show it raw.
  for (const kind of ["car.created", "car.updated", "car.sold", "car.unsold", "car.deleted", "car.restored", "car.removed"]) {
    assert.ok(ACTIONS[kind], `${kind} has no word`);
  }
});

// D31 — one word must not cover two actions. Deleting a car and undoing the delete are two
// events, and the reader of the log has to be able to tell them apart: in the row's own words, in
// the chip beside them, and in the counts the chips carry. A restoration counted as a deletion is
// the log contradicting itself.
test("a restoration reads, chips and counts as a restoration — never as a deletion", () => {
  assert.equal(wordOf("car.restored"), "Restored a car");
  assert.equal(categoryLabel("car.restored"), "Restored");
  assert.notEqual(categoryOf("car.restored"), categoryOf("car.deleted"));
  assert.notEqual(categoryLabel("car.restored"), categoryLabel("car.deleted"));

  const entry = (id: string, kind: string): ActivityEntry => ({
    id,
    kind,
    subject: "TS-1001",
    at: "2026-10-17T09:29:00.000Z",
    day: "2026-10-17",
    dayTitle: "Today",
    dayFull: "Saturday 17 Oct 2026",
    clock: "09:29",
    actor: "umar@truespec.example",
  });
  const events = [
    entry("a", "car.deleted"),
    entry("b", "car.restored"),
    entry("c", "car.deleted"),
    entry("d", "car.created"),
  ];

  assert.equal(countOf(events, "del"), 2, "the deleted chip counts the deletions");
  assert.equal(countOf(events, "res"), 1, "the restored chip counts the restoration");
  assert.equal(countOf(events, "all"), 4, "and the total is still every row");
});

test("the avatar is the operator's own initial, and says so when their account has gone", () => {
  assert.deepEqual(operator("umar@truespec.example"), { initial: "U", title: "umar@truespec.example" });
  const gone = operator(null);
  assert.equal(gone.initial, "?");
  assert.match(gone.title, /removed/);
});

test("a row is worded against the instant it was handed, once, in UTC", () => {
  const now = new Date("2026-10-15T12:00:00.000Z");
  const events: ActivityEvent[] = [
    { id: "a", kind: "car.created", subject: "TS-1002", at: "2026-10-15T08:42:00.000Z", actor: "umar@truespec.example" },
    { id: "b", kind: "car.sold", subject: "TS-1001", at: "2026-10-14T23:30:00.000Z", actor: null },
    { id: "c", kind: "car.imported", subject: "TS-1003", at: "2026-10-01T06:00:00.000Z", actor: "ada@truespec.example" },
  ];
  const entries = toActivityEntries(events, now);

  assert.deepEqual(
    entries.map((e) => ({ id: e.id, day: e.day, dayTitle: e.dayTitle, clock: e.clock })),
    [
      { id: "a", day: "2026-10-15", dayTitle: "Today", clock: "08:42" },
      { id: "b", day: "2026-10-14", dayTitle: "Yesterday", clock: "23:30" },
      { id: "c", day: "2026-10-01", dayTitle: "Thursday 1 Oct 2026", clock: "06:00" },
    ],
  );
  // The instant survives, so a panel can still say how long ago it was.
  assert.equal(entries[0].at, "2026-10-15T08:42:00.000Z");
  // The actor is carried, gone or not.
  assert.equal(entries[1].actor, null);
  // A UTC reading, not the machine's: 23:30 stays 23:30 whatever the local zone is.
  assert.equal(entries[1].clock, "23:30");
});

test("an empty feed maps to nothing — not to a row that says something", () => {
  assert.deepEqual(toActivityEntries([], new Date("2026-10-15T12:00:00.000Z")), []);
});
