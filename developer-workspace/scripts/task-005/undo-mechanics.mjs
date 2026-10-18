// TASK-005 plan Task 11 — the bar's mechanics are constrained.
//
// Three constraints on the offer's measure, read live and signed in:
//   1. the motion forces no layout — `transform`, not `width` (the bar's own width and the
//      toast's rect never move while it drains; body scroll height constant);
//   2. the bar is aria-hidden (the offer's words carry the meaning);
//   3. under reduced motion a static "8 s" label takes its place — no animation runs and the
//      offer still closes at eight seconds (the timer is then the clock);
//   4. the clock's start is recorded against the click: click → offer on screen → animation's
//      own start, with the page's frame clock (`requestAnimationFrame`) logged across the gap,
//      so "starts when the offer is actually pressable" is a measured statement.
//
// Two throwaway demo cars (created here, removed here), net-zero both times. Attach-only.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/undo-mechanics/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const env = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8");
const url = env
  .match(/^DATABASE_URL=(.+)$/m)?.[1]
  ?.trim()
  .replace(/^["']|["']$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");
const run = neon(url);

const carByRef = async (ref) =>
  (await run`SELECT id, ref, brand, deleted_at FROM car WHERE ref = ${ref}`)[0] ?? null;
const liveCount = async () => (await run`SELECT count(*)::int AS n FROM car WHERE deleted_at IS NULL`)[0].n;

const before = guardCount();
const browser = await attach();

// Minimal local helpers (same shapes the task-004/005 drives use).
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

const createThrowaway = async (page, tag) => {
  const brand = `TS-${tag}-${Date.now()}`;
  await gotoHydrated(page, `${BASE}/office/car/new`, "#save");
  await page.fill('input[name="brand"]', brand);
  await page.fill('input[name="model"]', "T11");
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
  const toast = await page.evaluate(() => (document.querySelector("#toast")?.textContent || "").trim());
  const ref = (toast.match(/TS-\d+/) || [])[0] ?? null;
  if (!w.ok || !ref) throw new Error(`no ref in the save toast (${w.ok ? "ok" : w.what}): ${toast}`);
  const created = await carByRef(ref);
  if (!created) throw new Error("the created car is not in the store");
  return { brand, ref, created };
};

const dispose = async (page, ref) => {
  await gotoHydrated(page, `${BASE}/office/inventory`, "table");
  const clearout = page.locator(".clearout");
  await clearout.waitFor({ state: "visible", timeout: 45000 });
  const trow = clearout.locator("li").filter({ hasText: ref }).first();
  await trow.locator("button", { hasText: "Remove for good" }).click();
  await trow.locator("button", { hasText: "Keep it" }).waitFor({ state: "visible", timeout: 15000 });
  await trow.locator("button.danger", { hasText: "Remove for good" }).click();
  const w = await waitUntil(
    async () =>
      (await page.locator(".clearout li").filter({ hasText: ref }).count().catch(() => 1)) === 0,
    { what: "the row removed for good", timeoutMs: 60000, everyMs: 300 },
  );
  const after = await carByRef(ref);
  if (!w.ok || after !== null) throw new Error(`the throwaway was not removed for good (${ref})`);
  return true;
};

const r = { when: new Date().toISOString(), base: BASE, normal: {}, reduced: {} };
let countBefore;

try {
  await assertOurs(browser);
  const { b: page } = await twoTabs(browser);
  countBefore = await liveCount();
  r.countBefore = countBefore;

  // ================= Pass A — normal motion: mechanics, layout, the clock's start =================
  {
    const p = r.normal;
    const throwaway = await createThrowaway(page, "T11a");
    p.ref = throwaway.ref;

    await gotoHydrated(page, `${BASE}/office/inventory`, "table");
    const row = page.locator("tr").filter({ hasText: p.ref }).first();
    await row.locator('button[aria-label^="Delete"]').click();
    await page.locator("div.mdl button#yes").waitFor({ state: "visible", timeout: 30000 });

    // Instrument before the click: the click timestamp, the frame clock, and a 100 ms sampler of
    // the bar (its scaleX, its own width, the toast's rect, the body's scroll height, the
    // animation's clock).
    await page.evaluate(() => {
      window.__samples = [];
      window.__frames = [];
      window.__clickT = null;
      const base = performance.now();
      window.__base = base;
      document.querySelector("#yes")?.addEventListener(
        "click",
        () => {
          window.__clickT = performance.now() - base;
        },
        { once: true },
      );
      const frame = (ts) => {
        window.__frames.push(Math.round(ts - base));
        if (window.__frames.length < 2000) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      window.__sampler = setInterval(() => {
        const bar = document.querySelector(".ubar");
        const toast = document.querySelector("#toast");
        const undo = document.querySelector("#undo");
        let sx = null;
        let raw = null;
        let width = null;
        let lay = null;
        if (bar) {
          raw = getComputedStyle(bar).transform;
          sx = raw === "none" ? 1 : Math.round(new DOMMatrixReadOnly(raw).a * 1000) / 1000;
          // Layout width, not the rect: getBoundingClientRect includes the scaleX transform.
          width = bar.offsetWidth;
        }
        if (toast) {
          // Layout boxes: offset* ignore transforms, so they read reflow, not motion.
          lay = {
            l: toast.offsetLeft,
            tp: toast.offsetTop,
            w: toast.offsetWidth,
            h: toast.offsetHeight,
            b: bar ? bar.offsetWidth : null,
          };
        }
        const rect = toast?.getBoundingClientRect();
        const a = bar?.getAnimations?.()[0] ?? null;
        window.__samples.push({
          t: Math.round(performance.now() - base),
          sx,
          raw: raw === "none" ? "none" : raw ? "matrix" : null,
          width,
          undo: !!undo && !undo.hidden,
          shown: !!toast && toast.classList.contains("show"),
          animStartRel: a?.startTime != null ? Math.round(Number(a.startTime) - base) : null,
          animCur: a?.currentTime != null ? Math.round(Number(a.currentTime)) : null,
          rect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null,
          lay,
          bodyH: document.body.scrollHeight,
        });
        if (window.__samples.length > 160) clearInterval(window.__sampler);
      }, 100);
    });

    await page.locator("div.mdl button#yes").click();
    await page.waitForSelector(".ubar", { state: "attached", timeout: 45000 });
    p.animation = await page.evaluate(() => {
      const a = document.querySelector(".ubar")?.getAnimations?.()[0];
      if (!a) return null;
      const t = a.effect.getTiming();
      return { duration: t.duration, iterations: t.iterations, easing: t.easing, fill: t.fill };
    });
    p.ariaHidden = await page.evaluate(
      () => document.querySelector(".utick")?.getAttribute("aria-hidden") === "true",
    );
    p.widthNotAnimated = await page.evaluate(() => {
      const a = document.querySelector(".ubar")?.getAnimations?.()[0];
      return a ? !(a.effect.getKeyframes?.() ?? []).some((k) => "width" in k) : null;
    });

    const closed = await page
      .waitForFunction(
        () => {
          const s = window.__samples;
          return s.length > 5 && s.some((x) => x.sx !== null) && !s[s.length - 1].shown;
        },
        null,
        { timeout: 20000, polling: 200 },
      )
      .then(() => true)
      .catch(() => false);
    p.closed = closed;
    ({ samples: p.samples, frames: p.frames, clickT: p.clickT } = await page.evaluate(() => {
      clearInterval(window.__sampler);
      return { samples: window.__samples, frames: window.__frames, clickT: window.__clickT };
    }));

    const withBar = p.samples.filter((s) => s.sx !== null);
    const firstBar = withBar[0] ?? null;
    const lastBar = withBar[withBar.length - 1] ?? null;
    const firstShownIdx = p.samples.findIndex((s) => s.shown && s.sx !== null);
    const closeIdx =
      firstShownIdx >= 0
        ? p.samples.findIndex((s, i) => i > firstShownIdx && s.sx === null && !s.shown)
        : -1;
    const closeSample = closeIdx >= 0 ? p.samples[closeIdx] : null;
    const animStartT = withBar.find((s) => s.animStartRel !== null)?.animStartRel ?? null;
    const framesInPending =
      firstBar && animStartT !== null
        ? p.frames.filter((f) => f >= firstBar.t && f < animStartT)
        : [];
    const frameGap =
      p.frames.length > 1
        ? Math.max(...p.frames.slice(1).map((f, i) => f - p.frames[i]))
        : null;
    const layKey = (s) => JSON.stringify(s.lay);
    p.arithmetic = {
      clickT: p.clickT,
      barInsertT: firstBar?.t ?? null,
      animStartT,
      closeT: closeSample?.t ?? null,
      clickToOfferMs: p.clickT != null && firstBar ? firstBar.t - p.clickT : null,
      offerToClockMs: firstBar && animStartT !== null ? animStartT - firstBar.t : null,
      clickToCloseMs: p.clickT != null && closeSample ? closeSample.t - p.clickT : null,
      windowMs: animStartT !== null && closeSample ? closeSample.t - animStartT : null,
      frameGap,
      framesInPending,
      startIsAFrame: animStartT !== null && p.frames.includes(animStartT),
      startWithinTwoFrames:
        firstBar && animStartT !== null && frameGap !== null
          ? animStartT - firstBar.t <= 2 * frameGap + 300
          : null,
      layStable:
        withBar.length > 1 ? withBar.every((s) => layKey(s) === layKey(withBar[0])) : null,
      bodyStable: withBar.length > 1 ? new Set(withBar.map((s) => s.bodyH)).size === 1 : null,
      widthStable: withBar.length > 1 ? new Set(withBar.map((s) => s.width)).size === 1 : null,
      // The drain's own curve: scaleX must equal 1 − elapsed/8000 at every sample.
      drainLinear: withBar.every(
        (s) => s.animCur == null || Math.abs(s.sx - (1 - s.animCur / 8000)) <= 0.02,
      ),
    };
    p.verdict = {
      theBarIsAriaHidden: p.ariaHidden === true,
      theMotionUsesTransform:
        p.widthNotAnimated === true &&
        p.arithmetic.widthStable === true &&
        withBar.some((s) => s.sx !== null && s.sx < 0.99),
      theDrainIsEightSeconds:
        p.animation?.duration === 8000 && p.animation?.iterations === 1 && p.animation?.easing === "linear",
      theDrainReachesZeroAtEightSeconds:
        p.arithmetic.drainLinear === true &&
        p.arithmetic.windowMs !== null &&
        p.arithmetic.windowMs >= 8000,
      theOfferClosed: !!closeSample,
      theWindowIsEightSeconds:
        p.arithmetic.windowMs !== null && p.arithmetic.windowMs >= 7800 && p.arithmetic.windowMs <= 9000,
      noLayoutShift: p.arithmetic.layStable === true && p.arithmetic.bodyStable === true,
      theClockStartsOnAFrameAfterTheOffer:
        p.arithmetic.startIsAFrame === true &&
        p.arithmetic.startWithinTwoFrames === true &&
        p.arithmetic.offerToClockMs !== null &&
        p.arithmetic.offerToClockMs > 0 &&
        p.arithmetic.clickToCloseMs !== null &&
        Math.abs(p.arithmetic.clickToCloseMs - 8000) > 1000,
    };
    p.tombstoned = await carByRef(p.ref);
    await gotoHydrated(page, `${BASE}/office/inventory`, "table");
    p.tombstoneListed = (await page.locator(".clearout").innerText()).includes(p.ref);
    await dispose(page, p.ref);
  }

  // ================= Pass B — reduced motion: the static "8 s" label, no animation =================
  {
    const p = r.reduced;
    await page.emulateMedia({ reducedMotion: "reduce" });
    const throwaway = await createThrowaway(page, "T11b");
    p.ref = throwaway.ref;

    await gotoHydrated(page, `${BASE}/office/inventory`, "table");
    const row = page.locator("tr").filter({ hasText: p.ref }).first();
    await row.locator('button[aria-label^="Delete"]').click();
    await page.locator("div.mdl button#yes").waitFor({ state: "visible", timeout: 30000 });

    await page.evaluate(() => {
      window.__samples = [];
      const base = performance.now();
      window.__sampler = setInterval(() => {
        const toast = document.querySelector("#toast");
        const undo = document.querySelector("#undo");
        window.__samples.push({
          t: Math.round(performance.now() - base),
          shown: !!toast && toast.classList.contains("show"),
          undo: !!undo && !undo.hidden,
          ubar: !!document.querySelector(".ubar"),
          usec: document.querySelector(".usec")?.textContent?.trim() ?? null,
        });
        if (window.__samples.length > 120) clearInterval(window.__sampler);
      }, 100);
    });

    await page.locator("div.mdl button#yes").click();
    const up = await waitUntil(
      async () => {
        const s = await page.evaluate(() => {
          const u = document.querySelector("#undo");
          const t = document.querySelector("#toast");
          return !!u && !u.hidden && !!t && t.classList.contains("show");
        });
        return s;
      },
      { what: "the offer up", timeoutMs: 45000, everyMs: 200 },
    );

    p.label = (await page.locator(".usec").innerText().catch(() => "")).trim();
    p.usecCount = await page.locator(".usec").count();
    p.ubarPresent = (await page.locator(".ubar").count()) > 0;
    p.animations = await page.evaluate(
      () => document.querySelector(".utick, .usec")?.getAnimations?.().length ?? 0,
    );
    p.reducedMatches = await page.evaluate(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );

    await page
      .waitForFunction(
        () => {
          const s = window.__samples;
          return s.some((x) => x.shown) && s.length > 3 && !s[s.length - 1].shown;
        },
        null,
        { timeout: 20000, polling: 200 },
      )
      .catch(() => {});
    p.samples = await page.evaluate(() => {
      clearInterval(window.__sampler);
      return window.__samples;
    });
    const upIdx = p.samples.findIndex((s) => s.shown && s.undo);
    const downIdx = p.samples.findIndex((s, i) => i > upIdx && upIdx >= 0 && !s.shown);
    const upSample = upIdx >= 0 ? p.samples[upIdx] : null;
    const downSample = downIdx >= 0 ? p.samples[downIdx] : null;
    p.arithmetic = {
      offerUpT: upSample?.t ?? null,
      closedT: downSample?.t ?? null,
      windowMs: upSample && downSample ? downSample.t - upSample.t : null,
      everHadBar: p.samples.some((s) => s.ubar),
      labels: [...new Set(p.samples.map((s) => s.usec).filter(Boolean))],
      undoUpWhileOpen: p.samples.slice(upIdx, downIdx).every((s) => s.undo) && upIdx >= 0 && downIdx > upIdx,
    };
    p.verdict = {
      theReducedMotionPreferenceIsSeen: p.reducedMatches === true,
      theStaticLabelTakesTheBarsPlace:
        p.label === "8 s" &&
        p.usecCount === 1 &&
        p.ubarPresent === false &&
        p.arithmetic.everHadBar === false,
      noAnimationRuns: p.animations === 0,
      theOfferClosesAtEightSeconds:
        p.arithmetic.windowMs !== null && p.arithmetic.windowMs >= 7800 && p.arithmetic.windowMs <= 9200,
      undoWasOfferedTheWholeTime: up.ok && p.arithmetic.undoUpWhileOpen === true,
    };
    p.tombstoned = await carByRef(p.ref);
    await dispose(page, p.ref);
    await page.emulateMedia({ reducedMotion: null });
  }

  r.countAfter = await liveCount();
  r.netZero = r.countAfter === r.countBefore;
  writeFileSync(`${RUNS}live.json`, JSON.stringify(r, null, 2));

  const a = r.normal.arithmetic;
  console.log(`A · throwaway ${r.normal.ref} (${r.normal.brand})`);
  console.log(
    `A · click t=${a.clickT} → offer t=${a.barInsertT} (${a.clickToOfferMs}ms) → clock t=${a.animStartT} (${a.offerToClockMs}ms; frames in the gap: ${a.framesInPending.length})`,
  );
  console.log(
    `A · close t=${a.closeT} · window ${a.windowMs}ms (click→close ${a.clickToCloseMs}ms) · layout: boxes ${a.layStable ? "held" : "MOVED"} · body ${a.bodyStable ? "held" : "MOVED"} · bar width ${a.widthStable ? "held" : "MOVED"} · drain linear ${a.drainLinear} · frame gap ${a.frameGap}ms`,
  );
  console.log(
    `A · tombstoned ${r.normal.tombstoned?.deleted_at ? "yes" : "NO"} · listed ${r.normal.tombstoneListed}`,
  );
  console.log(
    `B · throwaway ${r.reduced.ref} · label “${r.reduced.label}” · bar ${r.reduced.ubarPresent ? "PRESENT" : "absent"} · animations ${r.reduced.animations} · window ${r.reduced.arithmetic.windowMs}ms`,
  );
  console.log(`car count ${r.countBefore} → ${r.countAfter}`);
  console.log(`\nverdict A: ${JSON.stringify(r.normal.verdict, null, 1)}`);
  console.log(`\nverdict B: ${JSON.stringify(r.reduced.verdict, null, 1)}`);
  const bad = [
    ...Object.entries(r.normal.verdict).map(([k, v]) => [`A.${k}`, v]),
    ...Object.entries(r.reduced.verdict).map(([k, v]) => [`B.${k}`, v]),
    ["netZero", r.netZero],
  ].filter(([, v]) => !v);
  if (bad.length) throw new Error(`unmet: ${bad.map(([k]) => k).join(", ")}`);

  await page.goto(`${BASE}/office/inventory`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
} finally {
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
