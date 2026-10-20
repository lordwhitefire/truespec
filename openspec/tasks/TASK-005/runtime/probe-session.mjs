// TASK-005 research probe — R2.x runtime observation.
// Follows developer-workspace/procedures/browser-check.md: ATTACH ONLY to the Chrome on CDP :9222,
// never launch, never headless, detach on exit, no screenshots.
// Read-only in this probe: it navigates and reads the DOM. It drives NO writes.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  console.log(`contexts: ${browser.contexts().length} · pages: ${pages.length}`);

  const page = pages[0] ?? (await ctx.newPage());
  const ua = await page.evaluate(() => navigator.userAgent);
  if (/Headless/i.test(ua)) throw new Error("headless — not ours");

  async function look(path, label) {
    const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    const status = res?.status();
    // give the app a moment to settle (settle only; not a fixed-sleep assertion)
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    const url = page.url();
    const title = await page.title();
    const bodyLen = (await page.evaluate(() => document.body.innerText)).length;
    const h1 = await page
      .evaluate(() => document.querySelector("h1")?.textContent?.trim() ?? null)
      .catch(() => null);
    const signInish = /sign-in|Sign in/i.test((await page.evaluate(() => document.body.innerText)).slice(0, 3000));
    console.log(
      `\n[${label}] ${path}\n  status=${status} url=${url}\n  title=${JSON.stringify(title)} h1=${JSON.stringify(
        h1,
      )} bodyLen=${bodyLen} looksLikeSignIn=${signInish}`,
    );
    return { url, status, bodyLen };
  }

  await look("/", "showroom home");
  await look("/office", "office dashboard");
  await look("/office/inventory", "office inventory");
  await look("/office/settings", "office settings");
} finally {
  // detach only — leave the window and its tabs open
  browser.close().catch(() => {});
  console.log("\ndetached (no Chrome launched)");
}
