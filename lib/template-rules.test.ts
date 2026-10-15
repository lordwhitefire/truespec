import assert from "node:assert/strict";
import { test } from "node:test";
import { CAR_RECIPE } from "./change-check";
import {
  CAR_TEMPLATE_FIELDS,
  FEATURE_SEPARATOR,
  TEMPLATE_CONTENT_TYPE,
  TEMPLATE_FILENAME,
  TEMPLATE_MAX_CARS,
  carFieldName,
  carFields,
  isCarFieldNameBeyondLimit,
  isMoneyField,
  readCarCount,
  readCarFieldName,
  readingFor,
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

// ---------------------------------------------------------------------------------------------
// A blank may carry a batch (Task 22's "a 10-car file → 10 drafts"), so the names have to tell
// one car's field from another's — and read back to the same pair, which is what makes the blank
// and the upload one contract rather than two lists that agree today.
// ---------------------------------------------------------------------------------------------

test("the first car carries the bare names — a blank for one car is unchanged", () => {
  assert.deepEqual(carFields(1), CAR_TEMPLATE_FIELDS);
  for (const field of CAR_TEMPLATE_FIELDS) {
    assert.equal(carFieldName(field.recipe, 1), field.form);
  }
});

test("another car carries the same fourteen, each under its own name", () => {
  const first = carFields(2);
  assert.equal(first.length, CAR_TEMPLATE_FIELDS.length);
  assert.deepEqual(
    first.map((f) => f.form),
    CAR_TEMPLATE_FIELDS.map((f) => `${f.form}_2`),
  );
  // The words and the kinds are the blank's, not the car's: only the name changes.
  assert.deepEqual(first.map((f) => f.words), CAR_TEMPLATE_FIELDS.map((f) => f.words));
  assert.deepEqual(first.map((f) => f.kind), CAR_TEMPLATE_FIELDS.map((f) => f.kind));
});

test("no two cars can collide — every car's fields are distinct names", () => {
  const names: string[] = [];
  for (let car = 1; car <= TEMPLATE_MAX_CARS; car += 1) names.push(...carFields(car).map((f) => f.form));
  assert.equal(names.length, CAR_TEMPLATE_FIELDS.length * TEMPLATE_MAX_CARS);
  assert.equal(new Set(names).size, names.length, "two fields share a name across cars");
});

test("a field name reads back as the car and the field it belongs to", () => {
  for (let car = 1; car <= 5; car += 1) {
    for (const field of CAR_TEMPLATE_FIELDS) {
      assert.deepEqual(readCarFieldName(carFieldName(field.recipe, car)), {
        car,
        recipe: field.recipe,
      });
    }
  }
  // The state's one rename survives the round trip, which is the point of doing it here.
  assert.deepEqual(readCarFieldName("state_3"), { car: 3, recipe: "state_id" });
});

test("a name this blank does not write is not guessed at", () => {
  for (const never of [
    "",
    "notes",
    "brand_",
    "brand_1", // a second way of saying "car 1" would make the mapping ambiguous
    "brand_0",
    "brand_2_2",
    "brand_x",
    `brand_${TEMPLATE_MAX_CARS + 1}`,
  ]) {
    assert.equal(readCarFieldName(never), undefined, `the blank reads "${never}" back`);
  }
});

test("a car's number is a whole number inside the blank's limit", () => {
  for (const bad of [0, -1, 1.5, TEMPLATE_MAX_CARS + 1, Number.NaN]) {
    assert.throws(() => carFieldName("brand", bad));
    assert.throws(() => carFields(bad));
  }
  assert.equal(TEMPLATE_MAX_CARS, 20);
});

test("a name for a car past the blank's limit is recognised, so the upload can refuse the file", () => {
  assert.equal(isCarFieldNameBeyondLimit(`brand_${TEMPLATE_MAX_CARS + 1}`), true);
  assert.equal(isCarFieldNameBeyondLimit("brand_99999"), true);
  // the last car the blank does draw is not "beyond" anything
  assert.equal(isCarFieldNameBeyondLimit(`brand_${TEMPLATE_MAX_CARS}`), false);
  assert.equal(isCarFieldNameBeyondLimit("brand"), false);
  // and a name that is not ours at all is not one of our cars either
  assert.equal(isCarFieldNameBeyondLimit("notes_99"), false);
  assert.equal(isCarFieldNameBeyondLimit("brand_1"), false);
  assert.equal(isCarFieldNameBeyondLimit("brand_x"), false);
});

test("how a field is read back follows how it is written: text, whole, money or a list", () => {
  assert.equal(readingFor("brand", "text"), "text");
  assert.equal(readingFor("year", "number"), "whole");
  assert.equal(readingFor("mileage", "number"), "whole");
  assert.equal(readingFor("was_price_kobo", "number"), "money");
  assert.equal(readingFor("features", "json"), "list");

  // And the blank agrees with itself: every field carries the reading its own kind implies.
  for (const field of CAR_TEMPLATE_FIELDS) {
    assert.equal(field.reads, readingFor(field.recipe, field.kind));
  }
});

test("money is the store's `*_kobo` convention, and the convention is asserted against the recipe", () => {
  // The runtime rule is the name's suffix — cheap, and with nothing to keep in step. This test is
  // what makes that safe: it pins the money fields to the two prices, so a new `*_kobo` field joins
  // the money reading by construction and a non-money field cannot end up in it by accident.
  const money = CAR_RECIPE.filter((field) => isMoneyField(field.name)).map((field) => field.name);
  assert.deepEqual(money, ["was_price_kobo", "doorstep_price_kobo"]);

  for (const name of money) {
    const field = CAR_RECIPE.find((f) => f.name === name) as { kind: string };
    assert.equal(field.kind, "number");
  }
  assert.equal(isMoneyField("year"), false, "a year is a number, not an amount of money");
  assert.equal(isMoneyField("mileage"), false);
});

test("the blank's list separator is the one its caption names", () => {
  // The blank's fields are single-line, so its list is comma-separated and the caption says so. If
  // the two ever drifted apart, the owner would fill in a list the upload read as one long feature.
  assert.equal(FEATURE_SEPARATOR, ",");
  const features = CAR_TEMPLATE_FIELDS.find((field) => field.recipe === "features");
  assert.ok(features);
  assert.equal(features.reads, "list");
  assert.ok(features.words.includes("comma"), `the caption names the separator: "${features.words}"`);
});

test("the download's car count: absent means one, and a number no blank can hold is refused", () => {
  for (const absent of [null, undefined, "", "   "]) {
    assert.deepEqual(readCarCount(absent), { ok: true, cars: 1 });
  }
  assert.deepEqual(readCarCount(" 3 "), { ok: true, cars: 3 });
  assert.deepEqual(readCarCount("1"), { ok: true, cars: 1 });
  assert.deepEqual(readCarCount(String(TEMPLATE_MAX_CARS)), { ok: true, cars: TEMPLATE_MAX_CARS });

  for (const bad of ["0", "-1", "1.5", "2x", "two", "1e2", String(TEMPLATE_MAX_CARS + 1)]) {
    const read = readCarCount(bad);
    assert.equal(read.ok, false, `"${bad}" is not a number of cars`);
    if (!read.ok) assert.ok(read.reason.length > 0, "a refusal says why");
  }
});
