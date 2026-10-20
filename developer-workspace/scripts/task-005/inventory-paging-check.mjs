// TASK-005 Phase 13 runtime check — inventory browsing.
// Owner ask (2026-10-19): (1) the filter groups' options ("sub-items") must not show until the
// group's icon is clicked; (2) the cars must be paginated — "limited to the ones that can show" —
// nine a page, numbered pages (owner-approved), with Prev/Next.
//
// Read-only. Attach-only to the owner's Chrome on :9222 — never launches one. Window policy
// (owner report 19 Oct: window churn): ONE desktop window (reused for the 1440/1024/768 resize
// walk) + ONE phone window (375, real touch) for the taps — two windows per run, both closed at
// the end; no owner tab is touched by name or heuristic.
//
// usage: node inventory-paging-check.mjs
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { attach, assertOurs, detach, chromiumCount, guardCount, BASE } from "./_lib.mjs";

const runDir = new URL("./runs/inventory-paging/", import.meta.url);
mkdirSync(runDir, { recursive: true });
const progressLog = new URL("progress.log", runDir);
writeFileSync(progressLog, "");
const started = Date.now();
const progress = (msg) =>
  appendFileSync(progressLog, `${new Date().toISOString()} +${((Date.now() - started) / 1000).toFixed(1)}s  ${msg}\n`);

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

// One reader for everything the checks touch.
const state = (p) =>
  p.evaluate(() => {
    const q = (s, r = document) => r.querySelector(s);
    const qa = (s, r = document) => [...r.querySelectorAll(s)];
    const rect = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), top: +b.top.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1) };
    };
    const groups = qa("details.fs").map((d) => ({
      open: d.open,
      title: q("summary", d)?.textContent?.trim() ?? "",
      items: qa("label.ck", d).length,
      // checkVisibility() honours content-visibility, which is how Chrome hides a closed
      // <details>. getClientRects() still reports the boxes inside a closed group (observed
      // 19 Oct: 34 "visible" options with every group closed) — do not use it here.
      visible: qa("label.ck", d).filter((el) => el.checkVisibility()).length,
    }));
    const cards = qa(".sv .ip .grid .card");
    const rows = qa(".sv .ip .lc");
    const pg = q(".sv .pg");
    const pgb = qa(".sv .pg .pgb");
    const columns = cards.length
      ? new Set(cards.slice(0, Math.min(cards.length, 9)).map((c) => Math.round(c.getBoundingClientRect().x))).size
      : 0;
    return {
      url: location.pathname + location.search,
      groups,
      groupCount: groups.length,
      openCount: groups.filter((g) => g.open).length,
      visibleItems: groups.reduce((n, g) => n + g.visible, 0),
      cards: cards.length,
      rows: rows.length,
      columns,
      heading: q("#ttl")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      count: q("#cnt")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      speak: q("#speak")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
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
      active: document.activeElement?.id ?? document.activeElement?.tagName ?? null,
      ttlTop: rect(q("#ttl"))?.top ?? null,
      scrollY: Math.round(window.scrollY),
      sidebarOpen: q(".sv .sb")?.classList.contains("open") ?? null,
      sbt: (() => {
        const b = q("#sbt");
        if (!b) return null;
        return { display: getComputedStyle(b).display, expanded: b.getAttribute("aria-expanded") };
      })(),
      doc: {
        clientW: document.documentElement.clientWidth,
        scrollW: document.documentElement.scrollWidth,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      },
      innerW: innerWidth,
    };
  });

const currentPageBtn = (s) => s.pager.buttons.find((b) => b.current === "page") ?? null;

const clickPage = async (p, n) => {
  await p.locator(`.sv .pg .pgb[aria-label="Page ${n}"]`).click();
  await p
    .waitForFunction(
      (n) => {
        const b = document.querySelector(`.sv .pg .pgb[aria-label="Page ${n}"]`);
        return b && b.getAttribute("aria-current") === "page";
      },
      n,
      { timeout: 5000 },
    )
    .catch(() => {});
  await p.waitForTimeout(150);
};

