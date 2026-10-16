// Task 30 — the ten refusals, proved with what was asked and what came back.
//
// task.md names them and asks that each one be shown, not assumed:
//
//   an office URL with no session · a signed-out tab · a state deleted while occupied ·
//   a malformed WhatsApp number · a malformed amount · a file that is not the expected
//   template · a GET that would have changed data · a request carrying its own content_hash ·
//   a request trying to change an identity · an unauthenticated export
//
// Each case is judged on what the store or the rule actually answered, and — where a write
// was available to be made — that nothing changed. Three worlds are used, and each case says
// which rule refused it in the app's own words:
//
//   · HTTP        — the running office on :3210, no cookie (A, G, J)
//   · browser     — the standing attach-only Chrome, a tab nobody signed in (B)
//   · pure rules  — the modules the office itself calls (D, E, F, H-reader)
//   · scratch DB  — the whole migration chain + seed on its own database, so nothing here
//                   runs against the owner's store (C, H-store, I)
//
// Run (HTTP legs need the office server on :3210; the browser leg needs the automation
// Chrome on CDP :9222, and reports "not run" rather than guessing if it is absent):
//
//   node --env-file=.env.local --import tsx developer-workspace/scripts/task-004/refusals.mjs
//
// SKIP_BROWSER=1 runs everything except the tab leg.

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { PDFDocument } from "pdf-lib";

// The office's own rules, imported and called — never re-typed here.
import { normaliseNigerianMobile } from "../../../lib/phone";
import { parseCostAmount } from "../../../lib/money";
import { readCarInput } from "../../../lib/car-input";
import { carChangeCheck, CAR_RECIPE } from "../../../lib/change-check";
import { readCarFile, NOT_A_PDF, NOT_OUR_TEMPLATE } from "../../../lib/draft-read";
import { readEnquiryFile, NOT_AN_ENQUIRY_SHEET } from "../../../lib/enquiry-read";

const ORIGIN = process.env.BUILD_URL || "http://localhost:3210";
const SKIP_BROWSER = process.env.SKIP_BROWSER === "1";
const RUNS = "developer-workspace/scripts/task-004/runs/refusals";
mkdirSync(RUNS, { recursive: true });

/** Markup only the office shell emits, and office data. Reused from refusal-proof.ts. */
const OFFICE_MARKERS = [
  "Signed in as",
  "TS-10",
  "₦",
  "Landing cost",
  "profit",
  "customer",
  'class="shell"',
  'class="side"',
  "fa-gauge-high",
];

const cases = [];
function record(c) {
  cases.push(c);
  const ok = c.verdict === "REFUSED, as it must be";
  console.log(`[${c.id}] ${c.claim}`);
  console.log(`    asked:    ${c.asked}`);
  console.log(`    returned: ${c.returned}`);
  console.log(`    rule:     ${c.rule}`);
  console.log(`    ${ok ? "REFUSED" : "NOT PROVEN"}${c.changed === null ? "" : ` · nothing changed: ${!c.changed}`}`);
  console.log("");
  return c;
}

// ---------------------------------------------------------------------------
// World 1 — HTTP, no cookie.
// ---------------------------------------------------------------------------

async function get(path, opts = {}) {
  const res = await fetch(`${ORIGIN}${path}`, { redirect: "manual", ...opts });
  const body = await res.text().catch(() => "");
  return { status: res.status, location: res.headers.get("location") ?? "", body };
}

/**
 * The live store's row counts, read-only — the "nothing changed" witness for the HTTP legs.
 * A refusal that cannot write cannot change a count; this is how we show it, not say it.
 */
async function fingerprint() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    const one = async (t) => Number((await c.query(`SELECT count(*)::int n FROM ${t}`)).rows[0].n);
    return {
      car: await one("car"),
      cost_line: await one("cost_line"),
      car_photo: await one("car_photo"),
      enquiry: await one("enquiry"),
      setting: await one("setting"),
      tap: await one("tap"),
      activity_event: await one("activity_event"),
    };
  } finally {
    await c.end();
  }
}

