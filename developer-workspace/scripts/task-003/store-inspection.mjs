// Task 22 — the store, inspected (task.md benchmarks 3 and 7).
//
//   (3) the store is inspected for a rate or a currency, nothing is found — no column, no setting
//       key, no seed value, no constraint that mentions one.
//   (7) the seed is run twice, nothing duplicates and no figure changes.
//
// Two parts, one witness:
//
//   Part A — the live store, read-only. Every column name and type; every constraint's own text;
//            the setting keys; and the *values* of every text column in the store (so "no seed
//            value mentions a currency" is a measurement, not a glance at the seed file).
//   Part B — a scratch store. The chain, a seed, a fingerprint of all 15 tables, the seed again,
//            the fingerprints compared. "Nothing moved" then covers every table, not just the fleet.
//
// Run:  node --env-file=.env.local developer-workspace/scripts/task-003/store-inspection.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const DB = "truespec_scratch_003e";
const PROJECT = process.cwd();
const WORK = "/tmp/opencode/mig-003e";
const RUNS = join(PROJECT, "developer-workspace/scripts/task-003/runs/task-22");

// A rate or a currency, in any of the words the store could name one with. `\y` is a word
// boundary, so "separate" is not "rate".
const MONEY_WORDS =
  String.raw`\y(rate|rates|currency|currencies|usd|ngn|naira|dollar|dollars|exchange|forex|fx)\y`;

const FLOATING = new Set(["real", "double precision", "numeric"]);

// Every column that could hold money, and what each one is. A money column that is not written
// down here fails the inspection, so a new one has to be stated out loud before it can exist.
const MONEY_COLUMNS = {
  "car.was_price_kobo": "a price a human typed (kobo) — NULL means no Special ribbon",
  "car.doorstep_price_kobo": "a price a human typed (kobo) — NULL means the car is an office-only draft",
  "cost_line.amount_minor": "one cost line's amount (minor units) — NULL means not entered, 0 is a real zero",
  "sale.sale_price_kobo": "the price the car actually sold for (kobo)",
};
// Not money, despite the name: the row count of an imported document.
const NOT_MONEY = { "enquiry_pdf.rows_total": "the imported document's own row count (int)" };

mkdirSync(RUNS, { recursive: true });
const findings = { ranAt: new Date().toISOString(), partA: {}, partB: {}, checks: [] };
const check = (ok, name, detail) => {
  findings.checks.push({ ok, name, detail });
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  return ok;
};

// ============================ Part A — the live store ========================
console.log("Part A — the live store, read-only\n");
const live = new Client({ connectionString: process.env.DATABASE_URL });
await live.connect();

const columns = (
  await live.query(
    `SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
       FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`,
  )
).rows;

const tables = (
  await live.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  )
).rows.map((r) => r.table_name);

console.log(`  ${tables.length} tables, ${columns.length} columns read`);
findings.partA.tables = tables;

// 1. no floating point, and no fractional fixed point, anywhere.
const floating = columns.filter((c) => FLOATING.has(c.data_type));
const fractional = columns.filter((c) => c.numeric_scale !== null && Number(c.numeric_scale) > 0);
const types = {};
for (const c of columns) {
  const key = c.data_type + (c.numeric_scale !== null ? `(${c.numeric_precision},${c.numeric_scale})` : "");
  types[key] = (types[key] ?? 0) + 1;
}
findings.partA.types = types;
check(
  floating.length === 0 && fractional.length === 0,
  "no floating-point and no fractional column exists — money is whole minor units",
  Object.entries(types).map(([t, n]) => `${n}× ${t}`).join(" · "),
);

// 2. a rate or a currency in any name, any constraint, any setting key.
const constraints = (
  await live.query(
    `SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY conname`,
  )
).rows;
const namedHits = [
  ...columns
    .filter((c) => new RegExp(MONEY_WORDS, "i").test(c.column_name) || new RegExp(MONEY_WORDS, "i").test(c.table_name))
    .map((c) => `${c.table_name}.${c.column_name}`),
  ...constraints.filter((c) => new RegExp(MONEY_WORDS, "i").test(c.def)).map((c) => `constraint ${c.conname}: ${c.def}`),
];
findings.partA.constraintsRead = constraints.length;
check(
  namedHits.length === 0,
  "no column, table or constraint names a rate or a currency",
  `${constraints.length} constraints read${namedHits.length ? ` · found ${namedHits.join(", ")}` : ""}`,
);

