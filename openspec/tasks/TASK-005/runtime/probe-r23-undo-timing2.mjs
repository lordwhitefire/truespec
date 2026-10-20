// TASK-005 research probe — R2.3 timing half, PASS 2 (precise): same authorised delete+undo, but the
// confirm and undo clicks are timestamped INSIDE the page, so the deltas are exact, not inferred.
// Net effect on the store: the car is restored; the activity log gains a deleted/restored pair.
// Attach-only CDP :9222, no launch, no screenshots, detach on exit. Verified by reload + server read.
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
      try { t = await page.evaluate(() => document.body.innerText); } catch { t = ""; }
      if (t && !/Just a moment|We couldn’t load this/.test(t)) return t;
      await sleep(1000);
    }
    return "";
  }

  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  const rowsBefore = await page.locator("table.t tbody tr").count();
  console.log(`rows before: ${rowsBefore}`);

  const delButtons = page.locator('table.t tbody tr button[aria-label^="Delete "]');
  const n = await delButtons.count();
  const idx = 0; // this pass: the FIRST row
  const targetBtn = delButtons.nth(idx);
  const targetLabel = await targetBtn.getAttribute("aria-label");
  const rowLine = await page.locator("table.t tbody tr").nth(idx).locator("td.carx small").innerText();
  const ref = (rowLine.match(/TS-\d+/)?.[0] ?? "").trim();
  console.log(`TARGET: ${JSON.stringify(targetLabel)} · ${JSON.stringify(rowLine)} · ref=${ref}`);

  // Recorder + exact click stamps, all on performance.now().
  await page.evaluate((ref) => {
    window.__ev = [];
    const T = () => Math.round(performance.now());
    window.__t0 = T();
    const push = (kind, extra = {}) => window.__ev.push({ kind, t: T(), ...extra });
    window.__push = push;

    let lastKey = null;
    window.__timer = setInterval(() => {
      const t = document.querySelector("#toast");
      const undo = document.querySelector("#undo");
      const tmsg = document.querySelector("#tmsg");
      const row = !!document.querySelector(`a[href="/office/car/${ref}"]`);
      const ovl = document.querySelector("#ovl");
      const s = {
        show: !!t && t.className.includes("show"),
        text: (tmsg?.innerText ?? "").trim(),
        undoHidden: undo ? undo.hidden : null,
        undoVisible: !!undo && !undo.hidden && undo.getBoundingClientRect().height > 0,
        row,
        modalOpen: !!ovl && !ovl.hidden,
      };
      const key = JSON.stringify(s);
      if (key !== lastKey) { push("state", { ms: T() - window.__t0, ...s }); lastKey = key; }
    }, 20);

    // stamp the actual clicks
    document.addEventListener("click", (e) => {
      const el = e.target.closest("#yes, #undo, #no");
      if (el) push("click", { ms: T() - window.__t0, id: el.id });
    }, true);
  }, ref);

  await targetBtn.click();
  await page.waitForSelector("#ovl:not([hidden])", { timeout: 5000 });
  await sleep(300);
  await page.locator("#yes").click();
  await sleep(4000);
  await page.locator("#undo").click();
  await sleep(2500);

  const ev = await page.evaluate(() => { clearInterval(window.__timer); return window.__ev; });
  console.log("\n--- exact timeline (all times in ms from recorder start) ---");
  let tYes = null, tUndo = null;
  for (const e of ev) {
    if (e.kind === "click") {
      console.log(`  [click #${e.id}] at ${e.ms} ms`);
      if (e.id === "yes") tYes = e.ms;
      if (e.id === "undo") tUndo = e.ms;
    } else {
      console.log(
        `  ${String(e.ms).padStart(5)} ms  toast=${e.show ? "SHOWN" : "hidden"}  undo=${e.undoVisible ? "VISIBLE" : "hidden"}  row=${e.row ? "present" : "GONE"}  modal=${e.modalOpen ? "open" : "closed"}  text=${JSON.stringify(e.text)}`,
      );
    }
  }

  console.log("\n--- the deltas that matter ---");
  const st = ev.filter((e) => e.kind === "state");
  const rowGone = st.find((e) => !e.row && e.ms > tYes);
  const toastUp = st.find((e) => e.show && e.text.includes("deleted") && e.ms > tYes);
  const restored = st.find((e) => e.text.includes("restored") && e.ms > (tUndo ?? 0));
  const undoGoneAfterRestore = st.find((e) => e.text.includes("restored") && !e.undoVisible && e.ms > (tUndo ?? 0));
  const d = (a, b) => (a != null && b != null ? `${a - b} ms` : "n/a");
  console.log(`  confirm clicked → the row vanishes:            ${d(rowGone?.ms, tYes)}`);
  console.log(`  confirm clicked → the confirmation + Undo show: ${d(toastUp?.ms, tYes)}`);
  console.log(`  Undo clicked → the restore words show:          ${d(restored?.ms, tUndo)}`);
  console.log(`  Undo clicked → the Undo button goes away:       ${d(undoGoneAfterRestore?.ms, tUndo)}`);

  console.log("\n--- verifying by RELOAD + server read ---");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await waitContent();
  const after = await page.evaluate(() => ({
    rows: document.querySelectorAll("table.t tbody tr").length,
    links: [...document.querySelectorAll('a[href^="/office/car/"]')].map((a) => a.getAttribute("href")),
  }));
  console.log(`rows after reload: ${after.rows} (was ${rowsBefore})`);
  console.log(`car ${ref} present after reload: ${after.links.includes(`/office/car/${ref}`) ? "YES — restored in the store ✅" : "NO — STILL MISSING ⚠️"}`);
  console.log("done");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
