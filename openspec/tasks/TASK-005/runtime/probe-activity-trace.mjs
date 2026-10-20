// TASK-005 research probe — verify the claimed activity-log trace after the authorised delete+undo.
// READ-ONLY. Attach-only CDP :9222, detach on exit.
import { chromium } from "playwright-core";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto("http://127.0.0.1:3210/office/activity", { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));
  const txt = await page.evaluate(() => document.body.innerText);
  console.log("--- activity page text (first 1800 chars) ---");
  console.log(txt.slice(0, 1800));
} finally {
  browser.close().catch(() => {});
  console.log("\ndetached");
}
