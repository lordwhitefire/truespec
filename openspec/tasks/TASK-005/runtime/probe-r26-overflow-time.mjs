// TASK-005 research probe — R2.6c: is the home page's horizontal overflow real, and when does it stop?
// Measures document scrollWidth over time after load at 390px, and reports whether body's overflow-x
// clip is present at first paint or only after hydration. Attach-only, read-only, detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 390, height: 900 });

  // Measure as early as we can, then repeatedly.
  await page.goto("http://127.0.0.1:3210/", { waitUntil: "commit", timeout: 60000 });
  const t0 = Date.now();
  for (let i = 0; i < 14; i++) {
    const f = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        innerW: window.innerWidth,
        clientW: doc.clientWidth,
        scrollW: doc.scrollWidth,
        bodyOverflowX: body ? getComputedStyle(body).overflowX : "?",
        htmlOverflowX: getComputedStyle(doc).overflowX,
        readyState: document.readyState,
        hasJS: typeof window.next !== "undefined" || document.querySelectorAll("script").length > 0,
      };
    }).catch(() => null);
    if (f) {
      const over = f.scrollW - f.clientW;
      console.log(
        `t+${String(Date.now() - t0).padStart(5)}ms  ready=${f.readyState}  innerW=${f.innerW} clientW=${f.clientW} scrollW=${f.scrollW}  overflow=${over}  body-overflow-x=${f.bodyOverflowX}  html-overflow-x=${f.htmlOverflowX}`,
      );
    }
    await sleep(350);
  }

  // Now the honest question: with the clip removed (simulating a no-JS / pre-hydration paint), does it overflow?
  const raw = await page.evaluate(() => {
    const doc = document.documentElement;
    const before = doc.scrollWidth;
    document.body.style.overflowX = "visible";
    const after = doc.scrollWidth;
    document.body.style.overflowX = "";
    return { before, after, clientW: doc.clientWidth };
  });
  console.log(`\nwith body overflow-x forced visible: scrollWidth ${raw.before} → ${raw.after} (clientW ${raw.clientW})`);
  console.log("done — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