// 3. a rate or a currency in any *value* — every text column of every table.
const textColumns = columns.filter((c) => c.data_type === "text" || c.data_type.startsWith("character"));
const valueHits = [];
for (const c of textColumns) {
  const n = (
    await live.query(
      `SELECT count(*)::int AS n FROM "${c.table_name}" WHERE "${c.column_name}" ~* $1`,
      [MONEY_WORDS],
    )
  ).rows[0].n;
  if (n > 0) valueHits.push(`${c.table_name}.${c.column_name}: ${n} row(s)`);
}
findings.partA.textColumnsScanned = textColumns.length;
check(
  valueHits.length === 0,
  "no stored value in any text column names a rate or a currency",
  `${textColumns.length} text columns scanned over every row${valueHits.length ? ` · found ${valueHits.join(", ")}` : ""}`,
);

// 4. every money-holding column is written down, whole-numbered, and not a stored total.
const moneyish = columns.filter((c) =>
  /kobo|amount|price|cost|profit|margin|total|subtotal|balance/i.test(c.column_name),
);
const unexplained = [];
for (const c of moneyish) {
  const key = `${c.table_name}.${c.column_name}`;
  if (key in MONEY_COLUMNS) {
    if (!["bigint", "integer", "smallint"].includes(c.data_type)) unexplained.push(`${key} is ${c.data_type}`);
    continue;
  }
  if (key in NOT_MONEY) continue;
  unexplained.push(`${key} — not written down`);
}
findings.partA.moneyColumns = moneyish.map(
  (c) => `${c.table_name}.${c.column_name} (${c.data_type}) — ${MONEY_COLUMNS[`${c.table_name}.${c.column_name}`] ?? NOT_MONEY[`${c.table_name}.${c.column_name}`] ?? "UNEXPLAINED"}`,
);
check(
  unexplained.length === 0,
  "every money-holding column is whole-numbered and is not a computed total",
  moneyish.map((c) => `${c.table_name}.${c.column_name}(${c.data_type})`).join(" · ") +
    (unexplained.length ? ` · unexplained: ${unexplained.join("; ")}` : ""),
);

// 5. the setting keys, named.
const settings = (await live.query(`SELECT key, value FROM setting ORDER BY key`)).rows;
findings.partA.settings = settings;
const settingKeys = settings.map((s) => `${s.key}=${JSON.stringify(s.value)}`);
check(
  !settings.some((s) => new RegExp(MONEY_WORDS, "i").test(s.key)),
  "the setting keys hold no rate and no currency",
  `${settings.length} keys: ${settingKeys.join(" · ")}`,
);

await live.end();

// ===================== Part B — the seed, run twice ==========================
console.log("\nPart B — a scratch store, seeded twice\n");