// A — an office URL with no session.
async function caseA() {
  const paths = ["/office", "/office/inventory", "/office/drafts"];
  const answers = [];
  let allRefused = true;
  let leaked = [];
  for (const p of paths) {
    const { status, location, body } = await get(p);
    // The door refuses EITHER as a 3xx to the door, OR (as Next 15.5 does once the shell
    // has begun streaming) as a 200 carrying the redirect in the payload. Either way the
    // important fact is the same: the client is sent to /office/sign-in and no office data
    // rides along. The status is recorded so a change of shape cannot pass unnoticed.
    const toDoor =
      location.endsWith("/office/sign-in") ||
      (status === 200 && body.includes("/office/sign-in"));
    const found = OFFICE_MARKERS.filter((m) => body.includes(m));
    if (!toDoor) allRefused = false;
    leaked.push(...found.map((m) => `${p}:${m}`));
    answers.push(`${p} → ${status}${location ? ` loc=${location}` : " (redirect in payload)"}`);
  }
  return record({
    id: "A",
    claim: "an office URL with no session",
    asked: `GET ${paths.join(", ")} — no cookie`,
    returned: answers.join(" · "),
    rule:
      "requireOfficeSession() (lib/session.ts) → SIGN_IN_PATH: the layout refuses before it reads anything",
    verdict: allRefused && leaked.length === 0 ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: null, // covered by the whole-battery fingerprint below
    extra: { leaked, note: leaked.length === 0 ? "no office data in any answer" : "LEAK" },
  });
}

