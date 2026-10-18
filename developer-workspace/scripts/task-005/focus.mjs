// TASK-005 plan Task 14 — focus, scroll, name, Escape.
//
// Keyboard only. On each screen a real opener is focused and opened with Enter; then, live and
// signed in:
//   - where focus entered (a safe control, never the destructive one);
//   - Tab round the dialog — every landing inside it, the last does not leave;
//   - the accessible name read from the accessibility tree (Playwright ariaSnapshot);
//   - the page behind cannot be wheeled while the dialog is up, and the lock is gone after;
//   - Escape closes that dialog and nothing else — focus back on the opener, URL unchanged, and a
//     second Escape with nothing open changes nothing.
//
// The showroom's two modals open themselves (welcome timer; exit intent after a dwell). Their
// "opener" is whatever had focus when they opened: the drive focuses a real link first and checks
// it has focus back.
//
// Attach-only; no store writes.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount } from "./_lib.mjs";

const RUNS = new URL("./runs/focus/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(90000);

const r = { when: new Date().toISOString(), base: BASE, ua, results: {} };

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
      return !d || d.open === false;
    },
    sel,
    { timeout: 60000 },
  );

const describeActive = () =>
  page.evaluate(() => {
    const a = document.activeElement;
    if (!a) return "none";
    return `${a.tagName}${a.id ? "#" + a.id : ""}${
      a.getAttribute("aria-label") ? "[" + a.getAttribute("aria-label") + "]" : ""
    }${a.dataset.fp ? "·opener" : ""}`;
  });

async function tabTour(sel, presses) {
  const seq = [await describeActive()];
  let pageControls = 0;
  let bodyStops = 0;
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(
      (s) => {
        const d = document.querySelector(s);
        const a = document.activeElement;
        if (!d || !a) return "none";
        if (d.contains(a)) return "dialog";
        // Chrome's native modal dialog cycles through the document's body at the edge; it is the
        // platform's fallback, not a page control. A real control outside the dialog is a leak.
        if (a === document.body || a === document.documentElement) return "body";
        if (a.closest("a,button,input,select,textarea,[tabindex]")) return "page-control";
        return "outside";
      },
      sel,
    );
    if (where === "page-control" || where === "outside") pageControls++;
    if (where === "body") bodyStops++;
    seq.push(await describeActive());
  }
  return { seq, pageControls, bodyStops };
}

const scrollState = () =>
  page.evaluate(() => ({
    bodyOverflow: getComputedStyle(document.body).overflow,
    bodyInline: document.body.style.overflow,
    y: window.scrollY,
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }));

const fingerprint = () =>
  page.evaluate(() => ({
    url: location.href,
    openDialogs: document.querySelectorAll("dialog[open]").length,
    y: window.scrollY,
    bodyOverflow: getComputedStyle(document.body).overflow,
    active: document.activeElement
      ? `${document.activeElement.tagName}${document.activeElement.id ? "#" + document.activeElement.id : ""}${
          document.activeElement.dataset.fp ? "·opener" : ""
        }`
      : "none",
  }));

async function mark(sel) {
  await page.locator(sel).first().evaluate((el) => {
    el.dataset.fp = "1";
  });
}

async function screen(name, url, { opener = null, sel, how, tour = 8, hydrateOn = "main" }) {
  const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 90000 });
  if (response && response.status() >= 500) throw new Error(`${url} answered ${response.status()}`);

  if (opener) {
    await hydrated(opener);
    await mark(opener);
    await page.locator(opener).first().focus();
  } else {
    // The showroom's automated modals still have a real element to come back to.
    await page.locator("a[href]").first().waitFor({ timeout: 60000 });
    await mark("a[href]");
    await page.locator("a[href]").first().focus();
  }

  const beforeOpen = await fingerprint();

  if (opener) {
    await page.keyboard.press("Enter");
  } else {
    await hydrated(hydrateOn);
    if (how === "gesture") {
      await page.waitForTimeout(8000);
      await page.evaluate(() => {
        document.dispatchEvent(
          new MouseEvent("mouseout", { bubbles: true, relatedTarget: null, clientY: 0 }),
        );
      });
    }
  }

  await openWait(sel);
  const entered = await describeActive();
  const nameTree = await page.locator(sel).ariaSnapshot().catch(() => null);
  const tourResult = await tabTour(sel, tour);

  const scrollOpen = await scrollState();
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(600);
  const scrollAfterWheel = await scrollState();
  const fingerprintOpen = await fingerprint();

  await page.keyboard.press("Escape");
  await closeWait(sel);
  // The platform's close event is queued; give the owning close handler its task before reading.
  await page.waitForTimeout(500);
  const afterClose = await fingerprint();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const afterSecondEscape = await fingerprint();

  r.results[name] = {
    url,
    entered,
    nameTree,
    tab: tourResult,
    scroll: { open: scrollOpen, afterWheel: scrollAfterWheel },
    fingerprint: { beforeOpen, open: fingerprintOpen, afterClose, afterSecondEscape },
  };
  console.log(
    `${name}: entered=${entered} · pageControls=${tourResult.pageControls} bodyStops=${tourResult.bodyStops} · overflow=${scrollOpen.bodyOverflow} · wheel ${
      scrollAfterWheel.y === scrollOpen.y ? "held" : `MOVED ${scrollOpen.y}→${scrollAfterWheel.y}`
    } · after=${afterClose.active} · dialogs=${afterClose.openDialogs} · url ${
      afterClose.url === fingerprintOpen.url ? "same" : "CHANGED"
    } · secondEscape ${afterSecondEscape.url === afterClose.url && afterSecondEscape.active === afterClose.active ? "no change" : "CHANGED"}`,
  );
  console.log(`  a11y: ${String(nameTree).split("\n")[0]}`);
}

async function screenRetry(...args) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await screen(...args);
    } catch (error) {
      if (attempt === 2) throw error;
      console.log(`retry ${args[0]} after: ${error.message}`);
      await page.waitForTimeout(5000);
    }
  }
}

try {
  await screenRetry("office-inventory", "/office/inventory", {
    opener: "button.ab.del",
    sel: "#ovl",
  });
  await screenRetry("office-car", "/office/car/TS-1001", {
    opener: "#delBtn",
    sel: "#ovlD",
  });
  await screenRetry("office-drafts", "/office/drafts", {
    opener: ".dfoot button.btn.gh",
    sel: "dialog.ovl[open]",
  });
  await screenRetry("office-enquiries", "/office/enquiries", {
    opener: "article.card",
    sel: "#ovlD",
  });

  // Clear the buyer's demo state before the showroom screens (welcome / exit intent).
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("ts-asked");
      localStorage.removeItem("ts-visits");
      sessionStorage.removeItem("ts-covering");
    } catch {
      /* storage can be unavailable before the origin exists */
    }
  });

  await screenRetry("site-home", "/", { how: "gesture", sel: "#ovl", tour: 7, hydrateOn: "#ovl" });
  await screenRetry("site-car", "/car/TS-1001", { how: "gesture", sel: "#ovl", tour: 7, hydrateOn: "#ovl" });
  await screenRetry("site-inventory", "/inventory", { how: "gesture", sel: "#ovl", tour: 7 });
} finally {
  r.chromium = { before, after: chromiumCount() };
  writeFileSync(RUNS + "readings.json", JSON.stringify(r, null, 2));
  console.log(`chromium ${r.chromium.before} -> ${r.chromium.after} (no launch)`);
  await detach(browser);
}
