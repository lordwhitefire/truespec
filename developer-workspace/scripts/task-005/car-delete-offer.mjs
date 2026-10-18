// TASK-005 plan Task 19 — the car form's delete really deletes, with the same undo.
//
// Live, signed in. Two throwaway demo cars created through the office's own form:
//   - the first is deleted from its own form: the store tombstone is read back, the same offer
//     appears (Undo + the draining bar), the bar's registered animation is read, and Undo is
//     taken — then a full reload of the car page plus a server read confirm the car is back.
//   - the second is deleted and the window is allowed to run out: its own bar end (or the 12 s
//     failsafe) pushes to the office inventory, the store read shows a tombstone, the tombstone
//     is listed, and it is removed for good.
// Net-zero: both refs absent at the end; the live count is the count it started at.
//
// Attach-only (never launches a Chrome).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task19/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const env = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8");
const dbUrl = env
  .match(/^DATABASE_URL=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
if (!dbUrl) throw new Error("DATABASE_URL not found in .env.local");
const run = neon(dbUrl);
const carByRef = async (ref) =>
  (await run`SELECT id, ref, brand, model, year, deleted_at, updated_at FROM car WHERE ref = ${ref}`)[0] ?? null;
const liveCount = async () => (await run`SELECT count(*)::int AS n FROM car WHERE deleted_at IS NULL`)[0].n;

const before = guardCount();
const browser = await attach();
const stamp = Date.now();
const brand = `TS-T19-${stamp}`;
const r = { when: new Date().toISOString(), base: BASE, brand, created: [], first: {}, second: {}, net: {} };

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

/** Read the offer on whatever screen is showing: words, Undo, the bar's registered motion. */
const readOffer = (page) =>
  page.evaluate(() => {
    const toast = document.querySelector("#toast");
    const undo = document.querySelector("#tundo");
    const bar = document.querySelector(".ubar");
    const usec = document.querySelector(".usec");
    const anim = bar?.getAnimations?.()[0] ?? null;
    const cs = bar ? getComputedStyle(bar) : null;
    const scaleX = (() => {
      const m = cs?.transform;
      if (!m || m === "none") return null;
      const parts = m.match(/matrix\(([^)]+)\)/)?.[1]?.split(",").map((x) => Number(x.trim()));
      return parts ? parts[0] : null;
    })();
    return {
      show: !!toast && (toast.className || "").includes("show"),
      text: (toast?.textContent || "").replace(/\s+/g, " ").trim(),
      undoHidden: undo ? undo.hidden : null,
      bar: !!bar,
      usec: usec ? usec.textContent.trim() : null,
      animation: anim
        ? {
            name: anim.animationName,
            duration: anim.effect?.getTiming?.().duration ?? null,
            iterations: anim.effect?.getTiming?.().iterations ?? null,
            fill: anim.effect?.getTiming?.().fill ?? null,
            currentTime: anim.currentTime,
          }
        : null,
      scaleX,
    };
  });

