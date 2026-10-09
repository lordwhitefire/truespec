// RECON-001 — clean verification of the theme icon, ask bar and toast. Read-only.
// Order matters: wait for hydration (data-theme), dismiss the modal, THEN measure/toggle.
import { chromium } from "playwright-core";
const [, , refUrl, buildUrl] = process.argv;
const CHROME = "/usr/bin/google-chrome";

async function probe(browser, url, label) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  console.log(`\n========== ${label} ==========`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // wait for hydration: data-theme present
  await page.waitForFunction(() => !!document.documentElement.dataset.theme || !!document.documentElement.getAttribute("data-theme"), null, { timeout: 10000 }).catch(() => {});
  const theme = () => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const icon = () => page.getByRole("button", { name: "Toggle dark mode" }).evaluate((b) => {
    const i = b.querySelector("i");
    return i ? i.getAttribute("class") : "(no <i>) " + b.innerHTML.slice(0, 60);
  }).catch((e) => "err:" + e.message.split("\n")[0]);

  // dismiss modal if it opens
  const ovl = page.locator("#ovl");
  if (await ovl.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Close" }).click({ timeout: 5000 }).catch(() => {});
    await ovl.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }
  const dismissed = !(await ovl.isVisible().catch(() => false));

  const before = { theme: await theme(), icon: await icon() };
  await page.getByRole("button", { name: "Toggle dark mode" }).click({ timeout: 5000 }).catch(() => {});
  await page.waitForFunction((b) => document.documentElement.getAttribute("data-theme") !== b, before.theme, { timeout: 4000 }).catch(() => {});
  const after = { theme: await theme(), icon: await icon() };

  console.log(`modal dismissed: ${dismissed}`);
  console.log(`theme icon: ${before.theme} ${before.icon}  --toggle-->  ${after.theme} ${after.icon}`);
  console.log(`ask visible after dismiss: ${await page.locator("#ask").isVisible().catch(() => false)}`);

  let at = -1;
  const t0 = Date.now();
  for (let i = 0; i < 22; i++) {
    if (await page.locator("#toast").isVisible().catch(() => false)) { at = Date.now() - t0; break; }
    await page.waitForTimeout(1000);
  }
  console.log("toast:", at >= 0 ? `visible ${at}ms after dismiss` : "never (22s)",
    "| text:", JSON.stringify((await page.locator("#toast").textContent().catch(() => "")).trim().slice(0, 70)));
  await ctx.close();
}

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
await probe(browser, refUrl, "REF");
await probe(browser, buildUrl, "BUILD");
await browser.close();
