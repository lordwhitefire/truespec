// TASK-005 research probe — closing check after the authorised delete+undo writes.
// READ-ONLY: confirms the fleet is intact, nothing is tombstoned, and shows the activity-log traces left behind.
// Attach-only CDP :9222, no launch, no screenshots, detach on exit.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function waitContent(maxMs = 45000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      let t = "";
      try { t = await page.evaluate(() => document.body.innerText); } catch { t = ""; }
      if (t && !/Just a moment|We couldn’t load this/.test(t)) return t;
      await sleep(1000);
    }
    return "";
  }

  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  const inv = await page.evaluate(() => {
    const clearout = document.querySelector(".clearout");
    return {
      rows: document.querySelectorAll("table.t tbody tr").length,
      countLine: document.querySelector("#count")?.innerText?.replace(/\n+/g, " ").trim(),
      tombstonePanel: clearout ? clearout.innerText.replace(/\n+/g, " | ").slice(0, 200) : "(absent — nothing waiting to be cleared)",
      ts1001: !!document.querySelector('a[href="/office/car/TS-1001"]'),
    };
  });
  console.log("=== INVENTORY (fleet state) ===");
  console.log(JSON.stringify(inv, null, 2));

  await page.goto(BASE + "/office/activity", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  const act = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("table tbody tr, li")].slice(0, 6).map((r) => r.innerText.replace(/\n+/g, " | ").trim());
    return { firstEntries: rows };
  });
  console.log("\n=== ACTIVITY LOG (the traces the two passes left) ===");
  console.log(JSON.stringify(act, null, 2));
  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
