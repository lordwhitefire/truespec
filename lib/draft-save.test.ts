/**
 * The save's pure core, executable.
 *
 * Proves the one thing that must not drift: a draft is judged by the **same** rule as a hand-typed
 * record (`readCarInput`), so a car saved from a file and a car typed into the office cannot be
 * described two ways — and the round trip through the form's strings loses **no kobo**.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { carFormFromDraft, readDraftAsCar, readEnquirySeed } from "./draft-save";

const STATE = "00000000-0000-0000-0000-000000000001";

test("a complete car draft saves: the values reach the record's columns", () => {
  const values = {
    brand: "Toyota",
    model: "Camry",
    year: 2021,
    mileage: 45000,
    was_price_kobo: 1_250_000_00,
    doorstep_price_kobo: 1_100_000_00,
    features: ["Air conditioning", "Reverse camera"],
  };

  const read = readDraftAsCar(values, STATE);
  assert.equal(read.ok, true);
  if (!read.ok) return;

  const c = read.value.columns;
  assert.equal(c.brand, "Toyota");
  assert.equal(c.model, "Camry");
  assert.equal(c.year, 2021);
  assert.equal(c.mileage, 45000);
  assert.equal(c.was_price_kobo, 1_250_000_00);
  assert.equal(c.doorstep_price_kobo, 1_100_000_00);
  // The list is stored as JSON text, exactly as a hand-typed form's list would be.
  assert.equal(c.features, JSON.stringify(["Air conditioning", "Reverse camera"]));
  assert.equal(c.state_id, STATE);
});

test("the round trip through the form's strings loses no kobo", () => {
  // ₦12,500.50 — a sub-naira amount, the case `formatNaira` (whole naira) would destroy.
  const values = {
    brand: "Honda",
    model: "Accord",
    year: 2019,
    mileage: 61000,
    was_price_kobo: 1_250_050,
    doorstep_price_kobo: 1_100_075,
  };

  const read = readDraftAsCar(values, STATE);
  assert.equal(read.ok, true);
  if (!read.ok) return;
  assert.equal(read.value.columns.was_price_kobo, 1_250_050);
  assert.equal(read.value.columns.doorstep_price_kobo, 1_100_075);
});

test("a draft carried no price: the car still saves (C3's office-only draft)", () => {
  const values = { brand: "Toyota", model: "Corolla", year: 2020, mileage: 30000 };
  const read = readDraftAsCar(values, STATE);
  assert.equal(read.ok, true);
  if (!read.ok) return;
  assert.equal(read.value.columns.was_price_kobo, null);
  assert.equal(read.value.columns.doorstep_price_kobo, null);
});

test("an incomplete draft is refused at the save, naming every missing field", () => {
  const values = { model: "Camry" };
  const read = readDraftAsCar(values, STATE);
  assert.equal(read.ok, false);
  if (read.ok) return;
  const fields = read.errors.map((e) => e.field);
  assert.ok(fields.includes("brand"), "brand is named");
  assert.ok(fields.includes("year"), "year is named");
  assert.ok(fields.includes("mileage"), "mileage is named");
});

test("a year the file could not read stays missing — the save asks, it does not invent", () => {
  // `readCarFields` stores nothing for a value it could not read, so the year is simply absent.
  const values = { brand: "Toyota", model: "Camry", mileage: 45000 };
  const read = readDraftAsCar(values, STATE);
  assert.equal(read.ok, false);
  if (read.ok) return;
  assert.ok(read.errors.map((e) => e.field).includes("year"));
});

test("carFormFromDraft: absent text becomes empty, not the word 'undefined'", () => {
  const form = carFormFromDraft({ brand: "Toyota", model: "Camry" }, STATE);
  assert.equal(form.trim, "");
  assert.equal(form.note, "");
  assert.equal(form.wasPrice, "");
  assert.equal(form.stateId, STATE);
});

test("an enquiry draft with its three required fields saves, note and all", () => {
  const read = readEnquirySeed({
    name: "Ada Nwosu",
    number: "0803 000 0101",
    asked_for: "a 2021 Camry XSE V6 — the black one",
    note: "follow up on Friday",
  });
  assert.equal(read.ok, true);
  if (!read.ok) return;
  assert.equal(read.seed.name, "Ada Nwosu");
  assert.equal(read.seed.number, "0803 000 0101");
  assert.equal(read.seed.asked_for, "a 2021 Camry XSE V6 — the black one");
  assert.equal(read.seed.note, "follow up on Friday");
});

test("an enquiry draft with no note saves with a null note", () => {
  const read = readEnquirySeed({ name: "Ada", number: "0803", asked_for: "a Camry" });
  assert.equal(read.ok, true);
  if (!read.ok) return;
  assert.equal(read.seed.note, null);
});

test("an enquiry draft missing what they asked for is refused, naming the field", () => {
  const read = readEnquirySeed({ name: "Ada", number: "0803" });
  assert.equal(read.ok, false);
  if (read.ok) return;
  assert.ok(read.errors.map((e) => e.field).includes("asked_for"));
});

test("an enquiry draft whose only name is whitespace is refused", () => {
  const read = readEnquirySeed({ name: "   ", number: "0803", asked_for: "a Camry" });
  assert.equal(read.ok, false);
  if (read.ok) return;
  assert.ok(read.errors.map((e) => e.field).includes("name"));
});
