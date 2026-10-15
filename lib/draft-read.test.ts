/**
 * The upload's reader, executable.
 *
 * A filled blank becomes drafts, one per car, and **nothing is invented and nothing is dropped in
 * silence**: a page with no car on it and a car whose values cannot be read each come back as a
 * refusal naming the page and saying why.
 *
 * The file under test is built from the blank's own names (`carFields`, lib/template-rules.ts) — the
 * same names the download draws — so the round trip proves the two halves are one contract rather
 * than two lists that happen to agree today. No database, no session: bytes in, drafts out.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { carFieldName, carFields } from "./template-rules";
import {
  NOT_A_PDF,
  NOT_OUR_TEMPLATE,
  TOO_MANY_CARS,
  readCarFile,
  type CarFileRead,
} from "./draft-read";

/** A blank for `cars` cars, with the same field names the download draws — one page per car. */
async function blank(cars: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const form = doc.getForm();
  for (let car = 1; car <= cars; car += 1) {
    doc.addPage();
    for (const field of carFields(car)) form.createTextField(field.form);
  }
  return doc.save();
}

/** Fill named fields of a blank, by the file's own field names. */
async function fill(bytes: Uint8Array, values: Record<string, string>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  for (const [name, value] of Object.entries(values)) form.getTextField(name).setText(value);
  return doc.save();
}

function ok(read: CarFileRead): Extract<CarFileRead, { ok: true }> {
  assert.equal(read.ok, true, `expected a readable file, got: ${JSON.stringify(read)}`);
  return read as Extract<CarFileRead, { ok: true }>;
}

test("a filled blank for one car becomes one draft, carrying what the file carried", async () => {
  const filled = await fill(await blank(1), {
    brand: "Toyota",
    model: "Camry",
    year: "2021",
    mileage: "31,000",
    was_price_kobo: "42,000,000",
    doorstep_price_kobo: "45,500,000",
    features: "Panoramic roof, Leather seats",
    private_note: "Bought at auction",
    state: "On Order",
  });

  const read = ok(await readCarFile(filled));
  assert.equal(read.cars.length, 1);
  assert.deepEqual(read.refusals, []);

  const [car] = read.cars;
  assert.deepEqual(car.values, {
    brand: "Toyota",
    model: "Camry",
    year: 2021,
    mileage: 31000,
    features: ["Panoramic roof", "Leather seats"],
    private_note: "Bought at auction",
    // Naira as the owner wrote it, kept as kobo the way the store keeps money.
    was_price_kobo: 4200000000,
    doorstep_price_kobo: 4550000000,
  });
  // The state is a **name** the file can know, not a key — it never enters `values`.
  assert.equal(car.stateLabel, "On Order");
});

test("a blank for three cars becomes three drafts, in the order of the pages", async () => {
  const filled = await fill(await blank(3), {
    brand: "Toyota",
    model: "Camry",
    brand_2: "Honda",
    model_2: "Accord",
    brand_3: "Kia",
    model_3: "Rio",
  });

  const read = ok(await readCarFile(filled));
  assert.equal(read.cars.length, 3);
  assert.deepEqual(
    read.cars.map((car) => car.values.brand),
    ["Toyota", "Honda", "Kia"],
  );
  assert.deepEqual(
    read.cars.map((car) => car.values.model),
    ["Camry", "Accord", "Rio"],
  );
});

test("a page with no car on it is refused by name — not quietly left out", async () => {
  // Cars 1 and 3 are filled in; page 2 is untouched.
  const filled = await fill(await blank(3), {
    brand: "Toyota",
    brand_3: "Kia",
  });

  const read = ok(await readCarFile(filled));
  assert.deepEqual(
    read.cars.map((car) => car.values.brand),
    ["Toyota", "Kia"],
  );
  assert.equal(read.refusals.length, 1);
  assert.equal(read.refusals[0].page, 2);
  assert.match(read.refusals[0].reason, /no car details/i);
});

test("a value that cannot be read refuses that car, naming the field — it never becomes a guess", async () => {
  const filled = await fill(await blank(2), {
    brand: "Toyota",
    model: "Camry",
    brand_2: "Honda",
    [carFieldName("mileage", 2)]: "not a number",
    [carFieldName("doorstep_price_kobo", 2)]: "about five million",
  });

  const read = ok(await readCarFile(filled));
  // The good car is kept...
  assert.deepEqual(
    read.cars.map((car) => car.values.brand),
    ["Toyota"],
  );
  // ...and the bad one is refused, both bad fields named, in the owner's own words.
  assert.equal(read.refusals.length, 1);
  assert.equal(read.refusals[0].page, 2);
  assert.match(read.refusals[0].reason, /Mileage/);
  assert.match(read.refusals[0].reason, /Doorstep price/);
});

test("an absent field is absent — a draft holds only what the file carried", async () => {
  const filled = await fill(await blank(1), { brand: "Toyota", model: "Camry" });

  const read = ok(await readCarFile(filled));
  const [car] = read.cars;
  assert.deepEqual(car.values, { brand: "Toyota", model: "Camry" });
  assert.equal(car.stateLabel, null);
  assert.equal("note" in car.values, false, "a field the file left blank is not invented");
  assert.equal("state_id" in car.values, false, "the state is a label, not a value");
});

test("a file that is not a PDF is refused whole, with a reason", async () => {
  const read = await readCarFile(new TextEncoder().encode("this is not a PDF at all"));
  assert.equal(read.ok, false);
  if (!read.ok) assert.equal(read.reason, NOT_A_PDF);
});

test("a PDF that is not one of our blanks is refused whole, with a reason", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  doc.getForm().createTextField("something_else");
  const read = await readCarFile(await doc.save());

  assert.equal(read.ok, false);
  if (!read.ok) assert.equal(read.reason, NOT_OUR_TEMPLATE);
});

test("a file naming a car past the blank's limit is refused, not read as if the extra cars were absent", async () => {
  const doc = await PDFDocument.create();
  doc.addPage();
  const form = doc.getForm();
  form.createTextField("brand");
  form.createTextField("brand_21"); // past TEMPLATE_MAX_CARS
  const read = await readCarFile(await doc.save());

  assert.equal(read.ok, false);
  if (!read.ok) assert.equal(read.reason, TOO_MANY_CARS);
});

test("an empty blank is still our file — a refusal, not a failure to read it", async () => {
  // Every field is present but none was filled in: the file *is* ours, it just has no car on it. That
  // is a per-page refusal (the caller has nothing to hold), not a whole-file failure.
  const read = ok(await readCarFile(await blank(1)));
  assert.deepEqual(read.cars, []);
  assert.equal(read.refusals.length, 1);
  assert.equal(read.refusals[0].page, 1);
});