// B — a signed-out tab: a real browser tab nobody signed in.
async function caseB() {
  if (SKIP_BROWSER) {
    return record({
      id: "B",
      claim: "a signed-out tab",
      asked: "a browser tab opening /office with no session",
      returned: "not run (SKIP_BROWSER=1)",
      rule: "the same door rule, exercised in a browser",
      verdict: "NOT PROVEN",
      changed: null,
    });
  }
  let lib;
  try {
    lib = await import("./_lib.mjs");
  } catch (e) {
    return notRunB(`harness unavailable: ${e.message}`);
  }
  let browser;
  try {
    browser = await lib.attach();
  } catch (e) {
    return notRunB(e.message);
  }
  try {
    await lib.assertOurs(browser);
    const ctx = browser.contexts()[0];
    const page = await ctx.newPage();
    await page.goto(`${ORIGIN}/office`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForURL(/\/office\/sign-in/, { timeout: 30000 }).catch(() => {});
    const finalUrl = page.url();
    const body = await page.content();
    const leaked = OFFICE_MARKERS.filter((m) => body.includes(m));
    await page.close();
    const refused = /\/office\/sign-in/.test(finalUrl) && leaked.length === 0;
    return record({
      id: "B",
      claim: "a signed-out tab",
      asked: `a fresh tab → ${ORIGIN}/office`,
      returned: `landed at ${finalUrl}${leaked.length ? ` — LEAKED ${leaked.join(", ")}` : " — nothing office-shaped on the page"}`,
      rule: "requireOfficeSession() → SIGN_IN_PATH, followed by the client",
      verdict: refused ? "REFUSED, as it must be" : "NOT PROVEN",
      changed: null,
      extra: { finalUrl, leaked },
    });
  } finally {
    await lib.detach(browser);
  }
}
function notRunB(why) {
  return record({
    id: "B",
    claim: "a signed-out tab",
    asked: "a browser tab opening /office with no session",
    returned: `not run — ${why}`,
    rule: "the same door rule, exercised in a browser",
    verdict: "NOT PROVEN",
    changed: null,
    extra: { notRun: true },
  });
}

// G — a GET that would have changed data.
async function caseG() {
  const targets = ["/api/tap", "/api/upload"];
  const answers = [];
  let allRefused = true;
  for (const p of targets) {
    const { status } = await get(p);
    if (status !== 405) allRefused = false;
    answers.push(`GET ${p} → ${status}`);
  }
  return record({
    id: "G",
    claim: "a GET that would have changed data",
    asked: `GET ${targets.join(", ")} — the two handlers that write on POST`,
    returned: answers.join(" · "),
    rule:
      "the handlers export POST and no GET, so Next answers 405 before the handler runs — a GET cannot reach the write",
    verdict: allRefused ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: null,
    extra: {},
  });
}

// J — an unauthenticated export.
async function caseJ() {
  const { status, body } = await get("/api/export");
  const refused = status === 401 && body.length === 0;
  return record({
    id: "J",
    claim: "an unauthenticated export",
    asked: "GET /api/export — no session",
    returned: `${status}, ${body.length} byte(s)`,
    rule:
      "getOfficeSession() (lib/session.ts) is null → the route answers 401 with an empty body ('returns nothing')",
    verdict: refused ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: null,
    extra: { status, bytes: body.length },
  });
}

// ---------------------------------------------------------------------------
// World 2 — the pure rules, called as the office calls them.
// ---------------------------------------------------------------------------

function caseD() {
  const attempts = [
    "0803 CALL ME",
    "+1 202 555 0100",
    "0803 123",
  ];
  const answers = attempts.map((a) => `${JSON.stringify(a)} → ${JSON.stringify(normaliseNigerianMobile(a))}`);
  const allRefused = attempts.every((a) => normaliseNigerianMobile(a).ok === false);
  return record({
    id: "D",
    claim: "a malformed WhatsApp number",
    asked: attempts.map((a) => JSON.stringify(a)).join(", "),
    returned: answers.join(" · "),
    rule: "normaliseNigerianMobile() (lib/phone.ts) returns ok:false with the reason it refused",
    verdict: allRefused ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: null,
    extra: {},
  });
}

function caseE() {
  const money = parseCostAmount("twelve thousand");
  // And the same rule refusing at the form's own field, as the office surfaces it.
  const form = readCarInput(
    {
      brand: "Toyota",
      model: "Camry",
      year: "2021",
      mileage: "31000",
      stateId: "state-available",
      costs: { purchase_price: "twelve thousand" },
    },
    2026,
  );
  const refused =
    money.ok === false && form.ok === false && form.errors.some((e) => e.field === "cost.purchase_price");
  return record({
    id: "E",
    claim: "a malformed amount",
    asked: 'parseCostAmount("twelve thousand"); and a car form with costs.purchase_price = "twelve thousand"',
    returned: `money → ${JSON.stringify(money)} · form → ${
      form.ok ? "ACCEPTED" : JSON.stringify(form.errors)
    }`,
    rule:
      "parseCostAmount() (lib/money.ts) refuses it, and readCarInput() (lib/car-input.ts) refuses it at its own field",
    verdict: refused ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: null,
    extra: {},
  });
}

async function caseF() {
  const notPdf = await readCarFile(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]));
  // A real PDF, but not ours: no form for the car reader, no title for the enquiry reader.
  const blank = await PDFDocument.create();
  blank.addPage();
  const blankBytes = await blank.save();
  const notOurs = await readCarFile(blankBytes);
  const notSheet = await readEnquiryFile(blankBytes);
  const refused = !notPdf.ok && !notOurs.ok && !notSheet.ok;
  const sameAsItsOwn = notPdf.reason === NOT_A_PDF && notOurs.reason === NOT_OUR_TEMPLATE && notSheet.reason === NOT_AN_ENQUIRY_SHEET;
  return record({
    id: "F",
    claim: "a file that is not the expected template",
    asked: "readCarFile(a .zip); readCarFile(a PDF with no car form); readEnquiryFile(a PDF that is not the sheet)",
    returned: `car: ${JSON.stringify(notPdf.reason)} · car(blank pdf): ${JSON.stringify(notOurs.reason)} · enquiry: ${JSON.stringify(notSheet.reason)}`,
    rule:
      `readCarFile()/readEnquiryFile() (lib/draft-read.ts, lib/enquiry-read.ts) refuse with their own constants (NOT_A_PDF, NOT_OUR_TEMPLATE, NOT_AN_ENQUIRY_SHEET)${sameAsItsOwn ? "" : " — BUT the constants do not match; check the module"}`,
    verdict: refused && sameAsItsOwn ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: null,
    extra: {},
  });
}

