// TASK-005 research probe — R2.6b: pin the horizontal overflow on the showroom home page.
// The first pass found 339px of sideways scroll at 390px width; the "worst element" it named (.ring)
// is clipped by an ancestor, so it is not the true cause. This pass finds only UNCLIPPED overflow.
// Attach-only CDP :9222, read-only GETs, no screenshots, detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  for (const W of [390, 360, 320, 768]) {
    await page.setViewportSize({ width: W, height: 900 });
    await page.goto("http://127.0.0.1:3210/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(1600);
    const f = await page.evaluate(() => {
      const vw = window.innerWidth;
      const doc = document.documentElement;
      const clipped = (el) => {
        let p = el.parentElement;
        while (p && p !== document.documentElement) {
          const cs = getComputedStyle(p);
          if (/hidden|clip|auto|scroll/.test(cs.overflowX)) return true;
          p = p.parentElement;
        }
        return false;
      };
      const offenders = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.right - vw > 1) {
          if (clipped(el)) continue;
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className || "").split(" ").slice(0, 3).join("."),
            id: el.id || "",
            right: Math.round(r.right),
            width: Math.round(r.width),
            left: Math.round(r.left),
          });
        }
      }
      offenders.sort((a, b) => b.right - a.right);
      return {
        vw,
        scrollWidth: doc.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        over: doc.scrollWidth - vw,
        top: offenders.slice(0, 8),
        // is the offender's own scroll container also overflowing?
        htmlOverflowX: getComputedStyle(doc).overflowX,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
      };
    });
    console.log(`\n[home @ ${f.vw}px]  scrollWidth=${f.scrollWidth} bodyScrollWidth=${f.bodyScrollWidth} overflow=${f.over}`);
    console.log(`  html overflow-x=${f.htmlOverflowX} · body overflow-x=${f.bodyOverflowX}`);
    if (!f.top.length) console.log("  no UNCLIPPED element reaches past the viewport");
    for (const o of f.top) {
      console.log(`  ${o.tag}${o.id ? "#" + o.id : ""}${o.cls ? "." + o.cls : ""}  left=${o.left} width=${o.width} right=${o.right}`);
    }
  }
  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
