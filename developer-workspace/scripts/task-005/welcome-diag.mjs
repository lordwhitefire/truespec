// TASK-005 follow-up check — the new-visitor ask modal ("What are you after?").
// The owner asked: "the pop up that welcomes new visitor is not responsive — check and reply."
//
// Scope: read-only. Incognito windows only; the owner's storage and session are never touched.
// Attach-only: the Chrome on :9222 is the owner's; this never launches one.
// WINDOW POLICY (owner report 19 Oct: "always launching fresh? 3 windows now?"): one window per
// profile for the whole walk — not one per case. The phone window is reused for the interaction
// cases and the plain window for the resize cases; the visitor marker is cleared between cases,
// so every case still sees a true new visitor. Windows opened per run: 4 (was 22), all closed.
//
// It measures, across phone/tablet/desktop viewports and real mobile emulation:
//   - whether the panel fits the visual viewport,
//   - whether the close (X) and every button is hit-testable and tappable,
//   - whether the panel clips or the overlay can still be scrolled when space is short,
//   - whether the modal reflows when the viewport changes under it (rotation / resize),
//   - whether the page behind has horizontal overflow that would skew the overlay,
//   - the featured strip's per-row count and layout containment (Task 45: its overflow used to
//     widen the page and stretch the fixed dialog).
//
// Progress is appended to runs/welcome-responsive/progress.log as it walks, and diag.json is
// rewritten after every section, so a stalled run still leaves evidence of where it stopped.
//
// usage: node welcome-diag.mjs
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { attach, assertOurs, detach, chromiumCount, BASE } from "./_lib.mjs";

const runDir = new URL("./runs/welcome-responsive/", import.meta.url);
mkdirSync(runDir, { recursive: true });
const progressLog = new URL("progress.log", runDir);
writeFileSync(progressLog, "");
const started = Date.now();
const progress = (msg) =>
  appendFileSync(progressLog, `${new Date().toISOString()} +${((Date.now() - started) / 1000).toFixed(1)}s  ${msg}\n`);

progress("start");
const browser = await attach();
await assertOurs(browser);
progress(`attached (chromium instances: ${chromiumCount()})`);

const measure = (p) =>
  p.evaluate(() => {
    const d = document.querySelector("#ovl");
    const mdl = d?.querySelector(".mdl");
    const mx = d?.querySelector("#mx");
    const sl = document.querySelector("#sl");
    const btns = [...(d?.querySelectorAll(".mbtns button") ?? [])];
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        left: +b.left.toFixed(1),
        right: +b.right.toFixed(1),
        top: +b.top.toFixed(1),
        bottom: +b.bottom.toFixed(1),
        w: +b.width.toFixed(1),
        h: +b.height.toFixed(1),
      };
    };
    const vw = window.visualViewport?.width ?? innerWidth;
    const vh = window.visualViewport?.height ?? innerHeight;
    const at = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return e ? { tag: e.tagName, isTarget: e === el || el.contains(e) } : null;
    };
    return {
      open: !!d?.open,
      meta: document.querySelector("meta[name=viewport]")?.getAttribute("content") ?? null,
      inner: { w: innerWidth, h: innerHeight },
      visual: {
        w: +vw.toFixed(1),
        h: +vh.toFixed(1),
        scale: +(window.visualViewport?.scale ?? 1).toFixed(3),
        offsetTop: window.visualViewport?.offsetTop ?? 0,
      },
      screen: { w: screen.width, h: screen.height },
      doc: {
        clientW: document.documentElement.clientWidth,
        clientH: document.documentElement.clientHeight,
        scrollW: document.documentElement.scrollWidth,
        scrollH: document.documentElement.scrollHeight,
      },
      panel: r(mdl),
      panelStyle: mdl
        ? {
            width: getComputedStyle(mdl).width,
            maxWidth: getComputedStyle(mdl).maxWidth,
            padding: getComputedStyle(mdl).padding,
            overflowY: getComputedStyle(mdl).overflowY,
          }
        : null,
      strip: sl
        ? {
            cols: getComputedStyle(sl).gridTemplateColumns,
            per: getComputedStyle(sl).gridTemplateColumns.split(" ").length,
            cards: sl.children.length,
            contain: getComputedStyle(sl).contain,
            scrollW: sl.scrollWidth,
            right: +sl.getBoundingClientRect().right.toFixed(1),
          }
        : null,
      close: r(mx),
      closeHit: at(mx),
      buttons: btns.map((b) => ({
        text: b.textContent.trim(),
        rect: r(b),
        hit: at(b),
        clipH: b.scrollHeight > b.clientHeight + 1,
        clipW: b.scrollWidth > b.clientWidth + 1,
        whiteSpace: getComputedStyle(b).whiteSpace,
      })),
      overlayScroll: d
        ? {
            scrollH: d.scrollHeight,
            clientH: d.clientHeight,
            scrollTop: d.scrollTop,
            overflow: getComputedStyle(d).overflow,
          }
        : null,
      panelBeyondX: mdl ? r(mdl).left < 0 || r(mdl).right > vw : null,
      panelBeyondY: mdl ? r(mdl).top < 0 || r(mdl).bottom > vh : null,
      bodyLock: document.body.classList.contains("lock"),
    };
  });

