// TASK-005 plan Task 12 — the end of the window is true, and checked.
//
// When the eight seconds pass: the offer goes, undo is no longer offered, and the deletion stands.
// Nothing hard-erases on a timer — the car stays a tombstone, listed as waiting to be cleared, until
// the owner's own action. Watched once, live and signed in, on a throwaway demo car (safe to lose),
// with the store read at three points: after expiry, after a further wait, and after a reload.
// Net-zero: the throwaway is then removed for good and the store read back.
//
// Attach-only (never launches a Chrome), one throwaway write pair.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/undo-expiry/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const env = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8");
const url = env
  .match(/^DATABASE_URL=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");
const run = neon(url);

const carByRef = async (ref) =>
  (await run`SELECT id, ref, deleted_at FROM car WHERE ref = ${ref}`)[0] ?? null;
const liveCount = async () => (await run`SELECT count(*)::int AS n FROM car WHERE deleted_at IS NULL`)[0].n;
const tombstoneCount = async () => (await run`SELECT count(*)::int AS n FROM car WHERE deleted_at IS NOT NULL`)[0].n;

const before = guardCount();
const browser = await attach();

const waitUntil = async (fn, { timeoutMs = 60000, everyMs = 250, what = "condition" } = {}) => {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await fn()) return { ok: true };
    await new Promise((res) => setTimeout(res, everyMs));
  }
  return { ok: false, what };
};
const hydrated = (page, sel, timeout = 90000) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"));
    },
    sel,
    { timeout },
  );
