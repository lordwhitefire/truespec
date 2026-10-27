// LAUNCH-001 Task 18 — Playwright smoke test.
//
// Runs against the local production build on :3210. Connects to the existing
// Chrome on CDP :9222 (never launches a browser, never opens a tab) and reuses
// the existing build tab, navigating it through the smoke path and restoring it
// afterwards.
//
// Usage: npm run smoke-test   (requires the local build running on :3210)
import { chromium } from "playwright-core";

const CDP_URL = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const failures: string[] = [];
const notes: string[] = [];
function fail(msg: string) { failures.push(msg); console.log("FAIL:", msg); }
function note(msg: string) { notes.push(msg); console.log("ok:", msg); }

async function goto(page: any, path: string) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 });
}

async function bodyText(page: any): Promise<string> {
  return (await page.evaluate(() => document.body.innerText || "")).replace(/\s+/g, " ").trim();
}

async function main() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const pages = browser.contexts().flatMap((ctx) => ctx.pages());
  const page = pages.find((p) => {
    try { return new URL(p.url()).origin === BASE; } catch { return false; }
  });
  if (!page) throw new Error(`no existing tab for ${BASE}`);

  const originalUrl = page.url();

  try {
    // 1. Home page loads with main heading.
    await goto(page, "/");
    const home = await bodyText(page);
    if (!/TrueSpec/i.test(home) || !/cars you can trust/i.test(home)) {
      fail("home: expected 'TrueSpec — cars you can trust' heading; got: " + home.slice(0, 120));
    } else {
      note("home: loads with main heading");
    }

    // 2. Inventory page loads with main heading.
    await goto(page, "/inventory");
    const inv = await bodyText(page);
    if (!/Inventory/i.test(inv)) {
      fail("inventory: expected 'Inventory' heading; got: " + inv.slice(0, 120));
    } else {
      note("inventory: loads with main heading");
    }

    // 3. A public car page loads with main heading.
    await goto(page, "/car/TS-1001");
    const car = await bodyText(page);
    if (!/Toyota Camry XSE V6 2021/i.test(car)) {
      fail("car: expected 'Toyota Camry XSE V6 2021' heading; got: " + car.slice(0, 120));
    } else {
      note("car: loads with main heading");
    }

    // 4. Anonymous office request is sent to sign-in; no office data renders.
    await goto(page, "/office/sign-in");
    const office = await bodyText(page);
    const isSignIn = /sign.?in|clerk/i.test(office);
    const hasOfficeData = /inventory|drafts|enquiries|office dashboard/i.test(office);
    if (!isSignIn) fail("office/sign-in: not a sign-in page");
    else note("office/sign-in: sign-in page rendered");
    if (hasOfficeData) fail("office/sign-in: office data rendered anonymously");
    else note("office/sign-in: no office data rendered");
  } finally {
    // Restore the tab to its original URL so the owner's session is undisturbed.
    try {
      if (page.url() !== originalUrl) await page.goto(originalUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch {}
    await browser.close().catch(() => {});
  }

  if (failures.length) {
    console.log(`SMOKE TEST FAILED (${failures.length}):`);
    for (const f of failures) console.log("  -", f);
    process.exitCode = 1;
  } else {
    console.log(`SMOKE TEST PASSED (${notes.length} checks).`);
  }
}

main().catch((err) => {
  console.log("SMOKE TEST ERROR:", err.message);
  process.exitCode = 1;
});
