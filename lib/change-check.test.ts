// The change-check's rules, pinned.
//
// TASK-003 follow-up v1 (`openspec/tasks/TASK-003/key-and-hash-v1.md`, decisions 3–4). These tests
// are the rule written down as something that fails when it is changed by accident.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHANGE_CHECK_VERSION,
  CAR_RECIPE,
  ENQUIRY_RECIPE,
  carChangeCheck,
  changeCheck,
  changeCheckPreimage,
  enquiryChangeCheck,
  type Recipe,
} from "./change-check";

const car = (over: Record<string, unknown> = {}) => ({
  brand: "Toyota",
  model: "Camry",
  trim: "XSE V6",
  year: 2021,
  exterior_color: "Obsidian black",
  interior_color: "Black",
  mileage: 31000,
  features: ["Panoramic roof", "Leather upholstery"],
  note: null,
  private_note: null,
  was_price_kobo: 0,
  arrival_note: null,
  doorstep_price_kobo: 0,
  state_id: "8a1f4d2a-0000-4000-8000-000000000001",
  ...over,
});

const enquiry = (over: Record<string, unknown> = {}) => ({
  name: "Ada Nwosu",
  number: "+234 803 000 0101",
  asked_for: "a 2021 Camry XSE V6 — the black one on your lot",
  note: "Asked about finance terms",
  enquiry_state_id: "8a1f4d2a-0000-4000-8000-000000000002",
  ...over,
});

// ---- shape ------------------------------------------------------------------

test("the hash is SHA-256 in lowercase hex, and the recipe is versioned", () => {
  const h = carChangeCheck(car());
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, h.toLowerCase());
  assert.equal(CHANGE_CHECK_VERSION, 1);
});

test("the recipes hold the editable details only, in a fixed order", () => {
  const carFields = CAR_RECIPE.map((f) => f.name);
  assert.deepEqual(carFields, [
    "brand",
    "model",
    "trim",
    "year",
    "exterior_color",
    "interior_color",
    "mileage",
    "features",
    "note",
    "private_note",
    "was_price_kobo",
    "arrival_note",
    "doorstep_price_kobo",
    "state_id",
  ]);
  for (const forbidden of ["id", "ref", "is_demo", "created_at", "updated_at", "version", "content_hash"]) {
    assert.ok(!carFields.includes(forbidden), `${forbidden} must not be an ingredient`);
  }
  assert.deepEqual(
    ENQUIRY_RECIPE.map((f) => f.name),
    ["name", "number", "asked_for", "note", "enquiry_state_id"],
  );
});

// ---- the same details hash the same ----------------------------------------

test("the same details hash the same, whoever writes them", () => {
  assert.equal(carChangeCheck(car()), carChangeCheck(car()));
  assert.equal(enquiryChangeCheck(enquiry()), enquiryChangeCheck(enquiry()));
});

test("tidying: spaces trimmed and runs collapsed", () => {
  assert.equal(carChangeCheck(car({ brand: "  Toyota " })), carChangeCheck(car({ brand: "Toyota" })));
  assert.equal(carChangeCheck(car({ note: "a   b\tc" })), carChangeCheck(car({ note: "a b c" })));
});

test("an empty field and a missing field are the same", () => {
  const missing = car({ note: null });
  const empty = car({ note: "" });
  const spaces = car({ note: "   " });
  assert.equal(carChangeCheck(missing), carChangeCheck(empty));
  assert.equal(carChangeCheck(empty), carChangeCheck(spaces));

  const eMissing = enquiry({ note: null });
  const eEmpty = enquiry({ note: "" });
  assert.equal(enquiryChangeCheck(eMissing), enquiryChangeCheck(eEmpty));
});

test("case is folded only where case cannot matter — the customer's number", () => {
  // The number is case-insensitive: a phone number has no upper case.
  assert.equal(
    enquiryChangeCheck(enquiry({ number: "+234 803 abc" })),
    enquiryChangeCheck(enquiry({ number: "+234 803 ABC" })),
  );
  // A name, a note and what they asked for keep their case: it is detail the office typed.
  assert.notEqual(enquiryChangeCheck(enquiry({ name: "Ada Nwosu" })), enquiryChangeCheck(enquiry({ name: "ada nwosu" })));
  assert.notEqual(
    enquiryChangeCheck(enquiry({ asked_for: "a Camry" })),
    enquiryChangeCheck(enquiry({ asked_for: "a camry" })),
  );
  // The car's fields keep their case too.
  assert.notEqual(carChangeCheck(car({ model: "Camry" })), carChangeCheck(car({ model: "camry" })));
});

