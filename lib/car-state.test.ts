/**
 * The registry's statements, executable at the text level.
 *
 * Task 15's testable claims, without a store: no statement can reach a **primary**
 * state; a **secondary** can be added, renamed, recoloured, reordered and removed, and
 * nothing here can give it a section or a new-arrival flag (D15 — both belong to a
 * primary state alone); a repeat writes nothing; and deleting an occupied state is left
 * to the store's own `ON DELETE RESTRICT` refusal rather than anticipated here.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  carStateAddStatement,
  carStateHoldersStatement,
  carStateRecolourStatement,
  carStateRemoveStatement,
  carStateRenameStatement,
  carStateReorderStatement,
} from "./car-state";

const ID = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

/** Every statement the editor can send, with an argument for each. */
const statements = (): { name: string; text: string; params: unknown[] }[] => [
  { name: "add", ...carStateAddStatement({ id: ID, label: "Cleared", colour: "#3a7bd5" }) },
  { name: "rename", ...carStateRenameStatement({ id: ID, label: "Cleared" }) },
  { name: "recolour", ...carStateRecolourStatement({ id: ID, colour: "#3a7bd5" }) },
  { name: "reorder", ...carStateReorderStatement({ ids: [ID, OTHER] }) },
  { name: "remove", ...carStateRemoveStatement({ id: ID }) },
];

test("no statement can reach a primary state", () => {
  for (const s of statements()) {
    // The one line the owner's edits do not cross: every write names the kind it may touch.
    assert.match(s.text, /kind\s*=\s*'secondary'/, `${s.name} must be guarded to secondary states`);
  }
});

test("the owner's edits never give a state a section or a new-arrival flag", () => {
  const add = carStateAddStatement({ id: ID, label: "Cleared", colour: "#3a7bd5" }).text;
  // The add is the only statement that inserts, and it fixes both to a secondary's values.
  assert.match(add, /section\s*,\s*is_new_arrival\)/, "the add must name both columns in its INSERT");
  assert.match(add, /NULL,\s*false\)/, "the add must insert no section and no new-arrival flag");

  for (const s of statements().filter((x) => x.name !== "add")) {
    assert.doesNotMatch(s.text, /\bsection\s*=/, `${s.name} must not set a section`);
    assert.doesNotMatch(s.text, /is_new_arrival\s*=/, `${s.name} must not set the arrival flag`);
  }
});

test("the add mints its key outside and a repeat is the same state", () => {
  const { text, params } = carStateAddStatement({ id: ID, label: "Cleared", colour: "#3a7bd5" });
  assert.match(text, /ON CONFLICT \(id\) DO NOTHING/, "a retry must collapse onto the one row");
  // The trailing arm is what lets a retry still report the row it already wrote.
  assert.match(text, /UNION ALL/);
  assert.match(text, /FROM car_state WHERE id = \$1::uuid/);
  assert.deepEqual(params, [ID, "Cleared", "#3a7bd5"]);
  // A new secondary lands after every existing one and is nobody's section.
  assert.match(text, /MAX\(sort\)/, "a new state goes to the end of the owner's order");
});

test("a rename or a recolour sets the target and skips a value it already holds", () => {
  for (const s of [
    carStateRenameStatement({ id: ID, label: "Cleared" }),
    carStateRecolourStatement({ id: ID, colour: "#3a7bd5" }),
  ]) {
    assert.match(s.text, /IS DISTINCT FROM \$2/, "a repeat of the same value must write nothing");
    assert.match(s.text, /RETURNING id/, "the write must say whether it matched a secondary");
  }
});

test("the order is the list, and it is the secondaries' order alone", () => {
  const { text, params } = carStateReorderStatement({ ids: [OTHER, ID] });
  assert.match(text, /jsonb_array_elements_text\(\$1::jsonb\) WITH ORDINALITY/, "position in the list is the order");
  assert.match(text, /\(t\.ord - 1\)::int AS pos/, "positions run from zero, in the list's own order");
  assert.match(text, /c\.sort IS DISTINCT FROM w\.pos/, "a repeat of the same order must move nothing");
  assert.match(text, /kind = 'secondary'/, "a primary has no place in the owner's order");
  assert.deepEqual(params, [JSON.stringify([OTHER, ID])]);
});

test("a removal says which state went, and leaves an occupied one to the store", () => {
  const { text } = carStateRemoveStatement({ id: ID });
  assert.match(text, /RETURNING label/, "a removal must report the state it took");
  assert.doesNotMatch(text, /CASCADE|DELETE FROM car\b/, "nothing moves a car out of a state on the owner's behalf");
});

test("the reason a removal was refused is the store's own count", () => {
  const { text, params } = carStateHoldersStatement({ id: ID });
  assert.match(text, /FROM car WHERE state_id = \$1::uuid/);
  assert.match(text, /FROM car_secondary_state WHERE state_id = \$1::uuid/);
  assert.deepEqual(params, [ID]);
});
