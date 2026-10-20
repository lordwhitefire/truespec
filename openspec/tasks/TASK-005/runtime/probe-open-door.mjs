// TASK-005 research probe — open the office door, wait for Clerk's form to mount, then LEAVE it on screen.
// Attach-only CDP :9222. Read-only (no writes). Detaches without closing the tab, so the owner can sign in.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  const consoleErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200));
  });

  await page.goto(BASE + "/office/sign-in", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.bringToFront();

  // Wait up to 20s for Clerk to mount something real (an input, or a clerk root).
  let mounted = false;
  for (let i = 0; i < 20; i++) {
    const has = await page
      .evaluate(() => ({
        inputs: document.querySelectorAll("input").length,
        clerkRoot: document.querySelectorAll("[class*='cl-']").length,
      }))
      .catch(() => ({ inputs: 0, clerkRoot: 0 }));
    if (has.inputs > 0 || has.clerkRoot > 3) {
      mounted = true;
      console.log(`Clerk mounted after ~${i}s`, JSON.stringify(has));
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  const facts = await page.evaluate(() => ({
    url: location.href,
    inputs: document.querySelectorAll("input").length,
    clerkNodes: document.querySelectorAll("[class*='cl-']").length,
    buttons: [...document.querySelectorAll("button")].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 10),
    text: document.body.innerText.slice(0, 400),
  }));
  console.log("mounted:", mounted);
  console.log(JSON.stringify(facts, null, 2));
  if (consoleErrors.length) console.log("console errors:", consoleErrors.slice(0, 5));
  else console.log("console errors: none");

  console.log("\n>>> LEAVING the tab open on the office door for the owner to sign in.");
} finally {
  browser.close().catch(() => {});
  console.log("detached (tab left open)");
}
