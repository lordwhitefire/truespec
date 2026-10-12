// Task-4 live check: drag reorder (keyboard + pointer).
import {
  connect,
  detach,
  resize,
  clearResize,
} from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";

const BASE = process.env.BASE || "http://localhost:3210";
const browser = await connect();
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await resize(ctx, page, 1366, 900);
await page.goto(`${BASE}/office/settings`, { waitUntil: "networkidle" });
await page.getByRole("tab", { name: "Car states" }).click();

const labels = () => page.$$eval(".edin", (e) => e.map((i) => i.value));
const out = {};
out.initial = await labels();

// keyboard: focus the first grip, ArrowDown → swaps rows 0 and 1
await page.locator(".edgrip").first().focus();
await page.keyboard.press("ArrowDown");
out.afterKeyboard = await labels();

// pointer drag: drag row 4 ("Landed") grip onto row 0
await page.locator(".edgrip").nth(4).dragTo(page.locator(".edgrip").nth(0));
out.afterDrag = await labels();

await clearResize(page);
await page.close();
await detach(browser);
console.log(JSON.stringify(out, null, 2));
