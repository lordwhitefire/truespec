// RECON-001: measure where the tab label sits vertically inside the tab box.
// Usage: node rt-tabtext.mjs <url>
import { chromium } from "playwright-core";
const [, , url] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addInitScript(() => { try { localStorage.setItem("ts-theme","dark"); localStorage.setItem("ts-asked","true"); localStorage.setItem("ts-visits","3"); } catch {} });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
await page.waitForTimeout(800);
const rows = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll(".tabs > *").forEach((el, i) => {
    const b = el.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(el);
    const t = r.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      i, label: el.textContent.trim(),
      box: `${Math.round(b.width)}x${Math.round(b.height)}`,
      textTop: Math.round(t.top), textH: Math.round(t.height),
      gapTop: Math.round(t.top - b.top), gapBottom: Math.round(b.bottom - t.bottom),
      display: cs.display, alignItems: cs.alignItems, lineHeight: cs.lineHeight,
    });
  });
  return out;
});
await ctx.close();
await browser.close();
console.log(`url: ${url}`);
for (const r of rows) {
  const centered = Math.abs(r.gapTop - r.gapBottom) <= 1 ? "CENTERED" : "NOT centered";
  console.log(`  #${r.i} "${r.label}" box=${r.box} display=${r.display} align=${r.alignItems} lh=${r.lineHeight} | textTop-gap=${r.gapTop} bottom-gap=${r.gapBottom} -> ${centered}`);
}
