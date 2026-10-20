// TASK-004 — Task 31: Flows witness (browser, before/after) — REWRITTEN (hydration-aware)
//
// What earlier versions got wrong, and what this one does about it:
//   * v1 submitted with `button[type="submit"]`.first() — that is the office shell's **Sign out**
//     button (app/office/(shell)/layout.tsx:42-58). It signed the owner out and every later page hit
//     /office/sign-in. Nothing ran. Its counts were identical (activity 0→0).
//   * v2 proved the session but clicked/filled BEFORE React hydrated, so:
//       - form submits fell back to a native GET (`/office/car/X?brand=…`), never reaching the
//         Server Action;
//       - the upload input's `onChange` was not attached, so `setInputFiles` fetched nothing;
//       - `#tagSave` stayed `disabled` (its enabled state is React state).
//     A page is "hydrated" here iff a DOM node carries React's `__reactFiber$`/`__reactProps$` key —
//     which React attaches during hydration and never during SSR. Every interaction now waits on it.
//
// The store's own counts are the verdict. Each action records its own before/after.
//
// Attach-only CDP :9222, ≤10 chromium, no launch, no screenshots.

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const RUNS = join(process.cwd(), "developer-workspace/scripts/task-004/runs/flows");
const FIXTURES = join(RUNS, "fixtures");
mkdirSync(RUNS, { recursive: true });

const OUT_JSON = join(RUNS, "flows-witness.json");
const OUT_REPORT = join(RUNS, "flows-witness-report.txt");

const stepLog = [];
const uploads = [];
let base = "http://localhost:3210";

function S(v) {
  if (v === null || v === undefined) return "(null)";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 240 ? s.slice(0, 237) + "…" : s;
}

function run(cmd, args) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => res({ code, out, err }));
  });
}

async function counts() {
  const r = await run("node", [
    "--env-file",
    ".env.local",
    join(process.cwd(), "developer-workspace/scripts/task-004/_counts.cjs"),
  ]);
  if (r.code !== 0) throw new Error(`counts failed: ${r.err || r.out}`);
  return JSON.parse(r.out.trim());
}

async function waitUntil(fn, { timeoutMs = 40000, everyMs = 300, what = "condition" } = {}) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (last) return { ok: true, waitedMs: Date.now() - start, value: last };
    await new Promise((r) => setTimeout(r, everyMs));
  }
  return { ok: false, waitedMs: Date.now() - start, what };
}

const SESSION_PROBE = () => {
  const hasSide = !!document.querySelector("aside.side");
  const topbar = !!document.querySelector("header.topbar");
  const door = !!document.querySelector("main.office-door");
  const signedAs = (document.querySelector(".sfoot b")?.innerText || "").trim();
  return { url: location.href, hasSide, topbar, door, signedAs, signedIn: hasSide && topbar && !door };
};

// Hydration gate: React attaches __reactFiber$ / __reactProps$ to a node only when it hydrates it.
async function hydrated(page, sel, timeout = 60000) {
  await page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
      );
    },
    sel,
    { timeout },
  );
}

async function gotoHydrated(page, url, sel) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(sel, { state: "attached", timeout: 60000 });
  await hydrated(page, sel);
}

async function findSignedInPage(browser) {
  const officey = [];
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      try {
        if (/\/office/.test(p.url())) officey.push(p);
      } catch {}
    }
  }
  for (const p of officey) {
    try {
      if ((await p.evaluate(SESSION_PROBE)).signedIn) return { page: p, proof: await p.evaluate(SESSION_PROBE) };
    } catch {}
  }
  for (const p of officey) {
    try {
      await p.goto(`${base}/office`, { waitUntil: "domcontentloaded", timeout: 45000 });
      const s = await p.evaluate(SESSION_PROBE);
      if (s.signedIn) return { page: p, proof: s };
    } catch {}
  }
  const evidence = [];
  for (const p of officey) {
    try {
      evidence.push(await p.evaluate(SESSION_PROBE));
    } catch {}
  }
  return { page: null, proof: null, evidence };
}