const openModal = async (p, tag) => {
  await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await p.waitForSelector("#ovl[open]", { state: "attached", timeout: 8000 });
  await p.waitForTimeout(250);
};

// ---- 1. Plain CSS viewports — what the layout does at phone CSS widths -----------------------
const plainSizes = [
  { w: 280, h: 653 },
  { w: 320, h: 568 },
  { w: 320, h: 400 },
  { w: 360, h: 640 },
  { w: 360, h: 560 },
  { w: 375, h: 667 },
  { w: 375, h: 548 },
  { w: 390, h: 664 },
  { w: 414, h: 716 },
  { w: 430, h: 740 },
  { w: 480, h: 320 },
  { w: 568, h: 320 },
  { w: 667, h: 375 },
  { w: 768, h: 1024 },
  { w: 1440, h: 900 },
];
const plain = [];
const writeOut = (extra = {}) => {
  writeFileSync(
    new URL("diag.json", runDir),
    JSON.stringify({ at: new Date().toISOString(), plain, mobile, taps, resize, ...extra }, null, 2)
  );
};
let mobile = [];
let taps = [];
let resize = [];
// One window for the whole plain walk (no per-case windows — owner window report); it is reused
// by the resize section below and closed at the end.
const plainCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const plainPage = await plainCtx.newPage();
plainPage.setDefaultTimeout(10000);
progress("plain window open");
for (const s of plainSizes) {
  const tag = `plain ${s.w}x${s.h}`;
  progress(`${tag} start`);
  try {
    await plainPage.setViewportSize({ width: s.w, height: s.h });
    await plainPage.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
    await openModal(plainPage, tag);
    plain.push({ size: s, ...(await measure(plainPage)) });
    progress(`${tag} ok`);
  } catch (e) {
    plain.push({ size: s, error: e.message.split("\n")[0] });
    progress(`${tag} ERROR ${e.message.split("\n")[0]}`);
  }
  writeOut();
}

