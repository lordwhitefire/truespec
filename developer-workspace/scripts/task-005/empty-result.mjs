// TASK-005 Task 22/23 drive — the showroom's empty result and the live region.
//
// Read-only. Signed in not required for the site leg, but the office leg rides the same Chrome.
// Captures, in order:
//   · the site inventory fresh (region at rest: display, geometry, and its node in the
//     accessibility tree — Task 23's "exists before the result changes");
//   · the site inventory driven to zero results (the empty block, the count, the `#speak` line,
//     how many times the sourcing promise is printed, and where every clear control sits);
//   · the office inventory driven to a search that matches nothing (its count, empty block and
//     clear control — the strings Task 22 must leave byte-identical).
// Run with OUT=… to name the readings file (default runs/task22/readings.json).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const OUT =
  process.env.OUT ?? new URL("./runs/task22/readings.json", import.meta.url).pathname;
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

const r = { when: new Date().toISOString(), base: BASE, ui: !/Headless/i.test(ua) };

try {
  // ---- 1. site inventory, fresh ----------------------------------------------------------
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#pmin");
  r.fresh = await page.evaluate(() => {
    const sp = document.getElementById("speak");
    return {
      speak: sp
        ? { display: getComputedStyle(sp).display, height: sp.offsetHeight, text: sp.innerText }
        : null,
      ttlRole: document.getElementById("ttl")?.getAttribute("role"),
      ttl: document.getElementById("ttl")?.innerText,
    };
  });

  // the region's node in the accessibility tree, before anything changes
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("Accessibility.enable");
  const { root } = await cdp.send("DOM.getDocument", {});
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#speak" });
  if (nodeId) {
    const res = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
    r.fresh.ax = (res.nodes || []).map((n) => ({
      role: n.role?.value ?? null,
      ignored: !!n.ignored,
      name: n.name?.value ?? null,
    }));
  } else {
    r.fresh.ax = "region not found in the DOM";
  }

  // ---- 2. site inventory, driven to zero results -----------------------------------------
  await page.fill("#pmin", "999999999");
  await page.waitForFunction(
    () => (document.getElementById("speak")?.innerText || "").includes("match"),
    null,
    { timeout: 60000 },
  );
  r.zero = await page.evaluate(() => {
    const body = document.body.innerText;
    const occurrences = (re) => (body.match(re) || []).length;
    const where = (el) =>
      el.closest(".empty")
        ? "empty-block"
        : el.closest(".sb")
          ? "filter-panel"
          : el.closest("dialog")
            ? "dialog"
            : "other";
    const clears = Array.from(document.querySelectorAll("button, a"))
      .filter((b) => /clear/i.test(b.textContent || ""))
      .map((b) => ({
        tag: b.tagName,
        id: b.id,
        text: (b.textContent || "").replace(/\s+/g, " ").trim(),
        where: where(b),
      }));
    const sp = document.getElementById("speak");
    return {
      ttl: document.getElementById("ttl")?.innerText,
      cnt: document.getElementById("cnt")?.innerText,
      speak: {
        display: getComputedStyle(sp).display,
        height: sp.offsetHeight,
        text: sp.innerText,
        html: sp.innerHTML,
        hasLink: !!sp.querySelector("a"),
      },
      empty: document.querySelector(".empty")?.innerText,
      emptyCount: document.querySelectorAll(".empty").length,
      promiseCount: occurrences(/source it in the USA/g),
      promiseInSpeak: /source it in the USA/.test(sp.innerText),
      promiseInEmpty: /source it in the USA/.test(
        document.querySelector(".empty")?.innerText || "",
      ),
      tellCount: occurrences(/tell me what you're after/gi),
      clears,
    };
  });

  // ---- 3. office inventory, search matching nothing --------------------------------------
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#q");
  await page.fill("#q", "zzzzz");
  await page.waitForSelector(".empty2", { timeout: 60000 });
  r.office = await page.evaluate(() => {
    const where = (el) => (el.closest(".empty2") ? "empty-block" : "other");
    return {
      count: document.getElementById("count")?.innerText,
      empty: document.querySelector(".empty2")?.innerText,
      clears: Array.from(document.querySelectorAll("button, a"))
        .filter((b) => /clear/i.test(b.textContent || ""))
        .map((b) => ({
          tag: b.tagName,
          id: b.id,
          text: (b.textContent || "").replace(/\s+/g, " ").trim(),
          where: where(b),
        })),
    };
  });

  console.log(JSON.stringify(r, null, 2));
  console.log(`\nTASK 22/23 drive done → ${OUT}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch by the drive)`;
  writeFileSync(OUT, JSON.stringify(r, null, 2) + "\n");
  await detach(browser);
}
