// Dump the reference office page's visible content at RUNTIME (CDP, no source reading).
// Usage: node developer-workspace/scripts/office-data/dump-ref.mjs <url> [outfile]
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const url = process.argv[2];
const out = process.argv[3];
if (!url) {
  console.error("usage: node dump-ref.mjs <url> [outfile]");
  process.exit(2);
}

const browser = await chromium.connectOverCDP("http://localhost:9222", { timeout: 10000 });
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
await page.setViewportSize({ width: 1440, height: 1400 });
await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(400);

const text = await page.evaluate(() => {
  const main = document.querySelector("main");
  const el = main || document.body;
  return el.innerText;
});

await page.close();
if (out) {
  writeFileSync(out, text);
  console.log(`wrote ${out} (${text.length} chars)`);
} else {
  console.log(text);
}
process.exit(0);