// H (reader half) — a request carrying its own content_hash.
function caseHReader() {
  const supplied = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
  const r = readCarInput(
    {
      brand: "Toyota",
      model: "Camry",
      year: "2021",
      mileage: "31000",
      stateId: "state-available",
      content_hash: supplied,
      hash_version: 99,
    },
    2026,
  );
  const columns = r.ok ? Object.keys(r.value.columns) : [];
  const carriedThrough = columns.includes("content_hash") || columns.includes("hash_version");
  const recipeNames = JSON.stringify(CAR_RECIPE).includes("content_hash");
  // The change-check, built as the office builds it, must not carry a carried-in hash either.
  const check = r.ok ? carChangeCheck(r.value.columns) : null;
  const refused = r.ok === true && !carriedThrough && !recipeNames;
  return record({
    id: "H",
    claim: "a request carrying its own content_hash",
    asked: `a car form carrying content_hash=${supplied.slice(0, 8)}… and hash_version=99`,
    returned: r.ok
      ? `accepted, and the reader kept only ${columns.length} columns — content_hash present: ${carriedThrough} · the change-check: ${String(check).slice(0, 24)}…`
      : `refused: ${JSON.stringify(r.errors)}`,
    rule:
      "readCarInput() (lib/car-input.ts) and the change recipe (lib/change-check.ts) never accept a caller's hash — it is not a field the reader keeps, so a supplied one cannot reach the store",
    verdict: refused ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: null,
    extra: { columns: columns.length, carriedThrough },
  });
}

// ---------------------------------------------------------------------------
// World 3 — the scratch store: C, H-store, I.
// ---------------------------------------------------------------------------

const DB = "truespec_scratch_004t30";
const PROJECT = process.cwd();
const WORK = "/tmp/opencode/mig-004t30";

