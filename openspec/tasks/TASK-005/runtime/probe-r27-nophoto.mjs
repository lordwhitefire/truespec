// TASK-005 research probe — R2.7f: is there a car with NO photos, live in the showroom? (READ-ONLY)
// Checks /car/TS-1029 (0 thumbnails earlier) and whether it even appears in the showroom inventory.
// Attach-only CDP :9222, GETs only, detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const BASE = "http://127.0.0.1:3210";
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- 1. the car page for TS-1029 ----
  await page.goto(BASE + "/car/TS-1029", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const car = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].map((i) => ({ src: (i.getAttribute("src") || "").slice(-40), cls: i.className, w: Math.round(i.getBoundingClientRect().width) }));
    const gal = document.querySelector("#gal, .gal, .gallery");
    const thumbs = document.querySelectorAll(".thumbs *, #thumbs *").length;
    const body = document.body.innerText.replace(/\s+/g, " ");
    return {
      h1: document.querySelector("h1")?.innerText.trim(),
      imgCount: imgs.length,
      imgs: imgs.slice(0, 6),
      galHTML: gal ? gal.outerHTML.replace(/\s+/g, " ").slice(0, 400) : null,
      thumbsAny: thumbs,
      hasNoPhotoWording: /no photo|photos|No image|coming soon/i.test(body),
      bodyHead: body.slice(0, 260),
    };
  });
  console.log(`1. /car/TS-1029  h1="${car.h1}"`);
  console.log(`   <img> on the page: ${car.imgCount} → ${JSON.stringify(car.imgs)}`);
  console.log(`   gallery markup: ${car.galHTML}`);
  console.log(`   anything under .thumbs: ${car.thumbsAny}`);
  console.log(`   wording mentioning photos: ${car.hasNoPhotoWording}`);

  // ---- 2. is TS-1029 in the showroom inventory at all? ----
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const inv = await page.evaluate(() => {
    const hrefs = [...document.querySelectorAll("a.card")].map((a) => a.getAttribute("href"));
    const names = [...document.querySelectorAll("a.card h3")].map((h) => h.innerText.replace(/\s+/g, " ").trim());
    return { hrefs, names, has1029: hrefs.some((h) => /TS-1029/.test(h || "")) };
  });
  console.log(`\n2. /inventory → ${inv.hrefs.length} cards; TS-1029 present: ${inv.has1029}`);
  console.log(`   card hrefs: ${JSON.stringify(inv.hrefs)}`);
  console.log(`   card names: ${JSON.stringify(inv.names)}`);

  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
