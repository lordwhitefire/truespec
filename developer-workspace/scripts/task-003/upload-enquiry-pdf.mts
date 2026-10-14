// Task 13 — upload the demo enquiry PDF and record its stored result.
//
// Specs (media §"Enquiry PDFs stored privately in Sanity"): the file goes into
// the asset store under an `enquiry-pdfs` designation with a **randomised
// filename**; the **original filename and the asset reference live only in the
// database**. So:
//   * upload with  enquiry-pdfs/<random>.pdf
//   * store        enquiry_pdf.filename = the original ("enquiries-2026-09-30.pdf")
//                  enquiry_pdf.sanity_asset_id = the asset reference
//
// It also writes scripts/demo-enquiry-import.json, the record the seed reproduces
// from — the same pattern as scripts/demo-photo-manifest.json. **Only the filler
// writes enquiry rows** (`key-and-hash-v1.md` decision 14): this script points its
// own `enquiry_pdf` row at the new asset and re-writes the manifest, and stops
// there.
//
//   node --env-file=.env.local --conditions=react-server --import tsx \
//     developer-workspace/scripts/task-003/upload-enquiry-pdf.mts

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Client } from "pg";

import { findFileAsset, uploadFile } from "../../../lib/sanity";
import { ORIGINAL_FILENAME, ROWS } from "./author-enquiry-pdf.mts";

const PDF_PATH = `developer-workspace/scripts/task-003/runs/task-13/${ORIGINAL_FILENAME}`;
const RECORD = "scripts/demo-enquiry-import.json";
const IMPORTED_AT = "2026-09-30T09:00:00.000Z";

// The office state each row of the sheet was left in, in the sheet's order. The
// file is fictional (see author-enquiry-pdf.mts); what each customer is after is
// in their own words, and one of them asks for a car we do not hold.
const STATES = ["New", "Talking", "New", "Negotiating"];

const bytes = readFileSync(PDF_PATH);

// The randomised name the asset is stored under. If the store refuses the
// designation path, fall back to the plain randomised name and say so.
const randomised = `${randomUUID()}.pdf`;
let uploaded;
try {
  uploaded = await uploadFile(bytes, {
    filename: `enquiry-pdfs/${randomised}`,
    contentType: "application/pdf",
  });
  console.log(`uploaded as enquiry-pdfs/${randomised}`);
} catch (err) {
  console.log(`enquiry-pdfs/ designation refused (${(err as Error).message}); using the plain randomised name`);
  uploaded = await uploadFile(bytes, { filename: randomised, contentType: "application/pdf" });
}

console.log(`asset ${uploaded.assetId}  ${uploaded.size}B`);

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// This script writes the `enquiry_pdf` row and nothing else. The *enquiries* the
// sheet produces are the filler's, written from the same manifest
// (`key-and-hash-v1.md` decision 14) — so there is one writer for them, and a
// re-run of this developer's tool can never be the thing that removes a row.
const { rows: existing } = await client.query<{ id: string }>(
  "SELECT id FROM enquiry_pdf WHERE filename = $1 ORDER BY id LIMIT 1",
  [ORIGINAL_FILENAME],
);

if (existing[0]) {
  await client.query(
    `UPDATE enquiry_pdf SET sanity_asset_id = $2, rows_total = $3, imported_at = $4 WHERE id = $1`,
    [existing[0].id, uploaded.assetId, ROWS.length, IMPORTED_AT],
  );
  console.log(`enquiry_pdf row ${existing[0].id} re-pointed at ${uploaded.assetId}`);
} else {
  const { rows: pdfRows } = await client.query<{ id: string }>(
    `INSERT INTO enquiry_pdf (sanity_asset_id, filename, rows_total, imported_at)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [uploaded.assetId, ORIGINAL_FILENAME, ROWS.length, IMPORTED_AT],
  );
  console.log(`enquiry_pdf row ${pdfRows[0].id}: filename=${ORIGINAL_FILENAME} rows_total=${ROWS.length}`);
}
await client.end();

writeFileSync(
  RECORD,
  JSON.stringify(
    {
      purpose:
        "TASK-003 demo enquiry import — the stored result of the one authored demo PDF. The seed reproduces exactly this. The asset reference and the original filename live here and in the database only; the randomised name the asset was uploaded under is not the original filename. Each row's `askedFor` is what the customer wrote, in their own words — never one of our codes (D11, decision 13) — and one of them names a car we do not hold.",
      originalFilename: ORIGINAL_FILENAME,
      sanityAssetId: uploaded.assetId,
      rowsTotal: ROWS.length,
      importedAt: IMPORTED_AT,
      rows: ROWS.map((r, i) => ({ ...r, state: STATES[i] })),
    },
    null,
    2,
  ),
);
console.log(`wrote ${RECORD}`);

// --- proofs ------------------------------------------------------------------

const asset = await findFileAsset(uploaded.assetId);
console.log(`\nproof — the reference resolves in private storage: ${asset !== null}`);
console.log(`  url: ${asset?.url}  size: ${asset?.size}`);

// The randomised name is what the store holds; the original is not in the URL.
console.log(
  `  original filename appears in the asset URL: ${(asset?.url ?? "").includes(ORIGINAL_FILENAME)}`,
);
