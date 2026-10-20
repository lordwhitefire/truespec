// TASK-005 research probe — R2.7g: the photo-less car's gallery in full. Attach-only CDP :9222, read-only.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const ref of ["TS-1029", "TS-1030", "TS-1001"]) {
    await page.goto("http://127.0.0.1:3210/car/" + ref, { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(1800);
    const f = await page.evaluate(() => {
      const gal = document.querySelector("#gal");
      const gi = document.querySelector("#gi");
      const cn = document.querySelector("#gal .cn, .gal .cn, #cn");
      const body = document.body.innerText;
      return {
        h1: document.querySelector("h1")?.innerText.trim(),
        galHTML: gal ? gal.outerHTML.replace(/\s+/g, " ") : null,
        giSrc: gi ? gi.getAttribute("src") : null,
        giAlt: gi ? gi.getAttribute("alt") : null,
        counter: cn ? cn.innerText.replace(/\s+/g, " ").trim() : null,
        thumbs: document.querySelectorAll("#gal .thumbs *, .thumbs *").length,
        textHasUndefined: /\bundefined\b/.test(body),
        textHasNaN: /\bNaN\b/.test(body),
      };
    });
    console.log(`\n=== /car/${ref}  h1="${f.h1}"`);
    console.log(`  #gi src=${JSON.stringify(f.giSrc)}  alt=${JSON.stringify(f.giAlt)}`);
    console.log(`  photo counter: ${JSON.stringify(f.counter)}  · thumbnails ${f.thumbs}`);
    console.log(`  visible text mentions "undefined": ${f.textHasUndefined} · "NaN": ${f.textHasNaN}`);
    console.log(`  #gal inner: ${f.galHTML ? f.galHTML.slice(0, 520) : "(no #gal)"}`);
  }
  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
