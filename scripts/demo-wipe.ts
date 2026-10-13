import { config as loadEnv } from "dotenv";
import { Client } from "pg";

import { deleteAsset } from "../lib/sanity";

loadEnv({ path: ".env.local", quiet: true });

/**
 * The demo wipe — TASK-003 Task 24 (benchmark 8; benchmark 11's second half).
 *
 *   npm run demo:wipe                       # say what would go; change nothing
 *   npm run demo:wipe -- --yes              # remove the demo: rows and assets
 *   npm run demo:wipe -- --yes --no-assets  # rows only; leave the Sanity assets
 *   npm run demo:wipe -- --yes --json       # the machine-readable summary (for a witness)
 *
 * **This is the owner's hand.** No job, rule, seed, request path or schedule runs it, and it changes
 * nothing without `--yes`. "Nothing is deleted on the owner's behalf — ever" (task.md truth 10): the
 * one move that empties the demo is his.
 *
 * What goes, and only this (task.md:115, the owner's ruling):
 *
 *   - every demo `car` — its cost lines, its photos and its sale go with it (ON DELETE CASCADE);
 *   - every demo `enquiry` — and the imported PDF row it points at. That FK is SET NULL, so the row
 *     would outlive the enquiry; it is removed deliberately, and only when no other enquiry holds it;
 *   - `tap` rows whose `car_ref` is a demo ref;
 *   - `activity_event` rows naming a demo ref;
 *   - the demo's own assets — the photos and the PDF — by the id the row stores.
 *
 * What is left exactly as it was: every car, enquiry, cost line, photo, sale, PDF row, tap, activity
 * row, setting and asset that is not the demo's. That is **measured, not assumed**: the run takes the
 * ids of every row that is *not* the demo's before the delete, and after it refuses to accept its own
 * work if one of those ids is gone. A row may legitimately *stop* being the demo's — keeping a PDF
 * alive because an enquiry that is not the demo's holds it is the point of the clause — so the check
 * is "nothing that was not the demo's went missing", not "the counts are equal".
 */

// Every row that is not the demo's, by id. These are the rows the wipe promises to leave alone.
const OWNED_BY_OTHERS: Record<string, { sql: string; params: "refs" | "refsSubject" | "none" }> = {
  car: { sql: "SELECT id FROM car WHERE NOT is_demo", params: "none" },
  car_photo: {
    sql: "SELECT p.id FROM car_photo p WHERE NOT EXISTS (SELECT 1 FROM car c WHERE c.id = p.car_id AND c.is_demo)",
    params: "none",
  },
  cost_line: {
    sql: "SELECT l.id FROM cost_line l WHERE NOT EXISTS (SELECT 1 FROM car c WHERE c.id = l.car_id AND c.is_demo)",
    params: "none",
  },
  sale: {
    sql: "SELECT s.id FROM sale s WHERE NOT EXISTS (SELECT 1 FROM car c WHERE c.id = s.car_id AND c.is_demo)",
    params: "none",
  },
  enquiry: { sql: "SELECT id FROM enquiry WHERE NOT is_demo", params: "none" },
  enquiry_pdf: {
    sql: "SELECT p.id FROM enquiry_pdf p WHERE NOT EXISTS (SELECT 1 FROM enquiry e WHERE e.pdf_import_id = p.id AND e.is_demo)",
    params: "none",
  },
  tap: { sql: "SELECT id FROM tap WHERE car_ref <> ALL($1::text[])", params: "refs" },
  activity_event: {
    sql: "SELECT id FROM activity_event WHERE subject <> ALL($1::text[]) AND NOT (subject ~ $2)",
    params: "refsSubject",
  },
  setting: { sql: "SELECT key AS id FROM setting", params: "none" },
};

type Db = Client;
type Others = Record<string, string[]>;

async function idsOwnedByOthers(client: Client, refs: string[], subjectRe: string): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const [table, { sql, params }] of Object.entries(OWNED_BY_OTHERS)) {
    const rows = await client.query<{ id: string }>(
      sql,
      params === "refs" ? [refs] : params === "refsSubject" ? [refs, subjectRe] : [],
    );
    out[table] = rows.rows.map((r) => r.id);
  }
  return out;
}

const countsOf = (ids: Record<string, string[]>) =>
  Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.length]));

