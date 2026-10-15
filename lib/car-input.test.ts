/**
 * The car form's reader, executable.
 *
 * Proves the two things the brief makes testable: a **malformed amount is refused
 * at its own field**, and a car with **no primary state** is refused — and that a
 * well-formed form yields exactly the fourteen columns, the cost lines and the
 * secondary ids, with a browser-supplied hash nowhere in sight.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readCarInput, type CarFormInput } from "./car-input";

const base: CarFormInput = {
  brand: "Toyota",
  model: "Camry",
  trim: "XSE",
  year: "2021",
  exteriorColor: "Black",
  interiorColor: "Beige",
  mileage: "31000",
  features: "Panoramic roof\n Leather seats \n\n",
  price: "34,500,000",
  stateId: "state-available",
};

function read(patch: Partial<CarFormInput>, now = 2026) {
  return readCarInput({ ...base, ...patch }, now);
}

test("a well-formed car reads into the fourteen columns", () => {
  const r = read({});
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const c = r.value.columns;
  assert.equal(c.brand, "Toyota");
  assert.equal(c.model, "Camry");
  assert.equal(c.trim, "XSE");
  assert.equal(c.year, 2021);
  assert.equal(c.mileage, 31000);
  assert.equal(c.exterior_color, "Black");
  assert.equal(c.interior_color, "Beige");
  assert.equal(c.state_id, "state-available");
  // Features are stored as a JSON array text, trimmed, blanks dropped.
  assert.deepEqual(JSON.parse(c.features as string), ["Panoramic roof", "Leather seats"]);
  // Price is naira -> integer kobo.
  assert.equal(c.doorstep_price_kobo, 3_450_000_000);
  // Blank optionals become null, never empty strings.
  assert.equal(c.was_price_kobo, null);
  assert.equal(c.note, null);
  assert.equal(c.private_note, null);
  assert.equal(c.arrival_note, null);
  assert.deepEqual(r.value.costs, []);
  assert.deepEqual(r.value.secondaryStateIds, []);
});

test("a malformed amount is refused at its own field", () => {
  const r = read({ price: "1.2.3", wasPrice: "abc", costs: { shipping: "12x" } });
  assert.equal(r.ok, false);
  if (r.ok) return;
  const byField = Object.fromEntries(r.errors.map((e) => [e.field, e.message]));
  assert.ok(byField.price, "price refused");
  assert.ok(byField.wasPrice, "wasPrice refused");
  assert.ok(byField["cost.shipping"], "cost refused at its field");
  // A refusal names the field so the form can mark the input it came from.
  assert.match(byField["cost.shipping"], /naira/i);
});

test("a car with no primary state is refused", () => {
  const r = read({ stateId: "   " });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(r.errors.map((e) => e.field), ["stateId"]);
});

test("every field is judged at once, not just the first", () => {
  const r = read({ brand: "", model: "", year: "", mileage: "", stateId: "" });
  assert.equal(r.ok, false);
  if (r.ok) return;
  const fields = r.errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ["brand", "mileage", "model", "stateId", "year"]);
});

test("the year bound is the injected year, not a hardcoded one", () => {
  assert.equal(read({ year: "2027" }, 2026).ok, true); // next year's model is allowed
  assert.equal(read({ year: "2028" }, 2026).ok, false); // two years out is not
  assert.equal(read({ year: "1899" }, 2026).ok, false);
});

test("a blank price is allowed — a car may have no price yet (C3)", () => {
  const r = read({ price: "" });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.columns.doorstep_price_kobo, null);
});

test("cost lines are read per kind, blanks left unentered", () => {
  const r = read({ costs: { purchase_price: "30,000,000", full_tank: "0", shipping: "  " } });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(
    r.value.costs.slice().sort((a, b) => a.kind.localeCompare(b.kind)),
    [
      { kind: "full_tank", amountMinor: 0 },
      { kind: "purchase_price", amountMinor: 3_000_000_000 },
    ],
  );
});

test("secondary state ids are de-duplicated and blanks dropped", () => {
  const r = read({ secondaryStateIds: ["s1", "s1", "  ", "s2"] });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.value.secondaryStateIds, ["s1", "s2"]);
});

test("the reader never returns a hash — the change-check is the server's", () => {
  const r = read({});
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal("content_hash" in r.value.columns, false);
  assert.equal("hash_version" in r.value.columns, false);
});

// --- the sale (task 14) -------------------------------------------------------------

test("a form with no sale reads as no sale", () => {
  const r = read({});
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.sale, null);
});

test("the two sale money facts read into the sale, the date at noon UTC", () => {
  const r = read({ salePrice: "18,500,000", saleDate: "2026-09-15" });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  // Noon UTC: the day the owner typed, in an instant no display timezone can shift to
  // the day before or after.
  assert.deepEqual(r.value.sale, {
    salePriceKobo: 1_850_000_000,
    soldAt: "2026-09-15T12:00:00.000Z",
  });
});

test("half a sale is refused at the field that is missing", () => {
  const noDate = read({ salePrice: "18,500,000" });
  assert.equal(noDate.ok, false);
  if (!noDate.ok) assert.deepEqual(noDate.errors.map((e) => e.field), ["saleDate"]);

  const noPrice = read({ saleDate: "2026-09-15" });
  assert.equal(noPrice.ok, false);
  if (!noPrice.ok) assert.deepEqual(noPrice.errors.map((e) => e.field), ["salePrice"]);
});

test("a sale price that is not an amount is refused at salePrice", () => {
  const r = read({ salePrice: "lots", saleDate: "2026-09-15" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.errors[0]?.field, "salePrice");
});

test("a sale date that is not a real calendar day is refused at saleDate", () => {
  for (const bad of ["2026-02-31", "15/09/2026", "2026-9-15"]) {
    const r = read({ salePrice: "1,000", saleDate: bad });
    assert.equal(r.ok, false, `${bad || "(blank)"} is refused`);
    if (!r.ok) assert.ok(r.errors.some((e) => e.field === "saleDate"), `${bad} names saleDate`);
  }
});