const firstCardHref = (p) => p.locator(".sv .ip .grid .card").first().getAttribute("href");

// Hydration gate. The page is server-rendered, so a card selector matches long before React is
// listening; clicks before that are swallowed (observed 19 Oct: a filter and the list toggle did
// nothing while ?page=99 kept its un-normalized URL). React attaches its fiber to hydrated host
// nodes, so that property is a real signal rather than a fixed sleep.
const settle = async (p) => {
  await p.waitForSelector(".sv .ip .grid .card", { timeout: 30000 });
  await p.waitForFunction(
    () => {
      const el = document.querySelector(".sv .ip");
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$"));
    },
    null,
    { timeout: 15000 },
  );
  await p.waitForTimeout(120);
};

// ============================================================================================
// Desktop — one window, reused for the whole walk.
// ============================================================================================
const deskCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const d = await deskCtx.newPage();
d.setDefaultTimeout(20000);
const dErrors = [];
d.on("pageerror", (e) => dErrors.push(String(e)));
progress("desktop window open");

await d.goto(`${BASE}/inventory`, { waitUntil: "load" });
await settle(d);

// ---- A. the filter groups start closed ------------------------------------------------------
let s = await state(d);
out.sections.a_initial = s;
ok(s.groupCount === 5, `A: expected 5 filter groups, saw ${s.groupCount}`);
ok(s.openCount === 0, `A: all groups should be closed on load, ${s.openCount} open`);
ok(s.visibleItems === 0, `A: 0 filter options should be visible, saw ${s.visibleItems}`);
ok(s.cards === 9, `A: 9 cards on page 1, saw ${s.cards}`);
progress(`A initial: groups=${s.groupCount} open=${s.openCount} visibleItems=${s.visibleItems} cards=${s.cards}`);

// open / close by click
await d.locator(".sv .sbb details.fs").nth(0).locator("summary").click();
await d.waitForTimeout(150);
s = await state(d);
out.sections.a_open_status = s;
ok(s.groups[0].open && s.groups[0].visible === 3, `A: Status opens with 3 options, open=${s.groups[0].open} visible=${s.groups[0].visible}`);
ok(s.groups.filter((g) => g.open).length === 1, "A: only Status should be open");
await d.locator(".sv .sbb details.fs").nth(0).locator("summary").click();
await d.waitForTimeout(150);
s = await state(d);
ok(!s.groups[0].open && s.visibleItems === 0, "A: a second click closes Status");
progress(`A click open/close ok`);

// keyboard toggle on Make
await d.locator(".sv .sbb details.fs").nth(1).locator("summary").focus();
await d.keyboard.press("Enter");
await d.waitForTimeout(150);
s = await state(d);
out.sections.a_keyboard_open = s;
ok(s.groups[1].open, "A: Enter opens Make");
ok(s.groups[1].visible === s.groups[1].items && s.groups[1].items > 0, `A: all ${s.groups[1].items} Make options visible, saw ${s.groups[1].visible}`);
await d.keyboard.press("Enter");
await d.waitForTimeout(150);
s = await state(d);
ok(!s.groups[1].open, "A: Enter again closes Make");
progress(`A keyboard ok`);

// a filter still works while its group is open
await d.locator(".sv .sbb details.fs").nth(1).locator("summary").click();
await d.waitForTimeout(120);
const makeInfo = await d
  .locator(".sv .sbb details.fs")
  .nth(1)
  .locator("label.ck")
  .first()
  .evaluate((el) => ({
    label: el.textContent.replace(/\s+/g, " ").trim(),
    n: parseInt(el.querySelector("em")?.textContent ?? "0", 10),
  }));
