/**
 * The update statement, executable at the text level.
 *
 * Task 12's three testable claims, without a store: the write sets **every one of the
 * car's fourteen editable columns**; it recomputes the change-check (`content_hash`,
 * `hash_version`); and it **never names `id` or `ref` in its `SET` list** — the row's
 * identity is the `WHERE` key alone, which is the same line the store's
 * `car_identity_is_final` trigger defends from below.
 *
 * It also pins the idempotence the shared store guard retries under (D18): the whole
 * write is gated on the `changed` guard, so a repeat — a retry whose first reply was
 * lost — finds nothing to change and writes no second `car.updated` row.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { carUpdateStatement, type CarUpdateArgs } from "./car-update";

const args: CarUpdateArgs = {
  id: "11111111-1111-1111-1111-111111111111",
  columns: {
    brand: "Toyota",
    model: "Sienna",
    trim: "LE",
    year: 2020,
    exterior_color: "Silver",
    interior_color: "Grey",
    mileage: 52000,
    features: JSON.stringify(["Roof rails", "Rear camera"]),
    note: null,
    private_note: "Reserved for Mr O.",
    was_price_kobo: 3_000_000_000,
    arrival_note: "Cleared Lagos",
    doorstep_price_kobo: 3_600_000_000,
    state_id: "22222222-2222-2222-2222-222222222222",
  },
  costs: [
    { kind: "purchase_price", amountMinor: 2_000_000_000 },
    { kind: "shipping", amountMinor: 150_000_000 },
  ],
  secondaryStateIds: ["33333333-3333-3333-3333-333333333333"],
  sale: null,
  contentHash: "abc123",
  hashVersion: 1,
  actorId: "44444444-4444-4444-4444-444444444444",
};

const EDITABLE = [
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
] as const;

/** The part of the statement between the UPDATE and its WHERE — the written columns. */
function setClause(text: string): string {
  return text.slice(text.indexOf("UPDATE car"), text.indexOf("WHERE id = $1"));
}

test("every editable column is written", () => {
  const { text } = carUpdateStatement(args);
  const set = setClause(text);
  for (const column of EDITABLE) {
    assert.match(set, new RegExp(`\\b${column}\\s*=\\s*\\$`), `writes ${column}`);
  }
  assert.equal(EDITABLE.length, 14);
});

test("the change-check is recomputed on the write", () => {
  const { text } = carUpdateStatement(args);
  assert.match(text, /content_hash = \$16/);
  assert.match(text, /hash_version = \$17/);
});

test("the write never names id or ref as a column — identity is the WHERE key alone", () => {
  const { text } = carUpdateStatement(args);
  // The identity is only ever the key that selects the row...
  assert.match(text, /WHERE id = \$1 AND deleted_at IS NULL/);
  // ...never a column assigned a value.
  assert.doesNotMatch(setClause(text), /\bid\s*=/);
  assert.doesNotMatch(setClause(text), /\bref\s*=/);
});

test("the values travel as parameters, never as text", () => {
  const { params } = carUpdateStatement(args);
  assert.equal(params[0], args.id);
  assert.equal(params[1], "Toyota");
  assert.equal(params[9], null); // the public note is carried as-is (owned, not a form field)
  assert.equal(params[11], 3_000_000_000);
  assert.deepEqual(JSON.parse(params[17] as string), [
    { kind: "purchase_price", amount_minor: 2_000_000_000 },
    { kind: "shipping", amount_minor: 150_000_000 },
  ]);
  assert.deepEqual(JSON.parse(params[18] as string), ["33333333-3333-3333-3333-333333333333"]);
  assert.equal(params[19], "44444444-4444-4444-4444-444444444444");
});

test("one car.updated row, and the whole write is gated so a retry cannot double-apply", () => {
  const { text } = carUpdateStatement(args);
  assert.match(text, /'car\.updated'/);
  // The UPDATE only fires when something actually differs, and the cost/secondary/event
  // inserts draw only from `upd` — so a repeat finds `upd` empty and writes nothing.
  assert.match(text, /WHERE id = \$1 AND deleted_at IS NULL AND \(SELECT yes FROM changed\)/);
});

// --- the sale (task 14) ------------------------------------------------------------

const SOLD: CarUpdateArgs = {
  ...args,
  sale: { salePriceKobo: 3_500_000_000, soldAt: "2026-09-15T12:00:00.000Z" },
};

test("the sale rides the one car write: the row is upserted, never doubled", () => {
  const { text } = carUpdateStatement(SOLD);
  assert.match(text, /INSERT INTO sale \(car_id, sale_price_kobo, sold_at, prior_state_id\)/);
  assert.match(text, /ON CONFLICT \(car_id\) DO UPDATE/);
  // Correcting the price must not lose the state the car came from.
  const conflict = text.slice(text.indexOf("ON CONFLICT (car_id)"));
  assert.doesNotMatch(conflict.slice(0, conflict.indexOf("RETURNING 1")), /prior_state_id\s*=/);
});

test("the previous state is the car's own row before the write — never the browser's", () => {
  const { text } = carUpdateStatement(SOLD);
  // The sale's SELECT takes the state from `old` — the stored row, read by this same
  // statement before the update — so the previous primary state is the store's, and no
  // parameter can supply it.
  assert.match(text, /SELECT u\.id, \$21::bigint, \$22::timestamptz, \(SELECT o\.state_id FROM old o\)/);
});

test("leaving Sold deletes the sale, so no real-profit residue can survive", () => {
  const { text } = carUpdateStatement(args); // sale: null — the un-marking shape
  assert.match(text, /DELETE FROM sale/);
  assert.match(text, /\$21::bigint IS NULL OR \$22::timestamptz IS NULL/);
});

test("the sale is part of the change-check, so a price-only correction is a real write", () => {
  const { text } = carUpdateStatement(args);
  assert.match(text, /o\.sold\s+IS DISTINCT FROM n\.sold/);
});

test("the event names the transition: became sold, or stopped being sold", () => {
  const { text } = carUpdateStatement(args);
  assert.match(text, /THEN 'car\.sold'/);
  assert.match(text, /THEN 'car\.unsold'/);
});

test("the two money facts travel as parameters, and a null pair means no sale", () => {
  const sold = carUpdateStatement(SOLD).params;
  assert.equal(sold[20], 3_500_000_000);
  assert.equal(sold[21], "2026-09-15T12:00:00.000Z");
  const none = carUpdateStatement(args).params;
  assert.equal(none[20], null);
  assert.equal(none[21], null);
});
