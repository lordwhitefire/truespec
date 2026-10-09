import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
p.on("response", (r) => { if (r.status() >= 400) console.log(r.status(), r.url()); });
await p.goto("http://localhost:3210/inventory", { waitUntil: "networkidle" });
await p.waitForTimeout(300);
await b.close();
