import { chromium } from "playwright-core";

const [url, widthArg] = process.argv.slice(2);
const width = parseInt(widthArg || "1100", 10);
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true });
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(url, { waitUntil: "networkidle" });
const r = await page.evaluate(() => {
  const out = document.querySelector(".sv #out") || document.querySelector("#out");
  const g = document.querySelector(".sv .ip .grid") || document.querySelector(".grid");
  const w = document.querySelector(".sv .ip > .w");
  const sb = document.querySelector(".sv .sb");
  const sbt = document.querySelector(".sv .sbt");
  const cols = g ? getComputedStyle(g).gridTemplateColumns : "(none)";
  return {
    outClass: out ? out.className : null,
    gridClass: g ? g.className : null,
    gridColumns: cols,
    cards: document.querySelectorAll(".sv .card").length,
    rows: document.querySelectorAll(".sv .lc").length,
    ipwColumns: w ? getComputedStyle(w).gridTemplateColumns : "(none)",
    sidebarDisplay: sb ? getComputedStyle(sb).display : "(none)",
    sbtDisplay: sbt ? getComputedStyle(sbt).display : "(none)",
    docScrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify({ width, ...r }, null, 0));
await browser.close();
