// TASK-005 research probe — R2.4 VERIFICATION of two claims before they are written down.
//   A2: the slow store on a soft navigation, observed for longer (does the wait state EVER appear?).
//   D2: the photo placeholder — does it appear when a photo cannot load? Two causes tested separately:
//       (i) the request is aborted (asset store unreachable), (ii) the request answers 404 (asset missing).
// Both are in-tab only. Nothing is written, nothing restarted. Attach-only CDP :9222, detach on exit.
import { chromium } from "playwright-core";

const BASE = "http://127.0.0.1:3210";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitContent = async (maxMs = 45000) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      let t = "";
      try { t = await page.evaluate(() => document.body.innerText); } catch { t = ""; }
      if (t && !/Just a moment|We couldn’t load this/.test(t)) return t;
      await sleep(700);
    }
    return "";
  };

  // ---------- A2. slow soft navigation, longer window ----------
  console.log("=== A2. SLOW store on a soft navigation (RSC held 6 s), watched for 9 s ===");
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.goto(BASE + "/office", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  let held = 0;
  await page.route("**/*", async (route, req) => {
    if (req.url().includes("_rsc=") || req.headers()["rsc"] === "1") { held++; await sleep(6000); return route.continue(); }
    return route.continue();
  });
  const tClick = Date.now();
  await page.locator('a[href="/office/inventory"]').first().click().catch(() => {});
  const trace = [];
  for (let i = 0; i < 18; i++) {
    await sleep(500);
    const s = await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        url: location.pathname,
        waking: /Just a moment/.test(t),
        retry: /We couldn’t load this|We couldn't load this/.test(t),
        h1: document.querySelector("h1")?.innerText?.trim() ?? null,
        loadingEl: !!document.querySelector(".ts-store-state"),
      };
    });
    trace.push(`    +${String(Date.now() - tClick).padStart(5)}ms  url=${s.url} waking=${s.waking} loadingEl=${s.loadingEl} h1=${JSON.stringify(s.h1)}`);
    if (s.url === "/office/inventory" && s.h1 === "INVENTORY") break;
  }
  console.log(`  RSC held: ${held}`);
  console.log(trace.join("\n"));
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // ---------- D2. photos ----------
  console.log("\n=== D2. Photos: (i) request ABORTED, then (ii) request answered 404 ===");
  for (const mode of ["abort", "404"]) {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await page.goto("about:blank");
    // count image error events from before any script runs
    await page.addInitScript(() => {
      window.__imgErr = 0;
      window.__imgLoad = 0;
      addEventListener("error", (e) => { if (e.target && e.target.tagName === "IMG") window.__imgErr++; }, true);
      addEventListener("load", (e) => { if (e.target && e.target.tagName === "IMG") window.__imgLoad++; }, true);
    });
    let blocked = 0;
    await page.route("**/*", async (route, req) => {
      if (req.resourceType() === "image" && !req.url().startsWith("data:")) {
        blocked++;
        return mode === "abort" ? route.abort("failed") : route.fulfill({ status: 404, contentType: "text/plain", body: "gone" });
      }
      return route.continue();
    });
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
    await waitContent();
    await sleep(5000); // give any onError → placeholder swap plenty of time
    const r = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("img")].filter((i) => (i.getAttribute("src") || "").length > 0);
      return {
        imgErrorEvents: window.__imgErr,
        imgLoadEvents: window.__imgLoad,
        total: imgs.length,
        placeholder: imgs.filter((i) => (i.getAttribute("src") || "").startsWith("data:image/svg")).length,
        stillRemote: imgs.filter((i) => !(i.getAttribute("src") || "").startsWith("data:")).length,
        broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
        firstAlt: imgs[0]?.getAttribute("alt"),
      };
    });
    console.log(`  (${mode}) blocked ${blocked} image requests`);
    console.log(`       ${JSON.stringify(r)}`);
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }

  console.log("\ndone — read-only, in-tab only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