const base = new URL(process.env.DATABASE_URL);
const scratchUrl = new URL(base);
scratchUrl.pathname = `/${DB}`;
const scratch = scratchUrl.toString();
const admin = new Client({ connectionString: base.toString() });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${DB}`);
console.log(`  scratch database: ${DB}`);

rmSync(WORK, { recursive: true, force: true });
mkdirSync(join(WORK, "migrations"), { recursive: true });
for (const file of readdirSync(join(PROJECT, "migrations")).sort()) {
  if (file.endsWith(".sql")) symlinkSync(join(PROJECT, "migrations", file), join(WORK, "migrations", file));
}
if (!existsSync(join(WORK, ".env.local"))) symlinkSync(join(PROJECT, ".env.local"), join(WORK, ".env.local"));
symlinkSync(join(PROJECT, "node_modules"), join(WORK, "node_modules"));

execFileSync("node", ["--import", "tsx", join(PROJECT, "scripts/migrate.ts")], {
  cwd: WORK,
  env: { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch },
  stdio: ["ignore", "inherit", "inherit"],
});

const scratchEnv = { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch };
const seed = () =>
  execFileSync("node", ["--import", "tsx", join(PROJECT, "scripts/seed.ts")], {
    cwd: PROJECT,
    env: scratchEnv,
    stdio: ["ignore", "inherit", "inherit"],
  });

const c = new Client({ connectionString: scratch });
await c.connect();

// Columns that carry identity or a stamp rather than a figure. The seed recreates some child rows,
// which changes their ids and re-stamps them — that is measured and reported separately, and must
// not be allowed to hide whether a *figure* moved.
const identityOrStamp = (col) => col === "id" || col.endsWith("_at") || col === "pdf_import_id";

// A fingerprint of every table: its row count, a hash of its rows as text, a hash of its figure
// columns alone, and a hash of each column on its own. The last one says *what* moved when a row
// hash differs — a re-stamped timestamp reads very differently from a row written again from
// scratch.
async function fingerprint() {
  const out = {};
  for (const table of tables) {
    const cols = columns.filter((c) => c.table_name === table).map((c) => c.column_name);
    const figureCols = cols.filter((col) => !identityOrStamp(col));
    const rowHash = async (list) =>
      (
        await c.query(
          `SELECT md5(string_agg(x.r, chr(10) ORDER BY x.r)) AS h
             FROM (SELECT ${list.map((col) => `COALESCE("${col}"::text, '∅')`).join(" || '|' || ")} AS r FROM "${table}") x`,
        )
      ).rows[0].h;
    const byColumn = {};
    for (const col of cols) {
      byColumn[col] = (
        await c.query(
          `SELECT md5(string_agg(COALESCE(v, '∅'), chr(10) ORDER BY COALESCE(v, '∅'))) AS h
             FROM (SELECT COALESCE("${col}"::text, '∅') AS v FROM "${table}") y`,
        )
      ).rows[0].h;
    }
    const n = (await c.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n;
    out[table] = {
      rows: n,
      hash: await rowHash(cols),
      figuresHash: figureCols.length ? await rowHash(figureCols) : "no figures",
      figureColumns: figureCols,
      byColumn,
    };
  }
  return out;
}

function columnsThatMoved(before, after) {
  const cols = Object.keys(before.byColumn);
  return cols.filter((col) => before.byColumn[col] !== after.byColumn[col]);
}

seed();
const first = await fingerprint();
console.log(`  after the first seed: ${Object.values(first).reduce((n, t) => n + t.rows, 0)} rows across ${tables.length} tables`);
seed();
const second = await fingerprint();

console.log("\n  table                          rows   second seed");
for (const t of tables) {
  const same = first[t].hash === second[t].hash && first[t].rows === second[t].rows;
  const cols = same ? [] : columnsThatMoved(first[t], second[t]);
  console.log(`   ${t.padEnd(28)} ${String(first[t].rows).padStart(5)}   ${same ? "nothing moved" : `rewritten: ${cols.join(", ")}`}`);
}

const figureColumnsCompared = tables.reduce((n, t) => n + first[t].figureColumns.length, 0);
findings.partB = {
  tables: Object.fromEntries(
    tables.map((t) => [
      t,
      {
        rowsBefore: first[t].rows,
        rowsAfter: second[t].rows,
        figuresSame: first[t].figuresHash === second[t].figuresHash,
        rowsByteIdentical: first[t].hash === second[t].hash,
        columnsRewritten: columnsThatMoved(first[t], second[t]),
      },
    ]),
  ),
};

// Benchmark 7's own words, tested one clause at a time.
const duplicated = tables.filter((t) => first[t].rows !== second[t].rows);
check(
  duplicated.length === 0,
  "a second seed duplicates nothing",
  duplicated.length === 0
    ? `every one of the ${tables.length} tables holds the same number of rows`
    : duplicated.map((t) => `${t}: ${first[t].rows} → ${second[t].rows}`).join(", "),
);

const figureMoved = tables.filter((t) => first[t].figuresHash !== second[t].figuresHash);
check(
  figureMoved.length === 0,
  "a second seed changes no figure",
  figureMoved.length === 0
    ? `${figureColumnsCompared} figure columns compared across ${tables.length} tables (ids and stamps excluded — they are identity, not figures)`
    : figureMoved.map((t) => `${t}: ${columnsThatMoved(first[t], second[t]).join("/")}`).join(", "),
);

// The measurement that is *not* benchmark 7, reported rather than hidden: the seed writes its
// child rows again instead of syncing them in place.
const rewritten = tables.filter((t) => first[t].hash !== second[t].hash);
findings.partB.identityChurn = rewritten.map((t) => ({
  table: t,
  columnsRewritten: columnsThatMoved(first[t], second[t]),
}));
if (rewritten.length > 0) {
  console.log(
    `\n  FINDING (not a failure of benchmark 7): a second seed writes child rows again rather than\n` +
      `  syncing them in place. Ids are new, and the rows listed below carry re-stamped times. The\n` +
      `  figures do not move and nothing duplicates, but identity does. A write flow must not hold a\n` +
      `  cost_line or enquiry id across a seed run until this is settled with the owner.`,
  );
  for (const t of rewritten) {
    console.log(`    ${t.padEnd(16)} ${columnsThatMoved(first[t], second[t]).join(", ")}`);
  }
  console.log(
    `    (enquiry.created_at is not among them: the retention clock does not move.)`,
  );
}
findings.partB.finding = rewritten.length > 0;

const ok = findings.checks.every((c) => c.ok);
findings.ok = ok;
writeFileSync(join(RUNS, "store-inspection.json"), JSON.stringify(findings, null, 2) + "\n");

await c.end();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await admin.end();
rmSync(WORK, { recursive: true, force: true });

console.log(
  `\nverdict: ${
    ok
      ? "the store holds no rate and no currency, and a second seed duplicates nothing and moves no figure"
      : "THE INSPECTION FAILED — read the lines above"
  }${ok && findings.partB.finding ? "\n         (one finding stands beside it: see the identity churn above — the owner's call, not hidden)" : ""}`,
);
process.exit(ok ? 0 : 1);
