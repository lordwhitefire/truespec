// Task-6 live check: the Customer states editor (no section / tab controls).
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
await page.getByRole("tab", { name: "Customer states" }).click();

const out = {};
out.rows = await page.$$eval(".edrow", (rows) =>
  rows.map((r) => {
    const s = r.querySelector(".edsample");
    return {
      label: r.querySelector(".edin")?.value,
      bg: s ? getComputedStyle(s).backgroundColor : null,
      count: r.querySelector(".edcount")?.textContent?.trim(),
      delDisabled: r.querySelector(".eddel")?.disabled,
    };
  }),
);
out.hasSection = await page.locator(".edsection").count();
out.hasSwitch = await page.locator(".edswitch").count();
out.cols = await page
  .locator(".edhrow")
  .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);

// add + delete the fresh state (count 0 → deletable)
await page.getByRole("button", { name: /Add a state/i }).click();
const added = page.locator(".edrow").last();
await added.locator(".edin").fill("Follow-up");
out.afterAdd = (await page.locator(".edin").count());
await page
  .locator(".edrow", { has: page.locator('.edin[value="Follow-up"]') })
  .locator(".eddel")
  .click();
out.afterDelete = (await page.locator(".edin").count());

await clearResize(page);
await page.close();
await detach(browser);
console.log(JSON.stringify(out, null, 2));
