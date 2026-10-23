/**
 * TASK-006 B/T3 — the imported sheet is linked, and one draft makes one enquiry.
 *
 * Run only against the disposable branch (the guard refuses without `TASK006_THROWAWAY=1`):
 *
 *   TASK006_THROWAWAY=1 DATABASE_URL=<branch pooled> DATABASE_URL_UNPOOLED=<branch direct> \
 *     node --conditions=react-server --import tsx developer-workspace/scripts/task-006/draft-save-pdf-check.ts
 *
 * The claims:
 *   * one upload's enquiry drafts share one `enquiry_pdf` row, whose `rows_total` is the batch size;
 *   * the saved enquiry carries that row's id as `pdf_import_id`;
 *   * the enquiry's id is the draft's own id, so a second save of the same draft creates nothing;
 *   * a second draft from the same sheet reuses the same PDF row;
 *   * a concurrent double save still makes one enquiry.
 *
 * It cleans up every row it made, by the ids it minted.
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { runSaveDraft } from "../../../lib/draft-save-run";

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
  const assetId = `asset-task006-${batchId}`;
  const filename = `task006-sheet-${batchId.slice(0, 8)}.pdf`;
  const namePrefix = `TASK006 Enquiry ${batchId.slice(0, 8)}`;
  const draftIds = [randomUUID(), randomUUID()];
  const concurrentDraftId = randomUUID();
  const carDraftId = randomUUID();
  const carBrand = `TASK006 Car ${batchId.slice(0, 8)}`;
  let actorId: string | null = null;

  try {
    actorId = (
      await q(`INSERT INTO office_user (email) VALUES ($1) RETURNING id`, [
        `task006-pdf-${randomUUID()}@example.invalid`,
      ])
    ).rows[0].id as string;

    const state = (
      await q(`SELECT id, label FROM enquiry_state ORDER BY sort, label LIMIT 1`)
    ).rows[0] as { id: string; label: string } | undefined;
    if (!state) throw new Error("no enquiry state");

    const carState = (
      await q(
        `SELECT id, label FROM car_state
          WHERE kind = 'primary' AND section <> 'sold'
          ORDER BY sort, label LIMIT 1`,
      )
    ).rows[0] as { id: string; label: string } | undefined;
    if (!carState) throw new Error("no non-sold primary car state");

    const values = (n: number) => ({
      name: `${namePrefix} ${n}`,
      number: `+234800000${n.toString().padStart(4, "0")}`,
      asked_for: "a small saloon",
      note: "task006 PDF-link witness",
    });

    for (const [index, id] of draftIds.entries()) {
      await q(
        `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label, is_demo)
         VALUES ($1, 'enquiry', $2, $3, $4, $5::jsonb, $6, true)`,
        [id, batchId, filename, assetId, JSON.stringify(values(index + 1)), state.label],
      );
    }

    const enquiriesBefore = Number((await q(`SELECT count(*) AS n FROM enquiry`)).rows[0].n);
    const eventsBefore = Number(
      (await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1`, [actorId])).rows[0].n,
    );

    // ------------------------------------------------------------ the first save links the sheet ---
    const first = await runSaveDraft(draftIds[0], "", actorId);
    ok("saving an enquiry draft with a sheet succeeds", first.ok, first.ok ? "" : JSON.stringify(first.errors));
    if (!first.ok) throw new Error("the first save was refused");

    const row1 = (await q(`SELECT * FROM enquiry WHERE id = $1`, [draftIds[0]])).rows[0] as
      | Record<string, unknown>
      | undefined;
    ok("the enquiry's id is the draft's own id", Boolean(row1), String(row1?.id));
    ok("it has its ENQ-####", /^ENQ-\d{4}$/.test(String(row1?.ref)), String(row1?.ref));
    ok("it carries pdf_import_id", row1?.pdf_import_id != null, String(row1?.pdf_import_id));

    const pdf1 = (await q(`SELECT * FROM enquiry_pdf WHERE id = $1`, [row1?.pdf_import_id])).rows[0] as
      | Record<string, unknown>
      | undefined;
    ok("the PDF row is the draft's own asset", pdf1?.sanity_asset_id === assetId, String(pdf1?.sanity_asset_id));
    ok("...with the owner's filename", pdf1?.filename === filename, String(pdf1?.filename));
    ok("...and rows_total is the batch's enquiry drafts", Number(pdf1?.rows_total) === 2, String(pdf1?.rows_total));
    ok(
      "one stored file has exactly one PDF row",
      Number((await q(`SELECT count(*) AS n FROM enquiry_pdf WHERE sanity_asset_id = $1`, [assetId])).rows[0].n) === 1,
    );
    ok(
      "the saved draft is no longer waiting",
      Number((await q(`SELECT count(*) AS n FROM draft WHERE id = $1`, [draftIds[0]])).rows[0].n) === 0,
    );
    ok(
      "one enquiry was made, and one enquiry.created event",
      Number((await q(`SELECT count(*) AS n FROM enquiry`)).rows[0].n) === enquiriesBefore + 1 &&
        Number((await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1`, [actorId])).rows[0].n) ===
          eventsBefore + 1,
    );

    // -------------------------------------------------------------- the same draft, saved again ---
    const again = await runSaveDraft(draftIds[0], "", actorId);
    ok(
      "saving the same draft again creates nothing and says it is gone",
      !again.ok && again.errors.some((e) => /no longer waiting/.test(e.message)),
      again.ok ? "saved a second time" : JSON.stringify(again.errors),
    );
    ok(
      "no second enquiry and no second event",
      Number((await q(`SELECT count(*) AS n FROM enquiry`)).rows[0].n) === enquiriesBefore + 1 &&
        Number((await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1`, [actorId])).rows[0].n) ===
          eventsBefore + 1,
    );

    // ------------------------------------------- the second draft from the same sheet reuses it ---
    const second = await runSaveDraft(draftIds[1], "", actorId);
    ok("the second draft from the same sheet saves", second.ok, second.ok ? "" : JSON.stringify(second.errors));
    if (!second.ok) throw new Error("the second save was refused");
    const row2 = (await q(`SELECT * FROM enquiry WHERE id = $1`, [draftIds[1]])).rows[0] as
      | Record<string, unknown>
      | undefined;
    ok("it is its own enquiry, linked to the same PDF row", row2?.pdf_import_id === row1?.pdf_import_id, String(row2?.pdf_import_id));
    const pdf2 = (await q(`SELECT * FROM enquiry_pdf WHERE id = $1`, [row2?.pdf_import_id])).rows[0] as
      | Record<string, unknown>
      | undefined;
    ok("rows_total was not overwritten by the second save", Number(pdf2?.rows_total) === 2, String(pdf2?.rows_total));
    ok(
      "still exactly one PDF row for the file",
      Number((await q(`SELECT count(*) AS n FROM enquiry_pdf WHERE sanity_asset_id = $1`, [assetId])).rows[0].n) === 1,
    );

    // --------------------------------------------------------------- the same draft, twice at once ---
    await q(
      `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label, is_demo)
       VALUES ($1, 'enquiry', $2, $3, $4, $5::jsonb, $6, true)`,
      [concurrentDraftId, randomUUID(), filename, assetId, JSON.stringify(values(3)), state.label],
    );
    const both = await Promise.all([
      runSaveDraft(concurrentDraftId, "", actorId),
      runSaveDraft(concurrentDraftId, "", actorId),
    ]);
    ok(
      "a concurrent double save makes one enquiry",
      Number((await q(`SELECT count(*) AS n FROM enquiry WHERE id = $1`, [concurrentDraftId])).rows[0].n) === 1,
      `saves: ${both.map((r) => (r.ok ? "ok" : "refused")).join(", ")}`,
    );
    ok(
      "and exactly one enquiry.created event",
      Number(
        (await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1 AND kind = 'enquiry.created'`, [actorId]))
          .rows[0].n,
      ) === 3,
    );

    // --------------------------------------------- a car draft, saved twice at once, makes one car ---
    await q(
      `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label, is_demo)
       VALUES ($1, 'car', $2, $3, $4, $5::jsonb, $6, true)`,
      [
        carDraftId,
        randomUUID(),
        "task006-cars.pdf",
        `asset-task006-car-${batchId}`,
        JSON.stringify({
          brand: carBrand,
          model: "Test Model",
          trim: "XSE",
          year: 2016,
          exterior_color: "Black",
          interior_color: "Cream",
          mileage: 45001,
          features: ["Leather seats"],
          note: "task006 car idempotency witness",
          private_note: "",
          was_price_kobo: 1250050,
          arrival_note: "",
          doorstep_price_kobo: 1500000,
        }),
        carState.label,
      ],
    );
    const carSaves = await Promise.all([
      runSaveDraft(carDraftId, "", actorId),
      runSaveDraft(carDraftId, "", actorId),
    ]);
    const carRow = (await q(`SELECT * FROM car WHERE id = $1`, [carDraftId])).rows[0] as
      | Record<string, unknown>
      | undefined;
    ok(
      "a car draft's own id is the car's id — one row after two saves",
      Boolean(carRow) &&
        Number((await q(`SELECT count(*) AS n FROM car WHERE id = $1`, [carDraftId])).rows[0].n) === 1,
      carSaves.map((r) => (r.ok ? "ok" : "refused")).join(", "),
    );
    ok("it got its TS-####", /^TS-\d{4}$/.test(String(carRow?.ref)), String(carRow?.ref));
    ok(
      "and exactly one car.created event",
      Number(
        (await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1 AND kind = 'car.created'`, [actorId]))
          .rows[0].n,
      ) === 1,
    );
  } finally {
    if (actorId) {
      await q(`DELETE FROM activity_event WHERE actor_id = $1`, [actorId]);
      // The enquiry rows are found by the witness's own name prefix, so a failed assertion cannot
      // leave one behind.
      await q(`DELETE FROM enquiry WHERE name LIKE $1`, [`${namePrefix}%`]);
      await q(`DELETE FROM draft WHERE id = ANY($1::uuid[])`, [draftIds.concat(concurrentDraftId, carDraftId)]);
      await q(`DELETE FROM car WHERE id = $1`, [carDraftId]);
      await q(`DELETE FROM enquiry_pdf WHERE sanity_asset_id = $1`, [assetId]);
      await q(`DELETE FROM office_user WHERE id = $1`, [actorId]);
    }
    const left = {
      enquiries: Number((await q(`SELECT count(*) AS n FROM enquiry WHERE name LIKE $1`, [`${namePrefix}%`])).rows[0].n),
      pdf: Number((await q(`SELECT count(*) AS n FROM enquiry_pdf WHERE sanity_asset_id = $1`, [assetId])).rows[0].n),
      drafts: Number(
        (await q(`SELECT count(*) AS n FROM draft WHERE id = ANY($1::uuid[])`, [
          draftIds.concat(concurrentDraftId, carDraftId),
        ])).rows[0].n,
      ),
      cars: Number((await q(`SELECT count(*) AS n FROM car WHERE id = $1`, [carDraftId])).rows[0].n),
      events: actorId
        ? Number((await q(`SELECT count(*) AS n FROM activity_event WHERE actor_id = $1`, [actorId])).rows[0].n)
        : 0,
    };
    ok(
      "the branch is left as it was found — the witness's own rows are gone",
      left.enquiries === 0 && left.pdf === 0 && left.drafts === 0 && left.cars === 0 && left.events === 0,
      JSON.stringify(left),
    );
    await client.end();
  }

  console.log(failures === 0 ? "TASK-006 PDF-LINK CHECK PASSED" : `TASK-006 PDF-LINK CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
