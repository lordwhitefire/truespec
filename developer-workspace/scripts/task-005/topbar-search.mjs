// TASK-005 plan Task 18 — the dead Search control goes.
//
// Live, phone width (375x812), signed in. The office top bar is read on the routes that carry it:
// every control in it is a real link with a destination (no button that does nothing, no search
// placeholder); the top bar is not a place search lives. Search is still where it filters: the
// keyword fields on Inventory and Activity are driven and read.
//
// Attach-only; no store writes, nothing sorted or deleted; the viewport is restored.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount } from "./_lib.mjs";

const RUNS = new URL("./runs/task18/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(120000);

const r = { when: new Date().toISOString(), base: BASE, ua, viewport: "375x812", routes: {}, filters: {} };

const hydrated = (sel, timeout = 120000) =>
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
    const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (!response || response.status() < 500) break;
    if (attempt === 2) throw new Error(`${url} answered ${response.status()}`);
    await page.waitForTimeout(5000);
  }
  await page.waitForSelector(sel, { state: "attached", timeout: 120000 });
  await hydrated(sel);
}

const readTopbar = () =>
  page.evaluate(() => {
    const t = document.querySelector(".topbar");
    if (!t) return { found: false };
    const cs = getComputedStyle(t);
    const controls = Array.from(t.querySelectorAll("a,button")).map((el) => ({
      tag: el.tagName,
      href: el.getAttribute("href"),
      label: el.getAttribute("aria-label") || (el.textContent || "").replace(/\s+/g, " ").trim(),
      inert: el.tagName === "BUTTON" && !el.getAttribute("href") && !el.onclick,
      searchish: /search/i.test(
        `${el.getAttribute("aria-label") || ""} ${el.className || ""} ${
          el.querySelector("i")?.className || ""
        }`,
      ),
    }));
    return {
      found: true,
      display: cs.display,
      controls,
      allReal: controls.length > 0 && controls.every((c) => c.tag === "A" && !!c.href),
      anySearch: controls.some((c) => c.searchish),
    };
  });

try {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const [name, url] of [
    ["dashboard", "/office"],
    ["inventory", "/office/inventory"],
    ["activity", "/office/activity"],
    ["settings", "/office/settings"],
  ]) {
    await goto(url, ".topbar");
    r.routes[name] = { url, topbar: await readTopbar() };
  }

  // Search still lives on Inventory — the keyword field filters its own list.
  await goto("/office/inventory", "#q");
  const invBefore = await page.evaluate(() => ({
    count: document.getElementById("count")?.innerText.replace(/\s+/g, " ").trim() ?? null,
    cards: document.querySelectorAll(".cards .ccard").length,
  }));
  await page.fill("#q", "TS-1001");
  await page.waitForFunction(() => document.querySelectorAll(".cards .ccard").length === 1, null, {
    timeout: 30000,
  });
  const invAfter = await page.evaluate(() => ({
    count: document.getElementById("count")?.innerText.replace(/\s+/g, " ").trim() ?? null,
    cards: document.querySelectorAll(".cards .ccard").length,
    text: document.querySelector(".cards .ccard")?.innerText.replace(/\s+/g, " ").trim().slice(0, 80) ?? null,
    tableHidden: getComputedStyle(document.querySelector(".panel.tbl")).display === "none",
  }));
  await page.fill("#q", "");
  await page.waitForFunction((n) => document.querySelectorAll(".cards .ccard").length === n, invBefore.cards, {
    timeout: 30000,
  });
  r.filters.inventory = {
    before: invBefore,
    after: invAfter,
    pass: invAfter.cards === 1 && /TS-1001/.test(invAfter.text ?? "") && invAfter.tableHidden,
  };

  // Search still lives on Activity — the keyword field filters the log.
  await goto("/office/activity", "#q");
  const actBefore = await page.evaluate(() => ({
    count: document.getElementById("count")?.innerText.replace(/\s+/g, " ").trim() ?? null,
    rows: document.querySelectorAll("#log > *").length,
  }));
  await page.fill("#q", "removed");
  await page.waitForFunction(
    (n) => document.querySelectorAll("#log > *").length !== n,
    actBefore.rows,
    { timeout: 30000 },
  );
  const actAfter = await page.evaluate(() => ({
    count: document.getElementById("count")?.innerText.replace(/\s+/g, " ").trim() ?? null,
    rows: document.querySelectorAll("#log > *").length,
  }));
  const actMatch = (actAfter.count ?? "").match(/(\d+) of (\d+)/);
  await page.fill("#q", "");
  await page.waitForFunction(
    (n) => document.querySelectorAll("#log > *").length === n,
    actBefore.rows,
    { timeout: 30000 },
  );
  r.filters.activity = {
    before: actBefore,
    after: actAfter,
    pass: !!actMatch && Number(actMatch[1]) > 0 && Number(actMatch[1]) < Number(actMatch[2]),
  };

  r.pass =
    Object.values(r.routes).every((x) => x.topbar.allReal && !x.topbar.anySearch) &&
    r.filters.inventory.pass &&
    r.filters.activity.pass;

  for (const [name, x] of Object.entries(r.routes)) {
    console.log(
      `${name}: topbar ${x.topbar.display} · controls [${x.topbar.controls
        .map((c) => `${c.tag}${c.href ? `→${c.href}` : ""} "${c.label}"`)
        .join(", ")}] · allReal=${x.topbar.allReal} anySearch=${x.topbar.anySearch}`,
    );
  }
  console.log(
    `inventory filter: ${r.filters.inventory.before.count} → fill TS-1001 → ${r.filters.inventory.after.cards} card(s) "${r.filters.inventory.after.text}" → ${r.filters.inventory.pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `activity filter: ${r.filters.activity.before.count} → fill removed → ${r.filters.activity.after.count} → ${r.filters.activity.pass ? "PASS" : "FAIL"}`,
  );
  console.log(`TASK 18: ${r.pass ? "PASS" : "FAIL"}`);
} finally {
  await page.setViewportSize({ width: 1440, height: 900 });
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}readings.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await detach(browser);
}
