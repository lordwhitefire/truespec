// TASK-005 research probe — R2.4: the store blip and the offline path, by FAILURE INJECTION IN THE TAB ONLY.
// Nothing is restarted and nothing is written: every failure is produced inside the browser (request
// interception / offline emulation). The store is never touched, and the write experiment (§F) fulfils the
// request locally with 500 so the server never sees it.
// Attach-only CDP :9222, no launch, no screenshots, detach on exit.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitContent(maxMs = 45000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      let t = "";
      try { t = await page.evaluate(() => document.body.innerText); } catch { t = ""; }
      if (t && !/Just a moment|We couldn’t load this/.test(t)) return t;
      await sleep(800);
    }
    return "";
  }
  const bodyText = async () => (await page.evaluate(() => document.body.innerText).catch(() => "(context destroyed)"));
  const stateMarkers = async () =>
    page.evaluate(() => {
      const t = document.body.innerText;
      return {
        storeWaking: /Just a moment/.test(t),
        retryable: /We couldn’t load this|We couldn't load this/.test(t),
        hasTryAgain: [...document.querySelectorAll("button")].some((b) => /Try again/i.test(b.innerText)),
        navVisible: !!document.querySelector("aside a, nav a"),
        url: location.href,
      };
    });

  // ---------- A. A SLOW STORE on a soft navigation ----------
  console.log("=== A. The store is SLOW — a soft navigation to inventory (RSC held 5 s) ===");
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.goto(BASE + "/office", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  let held = 0;
  await page.route("**/*", async (route, req) => {
    const u = req.url();
    if (u.includes("_rsc=") || req.headers()["rsc"] === "1") {
      held++;
      await sleep(5000);
      return route.continue();
    }
    return route.continue();
  });
  const navClick = page.locator('a[href="/office/inventory"]').first();
  await navClick.click().catch((e) => console.log("  click err:", e.message.slice(0, 60)));
  // sample what the person sees while the read is in flight
  const seen = [];
  for (let i = 0; i < 10; i++) {
    await sleep(400);
    const m = await stateMarkers();
    seen.push(`    t≈${(i + 1) * 400}ms  storeWaking=${m.storeWaking} retryable=${m.retryable} url=${m.url.replace(BASE, "")}`);
    if (!m.storeWaking && /INVENTORY/.test(await bodyText())) break;
  }
  console.log(`  RSC requests held: ${held}`);
  console.log(seen.join("\n"));
  const finalA = await stateMarkers();
  console.log(`  settled: url=${finalA.url.replace(BASE, "")} storeWaking=${finalA.storeWaking} retryable=${finalA.retryable}`);
  console.log(`  body[0:120]=${JSON.stringify((await bodyText()).slice(0, 120))}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // ---------- B. A DROPPED STORE on a soft navigation ----------
  console.log("\n=== B. The store is DROPPED — soft navigation, RSC aborted ===");
  await page.goto(BASE + "/office", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  let aborted = 0;
  await page.route("**/*", async (route, req) => {
    const u = req.url();
    if (u.includes("_rsc=") || req.headers()["rsc"] === "1") {
      aborted++;
      return route.abort("failed");
    }
    return route.continue();
  });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  const consoleErrs = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text().slice(0, 160)); });
  await page.locator('a[href="/office/inventory"]').first().click().catch((e) => console.log("  click err:", e.message.slice(0, 60)));
  await sleep(4000);
  const B = await stateMarkers();
  console.log(`  RSC requests aborted: ${aborted}`);
  console.log(`  what is on screen now: ${JSON.stringify(B)}`);
  console.log(`  body[0:300]=${JSON.stringify((await bodyText()).slice(0, 300))}`);
  console.log(`  page errors: ${errs.length ? JSON.stringify(errs.slice(0, 3)) : "none"}`);
  console.log(`  console errors: ${consoleErrs.length ? JSON.stringify(consoleErrs.slice(0, 3)) : "none"}`);
  // does Try again recover (with the store back)?
  await page.unrouteAll({ behavior: "ignoreErrors" });
  const tryAgain = page.locator("button:has-text('Try again')").first();
  if (await tryAgain.count()) {
    await tryAgain.click().catch(() => {});
    await sleep(2500);
    console.log(`  after clicking "Try again" (store back): url=${(await page.url()).replace(BASE, "")} retryable=${(await stateMarkers()).retryable} text=${JSON.stringify((await bodyText()).slice(0, 90))}`);
  } else {
    console.log('  no "Try again" button appeared');
  }

  // ---------- D. AN ASSET THAT WILL NOT LOAD (the showroom) ----------
  console.log("\n=== D. The asset store is unreachable — every photo request blocked (showroom) ===");
  await page.unrouteAll({ behavior: "ignoreErrors" });
  let imgBlocked = 0;
  const imgHosts = new Set();
  await page.route("**/*", async (route, req) => {
    if (req.resourceType() === "image") {
      const u = req.url();
      if (!u.startsWith("data:")) {
        imgBlocked++;
        try { imgHosts.add(new URL(u).host); } catch {}
        return route.abort("failed");
      }
    }
    return route.continue();
  });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  await sleep(2500);
  const imgs = await page.evaluate(() => {
    const all = [...document.querySelectorAll("img")];
    const withSrc = all.filter((i) => (i.getAttribute("src") || "").length > 0);
    return {
      total: all.length,
      placeholderCount: withSrc.filter((i) => (i.getAttribute("src") || "").startsWith("data:image/svg")).length,
      brokenCount: withSrc.filter((i) => i.complete && i.naturalWidth === 0 && !(i.getAttribute("src") || "").startsWith("data:")).length,
      sampleAlt: withSrc.slice(0, 3).map((i) => i.getAttribute("alt")),
      brokenSample: withSrc.filter((i) => i.complete && i.naturalWidth === 0).slice(0, 3).map((i) => (i.getAttribute("src") || "").slice(0, 60)),
    };
  });
  console.log(`  image requests blocked: ${imgBlocked} (hosts: ${[...imgHosts].join(", ") || "none"})`);
  console.log(`  images on the home page: ${JSON.stringify(imgs, null, 2)}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });

  // ---------- E. OFFLINE ----------
  console.log("\n=== E. The browser is OFFLINE, then a soft navigation ===");
  await page.goto(BASE + "/office", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  await ctx.setOffline(true);
  await page.locator('a[href="/office/inventory"]').first().click().catch((e) => console.log("  click err:", e.message.slice(0, 60)));
  await sleep(3500);
  const E = await stateMarkers();
  console.log(`  what is on screen: ${JSON.stringify(E)}`);
  console.log(`  body[0:250]=${JSON.stringify((await bodyText()).slice(0, 250))}`);
  await ctx.setOffline(false);
  await sleep(500);

  // ---------- F. A WRITE THAT FAILS — fulfilled locally with 500, so the server never sees it ----------
  console.log("\n=== F. A write that fails — the delete's server action answered 500 IN THE BROWSER (never sent) ===");
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  const before = await page.locator("table.t tbody tr").count();
  let posts = 0;
  await page.route("**/*", async (route, req) => {
    if (req.method() === "POST") {
      posts++;
      console.log(`  intercepted POST ${req.url().replace(BASE, "")} (Next-Action: ${req.headers()["next-action"] ? "yes" : "no"}) → answering 500 locally; the server never receives it`);
      return route.fulfill({ status: 500, contentType: "text/plain", body: "injected failure" });
    }
    return route.continue();
  });
  const target = page.locator('table.t tbody tr button[aria-label^="Delete "]').first();
  const targetName = await target.getAttribute("aria-label");
  await target.click();
  await page.waitForSelector("#ovl:not([hidden])", { timeout: 5000 });
  await sleep(300);
  await page.locator("#yes").click();
  await sleep(4000);
  const F = await page.evaluate(() => {
    const t = document.querySelector("#toast");
    const tmsg = document.querySelector("#tmsg");
    return {
      rowsNow: document.querySelectorAll("table.t tbody tr").length,
      toastShow: !!t && t.className.includes("show"),
      toastText: (tmsg?.innerText ?? "").trim(),
      retryable: /We couldn’t load this|We couldn't load this/.test(document.body.innerText),
      url: location.href,
      bodyStart: document.body.innerText.slice(0, 200),
    };
  });
  console.log(`  target: ${JSON.stringify(targetName)} · rows before: ${before}`);
  console.log(`  after the failed write: ${JSON.stringify(F, null, 2)}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  console.log(`  POSTs intercepted: ${posts} (0 means the write never even left the page)`);
  // verify the store is untouched: reload and count
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  const after = await page.locator("table.t tbody tr").count();
  console.log(`  rows after reload: ${after} (before: ${before}) → ${after === before ? "store untouched ✅" : "⚠️ STORE CHANGED"}`);

  console.log("\ndone — nothing was written and nothing was restarted");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
