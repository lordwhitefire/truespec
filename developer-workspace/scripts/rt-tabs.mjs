// RECON-001: tab click behaviour — does each tab navigate, and where to?
// Usage: node rt-tabs.mjs <url> [selectorPrefix]
// Reports the URL reached after clicking each tab, plus console errors.
import { chromium } from "playwright-core";
const [, , url, prefix = ".tabs > *"] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function countTabs() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  const n = await page.$$eval(prefix, (els) => els.length);
  const labels = await page.$$eval(prefix, (els) => els.map((e) => e.textContent.trim()));
  const hrefs = await page.$$eval(prefix, (els) => els.map((e) => e.getAttribute("href")));
  await ctx.close();
  return { n, labels, hrefs };
}

// Kill any welcome/ask overlay so it can't intercept clicks.
const dismiss = (page) => page.evaluate(() => {
  document.querySelectorAll(".ovl, .mdl, .toast").forEach((e) => (e.style.display = "none"));
  document.body.classList.remove("lock");
}).catch(() => {});

const info = await countTabs();
console.log(`url: ${url}`);
console.log(`  ${info.n} tab(s): ${info.labels.map((l, i) => `"${l}"${info.hrefs[i] ? " href=" + info.hrefs[i] : ""}`).join(" | ")}`);

for (let i = 1; i <= info.n; i++) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await dismiss(page);
  const sel = `${prefix}:nth-child(${i})`;
  const label = info.labels[i - 1];
  try {
    await page.click(sel, { timeout: 8000 });
    await page.waitForTimeout(1400);
    const serverErrors = errs.filter((e) => !/404/.test(e));
    console.log(`  click "${label}" -> ${page.url()}${serverErrors.length ? "  ERRORS: " + serverErrors.join(" / ") : ""}`);
  } catch (e) {
    console.log(`  click "${label}" -> FAILED: ${e.message.split("\n")[0]}${errs.length ? "  ERRORS: " + errs.join(" / ") : ""}`);
  }
  await ctx.close();
}
await browser.close();
