// TASK-005 research probe — R2.3 (read-only half, part 2): the other three dialogs at runtime.
// Attach-only CDP :9222, no launch, no screenshots, detach on exit.
// Writes: NONE. The car form's Delete is a no-op in source (toast only), so clicking it stores nothing;
// nothing else here is confirmed. Drafts' "Delete draft" is NEVER clicked.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const activeInfo = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "BODY (nothing focused)";
      return `${a.tagName}#${a.id || "-"}[${a.getAttribute("aria-label") || a.textContent?.trim().slice(0, 40) || ""}]`;
    });

  async function open(path, maxMs = 45000) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      let t = "";
      try {
        t = await page.evaluate(() => document.body.innerText);
      } catch {
        t = "";
      }
      if (t && !/Just a moment|We couldn’t load this/.test(t)) return t;
      await sleep(1000);
    }
    return "";
  }

  console.log("=== A. CAR FORM — /office/car/TS-1001 — the delete dialog and the no-op Delete ===");
  await open("/office/car/TS-1001");
  const delVisible = await page.locator("#delBtn").isVisible().catch(() => false);
  console.log(`  #delBtn visible on an existing car: ${delVisible}`);
  await page.locator("#delBtn").click();
  await page.waitForSelector("#ovlD:not([hidden])", { timeout: 5000 });
  await sleep(300);
  console.log("  focus on open:", await activeInfo());
  console.log(
    "  dialog:",
    JSON.stringify(
      await page.evaluate(() => {
        const d = document.querySelector("#ovlD .mdl");
        return {
          heading: d?.querySelector("h2")?.innerText?.trim(),
          body: d?.querySelector("p")?.innerText?.trim(),
          buttons: [...(d?.querySelectorAll("button") ?? [])].map((b) => b.innerText.trim()),
          labelledBy: d?.getAttribute("aria-labelledby"),
        };
      }),
      null,
      2,
    ),
  );
  await page.keyboard.press("Escape");
  await sleep(300);
  console.log(`  Escape closed it: ${(await page.evaluate(() => document.querySelector("#ovlD")?.hidden)) === true}`);
  await page.mouse.click(8, 8);
  await sleep(300);
  console.log(`  click-outside closed it: ${(await page.evaluate(() => document.querySelector("#ovlD")?.hidden)) === true}`);

  // Now the lie: click Delete. Source says it only shows a toast. Verify nothing changes.
  const beforeName = await page.locator("#carName, input[name=name]").first().inputValue().catch(() => "(n/a)");
  await page.locator("#delBtn").click();
  await page.waitForSelector("#ovlD:not([hidden])", { timeout: 5000 });
  await page.locator("#delYes").click();
  await sleep(600);
  const afterToast = await page.evaluate(() => {
    const t = document.querySelector("#toast");
    return {
      toastVisible: !!t && t.className.includes("show"),
      toastText: t?.innerText?.trim(),
      tundoHidden: document.querySelector("#tundo")?.hidden,
      stillOnCarPage: location.pathname.includes("/office/car/"),
      heading: document.querySelector("h1")?.innerText?.trim(),
    };
  });
  console.log("  after clicking Delete (a no-op per source):");
  console.log(JSON.stringify(afterToast, null, 2));
  console.log(`  the car's name field before/after: ${JSON.stringify(beforeName)} — car still loaded: ${afterToast.stillOnCarPage}`);

  console.log("\n=== B. DRAFTS — the discard dialog, and whether Escape works ===");
  await open("/office/drafts");
  console.log("  drafts on screen:", await page.locator(".card").count());
  const dDel = page.locator("button:has-text('Delete')").first();
  await dDel.click();
  await page.waitForSelector(".ovl[role=dialog]", { timeout: 5000 });
  await sleep(300);
  console.log("  focus on open:", await activeInfo());
  console.log(
    "  dialog:",
    JSON.stringify(
      await page.evaluate(() => {
        const d = document.querySelector(".ovl[role=dialog]");
        return {
          ariaLabel: d?.getAttribute("aria-label"),
          heading: d?.querySelector("h2")?.innerText?.trim(),
          body: d?.querySelector("p")?.innerText?.trim(),
          buttons: [...(d?.querySelectorAll("button") ?? [])].map((b) => b.innerText.trim() || b.getAttribute("aria-label")),
          hasClickOutsideHandler: !!d?.getAttribute("onclick") || false,
        };
      }),
      null,
      2,
    ),
  );
  await page.keyboard.press("Escape");
  await sleep(300);
  const draftStillOpen = await page.locator(".ovl[role=dialog]").isVisible().catch(() => false);
  console.log(`  after Escape — dialog still open? ${draftStillOpen}  (source has no Escape handler)`);
  await page.mouse.click(8, 8);
  await sleep(300);
  const afterOutside = await page.locator(".ovl[role=dialog]").isVisible().catch(() => false);
  console.log(`  after click-outside — dialog still open? ${afterOutside}  (source has no click-outside handler)`);
  const mx = page.locator(".ovl[role=dialog] button[aria-label=Close]");
  if (await mx.count()) {
    await mx.click();
    await sleep(300);
    console.log(`  ✕ closed it: ${!(await page.locator(".ovl[role=dialog]").isVisible().catch(() => false))}`);
  }

  console.log("\n=== C. ENQUIRIES — the detail card, Escape, and focus ===");
  await open("/office/enquiries");
  const cardCount = await page.locator(".card[role=button]").count();
  console.log("  enquiry cards:", cardCount);
  if (cardCount) {
    await page.locator(".card[role=button]").first().click();
    await page.waitForSelector("#ovlD:not([hidden])", { timeout: 5000 });
    await sleep(300);
    console.log("  focus on open:", await activeInfo());
    console.log(
      "  dialog text:",
      JSON.stringify((await page.evaluate(() => document.querySelector("#ovlD .mdl")?.innerText ?? "")).slice(0, 400)),
    );
    await page.keyboard.press("Escape");
    await sleep(300);
    console.log(`  Escape closed it: ${(await page.evaluate(() => document.querySelector("#ovlD")?.hidden)) === true}`);
    console.log(`  focus after Escape: ${await activeInfo()}`);
  }

  console.log("\n=== D. TOMBSTONES — is anything waiting to be cleared? (read-only) ===");
  await open("/office/inventory");
  const clearout = await page.evaluate(() => {
    const s = document.querySelector(".clearout");
    return s ? s.innerText.slice(0, 300) : "(no 'Waiting to be cleared' section — nothing is waiting)";
  });
  console.log(" ", JSON.stringify(clearout));

  console.log("\ndone — nothing was written");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
