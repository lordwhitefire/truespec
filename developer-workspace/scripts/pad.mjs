import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
for (const url of ["http://localhost:3210/", "http://localhost:3210/inventory"]) {
  await p.goto(url, { waitUntil: "networkidle" });
  const w = p.locator(".sv .w").first();
  const r = await w.count() ? await w.evaluate((el) => getComputedStyle(el).paddingLeft + " / " + getComputedStyle(el).paddingRight) : "(no .sv .w)";
  console.log(url, "->", r);
}
await b.close();
