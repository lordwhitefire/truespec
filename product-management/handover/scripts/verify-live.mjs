import { chromium } from "playwright-core";

const EMAIL = "test@gmail.com";
const PASS = "cXgKZYj5ML7QAP1n";
const BASE = "https://truespec-k4y6.vercel.app";

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext();
const page = await ctx.newPage();

// public spot checks
for (const p of ["/", "/inventory", "/car/TS-1001", "/privacy"]) {
  const r = await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 45000 });
  console.log("PUBLIC", p, r.status(), (await page.title()).slice(0, 60));
}

// sign-in
await page.goto(BASE + "/office", { waitUntil: "domcontentloaded", timeout: 45000 });
console.log("OFFICE URL", page.url());

try {
  await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 20000 });
  await page.fill('input[name="identifier"], input[type="email"]', EMAIL);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);

  const pw = page.locator('input[name="password"], input[type="password"]').last();
  await pw.waitFor({ state: "visible", timeout: 20000 });
  await pw.click();
  await pw.fill(PASS);
  await page.waitForTimeout(400);
  {
    const cont = page.getByRole("button", { name: "Continue" }).first();
    if (await cont.count()) await cont.click();
    else await page.keyboard.press("Enter");
    await page.waitForTimeout(8000);
    console.log("AFTER LOGIN URL", page.url());
    console.log("TITLE", await page.title());
    const body = await page.locator("body").innerText();
    console.log("BODY", body.replace(/\s+/g, " ").slice(0, 600));
  }
} catch (e) {
  console.log("LOGIN ERROR", String(e).slice(0, 300));
  console.log("BODY", (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 500));
}

await browser.close();
process.exit(0);
