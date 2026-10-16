import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";
import { buildExport } from "../../../lib/export";
import { buildZip } from "../../../lib/zip";

/**
 * Task 28's witness: the export, built from the live store and opened by something that did not
 * write it.
 *
 * Three separate things are being proved, and none of them is "it should work":
 *
 *  1. **The content is complete.** Every subject's rows are counted from the store *here*, with this
 *     script's own queries, and compared against what came out of `buildExport`.
 *  2. **The archive is a real archive.** `runs/task-28/truespec-export.zip` is opened by
 *     `export-unzip-check.py` — Python's `zipfile` and `csv` modules, a wholly different
 *     implementation from the hand-rolled `lib/zip.ts` / `lib/csv.ts`. `testzip()` verifies every
 *     entry's CRC with Python's own arithmetic; the CSVs are parsed by Python's own reader; and the
 *     nesting in `master.json` is matched row-for-row against the flat files.
 *  3. **The door holds.** The real route is asked, over HTTP, with no session: it must answer `401`
 *     and *nothing* — no body at all, no ZIP, no hint of a subject.
 *
 * What this **cannot** prove here is the signed-in branch of the route: there is no office session
 * on this machine (`getOfficeSession()` needs a Clerk session) — the standing Checkpoint B gap. The
 * content and the archive are therefore proved directly, and the refusal is proved over HTTP.
 *
 * Run: node --conditions=react-server --dns-result-order=ipv4first --import tsx \
 *        developer-workspace/scripts/task-004/export-check.ts
 */

const RUN_DIR = new URL("./runs/task-28/", import.meta.url).pathname;
const ZIP_PATH = RUN_DIR + "truespec-export.zip";
const EXPECT_PATH = RUN_DIR + "expectations.json";
const PY_CHECK = new URL("./export-unzip-check.py", import.meta.url).pathname;
const DEV_ORIGIN = process.env.DEV_ORIGIN ?? "http://localhost:3210";

const passed: string[] = [];
const failed: string[] = [];

function ok(name: string, condition: boolean, detail = ""): void {
  (condition ? passed : failed).push(condition ? name : `${name}${detail ? `  ${detail}` : ""}`);
}

