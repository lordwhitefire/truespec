// TASK-003 Task 20 — the rebuild-from-nothing run (task.md benchmark 6).
//
// "…the database is dropped and rebuilt from the migrations and the seed, every screen shows the
//  same numbers as before the rebuild."
//
// This runs the drop on the LIVE store (owner's ruling, 2026-10-13), because that is also the move
// that clears the two named interims: the 8 leftover TASK-002 cars and their 24 third-party address
// rows. The owner was told exactly that before it ran, and the whole pre-rebuild store is dumped to
// JSON first (runs/task-20/before-dump.json) so nothing is unrecoverable.
//
// What has to hold (and is checked, not assumed):
//   · every one of the 17 fleet cars shows the same state, price, cost and profit after as before;
//   · the only records that disappear are the 8 leftovers and their 24 address rows — nothing else
//     moves (enquiries, the sale, the PDF, the ledger all identical);
//   · the dropped refs are exactly the cars that held address rows, no others;
//   · reconcile.ts (rendered office vs the shared rules over the store) is green afterwards;
//   · the seed run a second time changes nothing (benchmark 7).
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/checkpoint-d.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const BASE = process.env.LEAK_BASE_URL ?? "http://localhost:3210";
const RUN_DIR = "developer-workspace/scripts/task-003/runs/task-20";
mkdirSync(RUN_DIR, { recursive: true });

const strip = (h) =>
  h
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const get = async (path) => {
  const res = await fetch(BASE + path, { signal: AbortSignal.timeout(30000) });
  return { status: res.status, html: await res.text() };
};

/** The office's inventory rows, as the owner sees them: state, km, price, cost, profit per ref. */
async function officeRows() {
  const { html } = await get("/office/inventory");
  const map = new Map();
  for (const tr of html.split("</tr>")) {
    if (!tr.includes('class="carx"')) continue;
    const refNo = /<small>TS-(\d{4})/.exec(tr)?.[1];
    if (!refNo) continue;
    const state = /<span class="st [a-z]+"><i><\/i>([^<]+)<\/span>/.exec(tr)?.[1];
    const small = /<small>TS-\d{4}[\s\S]{0,80}?<\/small>/.exec(tr)?.[0] ?? "";
    const cells = [...tr.matchAll(/<td class="r[^"]*">([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    const amount = (cell) => {
      if (cell === undefined) return null;
      if (cell.includes("Costs incomplete")) return "incomplete";
      return /₦([\d,]+)/.exec(cell)?.[1] ?? null;
    };
    map.set(`TS-${refNo}`, {
      state,
      km: /([\d,]+) km/.exec(small)?.[1] ?? null,
      price: amount(cells[0]),
      cost: amount(cells[1]),
      profit: amount(cells[2]),
    });
  }
  return map;
}

/** The showroom page for one car: what it asks, and what section it claims. */
async function showroomCar(ref) {
  const { status, html } = await get(`/car/${ref}`);
  const text = strip(html);
  return {
    status,
    soldPage: /<title>Sold/.test(html),
    doorstepPrice: /Doorstep price\s*₦\s*([\d,]+)/.exec(text)?.[1] ?? null,
    chip: strip(/<span class="chip st [aol]"[^>]*>[\s\S]*?<\/span>/.exec(html)?.[0] ?? "") || null,
    km: /([\d,]+) km/.exec(text)?.[1] ?? null,
  };
}

