// Task-2/3/4/5 live check: the Car states editor. Attaches to the shared Chrome.
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

const readRows = () =>
  page.$$eval(".edrow", (rows) =>
    rows.map((r) => ({
      label: r.querySelector(".edin")?.value,
      count: r.querySelector(".edcount")?.textContent?.trim(),
      delDisabled: r.querySelector(".eddel")?.disabled,
      tip: r.querySelector(".tt")?.getAttribute("data-tip") || null,
    })),
  );

const out = {};
out.initialRows = await readRows();

// add
await page.getByRole("button", { name: /Add a state/i }).click();
out.afterAdd = await readRows();

// rename the newly added last row
const last = page.locator(".edrow").last().locator(".edin");
await last.fill("Held for payment");
out.afterRenameLast = (await readRows()).slice(-1);

// delete the "Cleared" row (count 0 → enabled)
await page
  .locator(".edrow", { has: page.locator('.edin[value="Cleared"]') })
  .locator(".eddel")
  .click();
out.afterDeleteCleared = (await readRows()).map((r) => r.label);

await clearResize(page);
await page.close();
await detach(browser);
console.log(JSON.stringify(out, null, 2));
