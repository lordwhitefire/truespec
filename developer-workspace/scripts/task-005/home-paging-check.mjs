// TASK-005 Phase 14 runtime check — the home inventory grid is paged.
// Owner clarification (2026-10-19): pagination is for vertical lists that would otherwise
// scroll endlessly — not for horizontal sliders/swipe tracks. This run proves the home grid
// (the remaining public vertical list), and checks that the featured strip and the car page's
// "More available cars" track are still sliders with no pager.
//
// Read-only. Attach-only to Chrome on :9222 — never launches one. Two windows per run (one
// desktop reused at 1440/1024/768, one 375 touch), both closed at the end; no owner tab touched.
//
// usage: node home-paging-check.mjs
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { attach, assertOurs, detach, chromiumCount, guardCount, BASE } from "./_lib.mjs";

const runDir = new URL("./runs/home-paging/", import.meta.url);
mkdirSync(runDir, { recursive: true });
const progressLog = new URL("progress.log", runDir);
writeFileSync(progressLog, "");
const started = Date.now();
const progress = (msg) =>
  appendFileSync(progressLog, `${new Date().toISOString()} +${((Date.now() - started) / 1000).toFixed(1)}s  ${msg}\n`);

const PAGE_SIZE = 12;
const out = { at: new Date().toISOString(), sections: {}, failures: [] };
const writeOut = () => writeFileSync(new URL("readings.json", runDir), JSON.stringify(out, null, 2));
const fail = (msg) => {
  out.failures.push(msg);
  progress(`FAIL ${msg}`);
};
const ok = (cond, msg) => {
  if (!cond) fail(msg);
  return !!cond;
};

const before = guardCount();
progress(`start (chromium ${before})`);
const browser = await attach();
await assertOurs(browser);
progress("attached");

const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36";

const state = (p) =>
  p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => [...document.querySelectorAll(s)];
    const rect = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), top: +b.top.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1) };
    };
    const grid = q(".sv .inv .grid");
    const cards = qa(".sv .inv .grid .card");
    const pg = q(".sv .inv .pg");
    const pgb = qa(".sv .inv .pg .pgb");
    const cols = grid
      ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter((x) => x && x !== "none").length
      : 0;
    return {
      url: location.pathname + location.search,
      cards: cards.length,
      cols,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      pager: pg
        ? {
            present: true,
            rect: rect(pg),
            buttons: pgb.map((b) => ({
              label: b.getAttribute("aria-label"),
              text: b.textContent.trim(),
              current: b.getAttribute("aria-current"),
              disabled: b.disabled,
              rect: rect(b),
            })),
          }
        : { present: false, rect: null, buttons: [] },
      current: pgb.find((b) => b.getAttribute("aria-current") === "page")?.textContent.trim() ?? null,
      count: q("#cnt")?.textContent.replace(/\s+/g, " ").trim() ?? null,
      speak: q("#speak")?.textContent.replace(/\s+/g, " ").trim() ?? null,
      active: document.activeElement?.id ?? document.activeElement?.tagName ?? null,
      headingTop: rect(q("#hinv-h"))?.top ?? null,
      scrollY: Math.round(window.scrollY),
      tabs: qa("#cars .tabs .tab").map((b) => ({ text: b.textContent.trim(), on: b.className.includes("on") })),
      featuredCards: qa(".sv .sp .sl .card").length,
      featuredPager: !!q(".sv .sp .pg"),
      doc: {
        clientW: document.documentElement.clientWidth,
        scrollW: document.documentElement.scrollWidth,
      },
    };
  });

const currentPageBtn = (s) => s.pager.buttons.find((b) => b.current === "page") ?? null;
const totalFrom = (s, label) => {
  const m = new RegExp(`${label} (\\d+) cars`).exec(s.count ?? "");
  return m ? parseInt(m[1], 10) : null;
};

const clickPage = async (p, n) => {
  await p.locator(`.sv .inv .pg .pgb[aria-label="Page ${n}"]`).click();
  await p
    .waitForFunction(
      (n) => {
        const b = document.querySelector(`.sv .inv .pg .pgb[aria-label="Page ${n}"]`);
        return b && b.getAttribute("aria-current") === "page";
      },
      n,
      { timeout: 5000 },
    )
    .catch(() => {});
  await p.waitForTimeout(200);
};