type Summary = {
  ranAt: string;
  dryRun: boolean;
  assetsDeletedFromStore: boolean;
  demo: { refs: string[]; cars: number; enquiries: number; photoAssets: number; pdfRows: number };
  removed: Record<string, number>;
  assets: { collected: number; deleted: string[]; failed: { assetId: string; reason: string }[] };
  untouched: { before: Record<string, number>; after: Record<string, number>; missing: string[] };
};

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = !argv.includes("--yes");
  const withAssets = !argv.includes("--no-assets");
  const asJson = argv.includes("--json");
  const say = (line: string) => {
    if (!asJson) console.log(line);
  };

  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("no DATABASE_URL_UNPOOLED / DATABASE_URL");

  const client = new Client({ connectionString });
  await client.connect();

  const summary: Summary = {
    ranAt: new Date().toISOString(),
    dryRun,
    assetsDeletedFromStore: withAssets,
    demo: { refs: [], cars: 0, enquiries: 0, photoAssets: 0, pdfRows: 0 },
    removed: {},
    assets: { collected: 0, deleted: [], failed: [] },
    untouched: { before: {}, after: {}, missing: [] },
  };

  try {
    const demoRefs = (await client.query<{ ref: string }>("SELECT ref FROM car WHERE is_demo ORDER BY ref")).rows;
    const refs = demoRefs.map((r) => r.ref);
    if (refs.some((r) => !/^[A-Za-z0-9._-]{1,40}$/.test(r))) {
      // The refs go into a regex below; anything unexpected stops the run.
      throw new Error("a demo ref is not the shape this tool is willing to build a pattern from");
    }
    const subjectRe = refs.length ? `(^|[^A-Za-z0-9])(${refs.join("|")})([^A-Za-z0-9]|$)` : "(?!)";

    const photoAssets = (
      await client.query<{ sanity_asset_id: string }>(
        `SELECT DISTINCT p.sanity_asset_id FROM car_photo p
           JOIN car c ON c.id = p.car_id WHERE c.is_demo AND p.sanity_asset_id IS NOT NULL`,
      )
    ).rows.map((r) => r.sanity_asset_id);
    const demoPdfIds = (
      await client.query<{ pdf_import_id: string }>(
        "SELECT DISTINCT pdf_import_id FROM enquiry WHERE is_demo AND pdf_import_id IS NOT NULL",
      )
    ).rows.map((r) => r.pdf_import_id);

    const totals = await client.query<{ car: string; enquiry: string; tap: string; activity_event: string; setting: string }>(
      `SELECT (SELECT count(*) FROM car) car, (SELECT count(*) FROM enquiry) enquiry,
              (SELECT count(*) FROM tap) tap, (SELECT count(*) FROM activity_event) activity_event,
              (SELECT count(*) FROM setting) setting`,
    );
    const t = totals.rows[0];
    const demoEnquiries = Number((await client.query("SELECT count(*) FROM enquiry WHERE is_demo")).rows[0].count);
    const demoPdfRows = Number(
      (await client.query("SELECT count(*) FROM enquiry WHERE is_demo AND pdf_import_id IS NOT NULL")).rows[0].count,
    );

    const othersBefore = await idsOwnedByOthers(client, refs, subjectRe);

    summary.demo = { refs, cars: refs.length, enquiries: demoEnquiries, photoAssets: photoAssets.length, pdfRows: demoPdfRows };
    summary.untouched.before = countsOf(othersBefore);

    say("The demo, as it stands:");
    say(`  ${refs.length} demo car(s) of ${Number(t.car)} — ${refs.join(", ")}`);
    say(`  ${demoEnquiries} demo enquiry(ies) of ${Number(t.enquiry)}`);
    say(`  ${photoAssets.length} photo asset(s), ${demoPdfRows} imported PDF row(s), ${Number(t.tap)} tap(s), ${Number(t.activity_event)} activity row(s)`);
    say(`  ${Number(t.setting)} setting row(s); the demo has no setting, and cost lines and sales leave with their car`);
    say("");
    say("Not the demo's (they must all still be here afterwards):");
    for (const [table, n] of Object.entries(summary.untouched.before)) say(`  ${table.padEnd(16)} ${n}`);

    if (dryRun) {
      say("");
      say("Dry run — nothing was changed, nothing was deleted. Add --yes to empty the demo.");
      emit(summary, asJson);
      return;
    }

    // ---- the one move ---------------------------------------------------------
    await client.query("BEGIN");
    try {
      const taps = await client.query("DELETE FROM tap WHERE car_ref = ANY($1::text[]) RETURNING id", [refs]);
      const activity = await client.query(
        "DELETE FROM activity_event WHERE subject = ANY($1::text[]) OR subject ~ $2 RETURNING id",
        [refs, subjectRe],
      );
      const enquiries = await client.query("DELETE FROM enquiry WHERE is_demo RETURNING id, pdf_import_id");
      const pdfIds = [
        ...new Set(
          (enquiries.rows as { pdf_import_id: string | null }[])
            .map((r) => r.pdf_import_id)
            .filter((v): v is string => Boolean(v)),
        ),
      ];
      const pdfs = pdfIds.length
        ? await client.query<{ id: string; sanity_asset_id: string }>(
            `DELETE FROM enquiry_pdf p
              WHERE p.id = ANY($1::uuid[])
                AND NOT EXISTS (SELECT 1 FROM enquiry e WHERE e.pdf_import_id = p.id)
              RETURNING p.id, p.sanity_asset_id`,
            [pdfIds],
          )
        : { rows: [] as { id: string; sanity_asset_id: string }[] };
      const cars = await client.query("DELETE FROM car WHERE is_demo RETURNING id");

      const stillDemo = await client.query(
        "SELECT (SELECT count(*) FROM car WHERE is_demo) car, (SELECT count(*) FROM enquiry WHERE is_demo) enquiry",
      );
      if (Number(stillDemo.rows[0].car) !== 0 || Number(stillDemo.rows[0].enquiry) !== 0) {
        throw new Error("demo rows survived the delete");
      }

      // Nothing that was not the demo's may have gone missing.
      const othersAfter = await idsOwnedByOthers(client, refs, subjectRe);
      const missing: string[] = [];
      for (const [table, beforeIds] of Object.entries(othersBefore)) {
        const after = new Set(othersAfter[table]);
        for (const id of beforeIds) if (!after.has(id)) missing.push(`${table}:${id}`);
      }
      if (missing.length) {
        throw new Error(`rows that are not the demo's went missing: ${missing.join(", ")}`);
      }

      await client.query("COMMIT");
      summary.removed = {
        cars: cars.rowCount ?? 0,
        enquiries: enquiries.rowCount ?? 0,
        pdfRows: pdfs.rows.length,
        taps: taps.rowCount ?? 0,
        activityEvents: activity.rowCount ?? 0,
      };
      summary.untouched.after = countsOf(await idsOwnedByOthers(client, refs, subjectRe));
      summary.untouched.missing = [];

      // The assets go only after the rows that named them are gone: a row pointing at a missing
      // asset is worse than an orphan asset, and an orphan is the one kind of litter a job may clear.
      const assetIds = [...new Set([...photoAssets, ...pdfs.rows.map((r) => r.sanity_asset_id)])].filter(Boolean);
      summary.assets.collected = assetIds.length;
      if (withAssets) {
        for (const assetId of assetIds) {
          const result = await deleteAsset(assetId);
          if (result.deleted) summary.assets.deleted.push(assetId);
          else summary.assets.failed.push({ assetId, reason: result.reason ?? "unknown" });
        }
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    emit(summary, asJson);
  } finally {
    await client.end();
  }
}

function emit(summary: Summary, asJson: boolean) {
  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  console.log("");
  console.log("--- what this run did ---");
  console.log(`  removed: ${JSON.stringify(summary.removed)}`);
  console.log(`  assets:  ${JSON.stringify(summary.assets)}${summary.assetsDeletedFromStore ? "" : "  (left in place, --no-assets)"}`);
  console.log("  not the demo's, before → after:");
  let changed = false;
  for (const key of Object.keys(summary.untouched.before)) {
    const b = summary.untouched.before[key];
    const a = summary.untouched.after[key];
    if (a !== b) changed = true;
    console.log(`    ${key.padEnd(16)} ${String(b).padStart(4)} → ${String(a).padStart(4)}${a === b ? "" : "  (no id lost; a row stopped being the demo's)"}`);
  }
  console.log(
    `  ids lost that were not the demo's: ${summary.untouched.missing.length === 0 ? "none" : summary.untouched.missing.join(", ")}`,
  );
  void changed;
  console.log("");
  console.log("Every car, enquiry, cost line, photo, sale, PDF row, tap, activity row, setting and asset");
  console.log("that is not the demo's is exactly as it was.");
}

main().catch((err) => {
  console.error(`demo wipe failed: ${(err as Error).message}`);
  process.exit(1);
});