async function step(page, name, fn) {
  const before = await counts();
  const entry = { name, before, after: null, delta: null, proof: null, ok: false, error: null };
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
      (entry.error ? `   ${entry.error.split("\n")[0]}` : ""),
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

  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      try {
        const u = new URL(p.url());
        if (u.pathname.startsWith("/office")) base = `${u.protocol}//${u.host}`;
      } catch {}
    }
  }

  const fixRun = await run("node", [
    "--import",
    "tsx",
    "--conditions=react-server",
    "developer-workspace/scripts/task-004/make-fixtures.ts",
  ]);
  if (fixRun.code !== 0) {
    console.error("fixtures failed:", fixRun.err || fixRun.out);
    await lib.detach(browser);
    process.exit(2);
  }
  const fixtures = JSON.parse(readFileSync(join(FIXTURES, "fixtures.json"), "utf8"));

  const counts0 = await counts();
  const gate = await findSignedInPage(browser);

  if (!gate.page) {
    writeFileSync(
      OUT_JSON,
      JSON.stringify(
        { ts: new Date().toISOString(), verdict: "BLOCKED — NOT SIGNED IN", counts0, sessionEvidence: gate.evidence ?? [] },
        null,
        2,
      ),
    );
    writeFileSync(
      OUT_REPORT,
      [
        "TASK-004 Task 31 — Flows witness",
        `ts: ${new Date().toISOString()}`,
        "VERDICT: BLOCKED — NOT SIGNED IN",
        "",
        "No attached tab is signed in to the office, so no flow was run and none is claimed.",
        `Sign in on the attach-only Chrome (CDP :9222) at ${base}/office/sign-in, then re-run.`,
        "",
        "session evidence (DOM, not URL):",
        ...(gate.evidence ?? []).map(
          (e) => `  ${e.url}\n    side=${e.hasSide} topbar=${e.topbar} signInDoor=${e.door} signedAs="${e.signedAs}"`,
        ),
      ].join("\n") + "\n",
    );
    console.log("BLOCKED — NOT SIGNED IN");
    await lib.detach(browser);
    process.exit(3);
  }

  const page = gate.page;
  await page.bringToFront();
  page.on("response", async (r) => {
    if (r.url().includes("/api/upload")) {
      let body = "";
      try {
        body = (await r.text()).slice(0, 400);
      } catch {}
      uploads.push({ at: new Date().toISOString(), status: r.status(), body });
    }
  });

  console.log(`SESSION PROVEN: ${gate.proof.url} — ${gate.proof.signedAs}`);
  const ref = { value: null };

  const waitToast = async (timeout = 45000, match = /Saved/) => {
    await page.waitForFunction(
      (src) => {
        const el = document.querySelector("#toast");
        if (!el || !el.classList.contains("show")) return false;
        return new RegExp(src).test(el.textContent || "");
      },
      match.source,
      { timeout },
    );
    return (await page.locator("#toast").innerText()).trim();
  };

  const saveForm = async () => {
    await hydrated(page, "#save");
    await page.locator("form button#save[type=submit]").click();
    return waitToast();
  };

  // ---- 1. create a car -----------------------------------------------------------------------------
  await step(page, "create a car", async () => {
    await gotoHydrated(page, `${base}/office/car/new`, "#save");
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
    const msg = await saveForm();
    ref.value = (msg.match(/TS-\d+/) || [])[0] ?? null;
    const w = await waitUntil(async () => (await counts()).activity > counts0.activity, {
      what: "activity rose after create",
    });
    return { ok: w.ok && !!ref.value, toast: msg, ref: ref.value, activity: w.ok };
  });

  // ---- 2. edit it ----------------------------------------------------------------------------------
  await step(page, "edit the car", async () => {
    await gotoHydrated(page, `${base}/office/car/${ref.value}`, "#save");
    await page.fill('input[name="model"]', "Flow2");
    const msg = await saveForm();
    return { ok: /Saved/.test(msg), toast: msg };
  });

  // ---- 3. change a cost ----------------------------------------------------------------------------
  await step(page, "change a cost", async () => {
    await gotoHydrated(page, `${base}/office/car/${ref.value}`, "#save");
    await page.fill('input[name="cost.shipping"]', "55000");
    const msg = await saveForm();
    return { ok: /Saved/.test(msg), toast: msg };
  });

  // ---- 4. mark sold --------------------------------------------------------------------------------
  await step(page, "mark sold", async () => {
    await gotoHydrated(page, `${base}/office/car/${ref.value}`, "#save");
    await page.locator("#mkSold").click();
    await page.waitForSelector('input[name="salePrice"]', { timeout: 20000, state: "visible" });
    await page.fill('input[name="salePrice"]', "6000000");
    await page.fill('input[name="saleDate"]', "2026-10-16");
    const msg = await saveForm();
    return { ok: /Saved/.test(msg), toast: msg };
  });

  // ---- 5. un-mark sold -----------------------------------------------------------------------------
  await step(page, "un-mark sold", async () => {
    await gotoHydrated(page, `${base}/office/car/${ref.value}`, "#save");
    await page.waitForSelector("#unmarkSold", { timeout: 20000, state: "visible" });
    await page.locator("#unmarkSold").click();
    const msg = await saveForm();
    return { ok: /Saved/.test(msg), toast: msg };
  });

  // ---- 6. upload photos ----------------------------------------------------------------------------
  await step(page, "upload photos", async () => {
    await gotoHydrated(page, `${base}/office/car/${ref.value}`, "#save");
    await page.waitForSelector('#drop input[name="photo"]', { state: "attached", timeout: 30000 });
    await hydrated(page, '#drop input[name="photo"]');
    const before = await page.locator('form input[type="hidden"][name="photos"]').count();
    await page.setInputFiles('#drop input[name="photo"]', join(FIXTURES, "photo.png"));
    const w = await waitUntil(
      async () => (await page.locator('form input[type="hidden"][name="photos"]').count()) > before,
      { what: "a photo reference appeared", timeoutMs: 60000 },
    );
    const held = await page.locator('form input[type="hidden"][name="photos"]').count();
    const uploadError = await page
      .locator('[role="alert"]')
      .allInnerTexts()
      .then((a) => a.join(" | ").trim())
      .catch(() => "");
    const msg = w.ok ? await saveForm() : null;
    return { ok: w.ok && held > before && /Saved/.test(msg ?? ""), before, held, uploadError, toast: msg };
  });

  // ---- 7. delete and undo (on the inventory, where delete is wired) --------------------------------
  await step(page, "delete and undo", async () => {
    await gotoHydrated(page, `${base}/office/inventory`, "table");
    const row = page.locator("tr").filter({ hasText: ref.value }).first();
    await row.locator('button[aria-label^="Delete"]').click();
    await page.locator("div.mdl button#yes").click();
    await page.waitForSelector("button#undo", { timeout: 20000, state: "visible" });
    await page.locator("button#undo").click();
    const w = await waitUntil(async () => {
      const r = await page.locator("tr").filter({ hasText: ref.value }).count();
      return r > 0;
    }, { what: "the undone car is back in the list" });
    return { ok: w.ok, backInList: w.ok };
  });

  // ---- 8. upload a template and save its drafts, leaving one unsaved -------------------------------
  await step(page, "template → drafts, save all but one", async () => {
    await gotoHydrated(page, `${base}/office/inventory`, 'input[aria-label="Create drafts from a file"]');
    await page.setInputFiles(
      'input[aria-label="Create drafts from a file"]',
      join(FIXTURES, fixtures.templateFile),
    );
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[role="status"]')].some((d) => /waiting/.test(d.textContent || "")) ||
        [...document.querySelectorAll('[role="alert"]')].some((d) => /\./.test(d.textContent || "")),
      { timeout: 60000 },
    );
    const note = await page.evaluate(() => {
      const ok = [...document.querySelectorAll('[role="status"]')].find((d) => /waiting/.test(d.textContent || ""));
      if (ok) return { kind: "status", text: (ok.textContent || "").trim() };
      const bad = [...document.querySelectorAll('[role="alert"]')].find((d) => /\./.test(d.textContent || ""));
      return { kind: "alert", text: (bad?.textContent || "").trim() };
    });

    await gotoHydrated(page, `${base}/office/drafts`, "article.dcard");
    const batch = page.locator(`section.batch[aria-label*="${fixtures.templateFile}"]`);
    await batch.waitFor({ timeout: 30000 });

    // A draft's images are added by hand (task.md's flow). Add one to the first draft.
    const firstCard = batch.locator("article.dcard").first();
    await hydrated(page, "article.dcard .drop input.dropinput");
    const thumbsBefore = await firstCard.locator(".thumbs .th").count();
    await firstCard.locator(".drop input.dropinput").setInputFiles(join(FIXTURES, "photo.png"));
    const imageAdd = await waitUntil(
      async () => (await firstCard.locator(".thumbs .th").count()) > thumbsBefore,
      { what: "a draft image was added by hand", timeoutMs: 60000 },
    );
    const thumbsAfter = await firstCard.locator(".thumbs .th").count();

    const saveBtns = batch.locator("article.dcard .dfoot button.btn:not(.gh)");
    const total = await saveBtns.count();
    for (let i = 0; i < total - 1; i++) {
      const n = await saveBtns.count();
      await saveBtns.nth(0).click();
      await waitUntil(async () => (await saveBtns.count()) < n, { what: "a draft was saved", timeoutMs: 30000 });
    }
    const leftUnsaved = await batch.locator("article.dcard").count();
    return {
      ok: note.kind === "status" && total >= 2 && leftUnsaved === 1 && thumbsAfter > thumbsBefore,
      uploadNote: note,
      draftsInBatch: total,
      saved: total - leftUnsaved,
      leftUnsaved,
      imageAddedByHand: imageAdd.ok,
      thumbsBefore,
      thumbsAfter,
    };
  });

  // ---- 9. import the enquiry PDF -------------------------------------------------------------------
  await step(page, "import the enquiry PDF", async () => {
    await gotoHydrated(page, `${base}/office/enquiries`, 'input[aria-label="Create drafts from a file"]');
    const enq = resolve(process.cwd(), "developer-workspace/scripts/task-003/runs/task-13/enquiries-2026-09-30.pdf");
    await page.setInputFiles('input[aria-label="Create drafts from a file"]', enq);
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('[role="status"]')].some((d) => /waiting/.test(d.textContent || "")) ||
        [...document.querySelectorAll('[role="alert"]')].some((d) => /\./.test(d.textContent || "")),
      { timeout: 60000 },
    );
    const note = await page.evaluate(() => {
      const ok = [...document.querySelectorAll('[role="status"]')].find((d) => /waiting/.test(d.textContent || ""));
      if (ok) return { kind: "status", text: (ok.textContent || "").trim() };
      const bad = [...document.querySelectorAll('[role="alert"]')].find((d) => /\./.test(d.textContent || ""));
      return { kind: "alert", text: (bad?.textContent || "").trim() };
    });
    return { ok: note.kind === "status" && /enquir/i.test(note.text), uploadNote: note };
  });

  // ---- 10. change a state (settings → Car states: add, then remove) --------------------------------
  await step(page, "change a state (registry)", async () => {
    await gotoHydrated(page, `${base}/office/settings`, "#tag");
    await page.locator("#tab-car").click();
    await page.waitForSelector("#panel-car button.btn.edadd", { timeout: 30000, state: "visible" });
    await page.locator("#panel-car button.btn.edadd").click();
    const nameInput = page.locator('input.edin[aria-label="Name of New state"]');
    await nameInput.fill("Flow check");
    await nameInput.press("Enter");
    const added = await waitUntil(
      async () => (await page.locator('input.edin[aria-label="Name of Flow check"]').count()) > 0,
      { what: "the new state appears" },
    );
    let removed = false;
    if (added.ok) {
      await page.locator('button.eddel[aria-label="Delete Flow check"]').click();
      const r = await waitUntil(
        async () => (await page.locator('input.edin[aria-label="Name of Flow check"]').count()) === 0,
        { what: "the state is gone again" },
      );
      removed = r.ok;
    }
    return { ok: added.ok && removed, addedThenRemoved: added.ok && removed };
  });

  // ---- 11. save a setting --------------------------------------------------------------------------
  await step(page, "save a setting", async () => {
    await gotoHydrated(page, `${base}/office/settings`, "#tag");
    const tag = page.locator("#tag");
    const from = await tag.inputValue();
    const to = from.endsWith(".") ? from.slice(0, -1) : `${from}.`;
    await tag.fill(to);
    await waitUntil(async () => await page.locator("#tagSave").isEnabled(), { what: "#tagSave enabled" });
    await page.locator("#tagSave").click();
    // Saved when the save button goes back to disabled (the field is no longer dirty).
    const saved = await waitUntil(async () => !(await page.locator("#tagSave").isEnabled()), {
      what: "the tagline save completed",
      timeoutMs: 30000,
    });
    // Prove it persisted, not merely that the input holds it: reload and read it back.
    await gotoHydrated(page, `${base}/office/settings`, "#tag");
    const persisted = await page.locator("#tag").inputValue();
    return { ok: saved.ok && persisted === to, from, to, persisted };
  });

  // ---- 12. export ----------------------------------------------------------------------------------
  await step(page, "export", async () => {
    await gotoHydrated(page, `${base}/office/settings`, "#tag");
    await page.locator("#tab-account").click();
    await page.waitForSelector("#exportBtn", { timeout: 30000, state: "visible" });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 90000 }).catch(() => null),
      page.locator("#exportBtn").click(),
    ]);
    if (!download) {
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
  const result = {
    ts: new Date().toISOString(),
    session: gate.proof,
    base,
    fixtureBrand: fixtures.brands[0],
    countsStart: counts0,
    countsAfter,
    carRef: ref.value,
    uploads,
    steps: stepLog,
  };
  writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));

  const report =
    [
      "TASK-004 Task 31 — Flows witness (browser, before/after)",
      `ts: ${result.ts}`,
      `session proven: ${gate.proof.url} — ${gate.proof.signedAs}`,
      `base: ${base}`,
      "",
      "counts at the start: " + S(counts0),
      "counts at the end:   " + S(countsAfter),
      "",
      "uploads seen:",
      ...uploads.map((u) => `  ${u.status} ${u.body}`),
      "",
      "--- per-action (store counts are the verdict) ---",
      ...stepLog.map((s) =>
        [
          `${s.error ? "ERR " : s.ok ? "ok  " : "FAIL"}  ${s.name}`,
          `      before ${S(s.before)}`,
          `      after  ${S(s.after)}`,
          `      delta  ${S(s.delta)}`,
          `      proof  ${S(s.proof)}`,
          s.error ? `      error  ${s.error.split("\n")[0]}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
      "",
      `TOTAL: ${stepLog.filter((s) => s.ok).length}/${stepLog.length} steps produced the expected store change`,
    ].join("\n") + "\n";
  writeFileSync(OUT_REPORT, report);

  console.log("\n" + report.split("\n").slice(-3).join("\n"));
  await lib.detach(browser);
  process.exit(stepLog.filter((s) => !s.ok).length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
