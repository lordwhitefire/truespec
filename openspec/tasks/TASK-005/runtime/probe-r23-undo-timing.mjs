// TASK-005 research probe — R2.3 timing half, authorised by the owner 2026-10-17:
// delete ONE demo car via office inventory, then UNDO it a few seconds later.
// Net effect on the store: the car is restored; the activity log gains a deleted/restored pair.
//
// Attach-only CDP :9222, no launch, no screenshots, detach on exit.
// Sampling happens INSIDE the page (every 25 ms) so the timings are not limited by CDP round-trips,
// and the outcome is verified by a RELOAD + server read, so an optimistic UI cannot fool the result.
import { chromium } from "playwright-core";

const CDP = "http://127.0.0.1:9222";
const BASE = "http://127.0.0.1:3210";

const browser = await chromium.connectOverCDP(CDP, { timeout: 15000 });
try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.setViewportSize({ width: 1440, height: 900 });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitContent(maxMs = 45000) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      let t = "";
      try {
        t = await page.evaluate(() => document.body.innerText);
      } catch { t = ""; }
      if (t && !/Just a moment|We couldn’t load this/.test(t)) return t;
      await sleep(1000);
    }
    return "";
  }

  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();

  const rowsBefore = await page.locator("table.t tbody tr").count();
  console.log(`rows before: ${rowsBefore}`);

  // Choose a target: the LAST row (least likely to be the flagship demo car).
  const delButtons = page.locator('table.t tbody tr button[aria-label^="Delete "]');
  const n = await delButtons.count();
  const targetBtn = delButtons.nth(n - 1);
  const targetLabel = await targetBtn.getAttribute("aria-label");
  // the row's ref, for verification
  const targetRef = await page
    .locator("table.t tbody tr")
    .nth(n - 1)
    .locator("td.carx small")
    .innerText();
  console.log(`TARGET: ${JSON.stringify(targetLabel)} · row ref/mileage line: ${JSON.stringify(targetRef)}`);
  const ref = (targetRef.match(/TS-\d+/)?.[0] ?? "").trim();
  console.log(`target ref: ${ref}`);

  // Install an in-page recorder sampling the toast + undo button + row presence every 25 ms.
  await page.evaluate((ref) => {
    window.__rec = [];
    window.__t0 = performance.now();
    const snap = () => {
      const t = document.querySelector("#toast");
      const undo = document.querySelector("#undo");
      const tmsg = document.querySelector("#tmsg");
      const rowPresent = !!document.querySelector(`a[href="/office/car/${ref}"]`);
      return {
        t: Math.round(performance.now() - window.__t0),
        show: !!t && t.className.includes("show"),
        text: (tmsg?.innerText ?? "").trim(),
        undoHidden: undo ? undo.hidden : null,
        undoVisible: !!undo && !undo.hidden && undo.getBoundingClientRect().height > 0,
        rowPresent,
      };
    };
    let last = null;
    window.__recTimer = setInterval(() => {
      const s = snap();
      const key = JSON.stringify([s.show, s.text, s.undoHidden, s.undoVisible, s.rowPresent]);
      if (key !== last) {
        window.__rec.push({ ...s, ms: Math.round(s.t) });
        last = key;
      }
    }, 25);
  }, ref);

  // --- THE WRITE: open the dialog, confirm ---
  await targetBtn.click();
  await page.waitForSelector("#ovl:not([hidden])", { timeout: 5000 });
  await sleep(400);
  const tClickYes = Date.now();
  await page.locator("#yes").click();
  console.log(`clicked Delete at t=0 (${new Date(tClickYes).toISOString()})`);

  // Watch the window: click Undo at ~4 s (well inside the 8 s the source claims).
  await sleep(4000);
  const undoState = await page.evaluate(() => {
    const u = document.querySelector("#undo");
    return { exists: !!u, hidden: u?.hidden, text: u?.innerText, rect: u ? u.getBoundingClientRect().toJSON() : null };
  });
  console.log(`at ~4 s: undo button = ${JSON.stringify(undoState)}`);
  if (undoState.exists && !undoState.hidden) {
    await page.locator("#undo").click();
    console.log("clicked Undo at ~4 s");
  } else {
    console.log("!! Undo was NOT available at ~4 s — did not click");
  }

  // let the restore toast play out
  await sleep(2500);
  const rec = await page.evaluate(() => {
    clearInterval(window.__recTimer);
    return window.__rec;
  });
  console.log("\n--- transitions seen by the in-page recorder (25 ms sampling) ---");
  for (const r of rec) {
    console.log(
      `  t=${String(r.ms).padStart(5)}ms  toastShow=${r.show ? "Y" : "n"}  undoHidden=${r.undoHidden}  undoVisible=${r.undoVisible}  rowPresent=${r.rowPresent}  text=${JSON.stringify(r.text)}`,
    );
  }

  // --- VERIFY SERVER-SIDE: reload and look for the row again ---
  console.log("\n--- verifying by RELOAD + server read (an optimistic UI cannot fake this) ---");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  const after = await page.evaluate(
    (ref) => ({
      rows: document.querySelectorAll("table.t tbody tr").length,
      links: [...document.querySelectorAll('a[href^="/office/car/"]')].map((a) => a.getAttribute("href")),
    }),
    ref,
  );
  const back = after.links.includes(`/office/car/${ref}`);
  console.log(`rows after reload: ${after.rows} (was ${rowsBefore})`);
  console.log(`car ${ref} present after reload: ${back ? "YES — restored in the store ✅" : "NO — STILL MISSING ⚠️"}`);
  const clearout = await page.evaluate(() => {
    const s = document.querySelector(".clearout");
    return s ? s.innerText.replace(/\n+/g, " | ").slice(0, 200) : "(no 'Waiting to be cleared' section)";
  });
  console.log(`tombstone panel: ${clearout}`);

  console.log("\ndone");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