const settle = async (p) => {
  await p.waitForSelector(".sv .inv .grid .card", { timeout: 30000 });
  await p.waitForFunction(
    () => {
      const el = document.querySelector(".sv .inv");
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
    },
    null,
    { timeout: 15000 },
  );
  await p.waitForTimeout(150);
};

// The home page opens the first-visit welcome dialog (`#ovl`, Task 45). It intercepts every
// click, so close it as a visitor would; it is not what this check is testing.
const dismissWelcome = async (p, touch = false) => {
  const dlg = p.locator("dialog#ovl[open]");
  await dlg.waitFor({ state: "visible", timeout: 1200 }).catch(() => {});
  if (await dlg.count()) {
    const x = p.locator("#mx");
    if (touch) await x.tap().catch(() => {});
    else await x.click().catch(() => {});
    await p.locator("dialog#ovl").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(150);
  }
};

// ============================================================================================
// Desktop — one window, reused.
// ============================================================================================
const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const d = await deskCtx.newPage();
d.setDefaultTimeout(30000);
const dErrors = [];
d.on("pageerror", (e) => dErrors.push(String(e)));
progress("desktop window open");

await d.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await settle(d);
await dismissWelcome(d);

let s = await state(d);
out.sections.initial = s;
const total = totalFrom(s, "Available");
const pageCount = total == null ? 0 : Math.ceil(total / PAGE_SIZE);
const lastPage = total == null ? 0 : total - PAGE_SIZE * (pageCount - 1);
out.meta = { total, pageCount, lastPage, pageSize: PAGE_SIZE };
progress(`meta: total=${total} pages=${pageCount} lastPage=${lastPage}`);

ok(total != null, `A: the Available count could not be read ("${s.count}")`);
ok(s.cards === Math.min(PAGE_SIZE, total ?? 0), `A: page 1 shows ${Math.min(PAGE_SIZE, total ?? 0)} cards, saw ${s.cards}`);
ok(s.pager.present === pageCount > 1, `A: pager presence follows the count (pages=${pageCount}, present=${s.pager.present})`);
ok(s.current === "1", `A: page 1 is current, saw ${s.current}`);
ok(s.url === "/", `A: the home URL stays "/", saw ${s.url}`);
ok(s.tabs.length === 3 && s.tabs[0].on, `A: the three tabs are present, Available on (${JSON.stringify(s.tabs)})`);
ok(s.cols === 4, `A: 4 columns at 1440, saw ${s.cols}`);
ok(s.overflowX === 0, `A: no horizontal overflow at 1440, saw ${s.overflowX}`);
ok(s.featuredCards === 3 && !s.featuredPager, `A: the featured strip is still a 3-up slider with no pager (cards=${s.featuredCards}, pager=${s.featuredPager}`);

