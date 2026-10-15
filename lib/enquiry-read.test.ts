/**
 * The enquiry reader's rule, executable.
 *
 * An enquiry sheet becomes drafts, one per row, and **nothing is invented and nothing is dropped in
 * silence**: a row whose details cannot be read comes back as a refusal naming the row and saying
 * why, and a sheet that is not ours is refused whole.
 *
 * These test the *pure* half — `parseEnquirySheet` over the sheet's lines — so the whole rule is
 * proved without a PDF. The PDF half (getting the words out of the file) is proved against a real
 * sheet by developer-workspace/scripts/task-004/enquiry-read-check.ts.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { NOT_AN_ENQUIRY_SHEET, ENQUIRY_SHEET_TITLE, parseEnquirySheet, type EnquiryFileRead } from "./enquiry-read";

/** A row's first line, in the sheet's own columns: name, then number, then the recorded day. */
function rowLine(name: string, phone: string, date = "2026-09-04"): string {
  return `${name.padEnd(26)}${phone.padEnd(20)}${date}`;
}

/** The sheet's lines: its heading, the column header, the rule of dashes, then a block per row. */
function sheet(...rows: { header: string; details: string[] }[]): string[] {
  return [
    ENQUIRY_SHEET_TITLE,
    "fictional sample - prepared by the sales desk, 30 September 2026",
    "Name                      Phone               Recorded",
    "----------------------------------------------------------------------------------------------------",
    ...rows.flatMap((row) => [row.header, ...row.details]),
  ];
}

function ok(read: EnquiryFileRead): Extract<EnquiryFileRead, { ok: true }> {
  assert.equal(read.ok, true, `expected a readable sheet, got: ${JSON.stringify(read)}`);
  return read as Extract<EnquiryFileRead, { ok: true }>;
}

test("reads one enquiry's fields from the sheet's own lines", () => {
  const read = ok(
    parseEnquirySheet(
      sheet({
        header: rowLine("Ada Nwosu", "0803 000 0101"),
        details: ["  Asked for: a 2021 Camry XSE V6", "  Note:      Asked about finance terms"],
      }),
    ),
  );

  assert.deepEqual(read.enquiries, [
    {
      values: {
        name: "Ada Nwosu",
        number: "0803 000 0101",
        asked_for: "a 2021 Camry XSE V6",
        note: "Asked about finance terms",
      },
      stateLabel: null,
    },
  ]);
  assert.deepEqual(read.refusals, []);
});

test("reads every row, keeping the sheet's own order", () => {
  const read = ok(
    parseEnquirySheet(
      sheet(
        { header: rowLine("Ada Nwosu", "0803 000 0101"), details: ["  Asked for: a Camry"] },
        { header: rowLine("Bright Okonkwo", "0805 000 0102"), details: ["  Asked for: an X5"] },
        { header: rowLine("Chika Adeyemi", "0807 000 0103"), details: ["  Asked for: a Highlander"] },
      ),
    ),
  );

  assert.deepEqual(
    read.enquiries.map((enquiry) => enquiry.values.name),
    ["Ada Nwosu", "Bright Okonkwo", "Chika Adeyemi"],
  );
  assert.deepEqual(read.refusals, []);
});

test("reads a row that carries only what it was given — nothing is invented", () => {
  const read = ok(
    parseEnquirySheet(
      sheet({ header: rowLine("Ada Nwosu", "0803 000 0101"), details: ["  Asked for: a Camry"] }),
    ),
  );

  assert.deepEqual(read.enquiries[0]?.values, {
    name: "Ada Nwosu",
    number: "0803 000 0101",
    asked_for: "a Camry",
  });
});

test("reads the state the sheet names, as a name and not as one of the record's fields", () => {
  const read = ok(
    parseEnquirySheet(
      sheet({
        header: rowLine("Ada Nwosu", "0803 000 0101"),
        details: ["  Asked for: a Camry", "  State: New"],
      }),
    ),
  );

  assert.equal(read.enquiries[0]?.stateLabel, "New");
  assert.equal(read.enquiries[0]?.values.state, undefined);
});

test("leaves the state null when the sheet names none", () => {
  const read = ok(
    parseEnquirySheet(
      sheet({ header: rowLine("Ada Nwosu", "0803 000 0101"), details: ["  Asked for: a Camry"] }),
    ),
  );

  assert.equal(read.enquiries[0]?.stateLabel, null);
});

test("leaves a label that is not one of the five alone", () => {
  const read = ok(
    parseEnquirySheet(
      sheet({
        header: rowLine("Ada Nwosu", "0803 000 0101"),
        details: ["  Asked for: a Camry", "  Colour: red"],
      }),
    ),
  );

  assert.deepEqual(read.enquiries[0]?.values, {
    name: "Ada Nwosu",
    number: "0803 000 0101",
    asked_for: "a Camry",
  });
  assert.deepEqual(read.refusals, []);
});

test("refuses a row that writes a detail twice, rather than guessing which is right", () => {
  const read = ok(
    parseEnquirySheet(
      sheet({
        header: rowLine("Ada Nwosu", "0803 000 0101"),
        details: ["  Asked for: a Camry", "  Asked for: a Corolla"],
      }),
    ),
  );

  assert.deepEqual(read.enquiries, []);
  assert.deepEqual(read.refusals, [{ row: 1, reason: '"Asked for" is written twice on this row' }]);
});

test("refuses a line it cannot place, naming the row, and keeps the rest of the row", () => {
  const read = ok(
    parseEnquirySheet(
      sheet({
        header: rowLine("Ada Nwosu", "0803 000 0101"),
        details: ["  Asked for: a Camry", "gibberish that is not a row"],
      }),
    ),
  );

  assert.equal(read.enquiries.length, 1);
  assert.deepEqual(read.refusals, [
    { row: 1, reason: "this line is not a name and number the sheet can read" },
  ]);
});

test("refuses a PDF that is not our sheet, whole", () => {
  const read = parseEnquirySheet(["Some other document", "Name                      Phone               Recorded"]);
  assert.equal(read.ok, false);
  assert.equal(read.ok === false && read.reason, NOT_AN_ENQUIRY_SHEET);
});

test("refuses our heading with no column header to find the rows by", () => {
  const read = parseEnquirySheet([ENQUIRY_SHEET_TITLE, "Ada Nwosu                 0803 000 0101       2026-09-04"]);
  assert.equal(read.ok, false);
  assert.equal(read.ok === false && read.reason, NOT_AN_ENQUIRY_SHEET);
});

test("a sheet whose rows are all refused still answers, with the refusals and no drafts", () => {
  const read = ok(
    parseEnquirySheet(
      sheet({
        header: rowLine("Ada Nwosu", "0803 000 0101"),
        details: ["  Note:   first", "  Note:   second"],
      }),
    ),
  );

  assert.deepEqual(read.enquiries, []);
  assert.equal(read.refusals.length, 1);
  assert.equal(read.refusals[0]?.row, 1);
});
