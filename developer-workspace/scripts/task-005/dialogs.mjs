// TASK-005 plan Task 13 — every confirmation is the platform's dialog.
//
// Reads, live and signed in, on the screens that carry a dialog: the office's four (inventory car
// delete, car form delete, drafts delete, enquiry detail) and the showroom's two (the car/ask modal
// on the home and car pages, the inventory browser's modal). Each is opened through its own real
// trigger — a click or, on the showroom, the same exit-intent gesture a buyer makes — then read:
// the element is a `DIALOG`, it is open, it is `:modal` (top layer), it fills the viewport, it has
// an accessible name, and the now-redundant inner `role="dialog"` is gone. Closing is read the same
// way: `open === false`, `display: none`, not `:modal`.
//
// Attach-only; no store writes. The drafts dialog is opened and closed without deleting a draft.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount } from "./_lib.mjs";

const RUNS = new URL("./runs/dialogs/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] || (await ctx.newPage());
page.setDefaultTimeout(90000);

const r = { when: new Date().toISOString(), base: BASE, ua, results: {} };

/** Everything the plan asks to be true of the element, read from the live DOM. */
const read = (sel) =>
  page.evaluate((s) => {
    const d = document.querySelector(s);
    if (!d) return { found: false };
    const cs = getComputedStyle(d);
    const heading = d.getAttribute("aria-labelledby")
      ? document.getElementById(d.getAttribute("aria-labelledby"))
      : null;
    const box = d.getBoundingClientRect();
    const mdl = d.querySelector(".mdl");
    return {
      found: true,
      tag: d.tagName,
      open: d.open === true,
      modal: d.matches(":modal"),
      display: cs.display,
      position: cs.position,
      rect: { w: Math.round(box.width), h: Math.round(box.height) },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      labelledby: d.getAttribute("aria-labelledby"),
      label: d.getAttribute("aria-label"),
      name: (heading?.textContent ?? d.getAttribute("aria-label") ?? "").trim(),
      innerRole: mdl?.getAttribute("role") ?? null,
      innerAriaModal: mdl?.getAttribute("aria-modal") ?? null,
      active: document.activeElement
        ? `${document.activeElement.tagName}${document.activeElement.id ? "#" + document.activeElement.id : ""}`
        : null,
    };
  }, sel);

const hydrated = (sel, timeout = 90000) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"));
    },
    sel,
    { timeout },
  );

const openWait = (sel) =>
  page.waitForFunction((s) => document.querySelector(s)?.open === true, sel, { timeout: 60000 });
const closeWait = (sel) =>
  page.waitForFunction(
    (s) => {
      const d = document.querySelector(s);
      // The inventory browser mounts its dialog with the modal state, so closed is also absent.
      return !d || d.open === false;
    },
    sel,
    { timeout: 60000 },
  );

async function screen(name, url, trigger, sel, close) {
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await trigger();
  await openWait(sel);
  const opened = await read(sel);
  await close();
  await closeWait(sel);
  const closed = await read(sel);
  r.results[name] = { url, selector: sel, opened, closed };
  console.log(
    `${name}: <${opened.tag}> open=${opened.open} modal=${opened.modal} display=${opened.display} ` +
      `rect=${opened.rect.w}x${opened.rect.h}/${opened.viewport.w}x${opened.viewport.h} name=${JSON.stringify(opened.name)} ` +
      `innerRole=${opened.innerRole} | closed ${closed.found ? `display=${closed.display} open=${closed.open}` : "unmounted"}`,
  );
}

try {
  // ---- office ------------------------------------------------------------
  await screen(
    "office-inventory",
    "/office/inventory",
    async () => {
      await hydrated("button.ab.del");
      await page.locator("button.ab.del").first().click();
    },
    "#ovl",
    () => page.keyboard.press("Escape"),
  );

  await screen(
    "office-car",
    "/office/car/TS-1001",
    async () => {
      await hydrated("#delBtn");
      await page.locator("#delBtn").click();
    },
    "#ovlD",
    () => page.locator('#ovlD button:has-text("Keep it")').click(),
  );

  await screen(
    "office-drafts",
    "/office/drafts",
    async () => {
      await hydrated(".dfoot button.btn.gh");
      await page.locator(".dfoot button.btn.gh").first().click();
    },
    "dialog.ovl",
    () => page.keyboard.press("Escape"),
  );

  await screen(
    "office-enquiries",
    "/office/enquiries",
    async () => {
      await hydrated("article.card");
      const card = page.locator("article.card").first();
      if (await card.count()) return card.click();
      // The Taps tab is not the enquiries board; go back to the board.
      await page.locator('a.etab:has-text("Enquiries")').click();
      await page.locator("article.card").first().click();
    },
    "#ovlD",
    () => page.keyboard.press("Escape"),
  );

  // ---- showroom ----------------------------------------------------------
  // The buyer's own demo state is cleared before each showroom document so the welcome and the
  // exit-intent path can run. This is the browser's demo state, not the store.
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("ts-asked");
      localStorage.removeItem("ts-visits");
      sessionStorage.removeItem("ts-covering");
    } catch {
      /* storage can be unavailable before the document's origin exists */
    }
  });
  await screen(
    "site-home",
    "/",
    async () => {
      await hydrated("#ovl");
      await page.waitForSelector("#ovl[open]", { timeout: 60000 });
    },
    "#ovl",
    () => page.locator("#mx").click(),
  );

  await screen(
    "site-car",
    "/car/TS-1001",
    async () => {
      await hydrated("#ovl");
      await page.waitForTimeout(8000);
      await page.evaluate(() => {
        document.dispatchEvent(
          new MouseEvent("mouseout", { bubbles: true, relatedTarget: null, clientY: 0 }),
        );
      });
    },
    "#ovl",
    () => page.locator("#mx").click(),
  );

  await screen(
    "site-inventory",
    "/inventory",
    async () => {
      // This page mounts its dialog with the modal state, so hydrate on the page itself.
      await hydrated("main");
      await page.waitForTimeout(8000);
      await page.evaluate(() => {
        document.dispatchEvent(
          new MouseEvent("mouseout", { bubbles: true, relatedTarget: null, clientY: 0 }),
        );
      });
    },
    "#ovl",
    () => page.locator("#mx").click(),
  );
} finally {
  r.chromium = { before, after: chromiumCount() };
  writeFileSync(RUNS + "readings.json", JSON.stringify(r, null, 2));
  console.log(`chromium ${r.chromium.before} -> ${r.chromium.after} (no launch)`);
  await detach(browser);
}
