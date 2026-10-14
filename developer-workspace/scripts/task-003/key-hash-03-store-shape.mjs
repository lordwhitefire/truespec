// Task 3 of the key-and-hash follow-up — the store's new shape, proven on a scratch database.
//
// A fresh database takes the whole chain (0001…0019). Then:
//   * the columns the three new migrations add are there, with the right nullability;
//   * the store refuses a car or an enquiry with no change-check;
//   * the identity lock refuses a changed `car.id`, `car.ref` or `enquiry.id`, and changes nothing;
//   * the lock allows a write that does not change a name — an ordinary update, a same-value write,
//     and the filler's `ON CONFLICT (ref) DO UPDATE` — and still allows a delete (the wipe);
//   * a handle, when present, names one row; many rows may have none.
//
// The live store is not touched. Creates and drops its own scratch database.
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/key-hash-03-store-shape.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const DB = "truespec_scratch_kh03";
const OUT = "developer-workspace/scripts/task-003/runs/key-hash";
const H = (c) => c.repeat(64);

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
admin.on("error", () => {}); // a dropped scratch database can cut a back-end; not a test failure
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${DB}`);
say(`created ${DB}`);

const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok: Boolean(ok), detail });
  say(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
};

// A failed single statement does not poison an autocommit connection, so each attempt stands alone.
const attempt = async (c, sql, params) => {
  try {
    await c.query(sql, params);
    return { refused: false };
  } catch (e) {
    return { refused: true, code: e.code, message: String(e.message).split("\n")[0] };
  }
};

try {
  const applied = execFileSync("node", ["--import", "tsx", "scripts/migrate.ts"], {
    env: { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch },
    encoding: "utf8",
  });
  say(applied.trim().split("\n").slice(-1)[0]);

  const c = new Client({ connectionString: scratch });
  c.on("error", () => {});
  await c.connect();

  // ---- the ledger and the new columns -------------------------------------
  const ledger = (await c.query("SELECT count(*)::int n FROM schema_migrations")).rows[0].n;
  check("the chain is 0001…0019", ledger === 19, `schema_migrations = ${ledger}`);

  const col = async (table, name) =>
    (await c.query(
      `SELECT data_type, is_nullable, column_default FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, name],
    )).rows[0];

  for (const table of ["car", "enquiry"]) {
    const h = await col(table, "content_hash");
    check(
      `${table}.content_hash is required text`,
      h?.data_type === "text" && h?.is_nullable === "NO",
      h ? `text, is_nullable=${h.is_nullable}` : "MISSING",
    );
    const v = await col(table, "hash_version");
    check(
      `${table}.hash_version is required, default 1`,
      v?.is_nullable === "NO" && String(v?.column_default).includes("1"),
      v ? `${v.data_type}, is_nullable=${v.is_nullable}, default=${v.column_default}` : "MISSING",
    );
  }

  const handleCol = await col("enquiry", "handle");
  check(
    "enquiry.handle is nullable text",
    handleCol?.data_type === "text" && handleCol?.is_nullable === "YES",
    handleCol ? `text, is_nullable=${handleCol.is_nullable}` : "MISSING",
  );

  const handleIdx = (
    await c.query(
      `SELECT indexdef FROM pg_indexes
        WHERE schemaname='public' AND tablename='enquiry' AND indexname='enquiry_handle_key'`,
    )
  ).rows[0];
  check(
    "a unique index on enquiry.handle exists",
    Boolean(handleIdx) && /UNIQUE/i.test(handleIdx.indexdef),
    handleIdx?.indexdef ?? "MISSING",
  );

  // ---- the change-check is required ---------------------------------------
  const noHash = await attempt(c, "INSERT INTO car (brand) VALUES ('No hash here')");
  check(
    "a car with no change-check is refused",
    noHash.refused && noHash.code === "23502",
    noHash.refused ? `SQLSTATE ${noHash.code}: ${noHash.message}` : "IT WAS ALLOWED",
  );

  const parked = (
    await c.query("INSERT INTO car (brand, model, content_hash) VALUES ('Toyota','Camry',$1) RETURNING id, ref", [H("0")])
  ).rows[0];
  check("a car with a change-check is accepted", Boolean(parked?.id), `ref=${parked?.ref}`);

  const noHashEnq = await attempt(
    c,
    "INSERT INTO enquiry (name, number, asked_for) VALUES ('A','1','a car')",
  );
  check(
    "an enquiry with no change-check is refused",
    noHashEnq.refused && noHashEnq.code === "23502",
    noHashEnq.refused ? `SQLSTATE ${noHashEnq.code}: ${noHashEnq.message}` : "IT WAS ALLOWED",
  );

  const enquiry = (await c.query(
    "INSERT INTO enquiry (name, number, asked_for, handle, content_hash) VALUES ('Ada','+234','a Camry','demo-enquiry-99',$1) RETURNING id",
    [H("1")],
  )).rows[0];
  check("an enquiry with a change-check is accepted", Boolean(enquiry?.id), "inserted");

  // ---- the identity lock refuses a changed name ---------------------------
  const refBefore = parked.ref;

  const refChange = await attempt(c, "UPDATE car SET ref = 'TS-9999' WHERE id = $1", [parked.id]);
  const refAfter = (await c.query("SELECT ref FROM car WHERE id = $1", [parked.id])).rows[0].ref;
  check(
    "changing car.ref is refused, and changes nothing",
    refChange.refused && refChange.message.includes("identity is final") && refAfter === refBefore,
    refChange.refused ? `SQLSTATE ${refChange.code}: ${refChange.message} · ref still ${refAfter}` : "IT WAS ALLOWED",
  );

  const idChange = await attempt(c, "UPDATE car SET id = gen_random_uuid() WHERE id = $1", [parked.id]);
  check(
    "changing car.id is refused",
    idChange.refused && idChange.message.includes("car.id cannot be changed"),
    idChange.refused ? `SQLSTATE ${idChange.code}: ${idChange.message}` : "IT WAS ALLOWED",
  );

  const enqIdChange = await attempt(c, "UPDATE enquiry SET id = gen_random_uuid() WHERE id = $1", [enquiry.id]);
  check(
    "changing enquiry.id is refused",
    enqIdChange.refused && enqIdChange.message.includes("enquiry.id cannot be changed"),
    enqIdChange.refused ? `SQLSTATE ${enqIdChange.code}: ${enqIdChange.message}` : "IT WAS ALLOWED",
  );

  // ---- the lock lets an honest write through ------------------------------
  const ordinary = await attempt(c, "UPDATE car SET brand = 'Lexus', note = 'fine' WHERE id = $1", [parked.id]);
  check("an ordinary update is still allowed", !ordinary.refused, ordinary.refused ? ordinary.message : "brand changed");

  const sameRef = await attempt(c, "UPDATE car SET ref = $2 WHERE id = $1", [parked.id, refBefore]);
  check(
    "setting car.ref to the value it already has is allowed",
    !sameRef.refused,
    sameRef.refused ? sameRef.message : `ref = ${refBefore}`,
  );

  const upsert = await attempt(
    c,
    `INSERT INTO car (ref, brand, content_hash) VALUES ($1, 'First', $2)
       ON CONFLICT (ref) DO UPDATE SET brand = EXCLUDED.brand`,
    [refBefore, H("2")],
  );
  check(
    "the filler's ON CONFLICT (ref) DO UPDATE pattern is allowed",
    !upsert.refused,
    upsert.refused ? upsert.message : "brand rewritten under the same ref",
  );

  const upsertRef = await attempt(
    c,
    `INSERT INTO car (ref, brand, content_hash) VALUES ($1, 'First', $2)
       ON CONFLICT (ref) DO UPDATE SET ref = EXCLUDED.ref, brand = EXCLUDED.brand`,
    [refBefore, H("3")],
  );
  check(
    "…even when its DO UPDATE list names ref itself",
    !upsertRef.refused,
    upsertRef.refused ? upsertRef.message : "same value, allowed",
  );

  // ---- the handle ---------------------------------------------------------
  const dupHandle = await attempt(
    c,
    "INSERT INTO enquiry (name, number, asked_for, handle, content_hash) VALUES ('B','2','a car','demo-enquiry-99',$1)",
    [H("3")],
  );
  check(
    "a handle, when present, names one row",
    dupHandle.refused && dupHandle.code === "23505",
    dupHandle.refused ? `SQLSTATE ${dupHandle.code}: ${dupHandle.message}` : "IT WAS ALLOWED",
  );

  const manyNull = await attempt(
    c,
    "INSERT INTO enquiry (name, number, asked_for, content_hash) VALUES ('C','3','a car',$1), ('D','4','a car',$2)",
    [H("3"), H("4")],
  );
  check("many rows may have no handle", !manyNull.refused, manyNull.refused ? manyNull.message : "two NULLs accepted");

  // ---- the wipe is not blocked --------------------------------------------
  const delCar = await attempt(c, "DELETE FROM car WHERE id = $1", [parked.id]);
  check("a delete still works (the wipe stays possible)", !delCar.refused, delCar.refused ? delCar.message : "car removed");

  await c.end();

  const pass = checks.filter((x) => x.ok).length;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    `${OUT}/03-store-shape.json`,
    JSON.stringify(
      {
        why: "0017–0019 apply to a fresh chain; the change-check is required; the identity lock refuses a changed name and nothing else; a handle names one row",
        scratchDatabase: DB,
        ledgerCount: ledger,
        checks,
        pass,
        total: checks.length,
        log,
      },
      null,
      2,
    ),
  );
  writeFileSync(`${OUT}/03-store-shape.log`, log.join("\n") + "\n");
  say(`\n${pass}/${checks.length} — evidence: ${OUT}/03-store-shape.json`);
  if (pass !== checks.length) process.exitCode = 1;
} finally {
  const drop = new Client({ connectionString: base.toString() });
  drop.on("error", () => {});
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await drop.end();
  say(`dropped ${DB}`);
}
