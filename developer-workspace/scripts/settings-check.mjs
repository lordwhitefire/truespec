// Task-1 live check for the Settings sub-menu (RECON-001 state editors).
// Attaches to the ONE persistent visible Chrome (CDP :9222) per the
// runtime-divergence / playwright-core skill — no new browser, no headless.
// Drives each width × mode, verifies tabs, panel swap, keyboard nav, overflow.
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
      try {
        localStorage.setItem("ts-theme", t);
      } catch {}
      document.documentElement.dataset.theme = t;
    }, theme);

    const rec = { viewport: vp.name, theme };
    rec.tabs = await page.getByRole("tab").allTextContents();
    rec.dataTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    rec.subnavDir = await page
      .locator(".subnav")
      .evaluate((e) => getComputedStyle(e).flexDirection);
    rec.generalSelected = await page
      .getByRole("tab", { name: "General" })
      .getAttribute("aria-selected");
    rec.generalCards = await page.locator('[role="tabpanel"] section.card').count();
    rec.overflowX = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      over: document.documentElement.scrollWidth > window.innerWidth + 1,
    }));

    // conditional: switch to Car states
    await page.getByRole("tab", { name: "Car states" }).click();
    rec.carSelected = await page
      .getByRole("tab", { name: "Car states" })
      .getAttribute("aria-selected");
    rec.carPanelText = (
      await page.locator('[role="tabpanel"]').innerText()
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 70);

    // conditional: Account shows the password card
    await page.getByRole("tab", { name: "Account" }).click();
    rec.accountPanelText = (
      await page.locator('[role="tabpanel"]').innerText()
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 70);

    // conditional: keyboard nav from General → ArrowRight → Car states
    await page.getByRole("tab", { name: "General" }).focus();
    await page.keyboard.press("ArrowRight");
    rec.afterArrow = await page
      .locator('[role="tab"][aria-selected="true"]')
      .textContent();

    out.push(rec);
    await clearResize(page);
  }
}

await page.close();
await detach(browser);
console.log(JSON.stringify(out, null, 2));