if (pageCount > 1) {
  ok(s.pager.buttons.length === pageCount + 2, `A: ${pageCount + 2} controls, saw ${s.pager.buttons.length}`);
  ok(s.pager.buttons[0].disabled === true, "A: Prev disabled on page 1");
  ok(s.pager.buttons[s.pager.buttons.length - 1].disabled === false, "A: Next enabled on page 1");
  ok(currentPageBtn(s)?.text === "1", "A: the numbered pager marks page 1");

  await clickPage(d, 2);
  s = await state(d);
  out.sections.page2 = s;
  ok(s.cards === lastPage, `B: page 2 shows ${lastPage} cards, saw ${s.cards}`);
  ok(s.current === "2", `B: page 2 is current, saw ${s.current}`);
  ok(s.url === "/", `B: the URL stays "/" on page 2, saw ${s.url}`);
  ok(s.speak === `Page 2 of ${pageCount}`, `B: announcement "Page 2 of ${pageCount}", saw "${s.speak}"`);
  ok(s.active === "hinv-h", `B: focus lands on the inventory heading, saw ${s.active}`);
  ok(s.headingTop !== null && s.headingTop >= 40 && s.headingTop <= 140, `B: the heading sits under the nav, saw top ${s.headingTop}`);
  ok(totalFrom(s, "Available") === total, `B: the count line stays the honest total (${total}), saw "${s.count}"`);
  ok(s.pager.buttons[s.pager.buttons.length - 1].disabled === true, "B: Next disabled on the last page");
  ok(s.pager.buttons[0].disabled === false, "B: Prev enabled on page 2");

  await d.locator('.sv .inv .pg .pgb[aria-label="Previous page"]').click();
  await d.waitForTimeout(200);
  s = await state(d);
  ok(s.current === "1" && s.cards === Math.min(PAGE_SIZE, total ?? 0), `B: Prev returns to page 1 (current=${s.current}, cards=${s.cards})`);

  // tab change from page 2 must return to page 1
  await clickPage(d, 2);
  await d.locator("#cars .tabs .tab", { hasText: "On order" }).click();
  await d.waitForTimeout(300);
  s = await state(d);
  out.sections.on_order = s;
  const onOrder = totalFrom(s, "On order");
  ok(s.tabs.find((t) => t.text.startsWith("On order"))?.on === true, "B: the On order tab is active");
  ok(s.cards === Math.min(PAGE_SIZE, onOrder ?? 0), `B: On order shows ${Math.min(PAGE_SIZE, onOrder ?? 0)} cards, saw ${s.cards}`);
  ok(s.pager.present === (onOrder ?? 0) > PAGE_SIZE, `B: On order pager follows its count (n=${onOrder}, present=${s.pager.present})`);
  if (s.pager.present) ok(s.current === "1", `B: On order starts on page 1, saw ${s.current}`);

  await d.locator("#cars .tabs .tab", { hasText: "Available" }).click();
  await d.waitForTimeout(300);
  s = await state(d);
  ok(s.current === "1" && s.cards === Math.min(PAGE_SIZE, total ?? 0), `B: Available returns to page 1 (current=${s.current}, cards=${s.cards})`);
  progress(`B paging + tab reset ok`);
} else {
  progress("B skipped: fewer than two pages");
}

// ---- C. widths ---------------------------------------------------------------------------------
const widthResults = [];
for (const cfg of [
  { w: 1024, h: 900, cols: 3 },
  { w: 768, h: 900, cols: 2 },
  { w: 375, h: 900, cols: 1 },
]) {
  await d.setViewportSize({ width: cfg.w, height: cfg.h });
  await d.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await settle(d);
  await dismissWelcome(d);
  s = await state(d);
  widthResults.push({ cfg, cols: s.cols, cards: s.cards, overflowX: s.overflowX, pagerRight: s.pager.rect?.right ?? null, pagerX: s.pager.rect?.x ?? null, innerW: cfg.w });
  ok(s.cols === cfg.cols, `C: ${cfg.w} should render ${cfg.cols} columns, saw ${s.cols}`);
  ok(s.overflowX === 0, `C: no horizontal overflow at ${cfg.w}, saw ${s.overflowX}`);
  ok(s.pager.present && s.pager.rect && s.pager.rect.right <= s.doc.clientW && s.pager.rect.x >= 0, `C: pager inside the viewport at ${cfg.w} (x=${s.pager.rect?.x}, right=${s.pager.rect?.right}, clientW=${s.doc.clientW})`);
  if (s.pager.present) {
    const minH = Math.min(...s.pager.buttons.map((b) => b.rect.h));
    ok(minH >= 40, `C: pager controls >= 40px at ${cfg.w}, smallest ${minH}`);
  }
}
out.sections.widths = widthResults;
progress(`C widths ok: ${widthResults.map((r) => `${r.cfg.w}:${r.cols}col/${r.overflowX}px`).join(" ")}`);

await d.setViewportSize({ width: 1440, height: 900 });
await d.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await settle(d);
await dismissWelcome(d);
if (pageCount > 1) {
  await clickPage(d, 2);
  await d.screenshot({ path: new URL("desktop-home-page2.png", runDir).pathname });
}