async function deleteFromForm(page, ref) {
  await gotoHydrated(page, `${BASE}/office/car/${ref}`, "#delBtn");
  const before = await carByRef(ref);
  const delBtnVisible = await page.evaluate(() => !document.getElementById("delBtn")?.hidden);
  await page.locator("#delBtn").click();
  await page.waitForFunction(() => !!document.querySelector("#ovlD")?.open, null, { timeout: 30000 });
  await page.locator("#ovlD button#delYes").click();
  const offered = await waitUntil(
    async () => (await readOffer(page)).show && (await readOffer(page)).undoHidden === false,
    { what: "the delete offer", timeoutMs: 60000, everyMs: 300 },
  );
  const offer = await readOffer(page);
  const deleted = await carByRef(ref);
  return { before, delBtnVisible, offered, offer, deleted };
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

  // ---- 1. delete, offer, undo, reload, server read --------------------------------------------
  const first = await deleteFromForm(page, refA);
  r.first = {
    ref: refA,
    before: first.before,
    delBtnVisible: first.delBtnVisible,
    deletedAtFirst: first.deleted?.deleted_at ?? null,
    offer: first.offer,
  };
  // Undo straight away — this case proves the offer restores the car. The bar's own drain is read
  // on the second throwaway, where nothing has to happen before the window ends.
  let undoClicked = true;
  await page
    .locator("#tundo")
    .click({ timeout: 20000 })
    .catch(() => {
      undoClicked = false;
    });
  const restored = await waitUntil(async () => /restored\./.test((await readOffer(page)).text), {
    what: "the restored toast",
    timeoutMs: 30000,
    everyMs: 300,
  });
  // The toast is optimistic; the write is what the reload must see.
  const backLive = await waitUntil(
    async () => {
      const c = await carByRef(refA);
      return !!c && c.deleted_at === null;
    },
    { what: "the undo write in the store", timeoutMs: 30000, everyMs: 300 },
  );
  r.first.undoClicked = undoClicked;
  r.first.restored = restored;
  r.first.backLive = backLive;
  if (!backLive.ok) {
    r.first.failure = {
      url: page.url(),
      offer: await readOffer(page).catch(() => null),
      store: (await carByRef(refA)) ?? null,
    };
    throw new Error("TASK 19: the undo did not reach the store — refusing to reload");
  }
  const undoHiddenAfter = await page.evaluate(() => document.getElementById("tundo")?.hidden ?? null);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
  let reloaded = null;
  try {
    await page.waitForSelector("#f-brand", { state: "attached", timeout: 60000 });
    await hydrated(page, "#f-brand");
    reloaded = await page.evaluate(() => ({
      url: location.pathname,
      brand: document.querySelector('input[name="brand"]')?.value ?? null,
      delBtn: !document.getElementById("delBtn")?.hidden,
    }));
  } catch (err) {
    r.first.failure = {
      url: page.url(),
      body: (await page.evaluate(() => document.body?.innerText?.slice(0, 300) ?? "")).replace(
        /\s+/g,
        " ",
      ),
      err: String(err).slice(0, 200),
    };
    throw err;
  }
  const backInStore = await carByRef(refA);
  r.first.undoHiddenAfter = undoHiddenAfter;
  r.first.afterReload = reloaded;
  r.first.backInStore = backInStore;
  r.first.pass =
    first.before?.deleted_at === null &&
    first.deleted?.deleted_at !== null &&
    first.delBtnVisible === true &&
    first.offer.bar === true &&
    first.offer.undoHidden === false &&
    first.offer.animation?.name === "undodrain" &&
    first.offer.animation?.duration === 8000 &&
    undoClicked === true &&
    restored.ok &&
    backLive.ok &&
    undoHiddenAfter === true &&
    reloaded?.brand === brand &&
    reloaded?.delBtn === true &&
    backInStore?.deleted_at === null;

  // ---- 2. delete, let the window run out: bar drain, push, tombstone ---------------------------
  const second = await deleteFromForm(page, refB);
  r.second = {
    ref: refB,
    deletedAt: second.deleted?.deleted_at ?? null,
    offer: second.offer,
  };
  // Now there is nothing to click: sample the bar until it visibly drains, then let the window end
  // by itself — the bar's own end closes the offer and pushes to the inventory.
  const windowStart = Date.now();
  const samples = [];
  for (let i = 0; i < 12; i++) {
    const o = await readOffer(page);
    samples.push({
      t: Date.now(),
      scaleX: o.scaleX,
      currentTime: o.animation?.currentTime ?? null,
      show: o.show,
    });
    if (o.scaleX !== null && o.scaleX < 0.5) break;
    if (!o.show) break;
    await page.waitForTimeout(800);
  }
  const pushed = await waitUntil(async () => (await page.url()).includes("/office/inventory"), {
    what: "the offer's end pushing to inventory",
    timeoutMs: 60000,
    everyMs: 400,
  });
  const windowMs = Date.now() - windowStart;
  await page.waitForSelector("table", { state: "attached", timeout: 120000 });
  await hydrated(page, "table");
  const tombstone = await carByRef(refB);
  const listed = await page.evaluate(
    (ref) => (document.querySelector(".clearout")?.innerText || "").includes(ref),
    refB,
  );
  const offerAfterPush = await page.evaluate(() => ({
    toast: document.querySelector("#toast") ? document.querySelector("#toast").className : null,
  }));
  // Clean up our own tombstone through the office's own control.
  const trow = page.locator(".clearout li").filter({ hasText: refB }).first();
  await trow.locator("button", { hasText: "Remove for good" }).click();
  await trow.locator("button", { hasText: "Keep it" }).waitFor({ state: "visible", timeout: 15000 });
  await trow.locator("button.danger", { hasText: "Remove for good" }).click();
  const gone = await waitUntil(async () => !(await carByRef(refB)), {
    what: "the throwaway removed for good",
    timeoutMs: 30000,
    everyMs: 300,
  });
  const xs = samples.map((x) => x.scaleX).filter((x) => x !== null);
  r.second.samples = samples;
  r.second.pushed = pushed;
  r.second.windowMs = windowMs;
  r.second.tombstoneDeletedAt = tombstone?.deleted_at ?? null;
  r.second.listedInClearout = listed;
  r.second.offerAfterPush = offerAfterPush;
  r.second.gone = gone;
  r.second.pass =
    second.deleted?.deleted_at !== null &&
    second.offer.bar === true &&
    second.offer.animation?.name === "undodrain" &&
    second.offer.animation?.duration === 8000 &&
    samples.length >= 2 &&
    xs.length >= 2 &&
    Math.min(...xs) < 1 &&
    xs[xs.length - 1] <= xs[0] &&
    pushed.ok &&
    tombstone?.deleted_at !== null &&
    listed === true &&
    gone.ok;

  // ---- cleanup: the first throwaway is still live (the undo test restored it) ------------------
  // Take it out through the same door: delete from its form, let the window run out, then remove
  // the tombstone for good. Net-zero is only real when this leg is done too.
  const third = await deleteFromForm(page, refA);
  const aPushed = await waitUntil(async () => (await page.url()).includes("/office/inventory"), {
    what: "the first throwaway's window end",
    timeoutMs: 60000,
    everyMs: 400,
  });
  await page.waitForSelector("table", { state: "attached", timeout: 120000 });
  await hydrated(page, "table");
  const aTombstone = await carByRef(refA);
  const aListed = await page.evaluate(
    (ref) => (document.querySelector(".clearout")?.innerText || "").includes(ref),
    refA,
  );
  const aRow = page.locator(".clearout li").filter({ hasText: refA }).first();
  await aRow.locator("button", { hasText: "Remove for good" }).click();
  await aRow.locator("button", { hasText: "Keep it" }).waitFor({ state: "visible", timeout: 15000 });
  await aRow.locator("button.danger", { hasText: "Remove for good" }).click();
  const aGone = await waitUntil(async () => !(await carByRef(refA)), {
    what: "the first throwaway removed for good",
    timeoutMs: 30000,
    everyMs: 300,
  });
  r.cleanup = {
    ref: refA,
    deletedAt: third.deleted?.deleted_at ?? null,
    pushed: aPushed,
    tombstoneDeletedAt: aTombstone?.deleted_at ?? null,
    listedInClearout: aListed,
    gone: aGone,
    pass:
      third.deleted?.deleted_at !== null &&
      aPushed.ok &&
      aTombstone?.deleted_at !== null &&
      aListed === true &&
      aGone.ok,
  };

  // ---- net-zero -------------------------------------------------------------------------------
  r.net.countAfter = await liveCount();
  r.net.refA = await carByRef(refA);
  r.net.refB = await carByRef(refB);
  r.net.pass = r.net.countAfter === countBefore;
  r.pass = r.first.pass && r.second.pass && r.cleanup.pass && r.net.pass;

  console.log(
    `first: deleted_at ${r.first.deletedAtFirst ? "set" : "null"} → offer "${r.first.offer.text}" undoHidden=${r.first.offer.undoHidden} bar=${r.first.offer.bar} anim=${r.first.offer.animation?.name}/${r.first.offer.animation?.duration}ms → undo → reload brand=${r.first.afterReload?.brand} delBtn=${r.first.afterReload?.delBtn} store=${r.first.backInStore?.deleted_at} → ${r.first.pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `second: bar=${r.second.offer.bar} anim=${r.second.offer.animation?.name}/${r.second.offer.animation?.duration}ms scaleX ${(r.second.samples ?? []).map((x) => x.scaleX?.toFixed(3)).join(" → ")} → window ran out in ${r.second.windowMs} ms → pushed=${r.second.pushed?.ok} tombstone=${r.second.tombstoneDeletedAt ? "set" : "null"} listed=${r.second.listedInClearout} removed=${r.second.gone?.ok} → ${r.second.pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `cleanup: first throwaway deleted=${r.cleanup.deletedAt ? "set" : "null"} pushed=${r.cleanup.pushed?.ok} tombstone=${r.cleanup.tombstoneDeletedAt ? "set" : "null"} listed=${r.cleanup.listedInClearout} removed=${r.cleanup.gone?.ok} → ${r.cleanup.pass ? "PASS" : "FAIL"}`,
  );
  console.log(`net-zero: ${countBefore} → ${r.net.countAfter} → ${r.net.pass ? "PASS" : "FAIL"}`);
  console.log(`TASK 19: ${r.pass ? "PASS" : "FAIL"}`);
} finally {
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
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}readings.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await detach(browser);
}
