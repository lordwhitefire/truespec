// TASK-005 plan Task 17 — focus survives a row removal and a refused save.
//
// Live, signed in, keyboard for the tested flow. Two throwaway demo cars are created through the
// office's own form, used for the two removal cases (middle row → the next row's delete control;
// last row in the visible list → the list's heading), undone after each, then removed for good —
// net-zero on the live count. The refusal cases write nothing: client field errors stop before the
// action; a missing brand is refused by the server before any insert; an edit with a tampered
// `carId` is refused before any update.
//
// Attach-only (never launches a Chrome).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import {
  BASE,
  attach,
  assertOurs,
  detach,
  guardCount,
  chromiumCount,
  twoTabs,
} from "./_lib.mjs";

const RUNS = new URL("./runs/task17/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const env = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8");
const dbUrl = env
  .match(/^DATABASE_URL=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
if (!dbUrl) throw new Error("DATABASE_URL not found in .env.local");
const run = neon(dbUrl);
const carByRef = async (ref) =>
  (await run`SELECT id, ref, brand, model, deleted_at, updated_at FROM car WHERE ref = ${ref}`)[0] ?? null;
const liveCount = async () => (await run`SELECT count(*)::int AS n FROM car WHERE deleted_at IS NULL`)[0].n;

const before = guardCount();
const browser = await attach();
const stamp = Date.now();
const brand = `TS-T17-${stamp}`;
const r = {
  when: new Date().toISOString(),
  base: BASE,
  brand,
  created: [],
  removal: {},
  refusals: {},
  net: {},
};

const waitUntil = async (fn, { timeoutMs = 60000, everyMs = 250, what = "condition" } = {}) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await fn()) return { ok: true };
    await new Promise((res) => setTimeout(res, everyMs));
  }
  return { ok: false, what };
};

const hydrated = (page, sel, timeout = 120000) =>
  page.waitForFunction(
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

async function gotoHydrated(page, url, sel) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (!res || res.status() < 500) break;
    if (attempt === 2) throw new Error(`${url} answered ${res.status()}`);
    await page.waitForTimeout(5000);
  }
  await page.waitForSelector(sel, { state: "attached", timeout: 120000 });
  await hydrated(page, sel);
}

const active = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    if (!a) return null;
    return {
      tag: a.tagName,
      id: a.id || null,
      className: typeof a.className === "string" ? a.className : null,
      carId: a.getAttribute("data-car-id"),
      ariaLabel: a.getAttribute("aria-label"),
      text: (a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
    };
  });

async function createThrowaway(page, model) {
  await gotoHydrated(page, `${BASE}/office/car/new`, "#save");
  await page.fill('input[name="brand"]', brand);
  await page.fill('input[name="model"]', model);
  await page.fill('input[name="trim"]', "STD");
  await page.fill('input[name="year"]', "2020");
  await page.fill('input[name="mileage"]', "12000");
  await page.fill('input[name="price"]', "5000000");
  await page.fill('input[name="exteriorColor"]', "Black");
  await page.fill('input[name="interiorColor"]', "Black");
  await page.fill('textarea[name="features"]', "Air conditioning");
  await page.locator("button.stb").first().click();
  await page.locator("form button#save[type=submit]").click();
  const saved = await waitUntil(
    async () => {
      const text = await page
        .evaluate(() => {
          const el = document.querySelector("#toast");
          return el && el.classList.contains("show") ? el.textContent || "" : "";
        })
        .catch(() => "");
      return /Saved .*TS-\d+/.test(text);
    },
    { what: "the save toast", timeoutMs: 90000, everyMs: 300 },
  );
  const toast = (
    await page.evaluate(() => (document.querySelector("#toast")?.textContent || "").trim())
  ).replace(/\s+/g, " ");
  const ref = (toast.match(/TS-\d+/) || [])[0] ?? null;
  if (!saved.ok || !ref) throw new Error(`throwaway not saved: ${toast}`);
  r.created.push({ model, ref });
  return ref;
}

async function confirmDeleteFromRow(page, row) {
  await row.locator("button.ab.del").evaluate((el) => el.focus());
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !!document.querySelector("#ovl")?.open, null, {
    timeout: 30000,
  });
  // The platform puts focus on the first control after opening; wait for that fixup rather than
  // tabbing from the document.
  await page.waitForFunction(() => document.activeElement?.id === "no", null, { timeout: 15000 });
  const first = await active(page);
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => document.activeElement?.id === "yes", null, { timeout: 15000 });
  const second = await active(page);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !document.querySelector("#ovl")?.open, null, {
    timeout: 30000,
  });
  return { first, second };
}