await d.locator(".sv .sbb details.fs").nth(1).locator("label.ck input").first().click();
await d.waitForTimeout(300);
s = await state(d);
out.sections.a_filter = { make: makeInfo, state: s };
ok(s.cards === Math.min(makeInfo.n, 9), `A: "${makeInfo.label}" should show ${Math.min(makeInfo.n, 9)} cards, saw ${s.cards}`);
ok((s.count ?? "").startsWith(String(makeInfo.n)), `A: count should start with ${makeInfo.n}, saw "${s.count}"`);
ok(s.pager.present === makeInfo.n > 9, `A: pager presence should follow the filtered count (n=${makeInfo.n}, present=${s.pager.present})`);
progress(`A filter ok: ${makeInfo.label} -> ${s.cards} cards`);

await d.locator("#clr").click();
await d.waitForTimeout(300);
s = await state(d);
out.sections.a_cleared = s;
ok(s.cards === 9 && /^\d+ cars$/.test(s.count ?? ""), `A: clear-all restores everything, count "${s.count}", cards ${s.cards}`);
const total = parseInt(s.count, 10);
const pageCount = Math.ceil(total / 9);
const perPage = Math.min(9, total);
const lastPage = total - 9 * (pageCount - 1);
out.sections.b_meta = { total, pageCount, perPage, lastPage };
progress(`B meta: total=${total} pages=${pageCount} lastPage=${lastPage}`);

// ---- B. paging -------------------------------------------------------------------------------
ok(s.pager.present, "B: pager present with more than one page");
ok(s.pager.buttons.length === pageCount + 2, `B: ${pageCount + 2} controls (Prev + ${pageCount} + Next), saw ${s.pager.buttons.length}`);
ok(s.pager.buttons[0].disabled === true, "B: Prev disabled on page 1");
ok(s.pager.buttons[s.pager.buttons.length - 1].disabled === false, "B: Next enabled on page 1");
ok(currentPageBtn(s)?.text === "1", "B: page 1 is current on load");
const hrefP1 = await firstCardHref(d);

await clickPage(d, 2);
const hrefP2 = await firstCardHref(d);
s = await state(d);
out.sections.b_page2 = { state: s, hrefP1, hrefP2 };
ok(s.cards === 9, `B: page 2 shows 9 cards, saw ${s.cards}`);
ok(s.url.includes("page=2"), `B: URL carries page=2, saw ${s.url}`);
ok(s.speak === `Page 2 of ${pageCount}`, `B: announcement "Page 2 of ${pageCount}", saw "${s.speak}"`);
ok(s.active === "ttl", `B: focus lands on the results heading, saw ${s.active}`);
ok(s.ttlTop !== null && s.ttlTop >= 40 && s.ttlTop <= 140, `B: heading sits under the nav (~80), saw top ${s.ttlTop}`);
ok(currentPageBtn(s)?.text === "2", "B: page 2 is current");
ok(hrefP1 && hrefP2 && hrefP2 !== hrefP1, "B: the second page shows other cars");
progress(`B page2 ok: cards=${s.cards} speak="${s.speak}" active=${s.active} ttlTop=${s.ttlTop}`);

if (pageCount >= 3) {
  await clickPage(d, pageCount);
  s = await state(d);
  out.sections.b_last = s;
  ok(s.cards === lastPage, `B: last page shows ${lastPage} cards, saw ${s.cards}`);
  ok(s.pager.buttons[s.pager.buttons.length - 1].disabled === true, "B: Next disabled on the last page");
  await d.locator('.sv .pg .pgb[aria-label="Previous page"]').click();
  await d.waitForTimeout(200);
  s = await state(d);
  ok(currentPageBtn(s)?.text === String(pageCount - 1), `B: Prev walks back to page ${pageCount - 1}`);
  progress(`B last page ok`);
}

