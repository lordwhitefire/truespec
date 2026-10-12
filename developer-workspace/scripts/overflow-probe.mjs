// Diagnostic: is the tablet overflow ours (the editor) or the shell baseline?
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

async function probe(width, height, label) {
  await resize(ctx, page, width, height);
  await page.goto(`${BASE}/office/settings`, { waitUntil: "networkidle" });
  const base = await page.evaluate(() => ({
    iw: window.innerWidth,
    doc: document.documentElement.scrollWidth,
  }));
  const per = {};
  for (const name of ["General", "Car states", "Customer states"]) {
    await page.getByRole("tab", { name }).click();
    per[name] = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("section.card")];
      const last = cards[cards.length - 1];
      const sc = document.querySelector(".edscroll");
      return {
        doc: document.documentElement.scrollWidth,
        cardW: last ? Math.round(last.getBoundingClientRect().width) : null,
        scW: sc ? Math.round(sc.getBoundingClientRect().width) : null,
        scScroll: sc ? sc.scrollWidth : null,
      };
    });
  }
  await clearResize(page);
  return { label, base, per };
}

const out = [];
out.push(await probe(834, 1112, "tablet-834"));
out.push(await probe(1024, 768, "tablet-1024"));

await page.close();
await detach(browser);
console.log(JSON.stringify(out, null, 2));
