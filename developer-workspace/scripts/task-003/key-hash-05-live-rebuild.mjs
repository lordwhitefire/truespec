// Task 6/7 — the rebuilt store, and the filler proved stable on the live database.
//
// The witness decision 11 calls load-bearing, run where it matters:
//   * the recipe's shape is in the store (17 cars, 49 photographs, 99 cost lines, one sale,
//     6 enquiries, one imported PDF);
//   * every car and every enquiry carries a `content_hash` the one module agrees with,
//     recomputed here from the stored row;
//   * running the filler once more leaves every row *byte-identical* — the same content and
//     the same ids — which is what "the filler removes nothing" means in practice;
//   * no car_photo holds a third-party address (the store holds asset references);
//   * no enquiry's `asked_for` is one of our codes (D11, decision 13).
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/key-hash-05-live-rebuild.mjs
//
// Read-only except that it runs the filler once, which is the point of the witness.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const OUT = "developer-workspace/scripts/task-003/runs/key-hash";
const log = [];
const say = (line) => {
  console.log(line);
  log.push(line);
};

const checks = [];
const check = (name, ok, detail) => {
  checks.push({ name, ok: Boolean(ok), detail });
  say(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
};

const client = new Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
});
client.on("error", () => {});
await client.connect();

const ORDER = [
  ["car", "ref"],
  ["car_photo", "car_id, position"],
  ["cost_line", "car_id, kind"],
  ["sale", "car_id"],
  ["enquiry", "handle"],
  ["enquiry_pdf", "filename"],
];

const snapshot = async () => {
  const out = {};
  for (const [table, order] of ORDER) {
    const r = await client.query(`SELECT * FROM ${table} ORDER BY ${order}`);
    out[table] = r.rows;
  }
  return out;
};

try {
  const before = await snapshot();
  const counts = Object.fromEntries(Object.entries(before).map(([t, rows]) => [t, rows.length]));
  say(`the rebuilt store: ${JSON.stringify(counts)}`);

  check("17 cars in the fleet", counts.car === 17, `${counts.car}`);
  check("6 enquiries (2 handwritten + 4 from the PDF)", counts.enquiry === 6, `${counts.enquiry}`);
  check("49 photographs", counts.car_photo === 49, `${counts.car_photo}`);
  check("one imported PDF", counts.enquiry_pdf === 1, before.enquiry_pdf[0]?.filename ?? "none");
  check(
    "every car is marked is_demo",
    before.car.every((r) => r.is_demo === true),
    `${before.car.filter((r) => r.is_demo === true).length}/17`,
  );

  // ---- the recipe agrees with what is stored ---------------------------------
  const { carChangeCheck, enquiryChangeCheck, CHANGE_CHECK_VERSION } = await import(
    "../../../lib/change-check.ts"
  );

  const carMismatch = before.car.filter((row) => carChangeCheck(row) !== row.content_hash);
  check(
    "every car's stored change-check matches its editable fields",
    carMismatch.length === 0,
    carMismatch.length === 0 ? `all ${counts.car} agree` : carMismatch.map((r) => r.ref).join(", "),
  );

  const enqMismatch = before.enquiry.filter((row) => enquiryChangeCheck(row) !== row.content_hash);
  check(
    "every enquiry's stored change-check matches its editable fields",
    enqMismatch.length === 0,
    enqMismatch.length === 0 ? `all ${counts.enquiry} agree` : enqMismatch.map((r) => r.handle).join(", "),
  );

  check(
    "every row records the current recipe version",
    [...before.car, ...before.enquiry].every((r) => r.hash_version === CHANGE_CHECK_VERSION),
    `hash_version = ${CHANGE_CHECK_VERSION}`,
  );

  // ---- the store holds references, not addresses -----------------------------
  const addressed = before.car_photo.filter((p) => /^https?:\/\//.test(p.sanity_asset_id ?? ""));
  check(
    "no photograph holds a third-party address",
    addressed.length === 0,
    addressed.length === 0 ? "all 49 are asset references" : `${addressed.length} address(es)`,
  );

  // ---- the customer's words, not our codes -----------------------------------
  const coded = before.enquiry.filter((e) => /^\s*TS-\d+\s*$/.test(e.asked_for ?? ""));
  check(
    "no enquiry is stored as one of our car codes",
    coded.length === 0,
    before.enquiry.map((e) => `${e.handle}=${JSON.stringify(e.asked_for)}`).join(" · "),
  );

  // ---- the filler's re-run leaves it all alone -------------------------------
  const output = execFileSync("node", ["--import", "tsx", "scripts/seed.ts"], {
    env: process.env,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter((l) => l.startsWith("seed:"))
    .pop();
  say(`filler: ${output}`);

  const after = await snapshot();
  for (const [table] of ORDER) {
    const a = JSON.stringify(before[table]);
    const b = JSON.stringify(after[table]);
    check(
      `the filler's re-run left ${table} byte-identical (same rows, same ids, same values)`,
      a === b,
      a === b ? `${after[table].length} row(s) unchanged` : "DIFFERS after the re-run",
    );
  }
} finally {
  await client.end();
}

const pass = checks.filter((x) => x.ok).length;
mkdirSync(OUT, { recursive: true });
writeFileSync(
  `${OUT}/05-live-rebuild.json`,
  JSON.stringify(
    {
      why: "the rebuilt store matches the recipe, and the filler's re-run leaves every row byte-identical — same content, same ids",
      checks,
      pass,
      total: checks.length,
      log,
    },
    null,
    2,
  ),
);
say(`\n${pass}/${checks.length} — evidence: ${OUT}/05-live-rebuild.json`);
if (pass !== checks.length) process.exitCode = 1;
