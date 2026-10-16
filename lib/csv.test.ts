import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvCell, csvOf, csvRow } from "./csv";

/**
 * The export's per-subject files (truth 13). What must hold:
 *   - a field that would break the layout is quoted, and its quotes doubled;
 *   - an empty value is an *empty cell* — the format has no word for "no value", so none is invented;
 *   - a date is ISO 8601 in UTC, like every other date in the office;
 *   - a `jsonb` snapshot survives as JSON, and a kobo `bigint` (which `pg` hands back as a string)
 *     survives as its own digits;
 *   - every record ends with CRLF, so the file opens the same everywhere.
 */

describe("csvCell", () => {
  it("passes a plain value straight through", () => {
    assert.equal(csvCell("Toyota Land Cruiser"), "Toyota Land Cruiser");
    assert.equal(csvCell(1250), "1250");
    assert.equal(csvCell(true), "true");
  });

  it("writes an absent value as an empty cell — it does not invent a word for nothing", () => {
    assert.equal(csvCell(null), "");
    assert.equal(csvCell(undefined), "");
    assert.equal(csvRow([null, "x", undefined]), ",x,");
  });

  it("quotes a field that would otherwise break the layout", () => {
    assert.equal(csvCell("Lagos, Nigeria"), '"Lagos, Nigeria"');
    assert.equal(csvCell('says "hello"'), '"says ""hello"""');
    assert.equal(csvCell("two\nlines"), '"two\nlines"');
    assert.equal(csvCell("carriage\rreturn"), '"carriage\rreturn"');
  });

  it("does not quote what does not need quoting", () => {
    assert.equal(csvCell(""), "");
    assert.equal(csvCell("TS-1001"), "TS-1001");
    assert.equal(csvCell("plain; semicolons stay"), "plain; semicolons stay");
  });

  it("says a date as ISO 8601 in UTC, like the rest of the office", () => {
    assert.equal(csvCell(new Date("2026-10-15T12:04:30.769Z")), "2026-10-15T12:04:30.769Z");
  });

  it("keeps a jsonb snapshot as JSON, quoting the commas it carries", () => {
    const cell = csvCell({ action: "car.create", at: 1 });
    assert.equal(cell, '"{""action"":""car.create"",""at"":1}"');
    // an array's JSON carries commas, so it is quoted like any other field that would break layout
    assert.equal(csvCell(["a", "b"]), '"[""a"",""b""]"');
  });

  it("keeps a pg bigint (a price in kobo) as its own digits", () => {
    assert.equal(csvCell("2500050" as unknown as bigint), "2500050");
    assert.equal(csvCell(9007199254740991), "9007199254740991");
  });

  it("keeps non-ASCII as it is — UTF-8, not escapes", () => {
    assert.equal(csvCell("₦12,500"), '"₦12,500"');
    assert.equal(csvCell("Elegushi’s car"), "Elegushi’s car");
  });
});

describe("csvOf", () => {
  it("puts the header first and ends every record with CRLF", () => {
    const out = csvOf(["id", "ref"], [
      ["1", "TS-1001"],
      ["2", "TS-1002"],
    ]);
    assert.equal(out, "id,ref\r\n1,TS-1001\r\n2,TS-1002\r\n");
  });

  it("writes a subject with no rows as a header and nothing else — not a broken file", () => {
    const out = csvOf(["id", "car_id", "amount_minor"], []);
    assert.equal(out, "id,car_id,amount_minor\r\n");
    assert.equal(out.split("\r\n").length - 1, 1);
  });

  it("survives a strict RFC 4180 parse — a quoted comma is not a separator", () => {
    const out = csvOf(["who", "note"], [["Ada", 'asked for "the black one", ready']]);

    // A real (small) reader: fields separated by commas, records by CRLF, a quoted field read
    // whole with its doubled quotes halved. Naive splitting is what this must outlive.
    const parse = (text: string): string[][] => {
      const rows: string[][] = [];
      let field = "";
      let row: string[] = [];
      let quoted = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
          if (ch === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i++;
            } else quoted = false;
          } else field += ch;
          continue;
        }
        if (ch === '"') quoted = true;
        else if (ch === ",") {
          row.push(field);
          field = "";
        } else if (ch === "\r" && text[i + 1] === "\n") {
          row.push(field);
          rows.push(row);
          field = "";
          row = [];
          i++;
        } else field += ch;
      }
      if (field !== "" || row.length) {
        row.push(field);
        rows.push(row);
      }
      return rows;
    };

    assert.deepEqual(parse(out), [
      ["who", "note"],
      ["Ada", 'asked for "the black one", ready'],
    ]);
  });
});