const gotoHydrated = async (page, url2, sel) => {
  await page.goto(url2, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector(sel, { state: "attached", timeout: 90000 });
  await hydrated(page, sel);
};

const r = { when: new Date().toISOString(), base: BASE, ref: null };
let countBefore;

try {
  await assertOurs(browser);
  const { b: page } = await twoTabs(browser);
  countBefore = await liveCount();
  r.countBefore = countBefore;
  r.tombstonesBefore = await tombstoneCount();

  // ---- 1. a throwaway demo car, created through the office's own form -----------------------------
  const brand = `TS-T12-${Date.now()}`;
  await gotoHydrated(page, `${BASE}/office/car/new`, "#save");
  await page.fill('input[name="brand"]', brand);
  await page.fill('input[name="model"]', "T12");
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
    async () =>
      /Saved .*TS-\d+/.test(
        await page
          .evaluate(() => {
            const el = document.querySelector("#toast");
            return el && el.classList.contains("show") ? el.textContent || "" : "";
          })
          .catch(() => ""),
      ),
    { what: "the save toast", timeoutMs: 90000, everyMs: 300 },
  );
  const toastText = await page.evaluate(() => (document.querySelector("#toast")?.textContent || "").trim());
  r.ref = (toastText.match(/TS-\d+/) || [])[0] ?? null;
  if (!saved.ok || !r.ref) throw new Error(`no ref in the save toast: ${toastText}`);
  r.created = await carByRef(r.ref);
  if (!r.created || r.created.deleted_at !== null) throw new Error("the created car is not live in the store");

  // ---- 2. delete it, and let the offer expire ----------------------------------------------------
  await gotoHydrated(page, `${BASE}/office/inventory`, "table");
  const row = page.locator("tr").filter({ hasText: r.ref }).first();
  await row.locator('button[aria-label^="Delete"]').click();
  await page.locator("div.mdl button#yes").waitFor({ state: "visible", timeout: 30000 });

  await page.evaluate(() => {
    window.__samples = [];
    const base = performance.now();
    window.__sampler = setInterval(() => {
      const toast = document.querySelector("#toast");
      const undo = document.querySelector("#undo");
      const bar = document.querySelector(".ubar");
      const a = bar?.getAnimations?.()[0] ?? null;
      window.__samples.push({
        t: Math.round(performance.now() - base),
        shown: !!toast && toast.classList.contains("show"),
        undo: !!undo && !undo.hidden,
        ubar: !!bar,
        usec: !!document.querySelector(".usec"),
        animStartRel: a?.startTime != null ? Math.round(Number(a.startTime) - base) : null,
        animCur: a?.currentTime != null ? Math.round(Number(a.currentTime)) : null,
      });
      if (window.__samples.length > 140) clearInterval(window.__sampler);
    }, 100);
  });

  await page.locator("div.mdl button#yes").click();
  const offerUp = await page
    .waitForFunction(
      () => {
        const u = document.querySelector("#undo");
        const t = document.querySelector("#toast");
        return !!u && !u.hidden && !!t && t.classList.contains("show");
      },
      null,
      { timeout: 45000, polling: 100 },
    )
    .then(() => true)
    .catch(() => false);
  if (!offerUp) throw new Error("the undo offer never came up");

  // The offer's expiry, watched: the toast goes and Undo is no longer offered.
  const gone = await page
    .waitForFunction(
      () => {
        const s = window.__samples;
        return s.some((x) => x.shown) && s.length > 3 && !s[s.length - 1].shown;
      },
      null,
      { timeout: 20000, polling: 100 },
    )
    .then(() => true)
    .catch(() => false);

  r.samples = await page.evaluate(() => {
    clearInterval(window.__sampler);
    return window.__samples;
  });
  const upIdx = r.samples.findIndex((s) => s.shown && s.undo);
  const downIdx = r.samples.findIndex((s, i) => i > upIdx && upIdx >= 0 && !s.shown);
  const upSample = upIdx >= 0 ? r.samples[upIdx] : null;
  const downSample = downIdx >= 0 ? r.samples[downIdx] : null;
  const clockStartT =
    r.samples.find((s) => s.animStartRel !== null)?.animStartRel ?? null;
  const clockWindowMs = clockStartT !== null && downSample ? downSample.t - clockStartT : null;
  const failsafeDueT = upSample ? upSample.t + 12_000 : null;
  const animationEndT = clockStartT !== null ? clockStartT + 8000 : null;
  r.away = {
    gone,
    offerUpT: upSample?.t ?? null,
    closedT: downSample?.t ?? null,
    // From the offer's arrival: includes the browser's pending start (a frame-time artifact).
    offerWindowMs: upSample && downSample ? downSample.t - upSample.t : null,
    // The offer's own clock (Task 10/11's mechanism): animation start → close.
    clockStartT,
    clockWindowMs,
    insertToClockMs: upSample && clockStartT !== null ? clockStartT - upSample.t : null,
    animationEndT,
    failsafeDueT,
    // Which closer got there first: the animation's own end, or the 12 s failsafe (the offer
    // arrives a sample or two after its timer starts, so the due time carries ±100 ms).
    closer:
      animationEndT === null || failsafeDueT === null
        ? null
        : animationEndT <= failsafeDueT + 100
          ? "animation"
          : "failsafe",
  };
  r.animFrame = r.samples.filter((s) => s.animCur !== null).slice(-1)[0] ?? null;

  // The page straight after expiry: nothing offered, nothing visible, nothing to press.
  r.afterExpiry = await page.evaluate(() => {
    const undo = document.querySelector("#undo");
    const toast = document.querySelector("#toast");
    return {
      undoPresent: !!undo,
      undoHidden: !!undo && undo.hidden,
      toastShown: !!toast && toast.classList.contains("show"),
      barPresent: !!document.querySelector(".ubar"),
      labelPresent: !!document.querySelector(".usec"),
    };
  });

  // ---- 3. the store after expiry: deleted, not erased, not restored ------------------------------
  r.tombstoned = await carByRef(r.ref);
  r.countAfterExpiry = await liveCount();
  r.tombstonesAfterExpiry = await tombstoneCount();
  r.tableRows = await page.locator("tr").filter({ hasText: r.ref }).count();
  await gotoHydrated(page, `${BASE}/office/inventory`, "table");
  const clearout = page.locator(".clearout");
  await clearout.waitFor({ state: "visible", timeout: 45000 });
  r.listedAfterReload = (await clearout.innerText()).includes(r.ref);

  // ---- 4. no timer erases it (SD10): a further wait, then the store read again ------------------
  await new Promise((res) => setTimeout(res, 4000));
  r.afterWait = await carByRef(r.ref);
  r.countAfterWait = await liveCount();
  r.tombstonesAfterWait = await tombstoneCount();

  // ---- 5. net-zero: the owner's own action clears it --------------------------------------------
  const trow = clearout.locator("li").filter({ hasText: r.ref }).first();
  await trow.locator("button", { hasText: "Remove for good" }).click();
  await trow.locator("button", { hasText: "Keep it" }).waitFor({ state: "visible", timeout: 15000 });
  await trow.locator("button.danger", { hasText: "Remove for good" }).click();
  const removed = await waitUntil(
    async () =>
      (await page.locator(".clearout li").filter({ hasText: r.ref }).count().catch(() => 1)) === 0,
    { what: "the row removed for good", timeoutMs: 60000, everyMs: 300 },
  );
  r.afterRemoval = await carByRef(r.ref);
  r.countAfter = await liveCount();
  r.removed = removed.ok;

  r.verdict = {
    theOfferCameUpAndWent: offerUp && gone,
    theWindowIsEightSeconds:
      r.away.clockWindowMs !== null &&
      r.away.clockWindowMs >= 7950 &&
      r.away.clockWindowMs <= 9200,
    theFailsafeNeverWins: r.away.closer === "animation",
    undoIsNoLongerOffered:
      r.afterExpiry.undoHidden === true &&
      r.afterExpiry.toastShown === false &&
      r.afterExpiry.barPresent === false &&
      r.afterExpiry.labelPresent === false,
    theDeletionStands:
      r.tombstoned !== null &&
      r.tombstoned.deleted_at !== null &&
      r.tableRows === 0 &&
      r.countAfterExpiry === countBefore,
    nothingWasHardErased:
      r.tombstoned !== null &&
      r.afterWait !== null &&
      +new Date(r.afterWait.deleted_at) === +new Date(r.tombstoned.deleted_at) &&
      r.tombstonesAfterWait === r.tombstonesAfterExpiry &&
      r.listedAfterReload === true,
    theOwnerClearsItByHand: r.removed && r.afterRemoval === null,
    netZero: r.countAfter === countBefore,
  };
  writeFileSync(`${RUNS}live.json`, JSON.stringify(r, null, 2));

  console.log(`throwaway: ${brand} → ${r.ref} (created, deleted, expired, removed)`);
  console.log(
    `offer t=${r.away.offerUpT} → clock t=${r.away.clockStartT} (${r.away.insertToClockMs}ms) → gone t=${r.away.closedT} · clock window ${r.away.clockWindowMs}ms · offer window ${r.away.offerWindowMs}ms`,
  );
  console.log(
    `closers: animation end t=${r.away.animationEndT} · failsafe due t=${r.away.failsafeDueT} · ${r.away.closer} · last anim reading ${JSON.stringify(r.animFrame)} · after expiry: ${JSON.stringify(r.afterExpiry)}`,
  );
  console.log(
    `store after expiry: ${JSON.stringify(r.tombstoned)} · live ${r.countAfterExpiry} · tombstones ${r.tombstonesAfterExpiry} · table rows ${r.tableRows} · listed after reload ${r.listedAfterReload}`,
  );
  console.log(
    `after a further 4 s: ${JSON.stringify(r.afterWait)} · tombstones ${r.tombstonesAfterWait}`,
  );
  console.log(`removed for good: ${r.removed} · store ${JSON.stringify(r.afterRemoval)} · count ${r.countBefore} → ${r.countAfter}`);
  console.log(`\nverdict: ${JSON.stringify(r.verdict, null, 1)}`);
  const bad = Object.entries(r.verdict).filter(([, v]) => !v);
  if (bad.length) throw new Error(`unmet: ${bad.map(([k]) => k).join(", ")}`);

  await page.goto(`${BASE}/office/inventory`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
} finally {
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
