// TASK-005 plan Task 6 — the settings statement's three arms, run against a throwaway copy.
//
// The statement changed this task: it now compares the stored value with the one about to be written
// and **writes nothing when they are the same**, answering which of the two happened. The text below
// is a verbatim copy of `lib/settings.ts`'s statement — that module carries `server-only`, so nothing
// outside a Server Component can import it (which is also why it has no unit test). The browser drive
// is the authority on the real text; this is the store-level reading of all three arms, including the
// one no screen can reach: a key with no row at all.
import { neon } from "@neondatabase/serverless";

const url = process.argv[2];
if (!url) {
  console.error("usage: settings-statement-probe.mjs <connection-url>");
  process.exit(2);
}
const run = neon(url);

const STATEMENT = `WITH cur AS (SELECT value FROM setting WHERE key = $1),
     changed AS (SELECT (SELECT value FROM cur) IS DISTINCT FROM $2::text AS yes),
     upsert AS (
       INSERT INTO setting (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
         WHERE (SELECT yes FROM changed)
         RETURNING value
     )
     SELECT value, true AS changed FROM upsert
     UNION ALL
     SELECT value, false AS changed FROM setting
      WHERE key = $1 AND NOT EXISTS (SELECT 1 FROM upsert)`;

const read = async (key) => (await run.query(`SELECT value, updated_at FROM setting WHERE key = $1`, [key]))[0] ?? null;
const save = async (key, value) => await run.query(STATEMENT, [key, value]);

const report = { when: new Date().toISOString(), store: url.replace(/\/\/[^@]*@/, "//***@").slice(0, 90), arms: [] };

// Arm 1 — a key with no row at all: `cur` is NULL, so the value must be written and reported as changed.
const before1 = await read("temp_probe_key");
const out1 = await save("temp_probe_key", "probe");
const after1 = await read("temp_probe_key");
report.arms.push({ arm: "no row yet", before: before1, answer: out1, after: after1 });

// Arm 2 — a key whose value differs: the write must land, timestamp and all.
const before2 = await read("tagline");
const out2 = await save("tagline", "CHANGED-by-probe");
const after2 = await read("tagline");
report.arms.push({ arm: "a different value", before: before2, answer: out2, after: after2 });

// Arm 3 — the same value again: nothing may be written, and the timestamp must not move.
const out3 = await save("tagline", "CHANGED-by-probe");
const after3 = await read("tagline");
report.arms.push({ arm: "the same value", answer: out3, after: after3 });

report.verdict = {
  noRowWroteAndSaidChanged: out1[0]?.changed === true && after1?.value === "probe",
  differentValueWroteAndSaidChanged: out2[0]?.changed === true && after2?.value === "CHANGED-by-probe",
  sameValueWroteNothingAndSaidSo: out3[0]?.changed === false,
  timestampUnmovedOnTheNoOp: String(after3?.updated_at) === String(after2?.updated_at),
  oneRowEveryTime: out1.length === 1 && out2.length === 1 && out3.length === 1,
};

// Put the copy back the way it was found (the copy is deleted afterwards anyway).
await run.query(`DELETE FROM setting WHERE key = $1`, ["temp_probe_key"]);
await run.query(`UPDATE setting SET value = $2, updated_at = $3 WHERE key = $1`, [
  "tagline",
  before2?.value ?? "",
  before2?.updated_at ?? null,
]);
report.restored = await read("tagline");

console.log(JSON.stringify(report, null, 2));
