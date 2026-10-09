// RECON-001 — facts dump to interpret the ambiguous probe rows. Read-only.
import { chromium } from "playwright-core";
const [, , refUrl, buildUrl] = process.argv;
const CHROME = "/usr/bin/google-chrome";

async function facts(browser, url, label) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(7000);
  console.log(`\n========== ${label} ==========`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // theme icon markup
  const btn = page.getByRole("button", { name: "Toggle dark mode" });
  await btn.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  console.log("theme btn outerHTML:", (await btn.evaluate((e) => e.outerHTML).catch(() => "?")));

  // ask bar: display + ancestry
  console.log("ask #ask exists:", await page.locator("#ask").count(), "| display:",
    await page.locator("#ask").evaluate((e) => getComputedStyle(e).display).catch(() => "?"),
    "| text:", (await page.locator("#ask").textContent().catch(() => "?"))?.slice(0, 40));
  console.log("ask inside #ovl:", await page.locator("#ovl #ask").count());

  // featured strip markup
  console.log("#sl html (first 300):", (await page.locator("#sl").innerHTML().catch(() => "?")).slice(0, 300));
  const ctrl = await page.locator("#sl").locator("xpath=..").getByRole("button").all();
  console.log("featured controls (aria):", await Promise.all(ctrl.map((b) => b.getAttribute("aria-label"))));

  // close modal, then poll toast
  const ovl = page.locator("#ovl");
  if (await ovl.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Close" }).click({ timeout: 5000 }).catch(() => {});
    await ovl.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
  let toastAt = -1;
  const t0 = Date.now();
  for (let i = 0; i < 30; i++) {
    if (await page.locator("#toast").isVisible().catch(() => false)) { toastAt = Date.now() - t0; break; }
    await page.waitForTimeout(1000);
  }
  console.log("toast visible after dismiss:", toastAt >= 0 ? `${toastAt}ms` : "never (30s)");
  console.log("toast exists:", await page.locator("#toast").count(),
    "| text:", (await page.locator("#toast").textContent().catch(() => "?"))?.slice(0, 60));

  // return visit: ask bar
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Toggle dark mode" }).waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  console.log("return visit — ask visible:", await page.locator("#ask").isVisible().catch(() => false));
  await ctx.close();
}

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
await facts(browser, refUrl, "REF");
await facts(browser, buildUrl, "BUILD");
await browser.close();
