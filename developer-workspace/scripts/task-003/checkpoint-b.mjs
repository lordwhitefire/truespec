// Checkpoint B — rebuild from nothing, then seed twice, and compare the figures.
//
// A fresh database takes the whole chain (0001…0014) and then the demo seed, twice.
// "Twice" is the point: the second run must move nothing. The figures it produces
// are then compared with the live store's fleet, which was seeded onto the
// corrective chain — the two paths must agree.
//
// Creates and drops its own scratch database; the live store is only read.
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/checkpoint-b.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const DB = "truespec_scratch_003b";
const RUN_DIR = "developer-workspace/scripts/task-003/runs/checkpoint-b";
mkdirSync(RUN_DIR, { recursive: true });

// The approved fleet (plans/TASK-003-demo-fleet.md) — the 17 cars the seed writes.
// Fleet measures are scoped by these refs, not by `is_demo`: on the live store the
// 8 cars an earlier seed wrote are marked `is_demo` as well (they are demonstration
// rows too), so `is_demo` would fold them into "the fleet".
const FLEET_REFS = [
  "TS-1001", "TS-1003", "TS-1005", "TS-1007", "TS-1008", "TS-1011", "TS-1012",
  "TS-1013", "TS-1014", "TS-1015", "TS-1016", "TS-1017", "TS-1018",
  "TS-1019", "TS-1020", "TS-1023", "TS-1025",
];
const R = `'{${FLEET_REFS.join(",")}}'`;

const baseUrl = new URL(process.env.DATABASE_URL);
const scratchUrl = new URL(baseUrl);
scratchUrl.pathname = `/${DB}`;

const log = [];
const say = (line) => {
  console.log(line);
  log.push(line);
};

// --- create the scratch database ---------------------------------------------

