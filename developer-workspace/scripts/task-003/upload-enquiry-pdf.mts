// Task 13 — upload the demo enquiry PDF and insert its stored result.
//
// Specs (media §"Enquiry PDFs stored privately in Sanity"): the file goes into
// the asset store under an `enquiry-pdfs` designation with a **randomised
// filename**; the **original filename and the asset reference live only in the
// database**. So:
//   * upload with  enquiry-pdfs/<random>.pdf
//   * store        enquiry_pdf.filename = the original ("enquiries-2026-09-30.pdf")
//                  enquiry_pdf.sanity_asset_id = the asset reference
//
// It also writes scripts/demo-enquiry-import.json, the record Task 14's seed
// reproduces from — the same pattern as scripts/demo-photo-manifest.json.
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

// The sheet's rows, with the office state each was left in. Fictional customers
// (see author-enquiry-pdf.mts); the refs are fleet cars, so the import links to
// real stock.
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

// Idempotent: the demo's own import row is replaced, never duplicated.
const { rows: existing } = await client.query<{ id: string }>(
  "SELECT id FROM enquiry_pdf WHERE filename = $1",
  [ORIGINAL_FILENAME],
);
for (const row of existing) {
  await client.query("DELETE FROM enquiry WHERE pdf_import_id = $1", [row.id]);
}
await client.query("DELETE FROM enquiry_pdf WHERE filename = $1", [ORIGINAL_FILENAME]);

const { rows: pdfRows } = await client.query<{ id: string }>(
  `INSERT INTO enquiry_pdf (sanity_asset_id, filename, rows_total, imported_at)
   VALUES ($1,$2,$3,$4) RETURNING id`,
  [uploaded.assetId, ORIGINAL_FILENAME, ROWS.length, IMPORTED_AT],
);
const pdfId = pdfRows[0].id;
console.log(`enquiry_pdf row ${pdfId}: filename=${ORIGINAL_FILENAME} rows_total=${ROWS.length}`);

const stateIds = new Map(
  (
    await client.query<{ id: string; label: string }>("SELECT id, label FROM enquiry_state")
  ).rows.map((r) => [r.label, r.id]),
);

for (let i = 0; i < ROWS.length; i++) {
  const row = ROWS[i];
  const stateId = stateIds.get(STATES[i]);
  if (!stateId) throw new Error(`enquiry state "${STATES[i]}" not found — run migrations first.`);
  await client.query(
    `INSERT INTO enquiry (name, number, car_ref, note, enquiry_state_id, pdf_import_id, created_at, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
    [row.name, row.phone, row.car, row.note, stateId, pdfId, `${row.date}T10:00:00.000Z`],
  );
}
console.log(`enquiry rows linking to the import: ${ROWS.length}`);

const { rows: count } = await client.query<{ n: number }>(
  "SELECT count(*)::int n FROM enquiry WHERE pdf_import_id = $1",
  [pdfId],
);
console.log(`confirmed in the store: ${count[0].n} enquiry row(s) on that import`);
await client.end();

writeFileSync(
  RECORD,
  JSON.stringify(
    {
      purpose:
        "TASK-003 demo enquiry import — the stored result of the one authored demo PDF. Task 14's seed reproduces exactly this. The asset reference and the original filename live here and in the database only; the randomised name the asset was uploaded under is not the original filename.",
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