// deep link
await d.goto(`${BASE}/inventory?page=2`, { waitUntil: "load" });
await settle(d);
s = await state(d);
out.sections.b_deeplink = s;
ok(s.cards === 9 && s.url.includes("page=2"), `B: deep link ?page=2 shows 9 cards, saw ${s.cards} / ${s.url}`);
ok(currentPageBtn(s)?.text === "2", "B: deep link marks page 2 current");
progress(`B deep link ok`);

// clamp
await d.goto(`${BASE}/inventory?page=99`, { waitUntil: "load" });
await settle(d);
s = await state(d);
out.sections.b_clamp = s;
ok(!s.url.includes("99"), `B: ?page=99 normalizes the URL, saw ${s.url}`);
ok(currentPageBtn(s)?.text === String(pageCount), `B: ?page=99 clamps to page ${pageCount}, saw ${currentPageBtn(s)?.text}`);
ok(s.cards === lastPage, `B: clamp shows the last page (${lastPage} cards), saw ${s.cards}`);
progress(`B clamp ok: ${s.url} cards=${s.cards}`);

// a filter returns to page 1
await d.goto(`${BASE}/inventory?page=2`, { waitUntil: "load" });
await settle(d);
await d.locator(".sv .sbb details.fs").nth(1).locator("summary").click();
await d.waitForTimeout(120);
await d.locator(".sv .sbb details.fs").nth(1).locator("label.ck input").first().click();
await d.waitForTimeout(300);
s = await state(d);
out.sections.b_filter_reset = s;
ok(!s.url.includes("page="), `B: a filter returns to page 1, saw ${s.url}`);
await d.locator("#clr").click();
await d.waitForTimeout(250);
progress(`B filter reset ok`);

// a sort change returns to page 1
await d.goto(`${BASE}/inventory`, { waitUntil: "load" });
await settle(d);
await clickPage(d, 2);
await d.selectOption("#sort", "low");
await d.waitForTimeout(300);
s = await state(d);
out.sections.b_sort_reset = s;
ok(!s.url.includes("page="), `B: a sort change returns to page 1, saw ${s.url}`);
ok(s.cards === 9, `B: sort reset lands on page 1, saw ${s.cards} cards`);
await d.selectOption("#sort", "new");
await d.waitForTimeout(200);
progress(`B sort reset ok`);

// list view pages too
await d.goto(`${BASE}/inventory`, { waitUntil: "load" });
await settle(d);
await d.locator("#vl").click();
await d.waitForTimeout(200);
await clickPage(d, 2);
s = await state(d);
out.sections.b_list = s;
ok(s.rows === 9, `B: list view page 2 shows 9 rows, saw ${s.rows}`);
ok(s.url.includes("page=2") && s.url.includes("view=list"), `B: list URL carries view=list&page=2, saw ${s.url}`);
await d.locator("#vg").click();
await d.waitForTimeout(200);
progress(`B list view ok`);

// ---- C. widths: columns, overflow, pager in view -------------------------------------------------
const widthResults = [];
for (const cfg of [
  { w: 1440, h: 900, cols: 3 },
  { w: 1024, h: 900, cols: 2 },
  { w: 768, h: 900, cols: 2 },
]) {
  await d.setViewportSize({ width: cfg.w, height: cfg.h });
  await d.waitForTimeout(350);
  s = await state(d);
  widthResults.push({ cfg, columns: s.columns, overflowX: s.doc.overflowX, pagerRight: s.pager.rect?.right ?? null, pagerX: s.pager.rect?.x ?? null, innerW: s.innerW });
  ok(s.columns === cfg.cols, `C: ${cfg.w} should render ${cfg.cols} columns, saw ${s.columns}`);
  ok(s.doc.overflowX === 0, `C: no horizontal overflow at ${cfg.w}, saw ${s.doc.overflowX}`);
  ok(s.pager.present && s.pager.rect && s.pager.rect.right <= s.doc.clientW && s.pager.rect.x >= 0, `C: pager inside the viewport at ${cfg.w} (x=${s.pager.rect?.x}, right=${s.pager.rect?.right}, clientW=${s.doc.clientW})`);
}
out.sections.c_widths = widthResults;
progress(`C widths ok: ${widthResults.map((r) => `${r.cfg.w}:${r.columns}col/${r.overflowX}px`).join(" ")}`);

