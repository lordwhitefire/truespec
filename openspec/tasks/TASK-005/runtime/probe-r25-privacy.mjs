// TASK-005 research probe — R2.5: the privacy notice at runtime (FIX-001 places 4 and 5), read-only GET.
// The point: the (site) header is on this page too, so the person can see the REAL number in the header
// and the INVENTED one in the notice text at the same time.
// Attach-only CDP :9222, no launch, no screenshots, detach on exit. No writes.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const resp = await page.goto("http://127.0.0.1:3210/privacy", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1800);
  const facts = await page.evaluate(() => {
    const text = document.body.innerText;
    const headerNums = [...document.querySelectorAll("header b, .inf b")].map((b) => b.innerText.trim()).filter(Boolean);
    const links = [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute("href"));
    // the WhatsApp section and the contact section
    const sec = (id) => document.querySelector(`#${id}`)?.innerText.replace(/\s+/g, " ").trim().slice(0, 420) ?? null;
    return {
      url: location.pathname,
      title: document.title,
      h1: document.querySelector("h1")?.innerText?.trim() ?? null,
      headerNums,
      whatsappSection: sec("whatsapp"),
      contactSection: sec("contact"),
      inventedInText: /800\s?000\s?0000/.test(text),
      inventedInLinks: links.some((h) => (h || "").includes("2348000000000")),
      linksSample: links.slice(0, 5),
      headerHasRealNumber: headerNums.some((h) => h.replace(/\D/g, "").includes("2348146927170")),
    };
  });
  console.log(`[privacy]  HTTP ${resp ? resp.status() : "?"} · url=${facts.url}`);
  console.log(`  title=${JSON.stringify(facts.title)}`);
  console.log(`  h1=${JSON.stringify(facts.h1)}`);
  console.log(`  header shows: ${JSON.stringify(facts.headerNums)}  (real number in header: ${facts.headerHasRealNumber})`);
  console.log(`  invented number in the notice TEXT: ${facts.inventedInText}`);
  console.log(`  invented number in a LINK: ${facts.inventedInLinks}`);
  console.log(`  wa.me links on the page: ${JSON.stringify(facts.linksSample)}`);
  console.log(`\n  WHATSAPP section:\n    ${facts.whatsappSection}`);
  console.log(`\n  CONTACT section:\n    ${facts.contactSection}`);
  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
