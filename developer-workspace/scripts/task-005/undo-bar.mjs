// TASK-005 plan Task 10 — the undo offer shows eight seconds draining.
//
// The offer carried no measure: a click deleted the car and the words said "deleted." for eight
// seconds, but nothing on screen said how long the window was, and the window's close was a
// `setTimeout` — the clock and the failsafe were the same thing. Now the offer carries a bar that
// starts full and drains for exactly the 8000 ms window (transform, so nothing reflows), and the
// bar's own animation end is what closes the offer; the timeout behind it is deliberately longer
// (10 s) and can never be the thing that closes it first.
//
// This reads, live and signed in, on a **throwaway** demo car (created here, removed here):
//   - the bar's computed scaleX, sampled in-page every 100 ms, from full to zero;
//   - the window's measured duration (bar mount → offer closed) against 8000 ms;
//   - that the close happens well before the 10 s failsafe;
//   - the animation's own registered duration;
//   - the store read back: absent → present → tombstoned (deleted_at set) → absent again.
//
// Attach-only (never launches a Chrome), one throwaway write pair, net-zero on the car.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/undo-bar/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const env = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8");
const url = env
  .match(/^DATABASE_URL=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");
const run = neon(url);

const carByRef = async (ref) => (await run`SELECT id, ref, brand, deleted_at FROM car WHERE ref = ${ref}`)[0] ?? null;
const liveCount = async () => (await run`SELECT count(*)::int AS n FROM car WHERE deleted_at IS NULL`)[0].n;

const before = guardCount();
const browser = await attach();
const stamp = Date.now();
const brand = `TS-T10-${stamp}`;
const r = { when: new Date().toISOString(), base: BASE, brand, ref: null };

// Minimal local helpers (same shapes the task-004 drives use).
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

try {
  await assertOurs(browser);
  const { b: page } = await twoTabs(browser);

  const countBefore = await liveCount();
  r.countBefore = countBefore;

  // ---- 1. a throwaway demo car, created through the office's own form -----------------------------
  await gotoHydrated(page, `${BASE}/office/car/new`, "#save");
  await page.fill('input[name="brand"]', brand);
  await page.fill('input[name="model"]', "T10");
  await page.fill('input[name="trim"]', "STD");
  await page.fill('input[name="year"]', "2020");
  await page.fill('input[name="mileage"]', "12000");
  await page.fill('input[name="price"]', "5000000");
  await page.fill('input[name="exteriorColor"]', "Black");
  await page.fill('input[name="interiorColor"]', "Black");
  await page.fill('textarea[name="features"]', "Air conditioning");
  await page.locator("button.stb").first().click();
  await page.locator("form button#save[type=submit]").click();
  const w = await waitUntil(
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
  r.saveToast = (
    await page.evaluate(() => (document.querySelector("#toast")?.textContent || "").trim())
  ).replace(/\s+/g, " ");
  r.ref = (r.saveToast.match(/TS-\d+/) || [])[0] ?? null;
  if (!r.ref) throw new Error(`no ref in the save toast (${w.ok ? "ok" : w.what}): ${r.saveToast}`);
  r.created = await carByRef(r.ref);
  if (!r.created) throw new Error("the created car is not in the store");

  // ---- 2. delete it, with the bar's drain sampled from inside the page ----------------------------
  await gotoHydrated(page, `${BASE}/office/inventory`, "table");
  const row = page.locator("tr").filter({ hasText: r.ref }).first();
  await row.locator('button[aria-label^="Delete"]').click();
  await page.locator("div.mdl button#yes").waitFor({ state: "visible", timeout: 30000 });

  // The sampler: installed before the confirm click, polling every 100 ms. It records the bar's
  // computed scaleX (the drain), whether the offer is still offered, whether the toast is up,
  // and — because a CSS animation can wait for its first frame — the animation's own clock
  // (playState/startTime/currentTime against the page's timeline).
  await page.evaluate(() => {
    window.__samples = [];
    const base = performance.now();
    window.__sampler = setInterval(() => {
      const bar = document.querySelector(".ubar");
      const undo = document.querySelector("#undo");
      const toast = document.querySelector("#toast");
      let sx = null;
      let raw = null;
      if (bar) {
        raw = getComputedStyle(bar).transform;
        sx = raw === "none" ? 1 : Math.round(new DOMMatrixReadOnly(raw).a * 1000) / 1000;
      }
      const a = bar?.getAnimations?.()[0] ?? null;
      window.__samples.push({
        t: Math.round(performance.now() - base),
        sx,
        raw: raw === "none" ? "none" : raw ? "matrix" : null,
        undo: !!undo && !undo.hidden,
        shown: !!toast && toast.classList.contains("show"),
        msg: document.querySelector("#tmsg")?.textContent ?? null,
        play: a?.playState ?? null,
        animStartRel: a?.startTime != null ? Math.round(Number(a.startTime) - base) : null,
        animCur:
          a?.currentTime != null ? Math.round(Number(a.currentTime)) : null,
        timeline: Math.round(Number(document.timeline.currentTime) - base),
      });
      if (window.__samples.length > 160) clearInterval(window.__sampler);
    }, 100);
  });

  await page.locator("div.mdl button#yes").click();

  // While the bar is up: read the animation's own registered timing.
  await page.waitForSelector(".ubar", { state: "attached", timeout: 45000 });
  r.animation = await page.evaluate(() => {
    const a = document.querySelector(".ubar")?.getAnimations?.()[0];
    if (!a) return null;
    const t = a.effect.getTiming();
    return { duration: t.duration, iterations: t.iterations, easing: t.easing, fill: t.fill };
  });

  // The offer closes at its own end; the sampler sees the toast go. (The failsafe is 10 s — if this
  // wait ever needed 10 s, the failsafe would have been the closer, and the reading would show it.)
  const closed = await page.waitForFunction(
    () => {
      const s = window.__samples;
      return s.length > 5 && s.some((x) => x.sx !== null) && !s[s.length - 1].shown;
    },
    null,
    { timeout: 15000, polling: 200 },
  ).then(() => true).catch(() => false);
  r.closed = closed;
  r.samples = await page.evaluate(() => {
    clearInterval(window.__sampler);
    return window.__samples;
  });

  // ---- 3. the arithmetic, from the samples --------------------------------------------------------
  const withBar = r.samples.filter((s) => s.sx !== null);
  const firstBar = withBar[0] ?? null; // the bar's element exists in the DOM
  const firstEffect = withBar.find((s) => s.raw === "matrix") ?? null; // its animation is applying
  const lastBar = withBar[withBar.length - 1] ?? null;
  // The close: the first sample where the bar is gone and the toast is down, after both had been up.
  const firstShownIdx = r.samples.findIndex((s) => s.shown && s.sx !== null);
  const closeIdx =
    firstShownIdx >= 0
      ? r.samples.findIndex((s, i) => i > firstShownIdx && s.sx === null && !s.shown)
      : -1;
  const closeSample = closeIdx >= 0 ? r.samples[closeIdx] : null;
  const lastSample = r.samples[r.samples.length - 1] ?? null;
  const animStartRel = withBar.find((s) => s.animStartRel !== null)?.animStartRel ?? null;
  r.arithmetic = {
    firstBar,
    firstEffect,
    lastBar,
    closeSample,
    lastSample,
    animStartRel,
    // Element in the DOM → the animation's own clock running (a CSS animation can wait for its
    // first frame; the gap is recorded, and Task 11 owns pinning the start).
    insertToAnimStartMs: firstBar && animStartRel !== null ? animStartRel - firstBar.t : null,
    // The offer's own clock: animation start → its end closing the offer.
    windowMs: animStartRel !== null && closeSample ? closeSample.t - animStartRel : null,
    drainMs: firstEffect && lastBar ? lastBar.t - firstEffect.t : null,
    animCurAtLastBar: lastBar?.animCur ?? null,
  };

  // ---- 4. the tombstone, then the throwaway's disposal --------------------------------------------
  await page.goto(`${BASE}/office/inventory`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await hydrated(page, "table");
  const clearout = page.locator(".clearout");
  await clearout.waitFor({ state: "visible", timeout: 45000 });
  r.tombstoneListed = (await clearout.innerText()).includes(r.ref);
  r.tombstoned = await carByRef(r.ref);

  const trow = clearout.locator("li").filter({ hasText: r.ref }).first();
  await trow.locator("button", { hasText: "Remove for good" }).click();
  // The first button opens the pair; wait for "Keep it" so the confirm is known open before the
  // second click (both buttons carry "Remove for good"'s words otherwise).
  await trow.locator("button", { hasText: "Keep it" }).waitFor({ state: "visible", timeout: 15000 });
  await trow.locator("button.danger", { hasText: "Remove for good" }).click();
  // The tombstones component returns null when its last row goes: with this throwaway as the only
  // tombstone the row leaves and the whole section unmounts, taking its note with it. So the
  // evidence checked is what survives — the row's departure (and the note, if others remain).
  const wr = await waitUntil(
    async () => {
      const note = await page.locator(".clearout .note").innerText().catch(() => null);
      if (note && /removed for good/.test(note)) {
        r.removalNoteText = note.trim();
        return true;
      }
      return (
        (await page
          .locator(".clearout li")
          .filter({ hasText: r.ref })
          .count()
          .catch(() => 1)) === 0
      );
    },
    { what: "the row removed for good", timeoutMs: 60000, everyMs: 300 },
  );
  r.removal = {
    rowGone: wr.ok,
    noteText: r.removalNoteText ?? null,
    sectionPresent: (await clearout.count()) > 0,
  };
  r.afterRemoval = await carByRef(r.ref);
  r.countAfter = await liveCount();

  r.verdict = {
    theThrowawayWasCreated: !!r.created && r.created.deleted_at === null,
    theBarStartsFull: (firstEffect?.sx ?? 0) >= 0.95,
    theBarReachesZero: !!lastBar && lastBar.sx <= 0.05,
    theAnimationIsRegisteredForEightSeconds:
      r.animation?.duration === 8000 && r.animation?.iterations === 1 && r.animation?.easing === "linear",
    theAnimationRanToItsEnd: (lastBar?.animCur ?? 0) >= 7900,
    theWindowIsEightSeconds:
      r.arithmetic.windowMs !== null && r.arithmetic.windowMs >= 7800 && r.arithmetic.windowMs <= 9000,
    theFailsafeNeverWins: r.arithmetic.windowMs !== null && r.arithmetic.windowMs < 9500,
    theOfferClosed: !!closeSample && lastSample?.shown === false && lastSample?.undo === false,
    theCarIsATombstone: r.tombstoned !== null && r.tombstoned.deleted_at !== null && r.tombstoneListed,
    theThrowawayWasRemoved: r.afterRemoval === null && r.removal.rowGone,
    netZero: r.countAfter === r.countBefore,
  };
  writeFileSync(`${RUNS}t10.json`, JSON.stringify(r, null, 2));

  console.log(`throwaway: ${brand} → ref ${r.ref} (created, deleted, removed)`);
  console.log(
    `bar: inserted t=${firstBar?.t} (${firstBar?.raw}) · animation start t=${r.arithmetic.animStartRel} · first effect t=${firstEffect?.t} sx=${firstEffect?.sx} (anim ${firstEffect?.animCur}ms)`,
  );
  console.log(
    `drain: ${lastBar?.sx} at t=${lastBar?.t} (anim ${lastBar?.animCur}ms) · close t=${closeSample?.t} · window ${r.arithmetic.windowMs}ms`,
  );
  console.log(
    `insert → animation start: ${r.arithmetic.insertToAnimStartMs}ms · registered ${JSON.stringify(r.animation)}`,
  );
  console.log(`removal: ${JSON.stringify(r.removal)}`);
  console.log(`store after removal: ${JSON.stringify(r.afterRemoval)} · car count ${r.countBefore} → ${r.countAfter}`);
  console.log(`\nverdict: ${JSON.stringify(r.verdict, null, 1)}`);
  const bad = Object.entries(r.verdict).filter(([, v]) => !v);
  if (bad.length) throw new Error(`unmet: ${bad.map(([k]) => k).join(", ")}`);

  // Leave the tab where this task's work lives.
  await page.goto(`${BASE}/office/inventory`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
} finally {
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