const admin = new Client({ connectionString: baseUrl.toString() });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${DB}`);
await admin.end();
say(`created ${DB}`);

// Both variables, or the seed would fall through to the live unpooled URL.
const env = { ...process.env, DATABASE_URL: scratchUrl.toString(), DATABASE_URL_UNPOOLED: scratchUrl.toString() };
const run = (command, args, label) => {
  const out = execFileSync(command, args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  say(`\n--- ${label} ---\n${out.trim()}`);
  return out;
};

const counts = async (url) => {
  const c = new Client({ connectionString: url });
  await c.connect();
  const q = async (sql) => (await c.query(sql)).rows[0];
  const row = {
    migrations: (await q("SELECT count(*)::int n FROM schema_migrations")).n,
    // Whole store (the live one still holds the 8 earlier cars and their photos).
    cars: (await q("SELECT count(*)::int n FROM car")).n,
    demoCars: (await q("SELECT count(*)::int n FROM car WHERE is_demo")).n,
    demoCarsOutsideFleet: (await q(`SELECT count(*)::int n FROM car WHERE is_demo AND ref <> ALL(${R})`)).n,
    costLines: (await q("SELECT count(*)::int n FROM cost_line")).n,
    photos: (await q("SELECT count(*)::int n FROM car_photo")).n,
    // The fleet itself, which must be the same on both paths (scoped by ref).
    fleetCars: (await q(`SELECT count(*)::int n FROM car WHERE ref = ANY(${R})`)).n,
    fleetCostLines: (
      await q(`SELECT count(*)::int n FROM cost_line cl JOIN car c ON c.id = cl.car_id WHERE c.ref = ANY(${R})`)
    ).n,
    fleetCostLinesWithoutKind: (
      await q(`SELECT count(*)::int n FROM cost_line cl JOIN car c ON c.id = cl.car_id WHERE c.ref = ANY(${R}) AND cl.kind IS NULL`)
    ).n,
    fleetPhotosWithAssetId: (
      await q(`SELECT count(*)::int n FROM car_photo p JOIN car c ON c.id = p.car_id WHERE c.ref = ANY(${R}) AND p.sanity_asset_id ~ '^image-'`)
    ).n,
    fleetPhotosWithOrigin: (
      await q(`SELECT count(*)::int n FROM car_photo p JOIN car c ON c.id = p.car_id WHERE c.ref = ANY(${R}) AND p.origin LIKE 'unsplash:%'`)
    ).n,
    fleetPhotosWithoutOutsideAddress: (
      await q(`SELECT count(*)::int n FROM car_photo p JOIN car c ON c.id = p.car_id WHERE c.ref = ANY(${R}) AND p.sanity_asset_id !~ '^https?://'`)
    ).n,
    fleetIncompleteCostCars: (
      await q(
        `SELECT count(*)::int n FROM (SELECT c.id FROM car c LEFT JOIN cost_line cl ON cl.car_id = c.id
           WHERE c.ref = ANY(${R}) GROUP BY c.id HAVING count(cl.*) < 6) x`,
      )
    ).n,
    fleetStatesUsed: (await q(`SELECT count(DISTINCT state_id)::int n FROM car WHERE ref = ANY(${R})`)).n,
    fleetMileage0NotLanded: (
      await q(`SELECT count(*)::int n FROM car c JOIN car_state s ON s.id = c.state_id WHERE c.ref = ANY(${R}) AND s.label <> 'Landed' AND c.mileage = 0`)
    ).n,
    enquiries: (await q("SELECT count(*)::int n FROM enquiry")).n,
    demoEnquiries: (await q("SELECT count(*)::int n FROM enquiry WHERE is_demo")).n,
    sales: (await q("SELECT count(*)::int n FROM sale")).n,
    pdfs: (await q("SELECT count(*)::int n FROM enquiry_pdf")).n,
  };
  await c.end();
  return row;
};

try {
  run("npm", ["run", "db:migrate"], "migrate the whole chain on a fresh database");
  run("npm", ["run", "db:seed"], "seed run 1");
  const after1 = await counts(scratchUrl.toString());
  run("npm", ["run", "db:seed"], "seed run 2");
  const after2 = await counts(scratchUrl.toString());
  const live = await counts(process.env.DATABASE_URL);

  say("\n--- counts ---");
  const keys = Object.keys(after1);
  say(`| measure | rebuild+seed 1 | rebuild+seed 2 | live store |`);
  say(`|---|---|---|---|`);
  for (const k of keys) say(`| ${k} | ${after1[k]} | ${after2[k]} | ${live[k]} |`);

  const seedMoved = JSON.stringify(after1) === JSON.stringify(after2);
  const fleetFields = [
    "fleetCars",
    "fleetCostLines",
    "fleetCostLinesWithoutKind",
    "fleetPhotosWithAssetId",
    "fleetPhotosWithOrigin",
    "fleetPhotosWithoutOutsideAddress",
    "fleetIncompleteCostCars",
    "fleetStatesUsed",
    "fleetMileage0NotLanded",
    "demoEnquiries",
    "sales",
    "pdfs",
  ];
  const disagree = fleetFields.filter((k) => after1[k] !== live[k]);
  const agrees = disagree.length === 0;
  say(`\nsecond seed moved nothing: ${seedMoved}`);
  say(`rebuilt fleet agrees with the live store's fleet on every fleet measure: ${agrees}`);
  if (!agrees) say(`  measures that differ: ${disagree.join(", ")}`);
  say(`(whole-store counts differ only by the 8 earlier cars and their 24 photos, which the live store still holds until the rebuild)`);

  writeFileSync(`${RUN_DIR}/counts.json`, JSON.stringify({ after1, after2, live, seedMoved, agrees }, null, 2));
  writeFileSync(`${RUN_DIR}/run.log`, log.join("\n"));
} finally {
  const drop = new Client({ connectionString: baseUrl.toString() });
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await drop.end();
  console.log(`\ndropped ${DB}`);
}
