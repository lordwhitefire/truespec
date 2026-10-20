// TASK-005 research probe — R2.5: the not-found surfaces at runtime, read-only (plain GETs).
// Also checks whether FIX-001's invented link is visible ON THE SAME PAGE as the real number in the header.
// Attach-only CDP :9222, no launch, no screenshots, detach on exit. No writes.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const TARGETS = [
    ["/car/TS-9999", "a missing car"],
    ["/car/not-a-ref", "a malformed car reference"],
    ["/no-such-page", "a bogus showroom route"],
    ["/office/no-such-page", "a bogus OFFICE route"],
  ];

  for (const [path, label] of TARGETS) {
    let status = "?";
    const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => {
      console.log(`  goto err: ${e.message.slice(0, 80)}`);
      return null;
    });
    if (resp) status = resp.status();
    // let the client component settle
    await sleep(1500);
    const facts = await page.evaluate(() => {
      const waLinks = [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute("href"));
      const text = document.body.innerText;
      return {
        url: location.pathname,
        title: document.title,
        h1: document.querySelector("h1")?.innerText?.trim() ?? null,
        waLinks,
        inventedVisible: /800\s?000\s?0000|2348000000000/.test(text) || waLinks.some((h) => (h || "").includes("2348000000000")),
        deadLink: waLinks.some((h) => /wa\.me\/\?/.test(h || "")),
        // the header's displayed number, and the numbers actually in links
        headerNumbers: [...document.querySelectorAll(".inf b, header b")].map((b) => b.innerText.trim()).filter(Boolean),
        buttons: [...document.querySelectorAll("a.btn, a.btn2, a.wab")].map((a) => a.innerText.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 6),
        textStart: text.replace(/\n+/g, " | ").slice(0, 200),
      };
    });
    console.log(`\n[${label}]  ${path}`);
    console.log(`  HTTP ${status} · url=${facts.url}`);
    console.log(`  title=${JSON.stringify(facts.title)}`);
    console.log(`  h1=${JSON.stringify(facts.h1)}`);
    console.log(`  buttons=${JSON.stringify(facts.buttons)}`);
    console.log(`  wa.me links=${JSON.stringify(facts.waLinks)}`);
    console.log(`  invented number visible on this page: ${facts.inventedVisible}`);
    console.log(`  dead link (wa.me/?…): ${facts.deadLink}`);
    console.log(`  header shows: ${JSON.stringify(facts.headerNumbers)}`);
    console.log(`  text=${JSON.stringify(facts.textStart)}`);
  }

  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
