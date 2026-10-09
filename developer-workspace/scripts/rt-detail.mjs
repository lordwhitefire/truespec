// RECON-001 runtime per-element detail probe.
// Usage: node rt-detail.mjs <refUrl> <buildUrl> <selector> [selector2 ...]
import { chromium } from "playwright-core";

const [, , refUrl, buildUrl, ...selectors] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function dump(url, selector) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("ts-theme", "dark"); localStorage.setItem("ts-asked", "true"); localStorage.setItem("ts-visits", "3"); } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.waitForTimeout(1500);
  const rows = await page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)].map((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        cls: el.className && typeof el.className === "string" ? el.className : "",
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
        rect: `${Math.round(r.width)}x${Math.round(r.height)}`,
        display: cs.display,
        color: cs.color,
        bg: cs.backgroundColor,
        pad: cs.padding,
        font: `${cs.fontSize}/${cs.lineHeight} w${cs.fontWeight}`,
      };
    });
  }, selector);
  await ctx.close();
  return rows;
}

for (const sel of selectors) {
  console.log(`\n=================== ${sel} ===================`);
  for (const [name, url] of [["REF", refUrl], ["BUILD", buildUrl]]) {
    const rows = await dump(url, sel);
    console.log(`--- ${name}: ${rows.length} match(es)`);
    for (const r of rows.slice(0, 12)) {
      console.log(`  [${r.tag}.${r.cls}] ${r.rect} disp=${r.display} color=${r.color} bg=${r.bg} font=${r.font} pad=${r.pad} :: "${r.text}"`);
    }
  }
}
await browser.close();