async function storeFacts(client) {
  const one = async (sql) => (await client.query(sql)).rows[0];
  const facts = await one(`SELECT
     (SELECT count(*)::int FROM car) cars,
     (SELECT count(*)::int FROM car WHERE is_demo) demo_cars,
     (SELECT count(*)::int FROM car WHERE deleted_at IS NOT NULL) tombstones,
     (SELECT count(*)::int FROM cost_line) cost_lines,
     (SELECT count(*)::int FROM car_photo) photos,
     (SELECT count(*)::int FROM car_photo WHERE sanity_asset_id ~* '^https?://') address_photos,
     (SELECT count(*)::int FROM car_photo WHERE sanity_asset_id !~* '^https?://') asset_photos,
     (SELECT count(*)::int FROM enquiry) enquiries,
     (SELECT count(*)::int FROM enquiry_pdf) pdfs,
     (SELECT count(*)::int FROM sale) sales,
     (SELECT count(*)::int FROM tap) taps,
     (SELECT to_regclass('office_car') IS NULL) office_car_gone`);
  const states = (await client.query(
    `SELECT s.label, count(*)::int n FROM car c JOIN car_state s ON s.id = c.state_id
      GROUP BY s.label ORDER BY s.label`,
  )).rows;
  const ledger = await one(
    `SELECT count(*)::int n, max(name) last FROM schema_migrations`,
  ).catch(() => ({ n: 0, last: null }));
  const tables = (await client.query(
    `SELECT count(*)::int n FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  )).rows[0].n;
  return { ...facts, tables, states, ledger };
}

async function reconcile() {
  try {
    const out = execFileSync(
      "node",
      ["--env-file=.env.local", "--conditions=react-server", "--import", "tsx", "scripts/reconcile.ts"],
      { encoding: "utf8" },
    );
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
  }
}

async function npmRun(script) {
  try {
    const out = execFileSync("npm", ["run", script], { encoding: "utf8" });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: String(err.stdout ?? "") + String(err.stderr ?? "") };
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// ---------------------------------------------------------------- 1. before
console.log("1. before the rebuild\n");
const beforeFacts = await storeFacts(client);
const beforeRows = await officeRows();
const beforeReconcile = await reconcile();
console.log(`   store: ${beforeFacts.cars} cars (${beforeFacts.demo_cars} demo) · ` +
  `${beforeFacts.cost_lines} cost lines · ${beforeFacts.photos} photos ` +
  `(${beforeFacts.asset_photos} asset, ${beforeFacts.address_photos} address) · ` +
  `${beforeFacts.enquiries} enquiries · ${beforeFacts.sales} sale(s) · ledger ${beforeFacts.ledger.n}`);
console.log(`   office rows rendered: ${beforeRows.size} · reconcile ${beforeReconcile.ok ? "green" : "RED"}`);

const refs = [...beforeRows.keys()];
// The cars that held a third-party address — read before the drop, because the drop is what removes
// them. The rebuild's claim is that these cars, and only these, leave.
const addressRefsBefore = [...new Set(
  (await client.query(
    `SELECT DISTINCT c.ref FROM car_photo cp JOIN car c ON c.id = cp.car_id
      WHERE cp.sanity_asset_id ~* '^https?://' ORDER BY c.ref`,
  )).rows.map((r) => r.ref),
)];
// The showroom sample comes from the approved fleet list, never from whatever happens to be in the
// store — a car that is meant to leave must not be mistaken for a car whose figures changed.
const sample = ["TS-1001", "TS-1013", "TS-1019", "TS-1025"];
const beforeShowroom = Object.fromEntries(await Promise.all(sample.map(async (r) => [r, await showroomCar(r)])));
console.log(`   showroom sample (approved fleet list): ${sample.join(", ")}`);
console.log(`   cars holding a third-party address before: ${addressRefsBefore.length} — ${addressRefsBefore.join(" ")}`);

// ------------------------------------------------------------ 2. the safety dump
const tables = (await client.query(
  `SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
)).rows.map((r) => r.table_name);
const dump = {};
for (const t of tables) dump[t] = (await client.query(`SELECT * FROM ${t}`)).rows;
writeFileSync(`${RUN_DIR}/before-dump.json`, JSON.stringify({ at: new Date().toISOString(), tables: dump }, null, 2));
console.log(`\n2. dumped ${tables.length} table(s) to ${RUN_DIR}/before-dump.json`);

// ------------------------------------------------------------------ 3. the drop
console.log("\n3. dropping the schema (owner's ruling: rebuild the live store)\n");
await client.query("DROP SCHEMA public CASCADE");
await client.query("CREATE SCHEMA public");
const afterDrop = await client.query(
  `SELECT count(*)::int n FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
);
const droppedTables = afterDrop.rows[0].n;
console.log(`   tables left in public: ${droppedTables}`);

// ----------------------------------------------------------------- 4. migrate
console.log("\n4. rebuilding from the migrations\n");
const migrate = await npmRun("db:migrate");
writeFileSync(`${RUN_DIR}/migrate.log`, migrate.out);
const applied = (migrate.out.match(/applying (\S+)/g) ?? []).length;
console.log(`   ${migrate.ok ? "applied" : "FAILED"} — ${applied} migration(s) from an empty schema`);
const ledgerAfter = await client.query(`SELECT max(name) last, count(*)::int n FROM schema_migrations`);
console.log(`   ledger: ${ledgerAfter.rows[0].n} — last ${ledgerAfter.rows[0].last}`);

// -------------------------------------------------------------------- 5. seed
console.log("\n5. authoring the demonstration\n");
const seed = await npmRun("db:seed");
writeFileSync(`${RUN_DIR}/seed.log`, seed.out);
console.log(seed.out.split("\n").filter((l) => /seed|fleet|car|cost|photo|enquir|sale|pdf|marked/i.test(l)).slice(0, 14).map((l) => "   " + l.trim()).join("\n"));

// ------------------------------------------------------------------- 6. after
console.log("\n6. after the rebuild\n");
const afterFacts = await storeFacts(client);
const afterRows = await officeRows();
const afterReconcile = await reconcile();
writeFileSync(`${RUN_DIR}/reconcile-before.txt`, beforeReconcile.out);
writeFileSync(`${RUN_DIR}/reconcile-after.txt`, afterReconcile.out);
console.log(`   store: ${afterFacts.cars} cars (${afterFacts.demo_cars} demo) · ` +
  `${afterFacts.cost_lines} cost lines · ${afterFacts.photos} photos ` +
  `(${afterFacts.asset_photos} asset, ${afterFacts.address_photos} address) · ` +
  `${afterFacts.enquiries} enquiries · ${afterFacts.sales} sale(s) · ledger ${afterFacts.ledger.n}`);
console.log(`   office rows rendered: ${afterRows.size} · reconcile ${afterReconcile.ok ? "green" : "RED"}`);
const afterShowroom = Object.fromEntries(await Promise.all(sample.map(async (r) => [r, await showroomCar(r)])));

// --------------------------------------------------- 7. the seed, run a second time
console.log("\n7. the seed a second time (benchmark 7)\n");
const seed2 = await npmRun("db:seed");
writeFileSync(`${RUN_DIR}/seed-second-run.log`, seed2.out);
const twiceFacts = await storeFacts(client);
console.log(`   ${seed2.ok ? "ran" : "FAILED"} — store after: ${twiceFacts.cars} cars · ` +
  `${twiceFacts.cost_lines} cost lines · ${twiceFacts.photos} photos · ${twiceFacts.enquiries} enquiries`);

// ------------------------------------------------------------------ 8. compare
console.log("\n8. the comparison\n");

const fleetRefs = [...afterRows.keys()].sort();
const goneRefs = refs.filter((r) => !afterRows.has(r)).sort();
const addressRefs = addressRefsBefore;
const addressRowsLeft = (await client.query(
  `SELECT count(*)::int n FROM car_photo WHERE sanity_asset_id ~* '^https?://'`,
)).rows[0].n;

const rowDiffs = [];
for (const ref of fleetRefs) {
  const b = beforeRows.get(ref);
  const a = afterRows.get(ref);
  if (!b) { rowDiffs.push(`${ref}: missing before`); continue; }
  for (const k of ["state", "km", "price", "cost", "profit"]) {
    if (b[k] !== a[k]) rowDiffs.push(`${ref}.${k}: ${b[k]} → ${a[k]}`);
  }
}
const showroomDiffs = [];
for (const ref of sample) {
  const b = beforeShowroom[ref];
  const a = afterShowroom[ref];
  for (const k of ["status", "soldPage", "doorstepPrice", "chip", "km"]) {
    if (b[k] !== a[k]) showroomDiffs.push(`${ref}.${k}: ${b[k]} → ${a[k]}`);
  }
}

const twice = {
  cars: twiceFacts.cars === afterFacts.cars,
  cost_lines: twiceFacts.cost_lines === afterFacts.cost_lines,
  photos: twiceFacts.photos === afterFacts.photos,
  enquiries: twiceFacts.enquiries === afterFacts.enquiries,
  sales: twiceFacts.sales === afterFacts.sales,
};

const expectedDrops = {
  cars: beforeFacts.cars - afterFacts.cars,
  photos: beforeFacts.photos - afterFacts.photos,
  address_photos: beforeFacts.address_photos - afterFacts.address_photos,
  cost_lines: beforeFacts.cost_lines - afterFacts.cost_lines,
};
const wantStates = { Available: 8, "On the way": 3, "At port": 2, Cleared: 1, Landed: 3 };
const statesAsAuthored =
  afterFacts.states.length === 5 &&
  afterFacts.states.every((s) => wantStates[s.label] === s.n) &&
  afterFacts.states.reduce((t, s) => t + s.n, 0) === 17;

const dropsAsPredicted =
  expectedDrops.cars === 8 &&
  expectedDrops.address_photos === 24 &&
  expectedDrops.photos === 24 &&
  afterFacts.address_photos === 0 &&
  afterFacts.cost_lines === 99 &&
  afterFacts.enquiries === beforeFacts.enquiries &&
  afterFacts.sales === beforeFacts.sales &&
  afterFacts.pdfs === beforeFacts.pdfs &&
  afterFacts.office_car_gone === true;

const goneAreTheAddressCars =
  goneRefs.length === 8 && JSON.stringify(goneRefs) === JSON.stringify(addressRefs);

console.log(`   fleet cars compared: ${fleetRefs.length} · differing figures: ${rowDiffs.length}`);
for (const d of rowDiffs) console.log(`      ✗ ${d}`);
console.log(`   showroom sample compared: ${sample.length} · differing: ${showroomDiffs.length}`);
for (const d of showroomDiffs) console.log(`      ✗ ${d}`);
console.log(`   refs that left: ${goneRefs.join(" ")}`);
console.log(`   refs that held address rows: ${addressRefs.join(" ")}`);
console.log(`   gone refs are exactly the address-holding refs: ${goneAreTheAddressCars}`);
console.log(`   address rows left in car_photo: ${addressRowsLeft}`);
console.log(`   drops as predicted — cars ${expectedDrops.cars}, photos ${expectedDrops.photos}, ` +
  `address rows ${expectedDrops.address_photos}, cost lines ${expectedDrops.cost_lines}: ${dropsAsPredicted}`);
console.log(`   the fleet's authored states (${afterFacts.states.map((s) => `${s.label} ${s.n}`).join(", ")}): ${statesAsAuthored}`);
console.log(`   the second seed run changed nothing: ${Object.values(twice).every(Boolean)} (${JSON.stringify(twice)})`);

const ok =
  droppedTables === 0 &&
  migrate.ok && applied === 15 &&
  seed.ok && seed2.ok &&
  afterReconcile.ok &&
  rowDiffs.length === 0 &&
  showroomDiffs.length === 0 &&
  goneAreTheAddressCars &&
  addressRowsLeft === 0 &&
  dropsAsPredicted &&
  statesAsAuthored &&
  Object.values(twice).every(Boolean);

writeFileSync(
  `${RUN_DIR}/checkpoint-d.json`,
  JSON.stringify(
    {
      at: new Date().toISOString(),
      before: { facts: beforeFacts, officeRows: beforeRows.size },
      after: { facts: afterFacts, officeRows: afterRows.size },
      twice: twiceFacts,
      applied,
      goneRefs,
      addressRefs,
      rowDiffs,
      showroomDiffs,
      twiceStable: twice,
      verdict: ok ? "PASS" : "FAIL",
    },
    null,
    2,
  ),
);

console.log(`\nverdict: ${ok ? "PASS" : "FAIL"}`);
console.log(`         evidence: ${RUN_DIR}/`);
await client.end();
process.exit(ok ? 0 : 1);
