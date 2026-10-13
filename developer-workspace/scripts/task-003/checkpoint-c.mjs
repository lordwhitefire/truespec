// Checkpoint C (after Tasks 15–17) — the office and the showroom, opened on the same car.
//
// The claim under test: after the office moved onto the one car table, both surfaces are
// reading the same record, and every figure both of them show is the same figure. The
// office's own witness (scripts/reconcile.ts) is run for the figures; this adds the part it
// cannot see — the two surfaces side by side, in the browser's own output.
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/checkpoint-c.mjs
//
// Needs the dev server on :3210 (the standing rule: build :3210, reference :3211).

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const BASE = process.env.LEAK_BASE_URL ?? "http://localhost:3210";
const RUN_DIR = "developer-workspace/scripts/task-003/runs/checkpoint-c";
mkdirSync(RUN_DIR, { recursive: true });

const SECTION_LABEL = { available: "Available", "on order": "On Order", landed: "Landed" };
const SECTION_LETTER = { available: "a", "on order": "o", landed: "l" };

// The cars Checkpoint C opens: one per office state, plus the sold one.
const SAMPLE = ["TS-1001", "TS-1013", "TS-1015", "TS-1017", "TS-1019", "TS-1025"];

// The office's state labels that are NOT showroom words: the showroom speaks in sections.
const OFFICE_ONLY_WORDS = ["At port", "Cleared", "On the way"];

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

// --- 1. the office's own witness ---------------------------------------------
console.log("1. the office's witness — scripts/reconcile.ts (re-pointed, Task 16)\n");
let reconcileOk = false;
let reconcileOut = "";
try {
  reconcileOut = execFileSync(
    "node",
    ["--env-file=.env.local", "--conditions=react-server", "--import", "tsx", "scripts/reconcile.ts"],
    { encoding: "utf8" },
  );
  reconcileOk = true;
} catch (err) {
  reconcileOut = String(err.stdout ?? "") + String(err.stderr ?? "");
}
const reconcileTail = reconcileOut
  .split("\n")
  .filter((l) => /VERDICT|FAIL|✗/.test(l))
  .join("\n");
console.log(reconcileTail || "(no verdict line)");
console.log(`   exit clean: ${reconcileOk}\n`);

// --- 2. the store ------------------------------------------------------------
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const q = async (sql) => (await client.query(sql)).rows;

const ledger = await q("SELECT count(*)::int n, max(name) last FROM schema_migrations");
const officeCar = await q("SELECT to_regclass('office_car') IS NULL AS gone");
const cars = await q(`
  SELECT c.ref, c.mileage, c.doorstep_price_kobo, s.label AS state, s.section, sale.sold_at,
         sale.sale_price_kobo
    FROM car c JOIN car_state s ON s.id = c.state_id
    LEFT JOIN sale ON sale.car_id = c.id
   ORDER BY c.ref`);
const byRef = new Map(cars.map((c) => [c.ref, c]));

console.log("2. the store after Task 17\n");
console.log(`   ledger: ${ledger[0].n} migrations, last ${ledger[0].last}`);
console.log(`   office_car absent: ${officeCar[0].gone}\n`);

// --- 3. every office screen still serves -------------------------------------
const OFFICE_ROUTES = [
  "/office",
  "/office/inventory",
  "/office/car",
  "/office/car/new",
  "/office/enquiries",
  "/office/activity",
  "/office/settings",
  "/office/login",
];
console.log("3. every office screen, after its own table is gone\n");
const officeStatuses = {};
for (const route of OFFICE_ROUTES) {
  const { status } = await get(route);
  officeStatuses[route] = status;
  console.log(`   ${status === 200 ? "✓" : "✗"} ${route.padEnd(22)} ${status}`);
}
console.log();

// --- 4. the office's rows, as rendered ---------------------------------------
const { html: invHtml } = await get("/office/inventory");
const officeRows = new Map();
for (const tr of invHtml.split("</tr>")) {
  if (!tr.includes('class="carx"')) continue;
  const small = /<small>TS-(\d{4})[\s\S]{0,80}?<\/small>/.exec(tr)?.[0];
  if (!small) continue;
  const ref = `TS-${/<small>TS-(\d{4})/.exec(tr)[1]}`;
  const km = /([\d,]+) km/.exec(small)?.[1] ?? null;
  const price = /<td class="r money">₦([\d,]+)</.exec(tr)?.[1] ?? null;
  officeRows.set(ref, { km, price });
}