// ---- 2. Real mobile emulation — screen set, so device-width is the phone's own width ---------
const androidUA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36";
const mobiles = [
  {
    name: "android-375x812",
    opts: {
      viewport: { width: 375, height: 812 },
      screen: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2.625,
      userAgent: androidUA,
    },
  },
  {
    name: "android-360x800",
    opts: {
      viewport: { width: 360, height: 800 },
      screen: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      userAgent: androidUA,
    },
  },
  {
    name: "android-430x932",
    opts: {
      viewport: { width: 430, height: 932 },
      screen: { width: 430, height: 932 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      userAgent: androidUA,
    },
  },
];
let phone = null; // the first phone window stays open for section 3, then closes
for (const cfg of mobiles) {
  progress(`mobile ${cfg.name} start`);
  const ctx = await browser.newContext(cfg.opts);
  const p = await ctx.newPage();
  p.setDefaultTimeout(10000);
  try {
    await openModal(p, cfg.name);
    mobile.push({ config: cfg.name, ...(await measure(p)) });
    progress(`mobile ${cfg.name} ok`);
  } catch (e) {
    mobile.push({ config: cfg.name, error: e.message.split("\n")[0] });
    progress(`mobile ${cfg.name} ERROR ${e.message.split("\n")[0]}`);
  }
  if (!phone) phone = { ctx, p };
  else await ctx.close();
  writeOut();
}

// ---- 3. Interaction on the phone window (no extra windows): X closes; Skip / a choice resolve --
const tapCases = [
  { name: "x", sel: "#ovl #mx" },
  { name: "skip", sel: "#ovl .mbtns .sk" },
  { name: "suv", sel: "#ovl .mbtns button[data-a='suv']" },
];
let tapErrors = [];
const tapPage = phone.p;
tapPage.on("pageerror", (e) => tapErrors.push(String(e)));
const tapState = async () => {
  // the choice may navigate (SUV → /inventory?body=SUV); give the document time and retry
  for (let i = 0; i < 3; i++) {
    try {
      return await tapPage.evaluate(() => ({
        open: !!document.querySelector("#ovl")?.open,
        lock: document.body ? document.body.classList.contains("lock") : null,
        asked: localStorage.getItem("ts-asked"),
        path: location.pathname + location.search,
      }));
    } catch {
      await tapPage.waitForTimeout(400);
    }
  }
  return { evalError: "document not ready after retries" };
};
for (const c of tapCases) {
  progress(`tap ${c.name} start`);
  tapErrors = [];
  try {
    // true new-visitor state without a new window: clear the visitor marker, then load
    await tapPage.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
    await openModal(tapPage, `tap ${c.name}`);
    await tapPage.locator(c.sel).tap({ timeout: 8000 });
    await tapPage.waitForTimeout(800);
    await tapPage.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    await tapPage.waitForTimeout(400);
    taps.push({ name: c.name, ...(await tapState()) });
    progress(`tap ${c.name} ok`);
  } catch (e) {
    taps.push({ name: c.name, error: e.message.split("\n")[0].slice(0, 200) });
    progress(`tap ${c.name} ERROR ${e.message.split("\n")[0].slice(0, 200)}`);
  }
  taps[taps.length - 1].errors = [...tapErrors];
  writeOut();
}
await phone.ctx.close();
progress("phone window closed");

// ---- 4. The viewport changes under the open modal (rotation / resize) -------------------------
progress("resize start");
{
  const p = plainPage; // same plain window, no extra window
  try {
    await p.setViewportSize({ width: 375, height: 812 });
    await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }).catch(() => {});
    await openModal(p, "resize");
    resize.push({ step: "open-375x812", ...(await measure(p)) });
    await p.setViewportSize({ width: 812, height: 375 });
    await p.waitForTimeout(400);
    resize.push({ step: "rotate-812x375", ...(await measure(p)) });
    await p.setViewportSize({ width: 320, height: 400 });
    await p.waitForTimeout(400);
    const shrunk = await measure(p);
    // short viewport: is the top of an overflowing panel reachable by scrolling the overlay?
    const reach = await p.evaluate(() => {
      const d = document.querySelector("#ovl");
      if (!d) return null;
      d.scrollTop = 0;
      const atTop = d.scrollTop;
      d.scrollTop = d.scrollHeight;
      const atBottom = d.scrollTop;
      const mdl = d.querySelector(".mdl");
      return {
        atTop,
        atBottom,
        max: d.scrollHeight - d.clientHeight,
        panelTop: mdl ? mdl.getBoundingClientRect().top : null,
      };
    });
    resize.push({ step: "shrink-320x400", ...shrunk, reach });
    progress("resize ok");
  } catch (e) {
    resize.push({ step: "resize", error: e.message.split("\n")[0] });
    progress(`resize ERROR ${e.message.split("\n")[0]}`);
  }
  writeOut();
}

await plainCtx.close();
progress("plain window closed");
writeOut({ chromium: chromiumCount(), done: true });
progress("done");
console.log("written:", new URL("diag.json", runDir).pathname);
console.log("TAPS", JSON.stringify(taps, null, 1));
console.log("PLAIN");
for (const r of plain) {
  console.log(
    " ",
    JSON.stringify({
      size: r.size,
      err: r.error,
      vw: r.visual?.w,
      vh: r.visual?.h,
      panel: r.panel,
      beyondX: r.panelBeyondX,
      beyondY: r.panelBeyondY,
      docOverflowX: r.doc ? r.doc.scrollW > r.doc.clientW : null,
      clipped: r.buttons?.filter((b) => b.clipH || b.clipW).map((b) => b.text),
      closeHit: r.closeHit,
      strip: r.strip ? { per: r.strip.per, cards: r.strip.cards, contain: r.strip.contain } : null,
    })
  );
}
console.log("MOBILE");
for (const r of mobile) {
  console.log(
    " ",
    JSON.stringify({
      config: r.config,
      err: r.error,
      inner: r.inner,
      visual: r.visual,
      screen: r.screen,
      panel: r.panel,
      beyondX: r.panelBeyondX,
      beyondY: r.panelBeyondY,
      closeHit: r.closeHit,
      docOverflowX: r.doc ? r.doc.scrollW > r.doc.clientW : null,
      strip: r.strip
        ? { per: r.strip.per, cards: r.strip.cards, contain: r.strip.contain, scrollW: r.strip.scrollW }
        : null,
    })
  );
}
console.log("RESIZE");
for (const r of resize) {
  console.log(
    " ",
    JSON.stringify({ step: r.step, vw: r.visual?.w, vh: r.visual?.h, panel: r.panel, beyondY: r.panelBeyondY, reach: r.reach })
  );
}
await detach(browser);
