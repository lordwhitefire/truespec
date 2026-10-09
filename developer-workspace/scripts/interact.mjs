import { chromium } from "playwright-core";

const base = process.argv[2] || "http://localhost:3210/inventory";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const log = (k, v) => console.log(`${k}: ${v}`);

await page.goto(base, { waitUntil: "networkidle" });

const cnt = () => page.locator(".band #cnt, #cnt").first().innerText();
const ttl = () => page.locator("#ttl").first().innerText();
const cards = () => page.locator(".sv .card").count();
const rows = () => page.locator(".sv .lc").count();

log("initial cnt", JSON.stringify(await cnt()));
log("initial ttl", JSON.stringify(await ttl()));
log("initial cards", await cards());

// 1) filter status = Available
await page.check('input[name="status"][value="a"]');
await page.waitForTimeout(150);
log("after status=a ttl", JSON.stringify(await ttl()));
log("after status=a cnt", JSON.stringify(await cnt()));
log("after status=a cards", await cards());
log("url", page.url());

// 2) add make filter if present (first make checkbox)
const make = page.locator('input[name="make"]').first();
if (await make.count()) {
  const v = await make.getAttribute("value");
  await make.check();
  await page.waitForTimeout(150);
  log(`after make=${v} ttl`, JSON.stringify(await ttl()));
  await make.uncheck();
  await page.waitForTimeout(100);
}

// 3) sort high
await page.selectOption("#sort", "high");
await page.waitForTimeout(150);
const prices = await page.locator(".sv .card .pt").allInnerTexts();
log("sort=high first price", JSON.stringify(prices[0]));
log("sort=high url", page.url());

// 4) list view
await page.click("#vl");
await page.waitForTimeout(150);
log("list rows", await rows());
log("list #vl aria-pressed", await page.getAttribute("#vl", "aria-pressed"));
log("list url", page.url());

// 5) back to grid + clear all
await page.click("#vg");
await page.waitForTimeout(100);
await page.click(".clr");
await page.waitForTimeout(150);
log("after clear cnt", JSON.stringify(await cnt()));
log("after clear cards", await cards());
log("after clear url", page.url());

await browser.close();
