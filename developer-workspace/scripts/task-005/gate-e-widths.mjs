// TASK-005 Gate E — width coverage for the dead Search and the car form's delete affordance.
//
// Live, signed in, read-only (the delete dialog is opened and closed with "Keep it" — no writes).
// At 375/768/1280 px:
//   · every office top bar carries no search control and no control that does nothing (Task 18's
//     claim, re-read at these widths);
//   · the car editor's delete is a real control whose confirmation dialog is the platform's modal
//     (opens, `:modal`, closes through its safe control, focus returns to the opener).
// The full store flow (delete → offer → undo → store read, expiry leg, net-zero) is driven by
// `car-delete-offer.mjs`: at 375 in `runs/gate-e-car-375/`, at desktop in `runs/task19/`.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/gate-e/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const CAR = "/car/TS-1001"; // live in the store at the time of the run
const ROUTES = ["/office", "/office/inventory", "/office/activity", "/office/settings"];

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);

const r = { when: new Date().toISOString(), base: BASE, car: CAR, widths: {} };

const hydrated = (sel, timeout = 180000) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
      );
    },
    sel,
    { timeout },
  );

async function goto(url, sel) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 180000 });
    if (!response || response.status() < 500) break;
    if (attempt === 2) throw new Error(`${url} answered ${response.status()}`);
    await page.waitForTimeout(5000);
  }
  await page.waitForSelector(sel, { state: "attached", timeout: 180000 });
  await hydrated(sel);
}

const readTopbar = () =>
  page.evaluate(() => {
    const tb = document.querySelector(".topbar");
    if (!tb) return { found: false };
    const controls = Array.from(tb.querySelectorAll("a, button, input, [role=button]")).map((el) => ({
      tag: el.tagName,
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
      ariaLabel: el.getAttribute("aria-label"),
      href: el.getAttribute("href"),
    }));
    const searchish = tb.querySelectorAll(
      '[aria-label*="search" i], [placeholder*="search" i], input[type="search"], i.fa-magnifying-glass',
    ).length;
    const buttons = controls.filter((c) => c.tag === "BUTTON").length;
    return {
      found: true,
      display: getComputedStyle(tb).display,
      buttons,
      searchish,
      controls,
    };
  });

try {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: width <= 560 ? 812 : width <= 820 ? 1024 : 900 });
    const routes = {};
    for (const url of ROUTES) {
      await goto(url, ".topbar");
      const tb = await readTopbar();
      routes[url] = tb;
    }
    const searchPass = Object.values(routes).every(
      (tb) => tb.found && tb.searchish === 0 && tb.buttons === 0,
    );

    await goto(`/office${CAR}`, "form");
    await page.waitForSelector("#f-brand", { state: "attached", timeout: 180000 });
    await hydrated("#f-brand");
    const delBtn = await page.evaluate(() => {
      const b = document.getElementById("delBtn");
      if (!b) return { found: false };
      const cs = getComputedStyle(b);
      return {
        found: true,
        text: (b.textContent || "").replace(/\s+/g, " ").trim(),
        visible: cs.display !== "none" && b.getBoundingClientRect().width > 0,
      };
    });
    await page.locator("#delBtn").click();
    await page.waitForFunction(() => !!document.querySelector("#ovlD")?.open, null, { timeout: 30000 });
    const dialogOpen = await page.evaluate(() => {
      const d = document.querySelector("#ovlD");
      const active = document.activeElement;
      const keep = Array.from(d.querySelectorAll("button")).find((b) =>
        /keep it/i.test(b.textContent || ""),
      );
      return {
        open: d.open,
        modal: d.matches(":modal"),
        heading: (d.querySelector(".mdl h2")?.textContent || "").replace(/\s+/g, " ").trim(),
        keepVisible:
          !!keep && getComputedStyle(keep).display !== "none" && keep.getBoundingClientRect().width > 0,
        activeInDialog: !!active?.closest?.("#ovlD"),
      };
    });
    await page.locator("#ovlD button", { hasText: "Keep it" }).click();
    await page.waitForFunction(() => !document.querySelector("#ovlD")?.open, null, { timeout: 30000 });
    const afterClose = await page.evaluate(() => ({
      activeId: document.activeElement?.id ?? null,
    }));

    const editorPass =
      delBtn.found &&
      delBtn.visible &&
      dialogOpen.open === true &&
      dialogOpen.modal === true &&
      /delete this car/i.test(dialogOpen.heading) &&
      dialogOpen.keepVisible === true &&
      afterClose.activeId === "delBtn";

    r.widths[String(width)] = {
      topbar: routes,
      topbarPass: searchPass,
      editor: { delBtn, dialogOpen, afterClose, pass: editorPass },
      pass: searchPass && editorPass,
    };
  }

  r.pass = [375, 768, 1280].every((w) => r.widths[String(w)].pass);

  for (const width of [375, 768, 1280]) {
    const e = r.widths[String(width)];
    const t = e.topbar["/office"];
    console.log(
      `${width}: topbar=${t.display} buttons=${t.buttons} searchish=${t.searchish} controls=${t.controls.map((c) => c.tag + ":" + (c.text || c.ariaLabel || "?")).join(",")} · editor #delBtn=${e.editor.delBtn.text} modal=${e.editor.dialogOpen.modal} heading="${e.editor.dialogOpen.heading}" keep-it→focus=${e.editor.afterClose.activeId} → ${e.pass ? "PASS" : "FAIL"}`,
    );
  }
  console.log(`TASK GATE E widths: ${r.pass ? "PASS" : "FAIL"}`);
} finally {
  await page.setViewportSize({ width: 1440, height: 900 });
  r.chromium = `${before} -> ${chromiumCount()} (no launch by the drive)`;
  writeFileSync(`${RUNS}readings.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await detach(browser);
}
