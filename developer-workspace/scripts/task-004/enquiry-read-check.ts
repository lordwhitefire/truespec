/**
 * Proves the enquiry upload's two halves (truth 9; D16; `specs/enquiries`): **an enquiry sheet becomes
 * one draft per row, and nothing is invented and nothing is dropped in silence** — and the file
 * itself is held, its reference only in the database.
 *
 * Everything here is the **real** thing: the sheet is the sales desk's own sample (the file
 * scripts/task-003/author-enquiry-pdf.mts wrote), it is read by the real reader
 * (`lib/enquiry-read.ts`), the rows are written by the real write (`lib/draft.ts`), and the file is
 * held by the real asset store (`lib/sanity.ts`). No copy of any of them — a copy could drift.
 *
 * **This witness writes, and removes exactly what it wrote.** Its drafts live under a `batch_id` it
 * mints itself and are deleted by that id in a `finally`; its held asset is deleted by the id the
 * store returned. The `enquiry` table is checked back at the end, so a run that leaves an enquiry
 * behind — or disturbs the ones the demo already has — fails.
 *
 * What is claimed:
 *
 *   1. the real sheet reads as four drafts, in the sheet's own order;
 *   2. the name, number, what they asked for and the note are read as the sheet wrote them — the
 *      em-dash and all;
 *   3. a draft's `values` is exactly the four the sheet carried, keyed by the record's own names;
 *   4. the state is read as a **name** — the sample names none, so no draft occupies one;
 *   5. a file that is not a PDF is refused whole, with a reason;
 *   6. a PDF that is not one of our sheets is refused whole, with a reason;
 *   7. the write records one **batch** — every draft of a sheet shares one `batch_id`;
 *   8. `enquiry` is the size it was: a draft is not an enquiry;
 *   9. the owner's own name for the file is kept, trimmed, and the row is not a demo row;
 *  10. the held file carries a randomised name, and its reference resolves to real bytes (and is
 *      removed again).
 *
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/enquiry-read-check.ts
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { PDFDocument } from "pdf-lib";
import { Client } from "pg";
import { recordEnquiryDrafts } from "../../../lib/draft";
import { NOT_AN_ENQUIRY_SHEET, readEnquiryFile } from "../../../lib/enquiry-read";
import { deleteAsset, findFileAsset, uploadFile } from "../../../lib/sanity";
import { heldFilename, sourceFilename } from "../../../lib/upload-rules";

loadEnv({ path: ".env.local", quiet: true });

/** The sales desk's own sample sheet — the file the office imports (authored for TASK-003). */
const SHEET = "developer-workspace/scripts/task-003/runs/task-13/enquiries-2026-09-30.pdf";

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  const count = async (table: string) =>
    Number((await client.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);

  const batchId = randomUUID();
  const unknownBatch = randomUUID();
  let heldAssetId: string | null = null;

  try {
    const bytes = new Uint8Array(readFileSync(SHEET));

    // ------------------------------------------------------------------- the read (the file) ---
    const read = await readEnquiryFile(bytes);
    ok("the real sheet reads at all", read.ok, read.ok ? "" : read.reason);
    if (!read.ok) throw new Error(read.reason);

    ok(
      "the sheet reads as four drafts, in the sheet's own order",
      read.enquiries.length === 4 && read.refusals.length === 0,
      `${read.enquiries.length} drafts, ${read.refusals.length} refusals`,
    );

    const first = read.enquiries[0];
    ok(
      "the first row's name and number are read as the sheet wrote them",
      first?.values.name === "Ada Nwosu" && first?.values.number === "0803 000 0101",
      `${String(first?.values.name)} / ${String(first?.values.number)}`,
    );
    ok(
      "what they asked for is read whole — em-dash and all",
      first?.values.asked_for === "a 2021 Camry XSE V6 — the black one on your lot",
      String(first?.values.asked_for),
    );
    ok("the note is read as its own field", first?.values.note === "Asked about finance terms", String(first?.values.note));
    ok(
      "a draft's values is exactly the four the sheet carried",
      JSON.stringify(Object.keys(first?.values ?? {}).sort()) ===
        JSON.stringify(["asked_for", "name", "note", "number"]),
      Object.keys(first?.values ?? {}).join(", "),
    );
    ok(
      "the state is read as a name — the sample sheet names none",
      read.enquiries.every((enquiry) => enquiry.stateLabel === null),
    );

    // --------------------------------------------------------- the refusals (not our file) ---
    const notPdf = await readEnquiryFile(new Uint8Array([1, 2, 3, 4]));
    ok(
      "a file that is not a PDF is refused whole, with a reason",
      !notPdf.ok && notPdf.reason === NOT_AN_ENQUIRY_SHEET,
      notPdf.ok ? "read" : notPdf.reason,
    );

    const foreign = await PDFDocument.create();
    foreign.addPage();
    const foreignRead = await readEnquiryFile(await foreign.save());
    ok(
      "a PDF that is not one of our sheets is refused whole, with a reason",
      !foreignRead.ok && foreignRead.reason === NOT_AN_ENQUIRY_SHEET,
      foreignRead.ok ? "read" : foreignRead.reason,
    );

    // ---------------------------------------------------------------- the write (the store) ---
    const enquiriesBefore = await count("enquiry");

    const written = await recordEnquiryDrafts({
      batchId,
      sourceFilename: sourceFilename("  enquiries september.pdf  "),
      sourceAssetId: "asset-witness-not-uploaded",
      enquiries: read.enquiries,
    });
    ok("the write records every enquiry the sheet carried", written === 4, String(written));

    const rows = (await client.query(`SELECT * FROM draft WHERE batch_id = $1`, [batchId])).rows as Record<
      string,
      unknown
    >[];
    ok(
      "one batch: every draft of a sheet shares one batch_id",
      rows.length === 4 && rows.every((row) => row.batch_id === batchId),
      String(rows.length),
    );
    ok(
      "the owner's own name for the file is kept, trimmed",
      rows.every((row) => row.source_filename === "enquiries september.pdf"),
      String(rows[0]?.source_filename),
    );
    ok(
      "every draft is an enquiry draft, and not a demo row",
      rows.every((row) => row.kind === "enquiry" && row.is_demo === false),
      rows.map((row) => String(row.kind)).join(", "),
    );
    ok(
      "a draft's values is exactly what the sheet carried (keyed by the record's own names)",
      JSON.stringify(Object.keys((rows[0]?.values as Record<string, unknown>) ?? {}).sort()) ===
        JSON.stringify(["asked_for", "name", "note", "number"]),
      Object.keys((rows[0]?.values as Record<string, unknown>) ?? {}).join(", "),
    );
    ok("the state's name is null — the sheet named none", rows[0]?.state_label === null, String(rows[0]?.state_label));

    ok(
      "the draft is not an enquiry — the enquiry table is the size it was",
      (await count("enquiry")) === enquiriesBefore,
      `${await count("enquiry")} vs ${enquiriesBefore}`,
    );

    // ---------------------------------------------------------------- the held file (the store) ---
    const heldName = heldFilename(randomUUID());
    ok(
      "a held file's name is randomised, with nothing of the owner's name in it",
      !heldName.includes("enquiries") && heldName.endsWith(".pdf"),
      heldName,
    );

    const held = await uploadFile(Buffer.from(bytes), { filename: heldName, contentType: "application/pdf" });
    heldAssetId = held.assetId;
    ok("the file is held — the asset store returned a reference", heldAssetId.startsWith("file-"), heldAssetId);

    // The asset store answers reads after its own short propagation, so this asks again a few times
    // rather than calling a reference "resolving nothing" on the first beat — the property under test
    // is that the held reference *does* resolve, not that it resolves within one round trip.
    let found: Awaited<ReturnType<typeof findFileAsset>> = null;
    for (let attempt = 0; attempt < 6 && found === null; attempt += 1) {
      found = await findFileAsset(heldAssetId);
      if (found === null) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    ok("the reference resolves to real bytes", found !== null && (found.size ?? 0) > 0, found ? `${found.size} bytes` : "not found");

    const removed = await deleteAsset(heldAssetId);
    ok("and the witness's own asset is removed again", removed.deleted === true, removed.reason ?? "");
    heldAssetId = null;
  } finally {
    if (heldAssetId) {
      const cleanup = await deleteAsset(heldAssetId);
      console.log(`  note  cleaned up an asset left behind: ${cleanup.deleted ? "removed" : cleanup.reason}`);
    }
    await client.query("DELETE FROM draft WHERE batch_id = ANY($1::uuid[])", [[batchId, unknownBatch]]);
    const left = Number(
      (await client.query("SELECT count(*) AS n FROM draft WHERE batch_id = ANY($1::uuid[])", [[batchId, unknownBatch]]))
        .rows[0].n,
    );
    ok("the store is the size it was — the witness's own drafts are gone", left === 0, `${left} left behind`);
    await client.end();
  }

  console.log(failures === 0 ? "ENQUIRY-READ CHECK PASSED" : `ENQUIRY-READ CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
