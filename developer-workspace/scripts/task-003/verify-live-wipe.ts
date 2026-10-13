// Ask the live store whether the wipe's own report is telling the truth.
//
// The wipe reports what it did; a report is not a measurement. This reads that report and then goes to
// the two places that can contradict it — the Postgres store (via the same env the app uses) and the
// Sanity dataset (via the query API) — and prints a verdict per claim.
//
//   node --env-file=.env.local --conditions=react-server --import tsx \
//     developer-workspace/scripts/task-003/verify-live-wipe.ts /tmp/opencode/wipe-live.json
//
// Existence in Sanity is asked of the query API, never of getDocument: that method answers with a
// document for an id that never existed, so it cannot tell "gone" from "here".
import fs from "node:fs";
import { Client } from "pg";
import { sanityClient } from "../../../lib/sanity";

const reportPath = process.argv[2] ?? "/tmp/opencode/wipe-live.json";
const raw = fs.readFileSync(reportPath, "utf8");
const report = JSON.parse(raw.slice(raw.indexOf("{")));

async function main() {
  // --- the database side -------------------------------------------------------
  const db = new Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  });
  await db.connect();
  const counts: Record<string, number> = {};
  for (const table of [
    "car",
    "car_photo",
    "cost_line",
    "sale",
    "enquiry",
    "enquiry_pdf",
    "tap",
    "activity_event",
    "setting",
    "car_state",
    "enquiry_state",
    "schema_migrations",
  ]) {
    const r = await db.query<{ n: number }>(`SELECT count(*)::int n FROM ${table}`);
    counts[table] = r.rows[0].n;
  }
  const states = await db.query<{ label: string }>("SELECT label FROM car_state ORDER BY label");
  const migrations = await db.query<{ name: string }>("SELECT name FROM schema_migrations ORDER BY name");
  await db.end();

  // --- the asset side ----------------------------------------------------------
  const client = sanityClient();
  const deleted: string[] = report.assets?.deleted ?? [];
  const leftover = await client.fetch<{ _id: string }[]>("*[_id in $ids]{_id}", { ids: deleted });
  const assetsLeft = Number((await client.fetch('count(*[_type in ["sanity.imageAsset","sanity.fileAsset"]])')) ?? 0);

  // --- the verdicts ------------------------------------------------------------
  const removed = report.removed ?? {};
  const untouched = report.untouched ?? { before: {}, after: {}, missing: [] };
  const verdicts = [
    { what: "the run removed the demo's cars", pass: removed.cars === 17, saw: removed.cars },
    { what: "…its cost lines, with the cars (cascade)", pass: counts.cost_line === 0, saw: `cost_line now ${counts.cost_line}` },
    { what: "…its photos, with the cars (cascade)", pass: counts.car_photo === 0, saw: `car_photo now ${counts.car_photo}` },
    { what: "…its sale, with the car (cascade)", pass: counts.sale === 0, saw: `sale now ${counts.sale}` },
    { what: "…its enquiries", pass: removed.enquiries === 6, saw: removed.enquiries },
    { what: "…its imported PDF row", pass: counts.enquiry_pdf === 0, saw: `enquiry_pdf now ${counts.enquiry_pdf}` },
    { what: "…its taps and activity rows", pass: counts.tap === 0 && counts.activity_event === 0, saw: `${counts.tap} taps, ${counts.activity_event} activity` },
    { what: "no asset delete failed", pass: (report.assets?.failed ?? []).length === 0, saw: `${(report.assets?.deleted ?? []).length} deleted, ${(report.assets?.failed ?? []).length} failed` },
    { what: "every asset the run deleted is gone from the store", pass: leftover.length === 0, saw: leftover.length === 0 ? "none of the 50 remain" : leftover.map((r) => r._id).join(", ") },
    { what: "no assets are left in the dataset at all", pass: assetsLeft === 0, saw: assetsLeft },
    { what: "nothing that was not the demo's went missing", pass: untouched.missing.length === 0, saw: `${untouched.missing.length} ids missing` },
    { what: "every table the demo lived in is empty", pass: counts.car === 0 && counts.enquiry === 0 && counts.cost_line === 0 && counts.car_photo === 0 && counts.sale === 0, saw: JSON.stringify({ car: counts.car, enquiry: counts.enquiry, cost_line: counts.cost_line, car_photo: counts.car_photo, sale: counts.sale }) },
    { what: "the five car states are untouched", pass: counts.car_state === 5, saw: `${counts.car_state}: ${states.rows.map((r) => r.label).join(", ")}` },
    { what: "the enquiry states are untouched", pass: counts.enquiry_state === 5, saw: counts.enquiry_state },
    { what: "the settings are untouched", pass: counts.setting === 3, saw: counts.setting },
    { what: "the ledger still reads 0001…0015", pass: counts.schema_migrations === 15, saw: `${counts.schema_migrations}: ${migrations.rows[0]?.name} … ${migrations.rows[migrations.rows.length - 1]?.name}` },
  ];

  console.log(`the wipe's report: ${reportPath}\n`);
  for (const v of verdicts) console.log(`  ${v.pass ? "PASS" : "FAIL"}  ${v.what} — ${v.saw}`);
  const ok = verdicts.every((v) => v.pass);
  console.log(`\n${ok ? "PASS" : "FAIL"} — ${verdicts.filter((v) => v.pass).length}/${verdicts.length} verdicts`);

  const out = {
    checkedAt: new Date().toISOString(),
    reportPath,
    ranAt: report.ranAt,
    verdicts,
    store: { counts, carStates: states.rows.map((r) => r.label), ledger: `${migrations.rows[0]?.name} … ${migrations.rows[migrations.rows.length - 1]?.name}` },
    assetVerification: { assetsTheRunDeleted: deleted.length, stillPresent: leftover.map((r) => r._id), assetsLeftInDataset: assetsLeft, askedVia: "the query API" },
  };
  const dir = "developer-workspace/scripts/task-003/runs/task-24";
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${dir}/live-wipe.json`, JSON.stringify({ ...out, wipeReport: report }, null, 2));
  console.log(`\nwrote ${dir}/live-wipe.json`);
  process.exitCode = ok ? 0 : 1;
}

main().catch((err) => {
  console.error("verification failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
