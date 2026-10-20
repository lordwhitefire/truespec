import assert from "node:assert/strict";
import test from "node:test";
import type { DraftRow } from "./draft-store";
import { enquiryFormDataFromDraft, enquiryValuesFromForm } from "./enquiry-form";

const states = [
  { id: "s-new", label: "New" },
  { id: "s-sold", label: "Sold" },
];

function draft(overrides: Partial<DraftRow> = {}): DraftRow {
  return {
    id: "enquiry-draft-1",
    kind: "enquiry",
    batchId: "batch-1",
    sourceFilename: "enquiries.pdf",
    sourceAssetId: "asset-1",
    values: {
      name: "Ada Obi",
      number: "+2348000000001",
      asked_for: "a small saloon",
      note: "call after six",
    },
    form: null,
    imageAssetIds: [],
    stateLabel: "New",
    isDemo: false,
    createdAt: "2026-10-20T10:00:00.000Z",
    ...overrides,
  };
}

test("an enquiry draft is shown from its values, with its state resolved by name", () => {
  const data = enquiryFormDataFromDraft(draft(), states, "2 hours");
  assert.equal(data.draftId, "enquiry-draft-1");
  assert.equal(data.draftSource, "enquiries.pdf");
  assert.equal(data.waiting, "2 hours");
  assert.equal(data.name, "Ada Obi");
  assert.equal(data.number, "+2348000000001");
  assert.equal(data.askedFor, "a small saloon");
  assert.equal(data.note, "call after six");
  assert.equal(data.stateId, "s-new");
  assert.equal(data.stateLabel, "New");
});

test("a state that is gone stays named, and the form opens with none chosen", () => {
  const data = enquiryFormDataFromDraft(draft({ stateLabel: "Waiting" }), states, "now");
  assert.equal(data.stateId, null);
  assert.equal(data.stateLabel, "Waiting");
});

test("a draft with no state has none, not a guessed one", () => {
  const data = enquiryFormDataFromDraft(draft({ stateLabel: null }), states, "now");
  assert.equal(data.stateId, null);
  assert.equal(data.stateLabel, null);
});

test("a posted form keeps the four values, trimmed, and drops bookkeeping", () => {
  const form = new FormData();
  form.set("draftId", "enquiry-draft-1");
  form.set("intent", "draft");
  form.set("stateId", "s-new");
  form.set("name", "  Ada Obi  ");
  form.set("number", " +2348000000001 ");
  form.set("asked_for", " a small saloon ");
  form.set("note", " call after six ");

  const result = enquiryValuesFromForm(form);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.values, {
    name: "Ada Obi",
    number: "+2348000000001",
    asked_for: "a small saloon",
    note: "call after six",
  });
  assert.deepEqual(Object.keys(result.values).sort(), ["asked_for", "name", "note", "number"]);
});

test("blank values are kept blank — a draft is allowed to be incomplete", () => {
  const form = new FormData();
  const result = enquiryValuesFromForm(form);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.values.name, "");
  assert.equal(result.values.number, "");
  assert.equal(result.values.asked_for, "");
  assert.equal(result.values.note, "");
});

test("an over-long value is refused at its own field, not stored", () => {
  const form = new FormData();
  form.set("name", "x".repeat(201));
  form.set("note", "y".repeat(5001));
  const result = enquiryValuesFromForm(form);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(
    result.errors.map((error) => error.field).sort(),
    ["name", "note"],
  );
});
