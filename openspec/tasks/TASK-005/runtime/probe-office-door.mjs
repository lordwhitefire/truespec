// TASK-005 research probe — the office door, waiting for Clerk's redirect to settle.
// Attach-only CDP :9222. Read-only (navigates and reads; drives no writes). Detach on exit.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  // Wait until the URL stops changing for a moment (Clerk redirects client-side).
  async function settle(maxMs = 20000) {
    const start = Date.now();
    let last = page.url();
    while (Date.now() - start < maxMs) {
      await new Promise((r) => setTimeout(r, 700));
      const now = page.url();
      if (now === last) return { url: now, settledMs: Date.now() - start };
      last = now;
    }
    return { url: page.url(), settledMs: Date.now() - start, timedOut: true };
  }

  async function read(label) {
    const info = await settle();
    let text = "";
    try {
      text = await page.evaluate(() => document.body.innerText);
    } catch {
      text = "(context destroyed mid-read)";
    }
    console.log(
      `\n[${label}] url=${info.url}${info.timedOut ? " (settle timed out)" : ""}\n  text[${
        text.length
      }]=${JSON.stringify(text.slice(0, 300))}`,
    );
    return { url: info.url, text };
  }

  console.log("=== /office ===");
  await page.goto(BASE + "/office", { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => console.log("goto:", e.message));
  const off = await read("/office after settle");

  console.log("\n=== /office/inventory ===");
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => console.log("goto:", e.message));
  await read("/office/inventory after settle");

  console.log("\n=== office door detail (if on sign-in) ===");
  if (/sign-in/.test(page.url())) {
    const facts = await page.evaluate(() => ({
      inputs: document.querySelectorAll("input").length,
      buttons: [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 8),
      clerk: !!document.querySelector(".cl-rootBox, .cl-card"),
      title: document.querySelector("h1")?.innerText?.trim() ?? null,
    }));
    console.log(JSON.stringify(facts, null, 2));
  }

  console.log("\n=== showroom home: header/contact check (FIX-001 relevant) ===");
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await read("/");
  const wa = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp"]')].map((a) => a.getAttribute("href"));
    const text = document.body.innerText;
    return {
      waLinks: links.slice(0, 6),
      invented: /800 ?000 ?0000/.test(text) || links.some((h) => (h || "").includes("2348000000000")),
      headerHasWhatsAppWord: /whatsapp/i.test(text),
    };
  });
  console.log("whatsapp facts:", JSON.stringify(wa, null, 2));
} finally {
  browser.close().catch(() => {});
  console.log("\ndetached");
}
