// RECON-001 screenshot helper.
// Usage: node recon-shot.mjs <url> <out.png> <width> <height> <dark|light> [visitor]
//   visitor = "first" (default) | "returning" (suppresses the first-visit ask/modal)
// Uses the system Google Chrome via playwright-core (no browser download).
import { chromium } from "playwright-core";

const [, , url, out, w, h, theme, visitor = "first"] = process.argv;
if (!url || !out || !w || !h || !theme) {
  console.error("usage: node recon-shot.mjs <url> <out.png> <width> <height> <dark|light> [first|returning]");
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

// Seed the theme for real origins (http://); harmless if it fails on file://.
await ctx.addInitScript((t) => {
  try {
    localStorage.setItem("ts-theme", t);
  } catch {}
}, theme);

// A "returning" visitor: skip the first-visit ask panel and welcome modal.
if (visitor === "returning") {
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("ts-asked", "true");
      localStorage.setItem("ts-visits", "3");
    } catch {}
  });
}

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

// Apply the theme post-load too — covers file:// (opaque origin) and forces the
// CSS attribute the reference and the build both key off.
await page.evaluate((t) => {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("ts-theme", t);
  } catch {}
}, theme);
await page.waitForTimeout(1500);

await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log(`ok ${out} ${w}x${h} ${theme}`);
