// TASK-005 research probe — R2.6: per-width interactions, READ-ONLY.
// Drives the same surfaces at six widths and records what shifts, what overlaps (horizontal overflow),
// and what becomes unreachable. Attach-only CDP :9222, no launch, no screenshots, detach on exit.
// No writes: plain GETs.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";
const WIDTHS = [1440, 1024, 821, 820, 768, 390];

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  // Find a real car ref to drive the detail page.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1500);
  const ref = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/car/"]');
    return a ? a.getAttribute("href") : null;
  });
  console.log(`car ref for the detail page: ${ref}`);

  const OFFICE = ["/office", "/office/inventory", "/office/car/new", "/office/drafts"];
  const SITE = ["/", "/inventory", ref || "/car/TS-1001"];

  for (const W of WIDTHS) {
    await page.setViewportSize({ width: W, height: 900 });
    console.log(`\n==================================================================`);
    console.log(`WIDTH ${W}px`);
    console.log(`==================================================================`);

    for (const [group, paths] of [["OFFICE", OFFICE], ["SHOWROOM", SITE]]) {
      for (const p of paths) {
        let status = "?";
        try {
          const r = await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 60000 });
          status = r ? r.status() : "?";
        } catch (e) {
          console.log(`  [${group}] ${p}  goto error: ${e.message.slice(0, 70)}`);
          continue;
        }
        await sleep(1300);
        const f = await page.evaluate(() => {
          const vis = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0;
          };
          const text = (sel) => document.querySelector(sel)?.innerText?.replace(/\s+/g, " ").trim().slice(0, 70) ?? null;
          const bnavItems = [...document.querySelectorAll(".bnav a")].map((a) => ({
            label: a.innerText.replace(/\s+/g, " ").trim(),
            href: a.getAttribute("href"),
          }));
          // horizontal overflow: how far past the viewport does anything reach?
          const vw = window.innerWidth;
          const doc = document.documentElement;
          const overflow = Math.max(0, doc.scrollWidth - vw);
          let worst = null;
          if (overflow > 1) {
            let best = 0;
            for (const el of document.querySelectorAll("body *")) {
              const r = el.getBoundingClientRect();
              const over = Math.max(r.right - vw, 0);
              if (over > best) {
                best = over;
                worst = `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ").slice(0, 2).join(".") : ""} (+${Math.round(over)}px)`;
              }
            }
          }
          return {
            url: location.pathname,
            w: vw,
            overflow: Math.round(overflow),
            worst,
            // office shell
            side: vis(".side"),
            topbar: vis(".topbar"),
            bnav: vis(".bnav"),
            bnavItems,
            searchBtn: !!document.querySelector('.topbar button[aria-label*="Search"]'),
            // showroom chrome
            fab: vis("a.fab"),
            tick: vis(".tick"),
            navWab: vis(".nav .wab"),
            headerNum: text(".inf b"),
            infHideVisible: vis(".inf.hide"),
            // inventory office: table vs cards
            tbl: vis(".tbl"),
            cards: vis(".cards"),
            // gallery
            galArrows: [...document.querySelectorAll("#gal .gb, .gallery .gb, .gb")].filter((b) => {
              const cs = getComputedStyle(b);
              return cs.display !== "none" && b.getBoundingClientRect().width > 0;
            }).length,
            thumbs: document.querySelectorAll(".thumbs img, #thumbs img, .thumbs button").length,
            h1: text("h1"),
          };
        });
        const parts = [`HTTP ${status}`, `overflow ${f.overflow}${f.worst ? ` (${f.worst})` : ""}`];
        if (f.side !== null) parts.push(`side=${f.side}`);
        if (f.topbar !== null) parts.push(`topbar=${f.topbar}`);
        if (f.bnav !== null) parts.push(`bnav=${f.bnav}`);
        if (f.fab !== null) parts.push(`fab=${f.fab}`);
        if (f.tick !== null) parts.push(`tick=${f.tick}`);
        if (f.navWab !== null) parts.push(`navWab=${f.navWab}`);
        if (f.tbl !== null) parts.push(`tbl=${f.tbl}`);
        if (f.cards !== null) parts.push(`cards=${f.cards}`);
        if (f.galArrows) parts.push(`galArrows=${f.galArrows}`);
        if (f.thumbs) parts.push(`thumbs=${f.thumbs}`);
        if (f.searchBtn) parts.push(`SEARCH-BTN=present`);
        if (f.headerNum) parts.push(`headerNum="${f.headerNum}"`);
        console.log(`  [${group}] ${p}  →  ${parts.join(" · ")}`);
        if (f.bnav && f.bnavItems.length) {
          console.log(`        bottom bar (${f.bnavItems.length}): ${f.bnavItems.map((i) => `${i.label}→${i.href}`).join(" | ")}`);
        }
      }
    }
  }
  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
