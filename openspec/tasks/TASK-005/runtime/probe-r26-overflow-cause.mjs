// TASK-005 research probe — R2.6d: catch the transient home-page overflow in the act.
// An init script records, on every frame, the max document scrollWidth and (at the first overflow)
// which elements reach past the viewport and whether the document can actually be scrolled sideways.
// Attach-only CDP :9222, read-only, detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 390, height: 900 });

  await page.addInitScript(() => {
    window.__r26 = { maxOver: 0, maxAt: 0, offenders: null, scrollable: null, samples: [] };
    const t0 = performance.now();
    const clipped = (el) => {
      let p = el.parentElement;
      while (p && p !== document.documentElement) {
        const cs = getComputedStyle(p);
        if (/hidden|clip/.test(cs.overflowX)) return true;
        p = p.parentElement;
      }
      return false;
    };
    const tick = () => {
      const doc = document.documentElement;
      const over = doc.scrollWidth - doc.clientWidth;
      const t = Math.round(performance.now() - t0);
      if (over > window.__r26.maxOver) {
        window.__r26.maxOver = over;
        window.__r26.maxAt = t;
        const out = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.right - doc.clientWidth > 1 && !clipped(el)) {
            out.push({
              tag: el.tagName.toLowerCase(),
              cls: String(el.className || "").split(" ").slice(0, 3).join("."),
              id: el.id || "",
              left: Math.round(r.left),
              width: Math.round(r.width),
              right: Math.round(r.right),
            });
          }
        }
        out.sort((a, b) => b.right - a.right);
        window.__r26.offenders = out.slice(0, 8);
        // Can the person actually move the page sideways right now?
        const before = window.scrollX;
        window.scrollTo(300, window.scrollY);
        const after = window.scrollX;
        window.scrollTo(before, window.scrollY);
        window.__r26.scrollable = { before, after, moved: after !== before };
      }
      if (t < 6000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.goto("http://127.0.0.1:3210/", { waitUntil: "load", timeout: 60000 });
  await sleep(3000);
  const r = await page.evaluate(() => window.__r26);
  console.log(`home @390px — worst overflow seen: ${r.maxOver}px at t+${r.maxAt}ms`);
  console.log(`  could the person scroll sideways at that moment? ${JSON.stringify(r.scrollable)}`);
  if (r.offenders) {
    console.log("  elements reaching past the viewport (unclipped):");
    for (const o of r.offenders) {
      console.log(`    ${o.tag}${o.id ? "#" + o.id : ""}${o.cls ? "." + o.cls : ""}  left=${o.left} width=${o.width} right=${o.right}`);
    }
  }
  console.log("done — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