async function openScratch() {
  const base = new URL(process.env.DATABASE_URL);
  const scratchUrl = new URL(base);
  scratchUrl.pathname = `/${DB}`;
  const scratch = scratchUrl.toString();

  const admin = new Client({ connectionString: base.toString() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${DB}`);
  await admin.end();
  console.log(`scratch database: ${DB}`);

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
  execFileSync("node", ["--import", "tsx", join(PROJECT, "scripts/seed.ts")], {
    cwd: PROJECT,
    env: { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch },
    stdio: ["ignore", "inherit", "inherit"],
  });

  const c = new Client({ connectionString: scratch });
  await c.connect();
  return c;
}

async function caseC(c) {
  const one = async (sql, p) => (await c.query(sql, p)).rows[0];
  const count = async (sql, p) => Number((await one(sql, p)).n);

  // (1) a state a car sits in. Two shapes now: a primary (caught by the pinned-primary
  //     trigger, which is a stronger rule) and a secondary (caught by the link's FK).
  const primary = await one(
    `SELECT s.id, s.label, count(c.id)::int n FROM car_state s JOIN car c ON c.state_id = s.id
     WHERE s.kind = 'primary' GROUP BY s.id, s.label ORDER BY n DESC LIMIT 1`,
  );
  let secondary = await one(
    `SELECT s.id, s.label, count(link.car_id)::int n FROM car_state s
     JOIN car_secondary_state link ON link.state_id = s.id
     WHERE s.kind = 'secondary' GROUP BY s.id, s.label ORDER BY n DESC LIMIT 1`,
  );
  if (!secondary) {
    // No seeded car carries a secondary state — make one inside the transaction so the
    // link's own FK is the thing under test. Rolled back below with everything else.
    await c.query("BEGIN");
    secondary = await one(
      `INSERT INTO car_state (label, kind, sort, colour) VALUES ('Refusal probe', 'secondary', 900, '#334155')
       RETURNING id, label`,
    );
    const aCar = await one("SELECT id FROM car ORDER BY ref LIMIT 1");
    await c.query("INSERT INTO car_secondary_state (car_id, state_id) VALUES ($1, $2)", [aCar.id, secondary.id]);
    await c.query("COMMIT");
    await c.query("BEGIN");
  }

  const out = [];
  let allRefused = true;
  let parentSurvived = true;

  // -- the secondary state, occupied: the link's FK must refuse --
  {
    const beforeState = await count("SELECT count(*)::int n FROM car_state WHERE id = $1", [secondary.id]);
    const beforeCars = await count("SELECT count(*)::int n FROM car_secondary_state WHERE state_id = $1", [secondary.id]);
    const r = await tryRefusal(c, "DELETE FROM car_state WHERE id = $1", [secondary.id]);
    const afterState = await count("SELECT count(*)::int n FROM car_state WHERE id = $1", [secondary.id]);
    const afterCars = await count("SELECT count(*)::int n FROM car_secondary_state WHERE state_id = $1", [secondary.id]);
    const survived = afterState === beforeState && afterCars === beforeCars;
    const rightRule = r.refused && r.code === "23001" && r.constraint === "car_secondary_state_state_id_fkey";
    if (!rightRule || !survived) allRefused = false;
    if (!survived) parentSurvived = false;
    out.push(
      `secondary '${secondary.label}' (${beforeCars} car(s)) → ${r.refused ? `${r.code} ${r.constraint}` : "ACCEPTED"} · parent survived: ${survived}`,
    );
  }

  // -- the enquiry state, occupied: its FK must refuse --
  {
    const st = await one(
      `SELECT s.id, s.label, count(e.id)::int n FROM enquiry_state s JOIN enquiry e ON e.enquiry_state_id = s.id
       GROUP BY s.id, s.label ORDER BY n DESC LIMIT 1`,
    );
    if (st) {
      const beforeState = await count("SELECT count(*)::int n FROM enquiry_state WHERE id = $1", [st.id]);
      const beforeEnq = await count("SELECT count(*)::int n FROM enquiry WHERE enquiry_state_id = $1", [st.id]);
      const r = await tryRefusal(c, "DELETE FROM enquiry_state WHERE id = $1", [st.id]);
      const afterState = await count("SELECT count(*)::int n FROM enquiry_state WHERE id = $1", [st.id]);
      const afterEnq = await count("SELECT count(*)::int n FROM enquiry WHERE enquiry_state_id = $1", [st.id]);
      const survived = afterState === beforeState && afterEnq === beforeEnq;
      const rightRule = r.refused && r.code === "23001" && r.constraint === "enquiry_enquiry_state_id_fkey";
      if (!rightRule || !survived) allRefused = false;
      if (!survived) parentSurvived = false;
      out.push(
        `enquiry state '${st.label}' (${beforeEnq} enquiry(ies)) → ${r.refused ? `${r.code} ${r.constraint}` : "ACCEPTED"} · parent survived: ${survived}`,
      );
    }
  }

  // -- a primary state a car sits in: a stronger rule refuses first --
  if (primary) {
    const beforeState = await count("SELECT count(*)::int n FROM car_state WHERE id = $1", [primary.id]);
    const r = await tryRefusal(c, "DELETE FROM car_state WHERE id = $1", [primary.id]);
    const afterState = await count("SELECT count(*)::int n FROM car_state WHERE id = $1", [primary.id]);
    const survived = afterState === beforeState;
    const rightRule = r.refused && r.code === "23514" && /the four primary car states are fixed/.test(r.message);
    if (!rightRule || !survived) allRefused = false;
    if (!survived) parentSurvived = false;
    out.push(
      `primary '${primary.label}' (${primary.n} car(s)) → ${r.refused ? `${r.code} "${String(r.message).slice(0, 62)}…"` : "ACCEPTED"} · parent survived: ${survived}`,
    );
  }

  return record({
    id: "C",
    claim: "a state deleted while occupied",
    asked: "DELETE the car's own state, the link's secondary state, and the enquiry's state while rows sit in them",
    returned: out.join(" · "),
    rule:
      "car.state_id / car_secondary_state.state_id / enquiry.enquiry_state_id are ON DELETE RESTRICT (23001), and since 0020 a primary state is refused by car_state_primaries_are_final (23514)",
    verdict: allRefused && parentSurvived ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: !parentSurvived,
    extra: {},
  });
}

async function tryRefusal(c, sql, params) {
  const mark = `sp_${Math.random().toString(36).slice(2, 8)}`;
  await c.query(`SAVEPOINT ${mark}`);
  let refused = false;
  let code = "";
  let constraint = "";
  let message = "";
  try {
    await c.query(sql, params);
  } catch (err) {
    refused = true;
    code = err.code ?? "";
    constraint = err.constraint ?? "";
    message = (err.message ?? "").split("\n")[0];
  } finally {
    await c.query(`ROLLBACK TO SAVEPOINT ${mark}`);
  }
  return { refused, code, constraint, message };
}

async function caseHStore(c) {
  // The hash is the store's to supply, not a caller's: a write that leaves it out is refused.
  const car = (await c.query("SELECT id, ref FROM car ORDER BY ref LIMIT 1")).rows[0];
  const r = await tryRefusal(c, "UPDATE car SET content_hash = NULL WHERE id = $1", [car.id]);
  const back = (await c.query("SELECT content_hash FROM car WHERE id = $1", [car.id])).rows[0];
  const unchanged = back && back.content_hash !== null;
  return record({
    id: "H-store",
    claim: "the stored hash cannot be supplied or dropped by the caller",
    asked: `UPDATE car SET content_hash = NULL WHERE ref = '${car.ref}'`,
    returned: r.refused ? `refused ${r.code}${r.constraint ? ` ${r.constraint}` : ""}` : "ACCEPTED",
    rule: "car.content_hash is NOT NULL — only the server's recomputation can fill it",
    verdict: r.refused && unchanged ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: !unchanged,
    extra: {},
  });
}

async function caseI(c) {
  const car = (await c.query("SELECT id, ref FROM car ORDER BY ref LIMIT 1")).rows[0];
  const enq = (await c.query("SELECT id FROM enquiry ORDER BY created_at LIMIT 1")).rows[0];
  const out = [];
  let allRefused = true;

  // A trigger names itself in its message (there is no constraint to name), so the rule is
  // read from the answer's words AND its SQLSTATE — not just that *something* was refused.
  const namesItself = (r) => r.refused && r.code === "23514" && /identity is final: \w+\.(id|ref)/.test(r.message);

  const r1 = await tryRefusal(c, "UPDATE car SET ref = ref || '-X' WHERE id = $1", [car.id]);
  const back1 = (await c.query("SELECT ref FROM car WHERE id = $1", [car.id])).rows[0];
  if (!namesItself(r1) || back1.ref !== car.ref) allRefused = false;
  out.push(`car.ref '${car.ref}' → ${r1.refused ? `${r1.code} "${r1.message}"` : "ACCEPTED"}`);

  const r2 = await tryRefusal(c, "UPDATE car SET id = gen_random_uuid() WHERE id = $1", [car.id]);
  const back2 = (await c.query("SELECT id FROM car WHERE ref = $1", [car.ref])).rows[0];
  if (!namesItself(r2) || !back2 || back2.id !== car.id) allRefused = false;
  out.push(`car.id → ${r2.refused ? `${r2.code} "${r2.message}"` : "ACCEPTED"}`);

  if (enq) {
    const r3 = await tryRefusal(c, "UPDATE enquiry SET id = gen_random_uuid() WHERE id = $1", [enq.id]);
    const back3 = (await c.query("SELECT count(*)::int n FROM enquiry WHERE id = $1", [enq.id])).rows[0];
    if (!namesItself(r3) || Number(back3.n) !== 1) allRefused = false;
    out.push(`enquiry.id → ${r3.refused ? `${r3.code} "${r3.message}"` : "ACCEPTED"}`);
  }

  return record({
    id: "I",
    claim: "a request trying to change an identity",
    asked: "UPDATE a car's ref, a car's id, and an enquiry's id",
    returned: out.join(" · "),
    rule:
      "refuse_identity_change() (migrations/0018) — 'identity is final: %.id / %.ref cannot be changed' (23514, the trigger names itself)",
    verdict: allRefused ? "REFUSED, as it must be" : "NOT PROVEN",
    changed: !allRefused,
    extra: {},
  });
}

// ---------------------------------------------------------------------------
// Run it.
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Task 30 — the ten refusals · office ${ORIGIN}\n`);

  // The HTTP legs first, around a read-only store fingerprint ("nothing changed").
  let before = null;
  let after = null;
  let fpError = null;
  try {
    before = await fingerprint();
  } catch (e) {
    fpError = e.message;
  }

  await caseA();
  await caseB();
  await caseG();
  await caseJ();

  if (before) {
    try {
      after = await fingerprint();
    } catch (e) {
      fpError = e.message;
    }
  }

  // The pure legs.
  caseD();
  caseE();
  await caseF();
  caseHReader();

  // The scratch legs.
  let c = null;
  try {
    c = await openScratch();
    await c.query("BEGIN");
    await caseC(c);
    await caseHStore(c);
    await caseI(c);
    await c.query("ROLLBACK");
  } finally {
    if (c) {
      await c.end();
      const admin = new Client({ connectionString: new URL(process.env.DATABASE_URL).toString() });
      await admin.connect();
      await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
      await admin.end();
    }
  }

  // The HTTP legs changed nothing — shown by the fingerprint, not asserted.
  if (before && after) {
    const same = JSON.stringify(before) === JSON.stringify(after);
    record({
      id: "HTTP",
      claim: "the HTTP refusals changed nothing",
      asked: "the live store's row counts, before and after A · B · G · J",
      returned: same ? "identical before and after" : `before ${JSON.stringify(before)} · after ${JSON.stringify(after)}`,
      rule: "a refused request cannot write; the counts show it",
      verdict: same ? "REFUSED, as it must be" : "NOT PROVEN",
      changed: !same,
      extra: { before, after },
    });
  } else {
    console.log(`(the live-store fingerprint could not be read: ${fpError ?? "unknown"})\n`);
  }

  const bad = cases.filter((c) => c.verdict !== "REFUSED, as it must be");
  const notRun = cases.filter((c) => c.extra?.notRun);
  console.log("─".repeat(72));
  console.log(`cases: ${cases.length} · refused as they must be: ${cases.length - bad.length} · not proven: ${bad.length}`);
  if (notRun.length) console.log(`not run: ${notRun.map((c) => c.id).join(", ")}`);
  for (const b of bad) console.log(`  NOT PROVEN [${b.id}] ${b.claim} — returned: ${b.returned}`);

  writeFileSync(join(RUNS, "refusals.json"), JSON.stringify({ at: new Date().toISOString(), origin: ORIGIN, cases }, null, 2));
  console.log(`report: ${join(RUNS, "refusals.json")}`);

  process.exit(bad.length === 0 ? 0 : 1);
}

await main();
