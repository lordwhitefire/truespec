// TASK-005 research probe — R2.7i: is the photo-less car linked from any public surface? READ-ONLY.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const p of ["/", "/inventory"]) {
    await page.goto("http://127.0.0.1:3210" + p, { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(2200);
    const f = await page.evaluate(() => {
      const links = [...new Set([...document.querySelectorAll('a[href^="/car/"]')].map((a) => a.getAttribute("href")))];
      return { links, has1029: links.some((h) => /TS-1029/.test(h || "")), has1030: links.some((h) => /TS-1030/.test(h || "")) };
    });
    console.log(`${p} → ${f.links.length} car links · TS-1029 linked: ${f.has1029} · TS-1030 linked: ${f.has1030}`);
    console.log(`   ${JSON.stringify(f.links)}`);
  }
  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
