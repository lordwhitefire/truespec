// TASK-005 plan Task 21 — the showroom's nav chat control behaves the same at every width.
//
// Live, signed in, read-only. At 375 (phone), 768 (tablet) and 1440 (desktop): the nav's
// "Chat on WhatsApp" control (`.nav .wab`) must show/hide the SAME way on home, inventory and a
// car page. DR15's ruling: hidden at ≤820px on every showroom page — the phone affords chat
// elsewhere (the floating `.fab` on home/inventory, the car page's own `.mbar`), so nothing is
// lost; above 820px it is the chat affordance on every page.
//
// Attach-only; no store writes; the viewport is restored.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task21/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const CAR = "/car/TS-1001"; // live in the store at the time of the run

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(120000);

const r = { when: new Date().toISOString(), base: BASE, ua, car: CAR, widths: {} };

async function goto(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (!response || response.status() < 500) break;
    if (attempt === 2) throw new Error(`${url} answered ${response.status()}`);
    await page.waitForTimeout(5000);
  }
  await page.waitForSelector(".nav", { state: "attached", timeout: 120000 });
  await page.waitForTimeout(1200); // let the Suspense pieces settle
}

const readControls = () =>
  page.evaluate(() => {
    const vis = (el) => {
      if (!el) return { present: false, visible: false, display: null };
      const cs = getComputedStyle(el);
      return {
        present: true,
        display: cs.display,
        visible: cs.display !== "none" && el.getBoundingClientRect().width > 0,
      };
    };
    const navWab = document.querySelector(".nav .wab");
    return {
      width: innerWidth,
      path: location.pathname,
      navWab: {
        ...vis(navWab),
        tag: navWab?.tagName ?? null,
        href: navWab?.getAttribute("href") ?? null,
      },
      fab: vis(document.querySelector("a.fab")),
      mbar: {
        ...vis(document.querySelector("#mbar")),
        show: document.querySelector("#mbar")?.classList.contains("show") ?? null,
      },
    };
  });

try {
  for (const w of [375, 768, 1440]) {
    await page.setViewportSize({ width: w, height: w === 1440 ? 900 : 1024 });
    const pages = [];
    for (const url of ["/", "/inventory", CAR]) {
      await goto(url);
      const controls = await readControls();
      if (url === CAR && w <= 820) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        controls.mbarShownAfterScroll = await page
          .waitForFunction(() => document.querySelector("#mbar")?.classList.contains("show"), null, {
            timeout: 8000,
          })
          .then(() => true)
          .catch(() => false);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      pages.push({ url, ...controls });
    }
    const byUrl = Object.fromEntries(pages.map((p) => [p.url, p]));
    const flags = pages.map((p) => p.navWab.visible);
    const consistent = flags.every((v) => v === flags[0]);
    r.widths[String(w)] = {
      width: pages[0].width,
      pages: byUrl,
      navChatSameEverywhere: consistent,
      pass:
        consistent &&
        (w <= 820
          ? pages.every((p) => p.navWab.visible === false) &&
            byUrl["/"].fab.visible === true &&
            byUrl["/inventory"].fab.visible === true &&
            byUrl[CAR].fab.present === false &&
            byUrl[CAR].mbar.display === "flex"
          : pages.every((p) => p.navWab.visible === true) &&
            pages.every((p) => p.fab.visible === false) &&
            byUrl[CAR].mbar.display === "none"),
    };
  }
  r.pass = r.widths["375"].pass && r.widths["768"].pass && r.widths["1440"].pass;

  const line = (w) => {
    const e = r.widths[String(w)];
    const nav = e.pages;
    const car = nav[CAR];
    return `nav chat visible: home=${nav["/"].navWab.visible} inventory=${nav["/inventory"].navWab.visible} car=${car.navWab.visible}`;
  };
  console.log(
    `375: ${line(375)} · fab home=${r.widths["375"].pages["/"].fab.visible} inventory=${r.widths["375"].pages["/inventory"].fab.visible} car=${r.widths["375"].pages[CAR].fab.present ? String(r.widths["375"].pages[CAR].fab.visible) : "absent"} · mbar=${r.widths["375"].pages[CAR].mbar.display} shownAfterScroll=${r.widths["375"].pages[CAR].mbarShownAfterScroll} → ${r.widths["375"].pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `768: ${line(768)} · mbar=${r.widths["768"].pages[CAR].mbar.display} → ${r.widths["768"].pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `1440: ${line(1440)} · fab home=${r.widths["1440"].pages["/"].fab.visible} · mbar=${r.widths["1440"].pages[CAR].mbar.display} → ${r.widths["1440"].pass ? "PASS" : "FAIL"}`,
  );
  console.log(`TASK 21: ${r.pass ? "PASS" : "FAIL"}`);
} finally {
  await page.setViewportSize({ width: 1440, height: 900 });
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}readings.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await detach(browser);
}