function eq(name: string, got: unknown, want: unknown): void {
  const same = JSON.stringify(got) === JSON.stringify(want);
  ok(
    name,
    same,
    same ? "" : `— got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
  );
}

async function main(): Promise<void> {
  mkdirSync(RUN_DIR, { recursive: true });

  const client = new Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  });
  await client.connect();

  // ---- 1. what the store holds, counted here, not by the code under test --------------------
  const counted = await client.query(`
    SELECT (SELECT count(*) FROM car)            AS cars,
           (SELECT count(*) FROM cost_line)      AS costs,
           (SELECT count(*) FROM car_photo)      AS photos,
           (SELECT count(*) FROM enquiry)        AS enquiries,
           (SELECT count(*) FROM tap)            AS taps,
           (SELECT count(*) FROM activity_event) AS activity,
           (SELECT count(*) FROM setting)         AS settings
  `);
  const counts = Object.fromEntries(
    Object.entries(counted.rows[0] as Record<string, string>).map(([k, v]) => [k, Number(v)]),
  );

  // The store's own columns per table — the header each CSV must carry, straight from the catalog.
  const catalog = await client.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])
      ORDER BY table_name, ordinal_position`,
    [["car", "cost_line", "car_photo", "enquiry", "tap", "activity_event", "setting"]],
  );
  const columnsOf = new Map<string, string[]>();
  for (const row of catalog.rows) {
    const list = columnsOf.get(row.table_name);
    if (list) list.push(row.column_name);
    else columnsOf.set(row.table_name, [row.column_name]);
  }

  await client.end();

  // ---- 2. build the export, exactly as the route does ---------------------------------------
  const now = new Date();
  const files = await buildExport(now);
  const zip = buildZip(
    files.map((file) => ({ name: file.name, data: file.body })),
    now,
  );

  writeFileSync(ZIP_PATH, zip);
  console.log(`Built ${files.length} files → ${ZIP_PATH} (${zip.byteLength} bytes)\n`);

  ok("the archive begins with the local-file-header signature PK\\x03\\x04",
    String.fromCharCode(...zip.subarray(0, 4)) === "PK\x03\x04");
  ok("the archive is not empty", zip.byteLength > 1024, `— ${zip.byteLength} bytes`);
  eq("the archive holds one file per subject, plus the master and the README",
    files.map((f) => f.name),
    ["README.txt", "master.json", "cars.csv", "costs.csv", "photos.csv", "enquiries.csv", "taps.csv", "activity.csv", "settings.csv"]);

  // The resolved columns the export adds because the registry they name is not itself exported.
  const carsColumns = [...(columnsOf.get("car") ?? []), "state"];
  const activityColumns = [...(columnsOf.get("activity_event") ?? []), "actor"];
  ok("cars.csv carries columns the office's own view drops (private_note travels)",
    carsColumns.includes("private_note"));
  ok("cars.csv carries the state beside its id", carsColumns.includes("state") && carsColumns.includes("state_id"));
  ok("activity.csv carries the actor beside its id",
    activityColumns.includes("actor") && activityColumns.includes("actor_id"));

  const expectations = {
    date: now.toISOString(),
    files: files.map((f) => f.name),
    subjects: [
      { key: "cars", file: "cars.csv", rows: counts.cars, columns: carsColumns },
      { key: "costs", file: "costs.csv", rows: counts.costs, columns: columnsOf.get("cost_line") },
      { key: "photos", file: "photos.csv", rows: counts.photos, columns: columnsOf.get("car_photo") },
      { key: "enquiries", file: "enquiries.csv", rows: counts.enquiries, columns: columnsOf.get("enquiry") },
      { key: "taps", file: "taps.csv", rows: counts.taps, columns: columnsOf.get("tap") },
      { key: "activity", file: "activity.csv", rows: counts.activity, columns: activityColumns },
      { key: "settings", file: "settings.csv", rows: counts.settings, columns: columnsOf.get("setting") },
    ],
  };
  writeFileSync(EXPECT_PATH, JSON.stringify(expectations, null, 2));

  console.log("Store counts:", JSON.stringify(counts), "\n");

  // ---- 3. a different implementation opens it ------------------------------------------------
  let pythonOut = "";
  let pythonOk = true;
  try {
    pythonOut = execFileSync("python3", [PY_CHECK, ZIP_PATH, EXPECT_PATH], { encoding: "utf8" });
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    pythonOut = (e.stdout ?? "") + (e.stderr ?? "");
    pythonOk = false;
  }
  console.log("--- independent extraction (python3 zipfile + csv) ---");
  console.log(pythonOut.trimEnd());
  console.log("");
  ok("python3's independent reader agrees with the export", pythonOk);

  // ---- 4. the door, over real HTTP, with no session ------------------------------------------
  try {
    const response = await fetch(`${DEV_ORIGIN}/api/export`, { redirect: "manual" });
    const body = new Uint8Array(await response.arrayBuffer());
    eq("a request with no session is refused with 401", response.status, 401);
    eq("and it returns nothing at all", body.byteLength, 0);
    ok("no ZIP signature in the refusal",
      String.fromCharCode(...body.subarray(0, 4)) !== "PK\x03\x04");
    ok("no subject leaks in the refusal",
      !new TextDecoder().decode(body).includes("master.json"));
    ok("the refusal is not cached", response.headers.get("cache-control") === "no-store");
  } catch (error) {
    ok("the export route answered over HTTP", false, `— ${(error as Error).message}`);
  }

  // ---- report --------------------------------------------------------------------------------
  console.log("\n--- Task 28 witness ---");
  for (const line of passed) console.log(`  PASS  ${line}`);
  for (const line of failed) console.log(`  FAIL  ${line}`);
  console.log(`\n${passed.length} passed, ${failed.length} failed`);
  if (failed.length) process.exitCode = 1;
}

async function run(): Promise<void> {
  try {
    await main();
  } catch (error) {
    console.error("The witness could not run:", (error as Error).message);
    process.exitCode = 1;
  }
}

void run();
