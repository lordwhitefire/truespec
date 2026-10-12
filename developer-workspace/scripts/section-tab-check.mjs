// Task-5 live check: section dropdown + "Show as a tab" switch.
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
await resize(ctx, page, 1440, 900);
await page.goto(`${BASE}/office/settings`, { waitUntil: "networkidle" });
await page.getByRole("tab", { name: "Car states" }).click();

const read = () =>
  page.$$eval(".edrow", (rows) =>
    rows.map((r) => ({
      label: r.querySelector(".edin")?.value,
      section: r.querySelector(".edsection")?.value,
      tab: r.querySelector(".edswitch input")?.checked,
    })),
  );

const out = {};
out.initial = await read();

// change Cleared's section to Landed
await page
  .locator(".edrow", { has: page.locator('.edin[value="Cleared"]') })
  .locator(".edsection")
  .selectOption("Landed");
out.clearedSection = (await read()).find((r) => r.label === "Cleared")?.section;

// toggle On the way's tab off
const row = page.locator(".edrow", { has: page.locator('.edin[value="On the way"]') });
await row.locator(".edswitch .edtrack").click();
out.onTheWayTab = (await read()).find((r) => r.label === "On the way")?.tab;

await clearResize(page);
await page.close();
await detach(browser);
console.log(JSON.stringify(out, null, 2));
