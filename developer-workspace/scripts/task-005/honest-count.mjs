// TASK-005 Task 24 drive — the honest count, and clearing lives in the panel.
//
// Read-only in the store (client-side filters only). Over-filters the showroom to zero at 1440
// and at 375, reads the count, every clear control and its home, then exercises the panel's
// clear; reads the office zero state at both widths (its empty block renders once per view
// container — the table's and the cards' — so the readings list every copy that is visible).
// Run with OUT=… to name the readings file (default runs/task24/readings.json).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const OUT =
  process.env.OUT ?? new URL("./runs/task24/readings.json", import.meta.url).pathname;
mkdirSync(dirname(OUT), { recursive: true });

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);

const hydrated = (sel) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
      );
    },
    sel,
    { timeout: 180000 },
  );

const readings = () =>
  page.evaluate(() => {
    const where = (el) =>
      el.closest(".empty")
        ? "empty-block"
        : el.closest(".sb")
          ? "filter-panel"
          : el.closest(".empty2")
            ? "office-empty-block"
            : "other";
    const vis = (el) => el.offsetParent !== null || el.getClientRects().length > 0;
    return {
      ttl: document.getElementById("ttl")?.innerText ?? null,
      cnt: document.getElementById("cnt")?.innerText ?? null,
      empty: document.querySelector(".empty")?.innerText ?? null,
      emptyHasClear: /clear/i.test(document.querySelector(".empty")?.textContent ?? ""),
      clears: Array.from(document.querySelectorAll("button, a"))
        .filter((el) => /clear/i.test(el.textContent || ""))
        .map((el) => ({
          tag: el.tagName,
          id: el.id,
          text: (el.textContent || "").replace(/\s+/g, " ").trim(),
          where: where(el),
          visible: vis(el),
        })),
    };
  });

// the office zero state: every empty block and every clear control, with what is actually visible
const officeRead = () =>
  page.evaluate(() => {
    const vis = (el) => el.offsetParent !== null || el.getClientRects().length > 0;
    return {
      count: document.getElementById("count")?.innerText ?? null,
      blocks: Array.from(document.querySelectorAll(".empty2")).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          visible: vis(el),
          y: Math.round(rect.y),
          h: Math.round(rect.height),
          text: (el.innerText || "").replace(/\n+/g, " | ").trim(),
        };
      }),
      clears: Array.from(document.querySelectorAll("button, a"))
        .filter((el) => /clear/i.test(el.textContent || ""))
        .map((el) => ({
          id: el.id,
          text: (el.textContent || "").replace(/\s+/g, " ").trim(),
          where: el.closest(".empty2") ? "empty-block" : "other",
          visible: vis(el),
        })),
    };
  });

const r = { when: new Date().toISOString(), base: BASE, ui: !/Headless/i.test(ua) };

try {
  // ---- 1. showroom at 1440, over-filtered to zero through the price field ------------------
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#pmin");
  await page.fill("#pmin", "999999999");
  await page.waitForFunction(
    () => (document.getElementById("ttl")?.innerText || "").includes("0 "),
    null,
    { timeout: 60000 },
  );
  r.site1440 = await readings();

  // the way out: the panel's clear control, exercised
  await page.click("#clr");
  await page.waitForFunction(
    () => !(document.getElementById("ttl")?.innerText || "").includes("0 "),
    null,
    { timeout: 60000 },
  );
  r.site1440AfterClear = await readings();

  // ---- 2. showroom at 375, the same zero state (filter set through the URL) -----------------
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE + "/inventory?min=999999999", {
    waitUntil: "domcontentloaded",
    timeout: 180000,
  });
  await hydrated("#pmin");
  r.site375Collapsed = await readings();
  await page.click("#sbt");
  await page.waitForTimeout(1500);
  r.site375PanelOpen = { ...(await readings()), sbtPressed: await page.evaluate(() => document.getElementById("sbt")?.getAttribute("aria-expanded")) };
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- 3. office zero state, both widths (continuity with Task 22's byte-identical strings) --
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#q");
  await page.fill("#q", "zzzzz");
  await page.waitForSelector(".empty2", { timeout: 60000 });
  await page.waitForTimeout(1500);
  r.office1440 = await officeRead();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1500);
  r.office375 = await officeRead();

  console.log(JSON.stringify(r, null, 2));
  console.log(`\nTASK 24 drive done → ${OUT}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch by the drive)`;
  writeFileSync(OUT, JSON.stringify(r, null, 2) + "\n");
  await detach(browser);
}
