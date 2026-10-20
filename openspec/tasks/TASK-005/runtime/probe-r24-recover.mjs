// TASK-005 research probe — R2.4 follow-up: does the retryable state's one action actually recover?
// (From §F: a failed write replaced the whole page with the LOAD error state. Now: after the store is back,
//  does "Try again" restore the page — and is the fleet still intact?)
// In-tab only; nothing written, nothing restarted. Attach-only CDP :9222, detach on exit.
import { chromium } from "playwright-core";

const BASE = "http://127.0.0.1:3210";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitText = async (maxMs = 45000) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      let t = "";
      try { t = await page.evaluate(() => document.body.innerText); } catch { t = ""; }
      if (t && !/Just a moment|We couldn’t load this/.test(t)) return t;
      await sleep(800);
    }
    return "";
  };
  const markers = () =>
    page.evaluate(() => ({
      retry: /We couldn’t load this|We couldn't load this/.test(document.body.innerText),
      hasTryAgain: [...document.querySelectorAll("button")].some((b) => /Try again/i.test(b.innerText)),
      rows: document.querySelectorAll("table.t tbody tr").length,
      navVisible: !!document.querySelector("aside a, nav a"),
      h1: document.querySelector("h1")?.innerText?.trim() ?? null,
      text: document.body.innerText.replace(/\n+/g, " | ").slice(0, 120),
    }));

  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitText();
  const before = (await markers()).rows;
  console.log(`rows before: ${before}`);

  // Fail the server action locally (never sent).
  let posts = 0;
  await page.route("**/*", async (route, req) => {
    if (req.method() === "POST") { posts++; return route.fulfill({ status: 500, contentType: "text/plain", body: "injected" }); }
    return route.continue();
  });

  const target = page.locator('table.t tbody tr button[aria-label^="Delete "]').first();
  const name = await target.getAttribute("aria-label");
  await target.click();
  await page.waitForSelector("#ovl:not([hidden])", { timeout: 5000 });
  await sleep(300);
  await page.locator("#yes").click();
  await sleep(4000);
  console.log(`\nafter the failed write (target ${JSON.stringify(name)}):`);
  console.log(`  ${JSON.stringify(await markers(), null, 1)}`);

  // Now take the injection away and press the one action the state offers.
  await page.unrouteAll({ behavior: "ignoreErrors" });
  console.log(`\nremoved the injection (${posts} POSTs had been intercepted; the server never saw them)`);
  const tryAgain = page.locator("button:has-text('Try again')").first();
  if (await tryAgain.count()) {
    await tryAgain.click().catch((e) => console.log("  click err:", e.message.slice(0, 60)));
    await sleep(4000);
    const after = await markers();
    console.log(`  after clicking "Try again":`);
    console.log(`  ${JSON.stringify(after, null, 1)}`);
    console.log(`  recovered: ${!after.retry && after.rows > 0 ? "YES ✅" : "NO ⚠️"}`);
    console.log(`  fleet intact: rows=${after.rows} (before ${before}) → ${after.rows === before ? "yes ✅" : "CHANGED ⚠️"}`);
  } else {
    console.log("  no Try again button present");
  }
  console.log("\ndone — read-only, in-tab only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