// --- 5. the same car on both surfaces ----------------------------------------
console.log("4. the same car, both surfaces (office row vs the showroom page)\n");
const rows = [];
let disagreements = 0;

for (const ref of SAMPLE) {
  const car = byRef.get(ref);
  const office = officeRows.get(ref) ?? {};
  const { status, html } = await get(`/car/${ref}`);
  const text = strip(html);
  const publicPrice = /Doorstep price\s*₦\s*([\d,]+)/.exec(text)?.[1] ?? null;
  const publicKm = /([\d,]+) km/.exec(text)?.[1] ?? null;
  const chipSpan = /<span class="chip st ([aol])"[^>]*>[\s\S]*?<\/span>/.exec(html);
  const publicChip = chipSpan ? { letter: chipSpan[1], label: strip(chipSpan[0]) } : null;
  const soldPage = /<title>Sold/.test(html);

  const sold = Boolean(car.sold_at);
  const naira = (kobo) => (Number(kobo) / 100).toLocaleString("en-US");
  const wantOfficePrice = sold ? naira(car.sale_price_kobo) : naira(car.doorstep_price_kobo);
  const wantLabel = SECTION_LABEL[car.section];

  const officePriceMatches = office.price === wantOfficePrice;
  const officeKmMatches = office.km !== null && office.km.replace(/,/g, "") === String(car.mileage);
  // The showroom: a listed car shows its doorstep price, its mileage and its section.
  // A sold car has left the showroom, so its page offers nothing and carries no section.
  const showroomMatches = sold
    ? soldPage && publicPrice === null && publicChip === null
    : publicPrice === naira(car.doorstep_price_kobo) &&
      publicKm !== null &&
      publicKm.replace(/,/g, "") === String(car.mileage) &&
      publicChip !== null &&
      publicChip.label === wantLabel &&
      publicChip.letter === SECTION_LETTER[car.section];

  const ok = status === 200 && officePriceMatches && officeKmMatches && showroomMatches;
  if (!ok) disagreements += 1;
  rows.push({ ref, state: car.state, section: car.section, status, publicPrice, officePrice: office.price, wantOfficePrice, publicKm, officeKm: office.km, mileage: String(car.mileage), publicChip: publicChip?.label ?? null, wantLabel, sold, ok });

  console.log(
    `   ${ok ? "✓" : "✗"} ${ref}  ${String(car.state).padEnd(11)} ` +
      `price office ₦${office.price ?? "?"} · showroom ${publicPrice ? "₦" + publicPrice : "(none — sold page)"} ` +
      `· km office ${office.km ?? "?"} / showroom ${publicKm ?? "—"} ` +
      `· section ${publicChip?.label ?? "?"} (want ${wantLabel})`,
  );
}
console.log();

// --- 6. the office's own words never reach the showroom ----------------------
console.log("5. office-only state words on the public surface\n");
const PUBLIC_ROUTES = ["/", "/inventory", ...SAMPLE.map((r) => `/car/${r}`)];
const leaks = [];
for (const route of PUBLIC_ROUTES) {
  const { html } = await get(route);
  const text = strip(html);
  for (const word of OFFICE_ONLY_WORDS) {
    if (text.includes(word)) leaks.push(`${route} carries "${word}"`);
  }
}
console.log(
  leaks.length
    ? leaks.map((l) => `   ✗ ${l}`).join("\n")
    : `   ✓ none of ${OFFICE_ONLY_WORDS.map((w) => `"${w}"`).join(", ")} appears on ${PUBLIC_ROUTES.length} public route(s)`,
);
console.log();

// --- verdict ------------------------------------------------------------------
const ok =
  reconcileOk &&
  officeCar[0].gone &&
  Object.values(officeStatuses).every((s) => s === 200) &&
  disagreements === 0 &&
  leaks.length === 0;

const evidence = {
  at: new Date().toISOString(),
  base: BASE,
  reconcile: { ok: reconcileOk, verdict: reconcileTail },
  ledger: ledger[0],
  officeCarGone: officeCar[0].gone,
  officeStatuses,
  sample: rows,
  officeWordsOnPublic: leaks,
  verdict: ok ? "PASS" : "FAIL",
};
writeFileSync(`${RUN_DIR}/checkpoint-c.json`, JSON.stringify(evidence, null, 2));
writeFileSync(`${RUN_DIR}/reconcile-output.txt`, reconcileOut);

console.log(`verdict: ${ok ? "PASS" : "FAIL"}`);
console.log(`         evidence: ${RUN_DIR}/checkpoint-c.json`);
await client.end();
process.exit(ok ? 0 : 1);