async function undo(page) {
  await page.waitForFunction(() => {
    const b = document.querySelector("#undo");
    return b && !b.hidden;
  }, null, { timeout: 30000 });
  await page.evaluate(() => document.getElementById("undo")?.click());
  await page.waitForTimeout(700);
}

try {
  await assertOurs(browser);
  const { b: page } = await twoTabs(browser);

  const countBefore = await liveCount();
  r.countBefore = countBefore;

  const refA = await createThrowaway(page, "A");
  const refB = await createThrowaway(page, "B");
  r.created[0].stored = await carByRef(refA);
  r.created[1].stored = await carByRef(refB);

  // ---- the list: filter to the two throwaways so the cases are deterministic --------------------
  await gotoHydrated(page, `${BASE}/office/inventory`, "table");
  await page.fill("#q", brand);
  await page.waitForFunction(() => document.querySelectorAll("#rows tr").length === 2, null, {
    timeout: 30000,
  });

  const rows = page.locator("#rows tr");
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#rows tr")).map((tr) => ({
      ref: (tr.innerText.match(/TS-\d+/) || [])[0] ?? null,
      carId: tr.querySelector("button.ab.del")?.getAttribute("data-car-id") ?? null,
    })),
  );
  r.removal.filteredRows = ids;

  // ---- middle row: delete the first of the two; the next row's delete control takes focus ------
  r.removal.middle = await confirmDeleteFromRow(page, rows.nth(0));
  await page.waitForFunction(
    () => {
      const a = document.activeElement;
      return a?.matches?.("button.ab.del") || a?.id === "inv-h";
    },
    null,
    { timeout: 15000 },
  );
  r.removal.middle.focus = await active(page);
  r.removal.middle.nextId = ids[1]?.carId ?? null;
  r.removal.middle.pass =
    r.removal.middle.focus?.carId === r.removal.middle.nextId && !!r.removal.middle.nextId;

  await undo(page);
  await page.waitForFunction(() => document.querySelectorAll("#rows tr").length === 2, null, {
    timeout: 30000,
  });

  // ---- last row in the visible list: delete the second; the list's heading takes focus ---------
  r.removal.last = await confirmDeleteFromRow(page, rows.nth(1));
  await page.waitForFunction(
    () => document.activeElement?.id === "inv-h",
    null,
    { timeout: 15000 },
  );
  r.removal.last.focus = await active(page);
  r.removal.last.pass = r.removal.last.focus?.id === "inv-h";

  await undo(page);
  await page.waitForFunction(() => document.querySelectorAll("#rows tr").length === 2, null, {
    timeout: 30000,
  });

  // ---- cleanup: remove both throwaways for good (via the tombstones) ---------------------------
  await page.fill("#q", "");
  await page.waitForTimeout(400);
  for (const ref of [refA, refB]) {
    const row = page.locator("#rows tr").filter({ hasText: ref }).first();
    await row.locator("button.ab.del").click();
    await page.waitForFunction(() => !!document.querySelector("#ovl")?.open, null, {
      timeout: 30000,
    });
    await page.locator("#ovl button#yes").click();
    await page.waitForFunction(() => !document.querySelector("#ovl")?.open, null, {
      timeout: 30000,
    });
    await page.waitForTimeout(500);
  }
  await waitUntil(
    async () => {
      for (const ref of [refA, refB]) {
        const c = await carByRef(ref);
        if (!c || c.deleted_at === null) return false;
      }
      return true;
    },
    { what: "both tombstones written", timeoutMs: 30000, everyMs: 300 },
  );

  await gotoHydrated(page, `${BASE}/office/inventory`, "table");
  const clearout = page.locator(".clearout");
  await clearout.waitFor({ state: "visible", timeout: 45000 });
  r.removal.tombstonesListed = (await clearout.innerText()).includes(refA) &&
    (await clearout.innerText()).includes(refB);
  for (const ref of [refA, refB]) {
    const trow = clearout.locator("li").filter({ hasText: ref }).first();
    await trow.locator("button", { hasText: "Remove for good" }).click();
    await trow.locator("button", { hasText: "Keep it" }).waitFor({ state: "visible", timeout: 15000 });
    await trow.locator("button.danger", { hasText: "Remove for good" }).click();
    await waitUntil(
      async () =>
        (await page.locator(".clearout li").filter({ hasText: ref }).count().catch(() => 0)) === 0,
      { what: `the ${ref} row removed`, timeoutMs: 30000, everyMs: 300 },
    );
  }

  // ---- a refused save, field level (the client's own rule): the first invalid amount -----------
  await gotoHydrated(page, `${BASE}/office/car/new`, "#save");
  await page.fill('input[name="brand"]', brand);
  await page.fill('input[name="model"]', "RefuseA");
  await page.fill('input[name="year"]', "2020");
  await page.fill('input[name="mileage"]', "1000");
  await page.fill('input[name="price"]', "abc");
  await page.fill('input[name="wasPrice"]', "def");
  const invalidBefore = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-invalid="true"]')).map((el) => el.id),
  );
  await page.locator("form button#save[type=submit]").click();
  await page.waitForTimeout(500);
  r.refusals.client = {
    invalidBefore,
    focus: await active(page),
    pass: (await active(page))?.id === "f-price",
  };

  // ---- a refused save, field level (the server's rule): the missing make ----------------------
  await gotoHydrated(page, `${BASE}/office/car/new`, "#save");
  await page.fill('input[name="model"]', "RefuseB");
  await page.fill('input[name="year"]', "2020");
  await page.fill('input[name="mileage"]', "1000");
  await page.fill('input[name="price"]', "5000000");
  await page.locator("button.stb").first().click();
  await page.locator("form button#save[type=submit]").click();
  await page.waitForFunction(() => !!document.getElementById("formErr"), null, { timeout: 60000 });
  await page.waitForTimeout(300);
  r.refusals.serverField = {
    focus: await active(page),
    block: await page.evaluate(() => document.getElementById("formErr")?.innerText ?? null),
    pass: (await active(page))?.id === "f-brand",
  };

  // ---- a form-level refusal: an edit whose carId is not a car (nothing is written) --------------
  const beforeEdit = await carByRef("TS-1001");
  await gotoHydrated(page, `${BASE}/office/car/TS-1001`, "#save");
  await page.evaluate(() => {
    const el = document.querySelector('input[name="carId"]');
    if (el) el.value = "not-a-car-id";
  });
  await page.locator("form button#save[type=submit]").click();
  await page.waitForFunction(() => !!document.getElementById("formErr"), null, { timeout: 60000 });
  await page.waitForTimeout(300);
  const afterEdit = await carByRef("TS-1001");
  r.refusals.formLevel = {
    focus: await active(page),
    block: await page.evaluate(() => document.getElementById("formErr")?.innerText ?? null),
    carUnchanged:
      beforeEdit?.updated_at?.toString() === afterEdit?.updated_at?.toString() &&
      beforeEdit?.deleted_at === null &&
      afterEdit?.deleted_at === null,
    pass: (await active(page))?.id === "formErr",
  };

  // ---- net-zero -------------------------------------------------------------------------------
  r.net.countAfter = await liveCount();
  r.net.refA = await carByRef(refA);
  r.net.refB = await carByRef(refB);
  r.net.pass = r.net.countAfter === countBefore && !r.net.refA && !r.net.refB;
  r.pass =
    r.removal.middle.pass &&
    r.removal.last.pass &&
    r.refusals.client.pass &&
    r.refusals.serverField.pass &&
    r.refusals.formLevel.pass &&
    r.removal.tombstonesListed &&
    r.net.pass;

  console.log(
    `middle row: deleted ${ids[0]?.ref} → focus ${r.removal.middle.focus?.tag}.${r.removal.middle.focus?.className} carId=${r.removal.middle.focus?.carId} (next=${r.removal.middle.nextId}) → ${r.removal.middle.pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `last row: focus ${r.removal.last.focus?.tag}#${r.removal.last.focus?.id} → ${r.removal.last.pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `client refusal: invalid ${JSON.stringify(invalidBefore)} → focus #${r.refusals.client.focus?.id} → ${r.refusals.client.pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `server field refusal: focus #${r.refusals.serverField.focus?.id} · block ${JSON.stringify(r.refusals.serverField.block?.slice(0, 60))} → ${r.refusals.serverField.pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `form-level refusal: focus #${r.refusals.formLevel.focus?.id} · car unchanged=${r.refusals.formLevel.carUnchanged} → ${r.refusals.formLevel.pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `net-zero: ${countBefore} → ${r.net.countAfter}; refs gone=${!r.net.refA && !r.net.refB} → ${r.net.pass ? "PASS" : "FAIL"}`,
  );
  console.log(`TASK 17: ${r.pass ? "PASS" : "FAIL"}`);
} finally {
  // If the run left one of our own throwaways behind, clear it here — never a car this script
  // did not create. The normal path removed both through the office's own tombstones.
  if (!r.pass) {
    for (const c of r.created) {
      if (!c.ref) continue;
      try {
        const row = await carByRef(c.ref);
        if (row) {
          await run`DELETE FROM car WHERE id = ${row.id}`;
          (r.cleanupFallback ??= []).push(c.ref);
        }
      } catch (err) {
        (r.cleanupFallback ??= []).push(`${c.ref}: ${String(err).slice(0, 120)}`);
      }
    }
  }
  mkdirSync(RUNS, { recursive: true });
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}readings.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await detach(browser);
}