// ---- D. the excluded surfaces are still sliders ----------------------------------------------
const href = await d.locator(".sv .inv .grid .card").first().getAttribute("href");
await d.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await d.waitForSelector(".rt", { timeout: 30000 });
await d.waitForTimeout(300);
const carTrack = await d.evaluate(() => {
  const rt = document.querySelector(".rt");
  const cs = rt ? getComputedStyle(rt) : null;
  return {
    href: location.pathname,
    tracks: document.querySelectorAll(".rt").length,
    overflowX: cs?.overflowX ?? null,
    snap: cs?.scrollSnapType ?? null,
    display: cs?.display ?? null,
    pagerInTrack: document.querySelectorAll(".rt .pg, .rel .pg").length,
  };
});
out.sections.car_track = carTrack;
ok(carTrack.tracks >= 1, "D: the car page has its horizontal track");
ok(carTrack.overflowX === "auto" && carTrack.snap.includes("x mandatory"), `D: "More available cars" is still a horizontal scroll-snap track (overflowX=${carTrack.overflowX}, snap=${carTrack.snap})`);
ok(carTrack.pagerInTrack === 0, `D: no pager was added to the slider, saw ${carTrack.pagerInTrack}`);
progress(`D car track ok: ${carTrack.overflowX} / ${carTrack.snap} / pager=${carTrack.pagerInTrack}`);

// ============================================================================================
// Phone — 375, real touch.
// ============================================================================================
const phCtx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  screen: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2.625,
  userAgent: ANDROID_UA,
});
const ph = await phCtx.newPage();
ph.setDefaultTimeout(30000);
const phErrors = [];
ph.on("pageerror", (e) => phErrors.push(String(e)));
progress("phone window open");

await ph.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
await settle(ph);
await dismissWelcome(ph, true);
s = await state(ph);
out.sections.phone_initial = s;
ok(s.cards === Math.min(PAGE_SIZE, total ?? 0), `P: phone page 1 shows ${Math.min(PAGE_SIZE, total ?? 0)} cards, saw ${s.cards}`);
ok(s.cols === 1, `P: 1-up at 375, saw ${s.cols}`);
ok(s.featuredCards === 1 && !s.featuredPager, `P: the featured strip shows one card and no pager (cards=${s.featuredCards}, pager=${s.featuredPager})`);
ok(s.overflowX === 0, `P: no horizontal overflow at 375, saw ${s.overflowX}`);

if (pageCount > 1) {
  await ph.locator(`.sv .inv .pg .pgb[aria-label="Page 2"]`).tap();
  await ph.waitForTimeout(350);
  s = await state(ph);
  out.sections.phone_page2 = s;
  ok(s.cards === lastPage, `P: tap page 2 shows ${lastPage} cards, saw ${s.cards}`);
  ok(s.current === "2", `P: page 2 is current, saw ${s.current}`);
  ok(s.speak === `Page 2 of ${pageCount}`, `P: announcement "Page 2 of ${pageCount}", saw "${s.speak}"`);
  ok(s.overflowX === 0, `P: no overflow on page 2`);
  ok(s.pager.present && s.pager.rect && s.pager.rect.right <= s.doc.clientW, "P: pager stays in the viewport");
}
await ph.screenshot({ path: new URL("phone-home-page2.png", runDir).pathname });
progress("P paging ok");

// ---- cleanup ---------------------------------------------------------------------------------
await phCtx.close();
progress("phone window closed");
await deskCtx.close();
progress("desktop window closed");

out.pageErrors = { desktop: dErrors, phone: phErrors };
ok(dErrors.length === 0, `desktop page errors: ${dErrors.join(" | ")}`);
ok(phErrors.length === 0, `phone page errors: ${phErrors.join(" | ")}`);

const after = chromiumCount();
out.chromium = { before, after };
ok(after === before, `chromium count moved ${before} → ${after}`);

await detach(browser);
writeOut();
progress(`done — failures: ${out.failures.length}`);
console.log(
  JSON.stringify(
    { failures: out.failures, chromium: out.chromium, meta: out.meta, widths: out.sections.widths, carTrack: out.sections.car_track },
    null,
    2,
  ),
);
process.exit(out.failures.length ? 1 : 0);
