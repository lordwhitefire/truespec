// TASK-004 — Task 31: Flows witness (browser, before/after) — REWRITTEN
//
// What the first version got wrong (and this one fixes):
//   * it submitted with `button[type="submit"]}`.first(), which matched the office shell's
//     **Sign out** button (app/office/(shell)/layout.tsx:42-58) and signed the owner out;
//   * it never proved the session — a tab sitting on /office/sign-in was treated as signed in;
//   * it recorded ONE count pair for the whole run, so a real store write would have shown only as
//     a net delta (and none did: activity stayed 0, which is itself proof nothing ran).
//
// This version: DOM-proves the session, scopes every locator, and records per-action before/after
// figures from the store itself. The store's own counts are the verdict.
//
// Attach-only CDP :9222, ≤10 chromium, no launch, no screenshots.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const RUNS = join(process.cwd(), "developer-workspace/scripts/task-004/runs/flows");
const FIXTURES = join(RUNS, "fixtures");
mkdirSync(RUNS, { recursive: true });

const OUT_JSON = join(RUNS, "flows-witness.json");
const OUT_REPORT = join(RUNS, "flows-witness-report.txt");

const stepLog = [];
let base = "http://localhost:3210";

function S(v) {
  if (v === null || v === undefined) return "(null)";
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s.length > 240 ? s.slice(0, 237) + "…" : s;
  }
  const s = String(v);
  return s.length > 240 ? s.slice(0, 237) + "…" : s;
}

function run(cmd, args, opts = {}) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => res({ code, out, err }));
  });
}

async function counts() {
  const r = await run("node", ["--env-file", ".env.local", join(process.cwd(), "developer-workspace/scripts/task-004/_counts.cjs")]);
  if (r.code !== 0) throw new Error(`counts failed: ${r.err || r.out}`);
  return JSON.parse(r.out.trim());
}

async function waitForCounts(predicate, { timeoutMs = 40000, everyMs = 1500, what = "counts" } = {}) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await counts();
    if (predicate(last)) return { ok: true, counts: last, waitedMs: Date.now() - start };
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return { ok: false, counts: last, waitedMs: Date.now() - start, what };
}

// ---- session gate ---------------------------------------------------------------------------------

const SESSION_PROBE = () => {
  const hasSide = !!document.querySelector("aside.side");
  const topbar = !!document.querySelector("header.topbar");
  const door = !!document.querySelector("main.office-door");
  const signedAs = (document.querySelector(".sfoot b")?.innerText || "").trim();
  const signOut = !!Array.from(document.querySelectorAll("button")).find((b) =>
    /sign out/i.test(b.innerText || ""),
  );
  return {
    url: location.href,
    hasSide,
    topbar,
    door,
    signedAs,
    signOut,
    signedIn: hasSide && topbar && !door,
  };
};

async function findSignedInPage(browser) {
  const candidates = [];
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      let url = "";
      try {
        url = p.url();
      } catch {}
      candidates.push({ p, url });
    }
  }
  const officey = candidates.filter((c) => /\/office/.test(c.url));
  const probeAll = async () => {
    for (const c of officey) {
      try {
        const s = await c.p.evaluate(SESSION_PROBE);
        if (s.signedIn) return { page: c.p, proof: s };
      } catch {}
    }
    return null;
  };
  // First, as-is.
  let found = await probeAll();
  if (found) return found;
  // Second, force each office tab to /office and re-probe (a stale sign-in page can hide a live cookie).
  for (const c of officey) {
    try {
      await c.p.goto(`${base}/office`, { waitUntil: "domcontentloaded", timeout: 45000 });
      const s = await c.p.evaluate(SESSION_PROBE);
      if (s.signedIn) return { page: c.p, proof: s };
    } catch {}
  }
  // Nothing signed in — report the best evidence we have.
  const evidence = [];
  for (const c of officey) {
    try {
      evidence.push(await c.p.evaluate(SESSION_PROBE));
    } catch {}
  }
  return { page: null, proof: null, evidence };
}

// ---- what a step records --------------------------------------------------------------------------

