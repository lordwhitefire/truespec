// TASK-005 research probe — R2.3 (read-only half): the office, the delete dialog, focus, the toast's place.
// Attach-only CDP :9222, no launch, no screenshots, detach on exit. This probe drives NO writes:
// it opens dialogs and closes them with "Keep it" / Escape / click-outside, never "Delete".
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // wait until the page shows something other than the store-waking state
  async function waitForContent(maxMs = 45000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      let t = "";
      try {
        t = await page.evaluate(() => document.body.innerText);
      } catch {
        t = "";
      }
      if (t && !/Just a moment|We couldn’t load this|We couldn't load this/.test(t)) return t;
      await sleep(1000);
    }
    return "(still waiting/waking after timeout)";
  }

  async function open(path, label) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) => console.log(`  goto err: ${e.message.slice(0, 80)}`));
    const text = await waitForContent();
    const facts = await page.evaluate(() => ({
      url: location.href,
      h1: document.querySelector("h1")?.innerText?.trim() ?? null,
      title: document.title,
      len: document.body.innerText.length,
      nav: [...document.querySelectorAll("nav a, aside a")].map((a) => a.innerText.trim()).filter(Boolean).slice(0, 12),
    }));
    console.log(
      `\n[${label}] ${path}\n  url=${facts.url}\n  h1=${JSON.stringify(facts.h1)} title=${JSON.stringify(facts.title)} textLen=${facts.len}\n  text[0:220]=${JSON.stringify(text.slice(0, 220))}`,
    );
    return text;
  }

  const activeInfo = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "BODY (nothing focused)";
      return `${a.tagName}#${a.id || "-"}[${a.getAttribute("aria-label") || a.textContent?.trim().slice(0, 40) || ""}]`;
    });

  console.log("=== 1. OFFICE ACCESS (each shell route) ===");
  for (const [p, l] of [
    ["/office", "dashboard"],
    ["/office/inventory", "inventory"],
    ["/office/drafts", "drafts"],
    ["/office/enquiries", "enquiries"],
    ["/office/activity", "activity"],
    ["/office/settings", "settings"],
  ]) {
    await open(p, l);
  }

  console.log("\n=== 2. THE DELETE DIALOG — real words, and how it closes (READ-ONLY) ===");
  await open("/office/inventory", "inventory (again)");
  const rows = await page.locator("table.t tbody tr").count();
  console.log(`  rows on screen: ${rows}`);
  const delBtn = page.locator('button[aria-label^="Delete "]').first();
  const delLabel = await delBtn.getAttribute("aria-label");
  console.log(`  first delete control: ${JSON.stringify(delLabel)}`);

  const focusBefore = await activeInfo();
  await delBtn.click();
  await page.waitForSelector("#ovl:not([hidden])", { timeout: 5000 });
  await sleep(300);
  const modal = await page.evaluate(() => {
    const ovl = document.querySelector("#ovl");
    const mdl = ovl?.querySelector(".mdl");
    return {
      overlayDisplay: ovl ? getComputedStyle(ovl).display : null,
      modalRole: mdl?.getAttribute("role"),
      ariaModal: mdl?.getAttribute("aria-modal"),
      heading: mdl?.querySelector("h2")?.innerText?.trim(),
      body: mdl?.querySelector("p")?.innerText?.trim(),
      buttons: [...(mdl?.querySelectorAll("button") ?? [])].map((b) => b.innerText.trim()),
    };
  });
  console.log(`  focus before open: ${focusBefore}`);
  console.log(`  focus on open:     ${await activeInfo()}`);
  console.log("  dialog:");
  console.log(JSON.stringify(modal, null, 2));

  // Escape
  await page.keyboard.press("Escape");
  await sleep(300);
  const afterEsc = await page.evaluate(() => document.querySelector("#ovl")?.hidden);
  console.log(`  Escape closed it: ${afterEsc === true}  · focus after Escape: ${await activeInfo()}`);

  // click outside
  await delBtn.click();
  await page.waitForSelector("#ovl:not([hidden])", { timeout: 5000 });
  await sleep(200);
  await page.mouse.click(8, 8);
  await sleep(300);
  const afterOut = await page.evaluate(() => document.querySelector("#ovl")?.hidden);
  console.log(`  click-outside closed it: ${afterOut === true}  · focus after click-outside: ${await activeInfo()}`);

  // "Keep it"
  await delBtn.click();
  await page.waitForSelector("#ovl:not([hidden])", { timeout: 5000 });
  await sleep(200);
  await page.locator("#no").click();
  await sleep(300);
  const afterKeep = await page.evaluate(() => document.querySelector("#ovl")?.hidden);
  console.log(`  "Keep it" closed it: ${afterKeep === true}  · focus after "Keep it": ${await activeInfo()}`);

  // can Tab escape the modal?
  await delBtn.click();
  await page.waitForSelector("#ovl:not([hidden])", { timeout: 5000 });
  await sleep(200);
  const tabTrace = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    tabTrace.push(await activeInfo());
  }
  console.log("  Tab order from open modal (8 tabs):");
  tabTrace.forEach((t, i) => console.log(`    ${i + 1}. ${t}`));
  await page.locator("#no").click();
  await sleep(200);

  console.log("\n=== 3. THE TOAST'S PLACE ON SCREEN (not triggered — its resting style) ===");
  const toastStyle = await page.evaluate(() => {
    const t = document.querySelector(".toast");
    if (!t) return "no .toast element on this surface";
    const cs = getComputedStyle(t);
    const r = t.getBoundingClientRect();
    return {
      position: cs.position,
      bottom: cs.bottom,
      left: cs.left,
      transform: cs.transform,
      width: Math.round(r.width),
      height: Math.round(r.height),
      zIndex: cs.zIndex,
      shown: t.className.includes("show"),
      text: t.innerText.trim(),
      undoHidden: document.querySelector("#undo")?.hidden,
    };
  });
  console.log(JSON.stringify(toastStyle, null, 2));

  console.log("\n=== 4. EMPTY STATE (read-only): office inventory filtered to nothing ===");
  await page.fill("#q", "zzzz-no-such-car");
  await sleep(400);
  console.log("  text:", JSON.stringify((await page.evaluate(() => document.querySelector(".empty2")?.innerText ?? "(no .empty2)")).slice(0, 200)));
  await page.fill("#q", "");
  await sleep(300);

  console.log("\ndone — nothing was written");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
