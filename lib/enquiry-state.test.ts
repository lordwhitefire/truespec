/**
 * The enquiry registry's statements, executable at the text level.
 *
 * The mirror image of `lib/car-state.test.ts`, and the difference is the claim: a **car** registry
 * splits into fixed primaries and the owner's secondaries, so every car statement is guarded to
 * `kind = 'secondary'`. An **enquiry** registry has no such split — New, Talking, Negotiating, Sold
 * and Lost are all the owner's — so the claim here is the opposite one: **no statement carries a
 * kind guard**, and none may grow one, or a state the board ships with could never be reached.
 *
 * The rest is the same discipline: a repeat writes nothing, the order is the whole list, and an
 * occupied state is left to the store's own `ON DELETE RESTRICT` refusal rather than anticipated.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  enquiryStateAddStatement,
  enquiryStateHoldersStatement,
  enquiryStateRecolourStatement,
  enquiryStateRemoveStatement,
  enquiryStateRenameStatement,
  enquiryStateReorderStatement,
} from "./enquiry-state";

const ID = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

/** Every statement the editor can send, with an argument for each. */
const statements = (): { name: string; text: string; params: unknown[] }[] => [
  { name: "add", ...enquiryStateAddStatement({ id: ID, label: "Follow up", colour: "#3a7bd5" }) },
  { name: "rename", ...enquiryStateRenameStatement({ id: ID, label: "Follow up" }) },
  { name: "recolour", ...enquiryStateRecolourStatement({ id: ID, colour: "#3a7bd5" }) },
  { name: "reorder", ...enquiryStateReorderStatement({ ids: [ID, OTHER] }) },
  { name: "remove", ...enquiryStateRemoveStatement({ id: ID }) },
];

test("every state is the owner's — no statement is guarded by a kind", () => {
  for (const s of statements()) {
    assert.doesNotMatch(s.text, /\bkind\b/, `${s.name} must not carry a car-registry kind guard`);
  }
});

test("the owner's edits touch nothing but the state itself", () => {
  const add = enquiryStateAddStatement({ id: ID, label: "Follow up", colour: "#3a7bd5" }).text;
  assert.match(add, /INSERT INTO enquiry_state \(id, label, colour, sort\)/);

  // No car-registry shape crept in: no section, no arrival flag, no kind.
  assert.doesNotMatch(add, /section|is_new_arrival/);

  for (const s of statements()) {
    // And nothing here can touch an enquiry — a state is a label, and giving it to an enquiry is a
    // separate statement (`lib/enquiry-set-state.ts`), not a side effect of editing the registry.
    assert.doesNotMatch(s.text, /\benquiry\b(?!_state)/, `${s.name} must not write an enquiry`);
  }
});

test("the add mints its key outside and a repeat is the same state", () => {
  const { text, params } = enquiryStateAddStatement({
    id: ID,
    label: "Follow up",
    colour: "#3a7bd5",
  });
  assert.match(text, /ON CONFLICT \(id\) DO NOTHING/, "a retry must collapse onto the one row");
  assert.match(text, /UNION ALL/, "a retry must still report the row it already wrote");
  assert.match(text, /FROM enquiry_state WHERE id = \$1::uuid/);
  assert.match(text, /MAX\(sort\)/, "a new state goes to the end of the owner's order");
  assert.deepEqual(params, [ID, "Follow up", "#3a7bd5"]);
});

test("a rename or a recolour sets the target and skips a value it already holds", () => {
  for (const s of [
    enquiryStateRenameStatement({ id: ID, label: "Follow up" }),
    enquiryStateRecolourStatement({ id: ID, colour: "#3a7bd5" }),
  ]) {
    assert.match(s.text, /IS DISTINCT FROM \$2/, "a repeat of the same value must write nothing");
    assert.match(s.text, /RETURNING id/);
  }
});

test("the order is the whole list, written as one position per state", () => {
  const { text, params } = enquiryStateReorderStatement({ ids: [OTHER, ID] });
  assert.match(text, /jsonb_array_elements_text\(\$1::jsonb\) WITH ORDINALITY/);
  assert.match(text, /\(t\.ord - 1\)::int AS pos/);
  assert.match(text, /s\.sort IS DISTINCT FROM w\.pos/, "a repeat of the same order must move nothing");
  assert.deepEqual(params, [JSON.stringify([OTHER, ID])]);
});

test("a removal says which state went, and leaves an occupied one to the store", () => {
  const { text } = enquiryStateRemoveStatement({ id: ID });
  assert.match(text, /RETURNING label/);
  assert.doesNotMatch(
    text,
    /CASCADE|DELETE FROM enquiry\b|enquiry_state_id = NULL/,
    "nothing moves an enquiry out of a state on the owner's behalf",
  );
});

test("the reason a removal was refused is the store's own count", () => {
  const { text, params } = enquiryStateHoldersStatement({ id: ID });
  assert.match(text, /FROM enquiry WHERE enquiry_state_id = \$1::uuid/);
  assert.deepEqual(params, [ID]);
});
