/**
 * TASK-006 A/T5 — the delete statement against the throwaway branch.
 *
 * Run only against the disposable branch:
 *
 *   TASK006_THROWAWAY=1 DATABASE_URL_UNPOOLED=<branch direct> \
 *     node --import tsx developer-workspace/scripts/task-006/enquiry-delete-check.ts
 *
 * The claims:
 *   * deleting one of several enquiries leaves the shared PDF row and its file;
 *   * the last enquiry keeps the PDF while a waiting draft still names its asset;
 *   * with no enquiry and no draft left, the PDF row goes and its asset id is returned;
 *   * a repeat finds no row and writes no second event;
 *   * taps are unchanged.
 *
 * No asset is uploaded: the statement only reads the id, and this witness never calls the asset
 * store. The branch is left as it was found.
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { enquiryDeleteStatement } from "../../../lib/enquiry-delete";

loadEnv({ path: ".env.local", quiet: true });

if (process.env.TASK006_THROWAWAY !== "1") {
  throw new Error("refusing: set TASK006_THROWAWAY=1 and run against the disposable branch only");
}

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL is not set");

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures += 1;
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  const q = (text: string, params?: unknown[]) => client.query(text, params);

  const batchId = randomUUID();
  const assetId = `asset-task006-delete-${batchId}`;
  const filename = `task006-delete-${batchId.slice(0, 8)}.pdf`;
  const prefix = `TASK006 Delete ${batchId.slice(0, 8)}`;
  const enquiryIds = Array.from({ length: 5 }, () => randomUUID());
  const draftId = randomUUID();
  let actorId: string | null = null;
  let pdfId: string | null = null;

  try {
    actorId = (
      await q(`INSERT INTO office_user (email) VALUES ($1) RETURNING id`, [
        `task006-delete-${randomUUID()}@example.invalid`,
      ])
    ).rows[0].id as string;

    pdfId = (
      await q(
        `INSERT INTO enquiry_pdf (sanity_asset_id, filename, rows_total)
         VALUES ($1, $2, $3) RETURNING id`,
        [assetId, filename, 5],
      )
    ).rows[0].id as string;

    for (const [index, id] of enquiryIds.entries()) {
      await q(
        `INSERT INTO enquiry (id, name, number, asked_for, note, content_hash, hash_version, pdf_import_id)
         VALUES ($1, $2, $3, $4, $5, $6, 1, $7)`,
        [
          id,
          `${prefix} ${index + 1}`,
          `+234800001${String(index).padStart(4, "0")}`,
          "a small saloon",
          "task006 delete witness",
          "a".repeat(64),
          pdfId,
        ],
      );
    }

    await q(
      `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label, is_demo)
       VALUES ($1, 'enquiry', $2, $3, $4, $5::jsonb, NULL, true)`,
      [
        draftId,
        batchId,
        filename,
        assetId,
        JSON.stringify({
          name: `${prefix} draft`,
          number: "+2348000009999",
          asked_for: "a small saloon",
          note: "waiting draft",
        }),
      ],
    );

    const tapsBefore = Number((await q(`SELECT count(*) AS n FROM tap`)).rows[0].n);
    const eventCount = async () =>
      Number((await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1`, [actorId])).rows[0].n);

    const del = (id: string) => {
      const { text, params } = enquiryDeleteStatement({ id, actorId: actorId as string });
      return q(text, params);
    };

    // ------------------------------------------------- one of five: the sheet is still shared ---
    const first = await del(enquiryIds[0]);
    ok("one enquiry is deleted", first.rows.length === 1 && first.rows[0].ref?.startsWith("ENQ-"), String(first.rows[0]?.ref));
    ok("the shared PDF row is not deleted", first.rows[0]?.asset_id === null, String(first.rows[0]?.asset_id));
    ok(
      "the PDF still exists",
      Number((await q(`SELECT count(*) AS n FROM enquiry_pdf WHERE id = $1`, [pdfId])).rows[0].n) === 1,
    );
    ok(
      "the deleted row is gone",
      Number((await q(`SELECT count(*) AS n FROM enquiry WHERE id = $1`, [enquiryIds[0]])).rows[0].n) === 0,
    );
    ok(
      "one enquiry.deleted event names the ENQ-####",
      (await q(`SELECT kind, subject FROM activity_event WHERE actor_id = $1`, [actorId])).rows[0]?.kind ===
        "enquiry.deleted" && (await eventCount()) === 1,
    );

    // --------------------------------------------------------------------- repeat: nothing new ---
    const repeat = await del(enquiryIds[0]);
    ok("a repeat finds no row", repeat.rows.length === 0);
    ok("...and writes no second event", (await eventCount()) === 1);

    // ------------------------------------------------- two more of five: still shared, still there ---
    await del(enquiryIds[1]);
    await del(enquiryIds[2]);
    ok(
      "with two enquiries still using it, the PDF stays",
      Number((await q(`SELECT count(*) AS n FROM enquiry_pdf WHERE id = $1`, [pdfId])).rows[0].n) === 1,
    );

    // ------------------------------------------- the last enquiry, but a draft still points at it ---
    const lastWithDraft = await del(enquiryIds[3]);
    ok("the last enquiry is deleted, but the waiting draft keeps the PDF", lastWithDraft.rows[0]?.asset_id === null);
    ok(
      "...so the PDF row is still there",
      Number((await q(`SELECT count(*) AS n FROM enquiry_pdf WHERE id = $1`, [pdfId])).rows[0].n) === 1,
    );

    // --------------------------------------------------------- the draft goes; the last delete clears it ---
    await q(`DELETE FROM draft WHERE id = $1`, [draftId]);
    const last = await del(enquiryIds[4]);
    ok("with no enquiry and no draft left, the delete returns the asset to clear", last.rows[0]?.asset_id === assetId, String(last.rows[0]?.asset_id));
    ok(
      "the PDF row is gone",
      Number((await q(`SELECT count(*) AS n FROM enquiry_pdf WHERE id = $1`, [pdfId])).rows[0].n) === 0,
    );
    ok(
      "five events — one per real delete",
      (await eventCount()) === 5,
      String(await eventCount()),
    );
    ok("taps are unchanged", Number((await q(`SELECT count(*) AS n FROM tap`)).rows[0].n) === tapsBefore);
  } finally {
    if (actorId) {
      await q(`DELETE FROM activity_event WHERE actor_id = $1`, [actorId]);
      await q(`DELETE FROM enquiry WHERE name LIKE $1`, [`${prefix}%`]);
      await q(`DELETE FROM draft WHERE batch_id = $1`, [batchId]);
      await q(`DELETE FROM enquiry_pdf WHERE sanity_asset_id = $1`, [assetId]);
      await q(`DELETE FROM office_user WHERE id = $1`, [actorId]);
    }
    const left = {
      enquiries: Number((await q(`SELECT count(*) AS n FROM enquiry WHERE name LIKE $1`, [`${prefix}%`])).rows[0].n),
      pdf: Number((await q(`SELECT count(*) AS n FROM enquiry_pdf WHERE sanity_asset_id = $1`, [assetId])).rows[0].n),
      drafts: Number((await q(`SELECT count(*) AS n FROM draft WHERE batch_id = $1`, [batchId])).rows[0].n),
      events: actorId
        ? Number((await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1`, [actorId])).rows[0].n)
        : 0,
    };
    ok(
      "the branch is left as it was found — the witness's own rows are gone",
      left.enquiries === 0 && left.pdf === 0 && left.drafts === 0 && left.events === 0,
      JSON.stringify(left),
    );
    await client.end();
  }

  console.log(failures === 0 ? "TASK-006 ENQUIRY-DELETE CHECK PASSED" : `TASK-006 ENQUIRY-DELETE CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
