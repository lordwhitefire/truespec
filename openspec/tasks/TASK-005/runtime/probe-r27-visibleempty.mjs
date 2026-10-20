// TASK-005 research probe — R2.7h: what is VISIBLE at zero matches on the showroom inventory
// (the "Nothing matches those filters…" string may be a screen-reader live region, not a visible block).
// Attach-only CDP :9222, read-only GET + client-side filter, detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:3210/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);

  const before = await page.evaluate(() => {
    const vis = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { exists: true, w: Math.round(r.width), h: Math.round(r.height), display: cs.display, clip: cs.clip, pos: cs.position, text: el.innerText.replace(/\s+/g, " ").trim().slice(0, 90) };
    };
    return { cards: document.querySelectorAll("a.card").length, ttl: vis("#ttl"), speak: vis("#speak"), empty: vis(".empty") };
  });
  console.log(`BEFORE filter: cards=${before.cards}`);
  console.log(`  #ttl   → ${JSON.stringify(before.ttl)}`);
  console.log(`  #speak → ${JSON.stringify(before.speak)}`);
  console.log(`  .empty → ${JSON.stringify(before.empty)}`);

  const minBox = await page.$('input[placeholder="Min"]');
  if (minBox) { await minBox.fill("999000000"); await sleep(1200); }

  const after = await page.evaluate(() => {
    const vis = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { w: Math.round(r.width), h: Math.round(r.height), display: cs.display, text: el.innerText.replace(/\s+/g, " ").trim().slice(0, 120) };
    };
    // every element containing the zero-match sentence, and whether it is laid out (h>0)
    const hits = [...document.querySelectorAll("*")].filter((e) => /Nothing matches/i.test(e.textContent || "") && e.children.length === 0)
      .map((e) => { const r = e.getBoundingClientRect(); const p = e.closest("#speak"); return { tag: e.tagName.toLowerCase(), cls: e.className, h: Math.round(r.height), w: Math.round(r.width), inLiveRegion: !!p, text: e.textContent.replace(/\s+/g, " ").trim().slice(0, 90) }; });
    const buttons = [...document.querySelectorAll("button, a")].filter((b) => b.getBoundingClientRect().height > 0).map((b) => b.innerText.replace(/\s+/g, " ").trim()).filter((t) => /clear|filter|search/i.test(t));
    return { cards: document.querySelectorAll("a.card").length, ttl: vis("#ttl"), speak: vis("#speak"), empty: vis(".empty"), hits, buttons };
  });
  console.log(`\nAFTER filter matching nothing: cards=${after.cards}`);
  console.log(`  #ttl   → ${JSON.stringify(after.ttl)}`);
  console.log(`  #speak → ${JSON.stringify(after.speak)}`);
  console.log(`  .empty → ${JSON.stringify(after.empty)}`);
  console.log(`  elements carrying "Nothing matches":`);
  for (const h of after.hits) console.log(`    <${h.tag} class="${h.cls}"> h=${h.h} w=${h.w} inLiveRegion=${h.inLiveRegion} "${h.text}"`);
  console.log(`  visible controls mentioning clear/filter/search: ${JSON.stringify(after.buttons)}`);

  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
