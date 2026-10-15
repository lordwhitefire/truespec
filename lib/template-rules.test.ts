import assert from "node:assert/strict";
import { test } from "node:test";
import { CAR_RECIPE } from "./change-check";
import {
  CAR_TEMPLATE_FIELDS,
  TEMPLATE_CONTENT_TYPE,
  TEMPLATE_FILENAME,
  templateFormName,
} from "./template-rules";

test("the blank asks for the car's fourteen editable details, in the recipe's order", () => {
  assert.equal(CAR_RECIPE.length, 14);
  assert.deepEqual(
    CAR_TEMPLATE_FIELDS.map((f) => f.recipe),
    CAR_RECIPE.map((f) => f.name),
  );
});

test("and for nothing else — one field per recipe field, no more and no fewer", () => {
  // Set equality both ways: a field the recipe does not name, and a recipe field with no blank
  // field, are both failures.
  const blankFields = new Set(CAR_TEMPLATE_FIELDS.map((f) => f.form));
  assert.equal(blankFields.size, CAR_TEMPLATE_FIELDS.length, "a field is asked for twice");
  assert.equal(blankFields.size, CAR_RECIPE.length);

  // The things a blank must never ask for: identity, bookkeeping, and the child rows.
  for (const never of ["id", "ref", "is_demo", "version", "content_hash", "cost", "photos"]) {
    assert.equal(templateFormName(never), undefined, `the blank asks for ${never}`);
  }
});

test("a form field carries the state's name, not the key the store minted", () => {
  assert.equal(templateFormName("state_id"), "state");
  const state = CAR_TEMPLATE_FIELDS.find((f) => f.recipe === "state_id");
  assert.ok(state);
  assert.match(state.words, /Available/);
  assert.match(state.words, /On Order/);
});

test("every field the recipe names keeps its own name on the blank, unchanged", () => {
  for (const field of CAR_TEMPLATE_FIELDS) {
    if (field.recipe === "state_id") continue;
    assert.equal(field.form, field.recipe);
  }
});

test("every field carries words, and no two fields carry the same ones", () => {
  const words = CAR_TEMPLATE_FIELDS.map((f) => f.words);
  for (const word of words) assert.ok(word.trim().length > 0);
  assert.equal(new Set(words).size, words.length, "two fields read the same on the blank");
});

test("the blank says what kind of value each field holds", () => {
  const kindOf = (recipe: string) => CAR_TEMPLATE_FIELDS.find((f) => f.recipe === recipe)?.kind;
  assert.equal(kindOf("year"), "number");
  assert.equal(kindOf("mileage"), "number");
  assert.equal(kindOf("was_price_kobo"), "number");
  assert.equal(kindOf("doorstep_price_kobo"), "number");
  assert.equal(kindOf("features"), "json");
  assert.equal(kindOf("brand"), "text");
  assert.equal(kindOf("state_id"), "text");

  const counted = CAR_TEMPLATE_FIELDS.reduce<Record<string, number>>((tally, f) => {
    tally[f.kind] = (tally[f.kind] ?? 0) + 1;
    return tally;
  }, {});
  assert.deepEqual(counted, { text: 9, number: 4, json: 1 });
});

test("the download is named and typed as a PDF", () => {
  assert.equal(TEMPLATE_FILENAME, "truespec-car-template.pdf");
  assert.match(TEMPLATE_FILENAME, /\.pdf$/);
  assert.equal(TEMPLATE_CONTENT_TYPE, "application/pdf");
});
