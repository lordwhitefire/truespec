import assert from "node:assert/strict";
import test from "node:test";
import { autofillAnswer } from "./autofill";
import type { CarFileRead } from "./draft-read";

const values = {
  brand: "Toyota",
  model: "Sienna",
  trim: "XLE",
  year: 2019,
  exterior_color: "Silver",
  interior_color: "Grey",
  mileage: 52614,
  features: ["Reverse camera", "Power sliding doors"],
  note: "One owner",
  private_note: "Duty paid",
  was_price_kobo: 3650000000,
  arrival_note: "Expected November",
  doorstep_price_kobo: 3390000000,
};

function one(stateLabel: string | null = "Available"): CarFileRead {
  return { ok: true, cars: [{ values, stateLabel }], refusals: [] };
}

function matched(id = "st-available"): { id: string; label: string } {
  return { id, label: "Available" };
}

test("one car becomes the fourteen form fields, with the matched state", () => {
  const answer = autofillAnswer(one(), matched());
  assert.equal(answer.ok, true);
  if (!answer.ok) return;

  assert.deepEqual(Object.keys(answer.fields).sort(), [
    "arrivalNote",
    "brand",
    "exteriorColor",
    "features",
    "interiorColor",
    "mileage",
    "model",
    "note",
    "price",
    "privateNote",
    "stateId",
    "trim",
    "wasPrice",
    "year",
  ]);
  assert.equal(answer.fields.brand, "Toyota");
  assert.equal(answer.fields.model, "Sienna");
  assert.equal(answer.fields.features, "Reverse camera\nPower sliding doors");
  assert.equal(answer.fields.price, "33900000.00");
  assert.equal(answer.fields.wasPrice, "36500000.00");
  assert.equal(answer.fields.note, "One owner");
  assert.equal(answer.fields.privateNote, "Duty paid");
  assert.equal(answer.fields.stateId, "st-available");
  assert.equal(answer.stateId, "st-available");
  assert.equal(answer.stateLabel, "Available");
  assert.equal(answer.stateFound, true);
  assert.deepEqual(answer.refusals, []);
});

test("more than one car is refused, names the count, and points at Inventory", () => {
  const read: CarFileRead = {
    ok: true,
    cars: [
      { values, stateLabel: "Available" },
      { values: { ...values, brand: "Lexus" }, stateLabel: null },
    ],
    refusals: [],
  };
  const answer = autofillAnswer(read, null);
  assert.equal(answer.ok, false);
  if (answer.ok) return;
  assert.match(answer.reason, /2 cars/);
  assert.match(answer.reason, /Create from file on Inventory/);
  assert.doesNotMatch(answer.reason, /first car/i);
});

test("zero cars is a plain refusal, carrying the reader's refusals", () => {
  const read: CarFileRead = {
    ok: true,
    cars: [],
    refusals: [{ page: 1, reason: "no car details were filled in on this page" }],
  };
  const answer = autofillAnswer(read, null);
  assert.equal(answer.ok, false);
  if (answer.ok) return;
  assert.equal(answer.reason, "No car could be read from that file.");
  assert.deepEqual(answer.refusals, read.refusals);
});

test("a file that is not ours keeps the reader's reason and has no car", () => {
  const answer = autofillAnswer({ ok: false, reason: "not ours" }, null);
  assert.deepEqual(answer, { ok: false, reason: "not ours" });
});

test("a state label that is gone leaves the form's state alone and says so", () => {
  const answer = autofillAnswer(one("Gone"), null);
  assert.equal(answer.ok, true);
  if (!answer.ok) return;
  assert.equal(answer.stateId, "");
  assert.equal(answer.stateLabel, "Gone");
  assert.equal(answer.stateFound, false);
  assert.equal(answer.fields.stateId, "");
});

test("a file that names no state is not an error, and leaves the form's state alone", () => {
  const answer = autofillAnswer(one(null), null);
  assert.equal(answer.ok, true);
  if (!answer.ok) return;
  assert.equal(answer.stateId, "");
  assert.equal(answer.stateLabel, null);
  assert.equal(answer.stateFound, true);
});

test("refusals from other pages travel back beside the one car", () => {
  const read: CarFileRead = {
    ok: true,
    cars: [{ values, stateLabel: "Available" }],
    refusals: [{ page: 2, reason: "no car details were filled in on this page" }],
  };
  const answer = autofillAnswer(read, matched());
  assert.equal(answer.ok, true);
  if (!answer.ok) return;
  assert.deepEqual(answer.refusals, read.refusals);
});
