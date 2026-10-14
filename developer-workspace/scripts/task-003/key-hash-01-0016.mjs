// Task 1 of the key-and-hash follow-up — migration 0016 on a scratch database.
//
// A fresh database takes the whole chain (0001…0016), and the `enquiry` table is then
// inspected: `asked_for` exists, is NOT NULL, and there is no `car_ref` anywhere. The live
// store is not touched. Creates and drops its own scratch database.
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/key-hash-01-0016.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const DB = "truespec_scratch_kh01";
const OUT = "developer-workspace/scripts/task-003/runs/key-hash";

const log = [];
const say = (line) => {
  console.log(line);
  log.push(line);
};

const baseUrl = new URL(process.env.DATABASE_URL);
const scratchUrl = new URL(baseUrl);
scratchUrl.pathname = `/${DB}`;

const admin = new Client({ connectionString: baseUrl.toString() });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${DB}`);
await admin.end();
say(`created ${DB}`);

try {
  const env = {
    ...process.env,
    DATABASE_URL: scratchUrl.toString(),
    DATABASE_URL_UNPOOLED: scratchUrl.toString(),
  };
  const applied = execFileSync("npx", ["tsx", "scripts/migrate.ts"], { env, encoding: "utf8" });
  say(applied.trim());

  const c = new Client({ connectionString: scratchUrl.toString() });
  await c.connect();

  const cols = (
    await c.query(
      `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'enquiry'
        ORDER BY ordinal_position`,
    )
  ).rows;

  const ledger = (await c.query("SELECT count(*)::int AS n FROM schema_migrations")).rows[0].n;
  await c.end();

  const askedFor = cols.find((r) => r.column_name === "asked_for");
  const carRef = cols.find((r) => r.column_name === "car_ref");

  const checks = [
    ["0016 is in the ledger", ledger === 16, `schema_migrations = ${ledger}`],
    ["enquiry.asked_for exists", Boolean(askedFor), askedFor ? "present" : "MISSING"],
    [
      "enquiry.asked_for is NOT NULL",
      askedFor?.is_nullable === "NO",
      `is_nullable = ${askedFor?.is_nullable ?? "-"}`,
    ],
    ["enquiry.car_ref is gone", !carRef, carRef ? "STILL THERE" : "absent"],
  ];

  let pass = 0;
  say("");
  for (const [name, ok, detail] of checks) {
    if (ok) pass += 1;
    say(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
  }
  say("");
  say(`enquiry columns: ${cols.map((r) => r.column_name).join(", ")}`);

  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    `${OUT}/01-0016-scratch.json`,
    JSON.stringify(
      {
        why: "migration 0016 applies cleanly to a fresh chain (0001…0016) and the enquiry table has asked_for NOT NULL and no car_ref",
        scratchDatabase: DB,
        ledgerCount: ledger,
        columns: cols,
        checks: checks.map(([name, ok, detail]) => ({ name, ok, detail })),
        pass,
        total: checks.length,
        log,
      },
      null,
      2,
    ),
  );
  writeFileSync(`${OUT}/01-0016-scratch.log`, log.join("\n") + "\n");
  say(`\n${pass}/${checks.length} — evidence: ${OUT}/01-0016-scratch.json`);
  if (pass !== checks.length) process.exitCode = 1;
} finally {
  const drop = new Client({ connectionString: baseUrl.toString() });
  await admin.end().catch(() => {});
  const a2 = new Client({ connectionString: baseUrl.toString() });
  await a2.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`).catch(() => {});
  await a2.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await a2.end();
  say(`dropped ${DB}`);
}
