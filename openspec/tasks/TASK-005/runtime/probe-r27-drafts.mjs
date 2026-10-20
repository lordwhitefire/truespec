// TASK-005 research probe — R2.7e: settle the drafts page state (it read "4 enquiries waiting", now empty).
// Attach-only CDP :9222, GET only, detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const wait of [1500, 4000]) {
    await page.goto("http://127.0.0.1:3210/office/drafts", { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(wait);
    const f = await page.evaluate(() => {
      const raw = document.body.innerText;
      const texts = [...document.querySelectorAll("*")].filter((e) => /waiting/i.test(e.textContent || "") && e.children.length === 0).map((e) => e.textContent.trim());
      return {
        len: raw.length,
        head: raw.replace(/\s+/g, " ").slice(0, 700),
        waiting: texts.slice(0, 4),
        hasPhrase: /WAITING ENQUIRY FROM FILE/i.test(raw),
        draftish: [...document.querySelectorAll("[class*=draft],[class*=wait]")].map((e) => e.className).slice(0, 6),
      };
    });
    console.log(`\n=== after ${wait}ms ===  text length ${f.len} · "WAITING ENQUIRY FROM FILE"=${f.hasPhrase}`);
    console.log(`  head: ${f.head}`);
    console.log(`  elements mentioning "waiting": ${JSON.stringify(f.waiting)}`);
    console.log(`  classes: ${JSON.stringify(f.draftish)}`);
  }
  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
