import assert from "node:assert/strict";
import { test } from "node:test";
import { ENQUIRY_RECIPE } from "./change-check";
import {
  ENQUIRY_TEMPLATE_CONTENT_TYPE,
  ENQUIRY_TEMPLATE_DEFAULT,
  ENQUIRY_TEMPLATE_FIELDS,
  ENQUIRY_TEMPLATE_FILENAME,
  ENQUIRY_TEMPLATE_MAX,
  ENQUIRY_TEMPLATE_TITLE,
  enquiryFieldName,
  enquiryFields,
  enquiryTemplateFormName,
  isEnquiryFieldNameBeyondLimit,
  readEnquiryCount,
  readEnquiryFieldName,
} from "./enquiry-template-rules";

test("the blank asks for the enquiry's five editable details, in the recipe's order", () => {
  assert.equal(ENQUIRY_RECIPE.length, 5);
  assert.deepEqual(
    ENQUIRY_TEMPLATE_FIELDS.map((field) => field.recipe),
    ENQUIRY_RECIPE.map((field) => field.name),
  );
});

test("and for nothing else — one field per recipe field", () => {
  const blank = new Set(ENQUIRY_TEMPLATE_FIELDS.map((field) => field.form));
  assert.equal(blank.size, ENQUIRY_TEMPLATE_FIELDS.length);
  assert.equal(blank.size, ENQUIRY_RECIPE.length);

  for (const never of ["id", "ref", "handle", "is_demo", "created_at", "pdf_import_id"]) {
    assert.equal(enquiryTemplateFormName(never), undefined, `the blank asks for ${never}`);
  }
});

test("the state is written as a name, not the key the store minted", () => {
  assert.equal(enquiryTemplateFormName("enquiry_state_id"), "state");
  assert.equal(ENQUIRY_TEMPLATE_FIELDS.find((f) => f.recipe === "enquiry_state_id")?.words, "State");
});

test("every field carries words, and no two fields carry the same ones", () => {
  const words = ENQUIRY_TEMPLATE_FIELDS.map((field) => field.words);
  for (const word of words) assert.ok(word.trim().length > 0);
  assert.equal(new Set(words).size, words.length);
});

test("the download is named and typed as a PDF", () => {
  assert.equal(ENQUIRY_TEMPLATE_FILENAME, "truespec-enquiry-template.pdf");
  assert.match(ENQUIRY_TEMPLATE_FILENAME, /\.pdf$/);
  assert.equal(ENQUIRY_TEMPLATE_CONTENT_TYPE, "application/pdf");
  assert.match(ENQUIRY_TEMPLATE_TITLE, /enquiry/i);
});

test("every page carries all five fields under its own page-prefixed names", () => {
  assert.equal(ENQUIRY_TEMPLATE_MAX, 20);
  for (const page of [1, 2, 20]) {
    const fields = enquiryFields(page);
    assert.equal(fields.length, ENQUIRY_TEMPLATE_FIELDS.length);
    assert.deepEqual(
      fields.map((field) => field.form),
      ENQUIRY_TEMPLATE_FIELDS.map(
        (field) => `enquiry_${String(page).padStart(2, "0")}_${field.form}`,
      ),
    );
  }
  assert.deepEqual(
    enquiryFields(3).map((field) => field.form),
    ["enquiry_03_name", "enquiry_03_number", "enquiry_03_asked_for", "enquiry_03_note", "enquiry_03_state"],
  );
});

test("no two pages can collide — every page's fields are distinct names", () => {
  const names: string[] = [];
  for (let page = 1; page <= ENQUIRY_TEMPLATE_MAX; page += 1) {
    names.push(...enquiryFields(page).map((field) => field.form));
  }
  assert.equal(names.length, ENQUIRY_TEMPLATE_FIELDS.length * ENQUIRY_TEMPLATE_MAX);
  assert.equal(new Set(names).size, names.length);
});

test("a field name reads back as the page and the field it belongs to", () => {
  for (let page = 1; page <= 5; page += 1) {
    for (const field of ENQUIRY_TEMPLATE_FIELDS) {
      assert.deepEqual(readEnquiryFieldName(enquiryFieldName(field.recipe, page)), {
        page,
        recipe: field.recipe,
      });
    }
  }
  assert.deepEqual(readEnquiryFieldName("enquiry_03_state"), { page: 3, recipe: "enquiry_state_id" });
});

test("a name this blank does not write is not guessed at", () => {
  for (const never of [
    "",
    "name",
    "enquiry_name",
    "enquiry_1_name",
    "enquiry_00_name",
    "enquiry_01_",
    "enquiry_01_notes",
    "enquiry_01_name_2",
    "enquiry_21_name",
    "other_01_name",
  ]) {
    assert.equal(readEnquiryFieldName(never), undefined, `the blank reads "${never}" back`);
  }
});

test("a name for a page past the blank's limit is recognised, so the upload can refuse the file", () => {
  assert.equal(isEnquiryFieldNameBeyondLimit("enquiry_21_name"), true);
  assert.equal(isEnquiryFieldNameBeyondLimit("enquiry_99_state"), true);
  assert.equal(isEnquiryFieldNameBeyondLimit("enquiry_20_name"), false);
  assert.equal(isEnquiryFieldNameBeyondLimit("enquiry_01_name"), false);
  assert.equal(isEnquiryFieldNameBeyondLimit("other_21_name"), false);
  assert.equal(isEnquiryFieldNameBeyondLimit("enquiry_21_notes"), false);
});

test("a page number is a whole number inside the blank's limit", () => {
  for (const bad of [0, -1, 1.5, ENQUIRY_TEMPLATE_MAX + 1, Number.NaN]) {
    assert.throws(() => enquiryFieldName("name", bad));
    assert.throws(() => enquiryFields(bad));
  }
});

test("the download asks for 1 to 20 pages, and 20 when it is not told", () => {
  assert.equal(readEnquiryCount(null).ok, true);
  assert.deepEqual(readEnquiryCount(null), { ok: true, pages: ENQUIRY_TEMPLATE_DEFAULT });
  assert.deepEqual(readEnquiryCount("1"), { ok: true, pages: 1 });
  assert.deepEqual(readEnquiryCount("20"), { ok: true, pages: 20 });
  assert.deepEqual(readEnquiryCount(" 2 "), { ok: true, pages: 2 });
  for (const bad of ["0", "21", "-1", "1.5", "abc", "2.0"]) {
    assert.equal(readEnquiryCount(bad).ok, false, `accepted "${bad}"`);
  }
});
