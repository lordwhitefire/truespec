import { chromium } from "playwright-core";
import fs from "node:fs/promises";

const BASE = "http://127.0.0.1:3210";
const OUT = "product-management/handover";

const ROUTES = [
  "/office/car/TS-1001",
  "/office/drafts/car/954e4aed-b610-4899-bfd8-d5043e0c973b",
  "/office/drafts/enquiry/be66a36a-b00e-410d-ad84-292527176212",
  "/office/enquiries?tab=taps",
  "/office/enquiries/ENQ-0004/edit",
  "/car/TS-1001",
  "/car/TS-1013",
  "/office/settings",
];

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const pages = browser.contexts().flatMap((c) => c.pages());
const page = pages.find((p) => p.url().includes("127.0.0.1:3210"));
if (!page) throw new Error("no 3210 tab found");

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => consoleErrors.push("PAGEERROR " + String(e).slice(0, 300)));

async function snapshot(route) {
  consoleErrors.length = 0;
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1200);
  const data = await page.evaluate(() => {
    const txt = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const uniq = (a) => [...new Set(a.filter(Boolean))];
    return {
      title: document.title,
      finalUrl: location.pathname + location.search,
      h: uniq([...document.querySelectorAll("h1,h2,h3,h4")].map(txt)).slice(0, 50),
      buttons: uniq([...document.querySelectorAll("button,[role=button]")].map(txt)).slice(0, 80),
      links: [...document.querySelectorAll("a")]
        .map((a) => ({ t: txt(a), h: a.getAttribute("href") }))
        .filter((x) => x.t)
        .slice(0, 60),
      labels: uniq([...document.querySelectorAll("label")].map(txt)).slice(0, 80),
      placeholders: uniq(
        [...document.querySelectorAll("input,textarea")]
          .map((i) => i.getAttribute("placeholder"))
          .filter(Boolean)
      ).slice(0, 80),
      th: uniq([...document.querySelectorAll("th")].map(txt)).slice(0, 50),
      body: document.body.innerText.replace(/\n{3,}/g, "\n\n").slice(0, 8000),
    };
  });
  return { route, ...data, consoleErrors: [...consoleErrors] };
}

const results = [];
for (const r of ROUTES) {
  try {
    results.push(await snapshot(r));
    console.log("ok", r);
  } catch (e) {
    results.push({ route: r, error: String(e).slice(0, 400) });
    console.log("ERR", r, String(e).slice(0, 120));
  }
}

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(OUT + "/raw-inventory-detail.json", JSON.stringify(results, null, 2));
console.log("written", results.length);
process.exit(0);
