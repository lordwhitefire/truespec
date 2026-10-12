// Task-6/7 final live check: both editors across 3 widths × 2 modes.
import {
  connect,
  detach,
  resize,
  clearResize,
} from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";

const BASE = process.env.BASE || "http://localhost:3210";
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "laptop", width: 1366, height: 900 },
];
const THEMES = ["dark", "light"];

const browser = await connect();
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
const out = [];

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    await resize(ctx, page, vp.width, vp.height);
    await page.goto(`${BASE}/office/settings`, { waitUntil: "networkidle" });
    await page.evaluate((t) => {
      try { localStorage.setItem("ts-theme", t); } catch {}
      document.documentElement.dataset.theme = t;
    }, theme);

    const rec = { viewport: vp.name, theme };
    rec.dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);

    await page.getByRole("tab", { name: "Car states" }).click();
    rec.carRows = await page.locator(".edrow").count();
    rec.carSwitches = await page.locator(".edswitch").count();
    rec.carSections = await page.locator(".edsection").count();
    rec.carCols = await page
      .locator(".edhrow")
      .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);
    rec.carScroll = await page.locator(".edscroll").evaluate((e) => ({
      sw: e.scrollWidth, cw: e.clientWidth, scrolls: e.scrollWidth > e.clientWidth,
    }));
    rec.carSwitchVisible = await page.locator(".edswitch .edtrack").first().isVisible();
    rec.carSample = await page
      .locator(".edsample")
      .first()
      .evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, ink: getComputedStyle(e).color }));

    await page.getByRole("tab", { name: "Customer states" }).click();
    rec.custRows = await page.locator(".edrow").count();
    rec.custSwitches = await page.locator(".edswitch").count();
    rec.custCols = await page
      .locator(".edhrow")
      .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(" ").length);

    rec.overflow = await page.evaluate(() => ({
      over: document.documentElement.scrollWidth > window.innerWidth + 1,
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
    }));

    out.push(rec);
    await clearResize(page);
  }
}

await page.close();
await detach(browser);
console.log(JSON.stringify(out, null, 2));