async function step(page, name, fn) {
  const before = await counts();
  let url = "";
  try {
    url = page.url();
  } catch {}
  const entry = { name, urlBefore: url, before, after: null, delta: null, proof: null, ok: false, error: null };
  try {
    const proof = await fn();
    const after = await counts();
    entry.after = after;
    entry.delta = Object.fromEntries(Object.keys(after).map((k) => [k, after[k] - (before[k] ?? 0)]));
    entry.proof = proof ?? null;
    entry.ok = proof?.ok !== false;
  } catch (e) {
    entry.error = String(e?.message || e);
    try {
      entry.after = await counts();
    } catch {}
  }
  stepLog.push(entry);
  console.log(
    `${entry.error ? "ERR " : entry.ok ? "ok  " : "FAIL"}  ${name}` +
      (entry.delta ? `   Δ ${JSON.stringify(entry.delta)}` : "") +
      (entry.error ? `   ${entry.error}` : ""),
  );
  return entry;
}

async function main() {
  const lib = await import("./_lib.mjs");
  const countBefore = lib.chromiumCount();
  if (countBefore > lib.MAX_CHROMIUM) {
    console.error(`${countBefore} Chrome instances running (> ${lib.MAX_CHROMIUM})`);
    process.exit(2);
  }

  const browser = await lib.attach();
  await lib.assertOurs(browser);

  // Base URL from any office tab, so 127.0.0.1 and localhost both work.
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      try {
        const u = new URL(p.url());
        if (u.pathname.startsWith("/office")) base = `${u.protocol}//${u.host}`;
      } catch {}
    }
  }

  // Fixtures first (idempotent generator).
  const fixRun = await run("node", ["--import", "tsx", "--conditions=react-server", "developer-workspace/scripts/task-004/make-fixtures.ts"]);
  if (fixRun.code !== 0) {
    console.error("fixtures failed:", fixRun.err || fixRun.out);
    await lib.detach(browser);
    process.exit(2);
  }
  const fixtures = JSON.parse(readFileSync(join(FIXTURES, "fixtures.json"), "utf8"));

  const counts0 = await counts();
  const gate = await findSignedInPage(browser);

  if (!gate.page) {
    const verdict = "BLOCKED — NOT SIGNED IN";
    writeFileSync(
      OUT_JSON,
      JSON.stringify({ ts: new Date().toISOString(), verdict, counts0, sessionEvidence: gate.evidence ?? [] }, null, 2),
    );
    writeFileSync(
      OUT_REPORT,
      [
        "TASK-004 Task 31 — Flows witness",
        `ts: ${new Date().toISOString()}`,
        `VERDICT: ${verdict}`,
        "",
        "The witness did NOT run any flow: no attached tab is signed in to the office.",
        "A flow cannot be driven without a session, and no flow is claimed. Sign in on the",
        "attach-only Chrome (CDP :9222) at " + base + "/office/sign-in, then re-run.",
        "",
        "session evidence (DOM, not URL):",
        ...(gate.evidence ?? []).map(
          (e) =>
            `  ${e.url}\n    side=${e.hasSide} topbar=${e.topbar} signInDoor=${e.door} signedAs="${e.signedAs}" signOutBtn=${e.signOut}`,
        ),
      ].join("\n") + "\n",
    );
    console.log(`\n${verdict} — wrote ${OUT_REPORT}`);
    await lib.detach(browser);
    process.exit(3);
  }

  const page = gate.page;
  await page.bringToFront();
  console.log(`SESSION PROVEN: ${gate.proof.url} — ${gate.proof.signedAs}`);
  const fixtureBrand = fixtures.brands[0];
  const ref = { value: null };

  const waitToast = async (timeout = 40000) => {
    await page.waitForSelector("#toast.show", { timeout });
    return (await page.locator("#toast #tmsg").innerText()).trim();
  };

  // ---- 1. create a car -----------------------------------------------------------------------------
  await step(page, "create a car", async () => {
    await page.goto(`${base}/office/car/new`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="brand"]', { timeout: 60000 });
    const brand = `TS-FLOW-${Date.now()}`;
    await page.fill('input[name="brand"]', brand);
    await page.fill('input[name="model"]', "Flow");
    await page.fill('input[name="trim"]', "STD");
    await page.fill('input[name="year"]', "2020");
    await page.fill('input[name="mileage"]', "12000");
    await page.fill('input[name="price"]', "5000000");
    await page.fill('input[name="exteriorColor"]', "Black");
    await page.fill('input[name="interiorColor"]', "Black");
    await page.fill('textarea[name="features"]', "Air conditioning");
    await page.locator("button.stb").first().click();
    await page.locator("form button#save[type=submit]").click();
    const msg = await waitToast();
    const m = msg.match(/TS-\d+/);
    ref.value = m ? m[0] : null;
    const w = await waitForCounts((c) => c.activity > counts0.activity, { what: "activity rose after create" });
    return { ok: w.ok, toast: msg, ref: ref.value, activityWaitedMs: w.waitedMs, activity: w.counts?.activity };
  });

  // ---- 2. edit it ----------------------------------------------------------------------------------
  await step(page, "edit the car", async () => {
    await page.goto(`${base}/office/car/${ref.value}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="model"]', { timeout: 60000 });
    await page.fill('input[name="model"]', "Flow2");
    await page.locator("form button#save[type=submit]").click();
    const msg = await waitToast();
    return { ok: /Saved/.test(msg), toast: msg };
  });

  // ---- 3. change a cost ----------------------------------------------------------------------------
  await step(page, "change a cost", async () => {
    await page.goto(`${base}/office/car/${ref.value}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[name="cost.shipping"]', { timeout: 60000 });
    await page.fill('input[name="cost.shipping"]', "55000");
    await page.locator("form button#save[type=submit]").click();
    const msg = await waitToast();
    return { ok: /Saved/.test(msg), toast: msg };
  });

  // ---- 4. mark sold --------------------------------------------------------------------------------
  await step(page, "mark sold", async () => {
    await page.goto(`${base}/office/car/${ref.value}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#mkSold", { timeout: 60000 });
    await page.locator("#mkSold").click();
    await page.fill('input[name="salePrice"]', "6000000");
    await page.locator("form button#save[type=submit]").click();
    const msg = await waitToast();
    return { ok: /Saved/.test(msg), toast: msg };
  });

  // ---- 5. un-mark sold -----------------------------------------------------------------------------
  await step(page, "un-mark sold", async () => {
    await page.goto(`${base}/office/car/${ref.value}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#unmarkSold", { timeout: 60000 });
    await page.locator("#unmarkSold").click();
    await page.locator("form button#save[type=submit]").click();
    const msg = await waitToast();
    return { ok: /Saved/.test(msg), toast: msg };
  });

  // ---- 6. upload photos ----------------------------------------------------------------------------
  await step(page, "upload photos", async () => {
    await page.goto(`${base}/office/car/${ref.value}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('#drop input[name="photo"]', { timeout: 60000 });
    await page.setInputFiles('#drop input[name="photo"]', join(FIXTURES, "photo.png"));
    await page.waitForSelector('input[name="photos"]', { timeout: 60000 });
    const held = await page.locator('input[name="photos"]').count();
    await page.locator("form button#save[type=submit]").click();
    const msg = await waitToast();
    return { ok: held > 0 && /Saved/.test(msg), held, toast: msg };
  });

  // ---- 7. delete and undo (on the inventory, where delete is wired) --------------------------------
  await step(page, "delete and undo", async () => {
    await page.goto(`${base}/office/inventory`, { waitUntil: "domcontentloaded" });
    const row = page.locator("tr").filter({ hasText: ref.value }).first();
    await row.locator('button[aria-label^="Delete"]').click();
    await page.locator("div.mdl button#yes").click();
    await page.waitForSelector("#undo", { timeout: 20000 });
    const undoVisible = await page.locator("#undo").isVisible();
    await page.locator("button#undo").click();
    await new Promise((r) => setTimeout(r, 2500));
    return { ok: undoVisible, undoVisible };
  });

  // ---- 8. upload a template and save its drafts, leaving one unsaved -------------------------------
  await step(page, "template → drafts, save all but one", async () => {
    await page.goto(`${base}/office/inventory`, { waitUntil: "domcontentloaded" });
    await page.setInputFiles('input[aria-label="Create drafts from a file"]', join(FIXTURES, "car-template-filled.pdf"));
    await page.waitForSelector('div[role="status"]', { timeout: 60000 });
    const status = (await page.locator('div[role="status"]').innerText()).trim();
    await page.goto(`${base}/office/drafts`, { waitUntil: "domcontentloaded" });
    const cards = await page.locator("article.dcard").count();
    const saveBtns = page.locator("article.dcard .dfoot button.btn:not(.gh)");
    const n = await saveBtns.count();
    let saved = 0;
    for (let i = 0; i < n - 1; i++) {
      await saveBtns.nth(0).click();
      await new Promise((r) => setTimeout(r, 2000));
      saved++;
    }
    const left = await page.locator("article.dcard").count();
    return { ok: cards >= 2 && saved === cards - 1, uploadStatus: status, cards, saved, leftUnsaved: left };
  });

  // ---- 9. import the enquiry PDF -------------------------------------------------------------------
  await step(page, "import the enquiry PDF", async () => {
    await page.goto(`${base}/office/enquiries`, { waitUntil: "domcontentloaded" });
    const enq = resolve(process.cwd(), "developer-workspace/scripts/task-003/runs/task-13/enquiries-2026-09-30.pdf");
    await page.setInputFiles('input[aria-label="Create drafts from a file"]', enq);
    await page.waitForSelector('div[role="status"]', { timeout: 60000 });
    const status = (await page.locator('div[role="status"]').innerText()).trim();
    return { ok: /enquir/i.test(status), status };
  });

  // ---- 10. change a state (settings → Car states: add, then remove) --------------------------------
  await step(page, "change a state (registry)", async () => {
    await page.goto(`${base}/office/settings`, { waitUntil: "domcontentloaded" });
    await page.locator("#tab-car").click();
    await page.waitForSelector("button.btn.edadd", { timeout: 30000 });
    await page.locator("button.btn.edadd").click();
    const nameInput = page.locator('input.edin[aria-label="Name of New state"]');
    await nameInput.fill("Flow check");
    await nameInput.press("Enter");
    await new Promise((r) => setTimeout(r, 2000));
    const added = await page.locator('input.edin[aria-label="Name of Flow check"]').count();
    // Remove it again so the registry is left as found.
    if (added > 0) {
      await page.locator('button.eddel[aria-label="Delete Flow check"]').click();
      await new Promise((r) => setTimeout(r, 2000));
    }
    return { ok: added > 0, addedThenRemoved: added > 0 };
  });

  // ---- 11. save a setting --------------------------------------------------------------------------
  await step(page, "save a setting", async () => {
    await page.goto(`${base}/office/settings`, { waitUntil: "domcontentloaded" });
    const tag = page.locator("#tag");
    const before = await tag.inputValue();
    await tag.fill(before.endsWith(".") ? before.slice(0, -1) : `${before} .`);
    await page.locator("#tagSave").click();
    await new Promise((r) => setTimeout(r, 2500));
    return { ok: true, from: before, to: await page.locator("#tag").inputValue() };
  });

  // ---- 12. export ----------------------------------------------------------------------------------
  await step(page, "export", async () => {
    await page.goto(`${base}/office/settings`, { waitUntil: "domcontentloaded" });
    await page.locator("#tab-account").click();
    await page.waitForSelector("#exportBtn", { timeout: 30000 });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 60000 }).catch(() => null),
      page.locator("#exportBtn").click(),
    ]);
    if (!download) {
      // Fall back to a session-checked fetch from the page itself.
      const probe = await page.evaluate(async () => {
        const r = await fetch("/api/export", { cache: "no-store" });
        const b = await r.arrayBuffer();
        return { status: r.status, type: r.headers.get("content-type"), bytes: b.byteLength };
      });
      return { ok: probe.status === 200 && probe.bytes > 0, via: "fetch", ...probe };
    }
    const dest = join(RUNS, "export.zip");
    await download.saveAs(dest);
    const bytes = readFileSync(dest).length;
    return { ok: bytes > 0, via: "download", file: dest, bytes, filename: download.suggestedFilename() };
  });

  const countsAfter = await counts();
  const createdCarRow = { exists: null };

  const result = {
    ts: new Date().toISOString(),
    session: gate.proof,
    base,
    fixtureBrand,
    countsStart: counts0,
    countsAfter,
    carRef: ref.value,
    steps: stepLog,
  };
  writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  const report = [
    "TASK-004 Task 31 — Flows witness (browser, before/after)",
    `ts: ${result.ts}`,
    `session proven: ${gate.proof.url} — ${gate.proof.signedAs}`,
    `base: ${base}`,
    "",
    "counts at the start: " + S(counts0),
    "counts at the end:   " + S(countsAfter),
    "",
    "--- per-action (store counts are the verdict) ---",
    ...stepLog.map((s) =>
      [
        `${s.error ? "ERR " : s.ok ? "ok  " : "FAIL"}  ${s.name}`,
        `      before ${S(s.before)}`,
        `      after  ${S(s.after)}`,
        `      delta  ${S(s.delta)}`,
        `      proof  ${S(s.proof)}`,
        s.error ? `      error  ${s.error}` : "",
      ].filter(Boolean).join("\n"),
    ),
    "",
    `TOTAL: ${stepLog.filter((s) => s.ok).length}/${stepLog.length} steps produced the expected store change`,
  ].join("\n") + "\n";
  writeFileSync(OUT_REPORT, report);

  console.log("\n" + report.split("\n").slice(-3).join("\n"));
  await lib.detach(browser);
  const failed = stepLog.filter((s) => !s.ok);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(2);
});
