// Task 4 of the key-and-hash follow-up — the filler removes nothing, proven on a scratch database.
//
// The witness decision 11 calls load-bearing: run the filler twice and the store is the same both
// times — the same content *and the same row ids*. If any delete or re-insert were left, the ids
// would move. A snapshot is every row of every table the filler writes, in a fixed order.
//
// Also proven here:
//   * every car and enquiry carries a `content_hash` the recipe agrees with (recomputed from the
//     stored row, in this same process, using the one module);
//   * every demo enquiry carries its handle, and the row count is the recipe's;
//   * a second run writes no row at all (no `car.version` churn, no `updated_at` move).
//
// The live store is not touched. Creates and drops its own scratch database.
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/key-hash-04-seed-idempotent.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const DB = "truespec_scratch_kh04";
const OUT = "developer-workspace/scripts/task-003/runs/key-hash";

const log = [];
const say = (line) => {
  console.log(line);
  log.push(line);
};

const base = new URL(process.env.DATABASE_URL);
const scratchUrl = new URL(base);
scratchUrl.pathname = `/${DB}`;
const scratch = scratchUrl.toString();

const admin = new Client({ connectionString: base.toString() });
admin.on("error", () => {});
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${DB}`);
say(`created ${DB}`);

const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok: Boolean(ok), detail });
  say(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
};

const env = { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch };
const runNode = (args) => execFileSync("node", args, { env, encoding: "utf8" });
const runSeed = () => runNode(["--import", "tsx", "scripts/seed.ts"]).trim().split("\n").slice(-1)[0];

// Every row of every table the filler writes, in a fixed order — ids included.
const snapshot = async (c) => {
  const out = {};
  for (const [table, order] of [
    ["car", "ref"],
    ["car_photo", "car_id, position"],
    ["cost_line", "car_id, kind"],
    ["sale", "car_id"],
    ["enquiry", "handle NULLS LAST, name"],
    ["enquiry_pdf", "filename, id"],
  ]) {
    const r = await c.query(`SELECT row_to_json(t) AS row FROM (SELECT * FROM ${table} ORDER BY ${order}) t`);
    out[table] = r.rows.map((x) => x.row);
  }
  return out;
};

try {
  say(runNode(["--import", "tsx", "scripts/migrate.ts"]).trim().split("\n").slice(-1)[0]);

  const c = new Client({ connectionString: scratch });
  c.on("error", () => {});
  await c.connect();

  // ---- run the filler twice ------------------------------------------------
  say(runSeed());
  const first = await snapshot(c);
  say(runSeed());
  const second = await snapshot(c);

  const counts = Object.fromEntries(Object.entries(second).map(([t, rows]) => [t, rows.length]));
  say(`rows after two runs: ${JSON.stringify(counts)}`);

  for (const table of Object.keys(second)) {
    const a = JSON.stringify(first[table], null, 1);
    const b = JSON.stringify(second[table], null, 1);
    check(
      `the second run left ${table} byte-identical (same rows, same ids, same values)`,
      a === b,
      a === b ? `${first[table].length} row(s) unchanged` : `DIFFERS after run 2`,
    );
  }

  check(
    "the fleet is the recipe's 17 cars",
    second.car.length === 17,
    `${second.car.length} car row(s)`,
  );
  check(
    "the enquiries are the recipe's 6 (2 handwritten + 4 from the PDF)",
    second.enquiry.length === 6,
    `${second.enquiry.length} enquiry row(s)`,
  );
  check(
    "every enquiry carries a handle",
    second.enquiry.every((e) => typeof e.handle === "string" && e.handle.length > 0),
    second.enquiry.map((e) => e.handle).sort().join(", "),
  );

  // ---- the recipe agrees with what is stored -------------------------------
  const { carChangeCheck, enquiryChangeCheck, CHANGE_CHECK_VERSION } = await import(
    "../../../lib/change-check.ts"
  );

  const carMismatch = second.car.filter((row) => carChangeCheck(row) !== row.content_hash);
  check(
    "every car's content_hash matches its editable fields",
    carMismatch.length === 0,
    carMismatch.length === 0
      ? `all ${second.car.length} agree`
      : carMismatch.map((r) => r.ref).join(", "),
  );

  const enqMismatch = second.enquiry.filter((row) => enquiryChangeCheck(row) !== row.content_hash);
  check(
    "every enquiry's content_hash matches its editable fields",
    enqMismatch.length === 0,
    enqMismatch.length === 0
      ? `all ${second.enquiry.length} agree`
      : enqMismatch.map((r) => r.handle ?? r.name).join(", "),
  );

  check(
    "every car and enquiry records the current recipe version",
    [...second.car, ...second.enquiry].every((r) => r.hash_version === CHANGE_CHECK_VERSION),
    `hash_version = ${CHANGE_CHECK_VERSION}`,
  );

  // A row that is untouched keeps its version and its timestamps; both runs are equal above, so
  // this only states the shape the equality already proves.
  check(
    "no car row was written afresh (ids are the first run's)",
    second.car.every((row, i) => row.id === first.car[i].id),
    "ids stable across the two runs",
  );

  await c.end();

  const pass = checks.filter((x) => x.ok).length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    `${OUT}/04-seed-idempotent.json`,
    JSON.stringify(
      {
        why: "the filler removes nothing: two runs, the same content and the same row ids; every car and enquiry agrees with the recipe",
        scratchDatabase: DB,
        counts,
        checks,
        pass,
        total: checks.length,
        log,
      },
      null,
      2,
    ),
  );
  say(`\n${pass}/${checks.length} — evidence: ${OUT}/04-seed-idempotent.json`);
  if (pass !== checks.length) process.exitCode = 1;
} finally {
  const drop = new Client({ connectionString: base.toString() });
  drop.on("error", () => {});
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await drop.end();
  say(`dropped ${DB}`);
}
