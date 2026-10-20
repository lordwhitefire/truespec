// TASK-005 research probe — R2.4 VERIFICATION of the photo placeholder, narrowing the cause.
// Hypothesis: Photo's placeholder works when the failure happens AFTER hydration, but not when the photo is
// already broken as the page loads (the error fires before React attaches onError).
// In-tab only; nothing written, nothing restarted. Attach-only CDP :9222, detach on exit.
import { chromium } from "playwright-core";

const BASE = "http://127.0.0.1:3210";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitText = async (maxMs = 40000) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      let t = "";
      try { t = await page.evaluate(() => document.body.innerText); } catch { t = ""; }
      if (t && !/Just a moment/.test(t)) return;
      await sleep(700);
    }
  };
  const dumpImgs = () =>
    page.evaluate(() => {
      const imgs = [...document.querySelectorAll("img")];
      return imgs.slice(0, 10).map((i) => {
        const src = i.getAttribute("src") || "";
        const parent = i.closest(".ccard, .sl, .gal, .th, .hcard, li, article, div");
        return {
          src: src.slice(0, 42),
          kind: src.startsWith("data:image/svg") ? "PLACEHOLDER" : src.startsWith("data:") ? "data(other)" : src ? "remote" : "EMPTY",
          complete: i.complete,
          naturalWidth: i.naturalWidth,
          alt: (i.getAttribute("alt") || "").slice(0, 26),
          inPhotoLike: !!parent && /ccard|sl|gal|th|hcard/.test(parent.className || ""),
        };
      });
    });

  // ---- CASE 1: the failure happens as the page loads (photo already broken on first paint) ----
  console.log("=== CASE 1: photos are unreachable WHILE the page loads (failure before hydration) ===");
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.goto("about:blank");
  await page.addInitScript(() => {
    window.__err = 0; window.__load = 0;
    addEventListener("error", (e) => { if (e.target?.tagName === "IMG") window.__err++; }, true);
    addEventListener("load", (e) => { if (e.target?.tagName === "IMG") window.__load++; }, true);
  });
  await page.route("**/*", async (route, req) => {
    if (req.resourceType() === "image" && !req.url().startsWith("data:"))
      return route.fulfill({ status: 404, contentType: "text/plain", body: "gone" });
    return route.continue();
  });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitText();
  await sleep(6000); // hydration + plenty of time for any swap
  const c1 = await page.evaluate(() => ({ err: window.__err, load: window.__load, hydrated: !!(document.querySelector("#__next") || document.querySelector("[data-reactroot]") || Object.keys(document.body).some((k) => k.startsWith("__reactContainer")) || !!document.querySelector("a[href]")?.__reactFiber$) }));
  console.log(`  image error events: ${c1.err} · load events: ${c1.load}`);
  console.log("  first images:", JSON.stringify(await dumpImgs(), null, 1));
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // ---- CASE 2: the failure happens AFTER the page is hydrated and the photos are showing ----
  console.log("\n=== CASE 2: the photos load fine, THEN the asset store goes away (failure after hydration) ===");
  await page.route("**/*", async (route, req) => {
    if (req.resourceType() === "image" && !req.url().startsWith("data:"))
      return route.fulfill({ status: 404, contentType: "text/plain", body: "gone" });
    return route.continue();
  });
  // force every photo to re-request by re-assigning the same src (this is a fresh load for the element)
  const before = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((i) => (i.getAttribute("src") || "").startsWith("http"));
    window.__n = imgs.length;
    return imgs.length;
  });
  await page.evaluate(() => {
    for (const i of document.querySelectorAll("img")) {
      const s = i.getAttribute("src") || "";
      if (s.startsWith("http")) {
        i.setAttribute("src", s + "?retry=1"); // forces a new request that will now 404
      }
    }
  });
  await sleep(5000);
  const c2 = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    return {
      placeholder: imgs.filter((i) => (i.getAttribute("src") || "").startsWith("data:image/svg")).length,
      remoteStillBroken: imgs.filter((i) => {
        const s = i.getAttribute("src") || "";
        return s.startsWith("http") && i.complete && i.naturalWidth === 0;
      }).length,
    };
  });
  console.log(`  http images forced to re-load: ${before}`);
  console.log(`  after re-request: placeholder=${c2.placeholder} · still-broken-remote=${c2.remoteStillBroken}`);
  console.log("  first images:", JSON.stringify(await dumpImgs(), null, 1));
  await page.unrouteAll({ behavior: "ignoreErrors" });

  console.log("\ndone — read-only, in-tab only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