// ---- a change is a change ---------------------------------------------------

test("changing any of the car's editable details changes the hash", () => {
  const base = carChangeCheck(car());
  const changes: Record<string, unknown>[] = [
    { brand: "Lexus" },
    { model: "Corolla" },
    { trim: "LE" },
    { year: 2022 },
    { exterior_color: "Pearl white" },
    { interior_color: "Tan" },
    { mileage: 31001 },
    { features: ["Panoramic roof"] },
    { note: "a note" },
    { private_note: "for us only" },
    { was_price_kobo: 1 },
    { arrival_note: "arrives November" },
    { doorstep_price_kobo: 1 },
    { state_id: "8a1f4d2a-0000-4000-8000-000000000009" },
  ];
  for (const change of changes) {
    assert.notEqual(carChangeCheck(car(change)), base, `${Object.keys(change)[0]} should be covered`);
  }
});

test("changing any of the enquiry's details changes the hash", () => {
  const base = enquiryChangeCheck(enquiry());
  for (const change of [
    { name: "Ada N." },
    { number: "+234 803 000 0102" },
    { asked_for: "something else" },
    { note: "" },
    { enquiry_state_id: "8a1f4d2a-0000-4000-8000-000000000009" },
  ]) {
    assert.notEqual(enquiryChangeCheck(enquiry(change)), base, `${Object.keys(change)[0]} should be covered`);
  }
});

test("0 and 1 are different; a number is not its string twin's business", () => {
  assert.notEqual(carChangeCheck(car({ mileage: 0 })), carChangeCheck(car({ mileage: 1 })));
  // `was_price_kobo: 0` (no was-price) and `null` (no was-price) read the same to a person, but
  // the store distinguishes them; only the stored value is hashed.
  assert.notEqual(carChangeCheck(car({ was_price_kobo: 0 })), carChangeCheck(car({ was_price_kobo: null })));
});

test("the same feature list hashes the same however it is held", () => {
  const asArray = car({ features: ["a", "b"] });
  const asJson = car({ features: '["a","b"]' });
  assert.equal(carChangeCheck(asArray), carChangeCheck(asJson));
  assert.notEqual(carChangeCheck(car({ features: ["b", "a"] })), carChangeCheck(asArray));
});

// ---- two rows cannot collide ------------------------------------------------

test("two rows whose values could run together hash differently", () => {
  // `model` and `trim` are adjacent: "a" + "b c" versus "a b" + "c" must not collide.
  assert.notEqual(
    carChangeCheck(car({ model: "a", trim: "b c" })),
    carChangeCheck(car({ model: "a b", trim: "c" })),
  );
  // And a value that literally contains the separator cannot smuggle one past.
  const recipe: Recipe = [
    { name: "a", kind: "text" },
    { name: "b", kind: "text" },
  ];
  assert.notEqual(
    changeCheck(recipe, { a: "x", b: "y" }),
    changeCheck(recipe, { a: `x\u001e\u001fb`, b: "" }),
  );
  // A trailing space is tidied away: the same details, so the same hash.
  assert.equal(changeCheck(recipe, { a: "x", b: "y" }), changeCheck(recipe, { a: "x", b: "y " }));
});

test("the order of the recipe is part of the hash", () => {
  const forward: Recipe = [
    { name: "a", kind: "text" },
    { name: "b", kind: "text" },
  ];
  const backward: Recipe = [
    { name: "b", kind: "text" },
    { name: "a", kind: "text" },
  ];
  assert.notEqual(
    changeCheck(forward, { a: "1", b: "2" }),
    changeCheck(backward, { a: "1", b: "2" }),
  );
});

test("the version is inside the hashed text", () => {
  const pre = changeCheckPreimage(CAR_RECIPE, car());
  assert.ok(pre.startsWith(`v${CHANGE_CHECK_VERSION}${"\u001e"}`));
});

// ---- a canary ---------------------------------------------------------------

test("canary: the hash of these exact details", () => {
  // If this fails, the recipe or the normalisation moved. That is allowed — but only on purpose,
  // with the version raised and everything recalculated once (the file's rule).
  assert.equal(
    carChangeCheck(car({ note: "hello", features: ["a", "b"] })),
    "f4dd34ff76cd7d41d0ee64dece0fac79938e4d17cc3cba73082ba39c40f626ae",
  );
  assert.equal(
    enquiryChangeCheck(enquiry()),
    "5121526447ff086260e1b4893bf5e3bca61a1e771ab6854f8598676cd3f03200",
  );
});