await d.setViewportSize({ width: 1440, height: 900 });
await d.goto(`${BASE}/inventory?page=2`, { waitUntil: "load" });
await settle(d);
await d.waitForTimeout(250);
await d.screenshot({ path: new URL("desktop-page2.png", runDir).pathname });

// ============================================================================================
// Phone — 375, real touch; collapsed groups, tap to open, tap to page.
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
ph.setDefaultTimeout(20000);
const phErrors = [];
ph.on("pageerror", (e) => phErrors.push(String(e)));
progress("phone window open");

await ph.goto(`${BASE}/inventory`, { waitUntil: "load" });
await settle(ph);
s = await state(ph);
out.sections.p_initial = s;
ok(s.groupCount === 5 && s.openCount === 0 && s.visibleItems === 0, `P: groups collapsed on the phone (open=${s.openCount}, visible=${s.visibleItems})`);
ok(s.sbt && s.sbt.display !== "none", "P: Search options button visible at 375");
ok(s.cards === perPage && s.columns === 1, `P: 1-up with ${perPage} cards, saw cols=${s.columns} cards=${s.cards}`);
ok(s.doc.overflowX === 0, `P: no horizontal overflow at 375, saw ${s.doc.overflowX}`);
ok(s.pager.present && s.pager.rect && s.pager.rect.right <= s.doc.clientW && s.pager.rect.x >= 0, `P: pager in viewport (x=${s.pager.rect?.x}, right=${s.pager.rect?.right})`);
if (s.pager.present) {
  const minH = Math.min(...s.pager.buttons.map((b) => b.rect.h));
  ok(minH >= 40, `P: pager controls ≥ 40px tall, smallest ${minH}`);
}
progress(`P initial ok`);

await ph.tap("#sbt");
await ph.waitForTimeout(250);
s = await state(ph);
out.sections.p_sidebar = s;
ok(s.sidebarOpen === true, "P: tapping Search options opens the sidebar");
ok(s.groups.every((g) => !g.open), "P: the groups inside are still collapsed");

await ph.locator(".sv .sbb details.fs").nth(0).locator("summary").tap();
await ph.waitForTimeout(250);
s = await state(ph);
out.sections.p_open_status = s;
ok(s.groups[0].open && s.groups[0].visible === 3, `P: tap opens Status with 3 options, open=${s.groups[0].open} visible=${s.groups[0].visible}`);
await ph.locator(".sv .sbb details.fs").nth(0).locator("summary").tap();
await ph.waitForTimeout(200);
s = await state(ph);
ok(!s.groups[0].open, "P: tap again closes Status");
await ph.tap("#sbt");
await ph.waitForTimeout(200);
s = await state(ph);
ok(s.sidebarOpen === false, "P: tapping Search options again closes the drawer");
progress(`P group open/close ok`);

if (pageCount >= 2) {
  await ph.locator('.sv .pg .pgb[aria-label="Page 2"]').tap();
  await ph.waitForTimeout(350);
  s = await state(ph);
  out.sections.p_page2 = s;
  ok(s.cards === 9 && s.url.includes("page=2"), `P: tap page 2 shows 9 cards, saw ${s.cards} / ${s.url}`);
  ok(currentPageBtn(s)?.text === "2", "P: page 2 is current");
  ok(s.doc.overflowX === 0, "P: no overflow on page 2");
}
await ph.screenshot({ path: new URL("phone-page2.png", runDir).pathname });
progress(`P paging ok`);

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
    { failures: out.failures, chromium: out.chromium, meta: out.sections.b_meta, widthResults: out.sections.c_widths },
    null,
    2,
  ),
);
process.exit(out.failures.length ? 1 : 0);
