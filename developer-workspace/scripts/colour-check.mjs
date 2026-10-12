// Task-3 live check: colour picker + live sample + luminance ink.
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

const samples = () =>
  page.$$eval(".edrow", (rows) =>
    rows.map((r) => {
      const s = r.querySelector(".edsample");
      const cs = s ? getComputedStyle(s) : null;
      return {
        label: r.querySelector(".edin")?.value,
        sampleText: s?.textContent,
        bg: cs?.backgroundColor,
        ink: cs?.color,
      };
    }),
  );

const out = {};
out.initial = await samples();

// pick a light colour on "Available" → ink should flip to near-black
const pick = (i) => page.locator(".edrow").nth(i).locator(".edpick");
await pick(0).fill("#f5f5f5");
out.afterLight = (await samples())[0];

// pick a dark colour → ink should flip to white
await pick(0).fill("#101010");
out.afterDark = (await samples())[0];

await clearResize(page);
await page.close();
await detach(browser);
console.log(JSON.stringify(out, null, 2));
