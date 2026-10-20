// TASK-005 research probe — R2.6e: the width-specific *behaviours* the plan asks about:
//   swipe versus arrows (car gallery), a drawer versus a sidebar (office nav), a stacked form
//   versus a row (office car form; enquiries board) — plus the bottom-bar overlap check.
// Attach-only CDP :9222, read-only (GETs + a synthetic touch swipe, which changes nothing), detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const cdp = await ctx.newCDPSession(page);

  // ---- 1. Car gallery: arrows present at phone width, and does a touch swipe advance it? ----
  console.log("== 1. car detail gallery: arrows + swipe ==");
  for (const W of [1024, 390]) {
    await page.setViewportSize({ width: W, height: 900 });
    await page.goto("http://127.0.0.1:3210/car/TS-1001", { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(1800);
    const before = await page.evaluate(() => {
      const stage = document.querySelector("#gal img, .gal img, .stage img");
      const arrows = [...document.querySelectorAll(".gb")].filter((b) => b.getBoundingClientRect().width > 0);
      const counter = document.querySelector(".pc")?.innerText?.replace(/\s+/g, " ").trim() ?? null;
      return { src: stage ? stage.getAttribute("src") : null, arrows: arrows.length, counter, disabled: arrows.map((a) => a.disabled) };
    });
    // synthetic touch swipe left→right across the gallery
    const box = await page.evaluate(() => {
      const g = document.querySelector("#gal, .gal, .gallery");
      if (!g) return null;
      const r = g.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + Math.min(120, r.height / 2)) };
    });
    if (box) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + 80, y: box.y }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x - 80, y: box.y }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(900);
    }
    const after = await page.evaluate(() => {
      const stage = document.querySelector("#gal img, .gal img, .stage img");
      const counter = document.querySelector(".pc")?.innerText?.replace(/\s+/g, " ").trim() ?? null;
      return { src: stage ? stage.getAttribute("src") : null, counter };
    });
    console.log(`  @${W}px  arrows visible=${before.arrows}${before.disabled.length ? ` (disabled=${JSON.stringify(before.disabled)})` : ""}  counter=${JSON.stringify(before.counter)}`);
    console.log(`         before src=…${(before.src || "").slice(-28)}  →  after swipe src=…${(after.src || "").slice(-28)}  counter=${JSON.stringify(after.counter)}  →  SWIPE ${before.src !== after.src ? "CHANGED the photo" : "did nothing"}`);
  }

  // ---- 2. Office car form: stacked vs row (.cols) ----
  console.log("\n== 2. office car form: .cols / .aside ==");
  for (const W of [1440, 1150, 1024, 900, 390]) {
    await page.setViewportSize({ width: W, height: 900 });
    await page.goto("http://127.0.0.1:3210/office/car/new", { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(1300);
    const f = await page.evaluate(() => {
      const cols = document.querySelector(".cols");
      const aside = document.querySelector(".aside");
      const g = (el) => (el ? getComputedStyle(el).gridTemplateColumns.split(" ").length : null);
      return { colsTracks: g(cols), asideDisplay: aside ? getComputedStyle(aside).display : null, asideOrder: aside ? getComputedStyle(aside).order : null };
    });
    console.log(`  @${W}px  .cols tracks=${f.colsTracks}  .aside display=${f.asideDisplay} order=${f.asideOrder}`);
  }

  // ---- 3. Enquiries board columns ----
  console.log("\n== 3. enquiries board columns ==");
  for (const W of [1440, 1180, 1024, 390]) {
    await page.setViewportSize({ width: W, height: 900 });
    await page.goto("http://127.0.0.1:3210/office/enquiries", { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(1300);
    const f = await page.evaluate(() => {
      const b = document.querySelector(".board");
      if (!b) return { tracks: null, scrollW: null, clientW: null };
      return { tracks: getComputedStyle(b).gridTemplateColumns.split(" ").length, scrollW: b.scrollWidth, clientW: b.clientWidth };
    });
    console.log(`  @${W}px  .board columns=${f.tracks}  board scrollW=${f.scrollW} clientW=${f.clientW}${f.scrollW > f.clientW ? "  (board scrolls sideways)" : ""}`);
  }

  // ---- 4. Bottom bar overlap: is the last content hidden behind it? ----
  console.log("\n== 4. office: does the bottom bar cover the last content? ==");
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("http://127.0.0.1:3210/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1600);
  const overlap = await page.evaluate(() => {
    const nav = document.querySelector(".bnav");
    const main = document.querySelector(".main");
    if (!nav || !main) return null;
    const navTop = nav.getBoundingClientRect().top;
    const mainRect = main.getBoundingClientRect();
    // last visible child block of main
    const kids = [...main.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().height > 10);
    const last = kids.reduce((acc, e) => {
      const r = e.getBoundingClientRect();
      return r.bottom > (acc ? acc.bottom : -1) ? { r, tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 40) } : acc;
    }, null);
    return {
      navTop: Math.round(navTop),
      mainBottom: Math.round(mainRect.bottom),
      lastBottom: last ? Math.round(last.r.bottom) : null,
      lastTag: last ? `${last.tag}.${last.cls}` : null,
      docScrollBottom: Math.round(document.documentElement.scrollHeight) ,
    };
  });
  console.log(`  @390px  bottom-bar top=${overlap.navTop}  main bottom=${overlap.mainBottom}`);
  console.log(`          last content bottom=${overlap.lastBottom} (${overlap.lastTag})  page height=${overlap.docScrollBottom}`);
  console.log(`          → last content is ${overlap.lastBottom <= overlap.navTop ? "ABOVE" : "BEHIND"} the bottom bar`);

  console.log("\ndone — read-only (one synthetic touch swipe; nothing written)");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
