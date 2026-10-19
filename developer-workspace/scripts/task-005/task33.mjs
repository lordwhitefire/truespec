// TASK-005 Task 33 — a slow soft navigation shows the approved waiting sign ("Loading…"); a fast
// one does not flash it. The slow case is the R2.4 hold reproduced in-tab: every RSC request is
// held 6 s, so the target's loading.tsx cannot arrive until the hold ends. The sign is the clicked
// nav Link's `useLinkStatus` pending state (NavLabel, 400 ms show delay); the URL and the old
// screen stay put while it is up, and the existing loading boundary still covers the held payload's
// arrival. Attach-only. No source is changed for the slowdown; the route is removed on exit.
//
// usage: node task33.mjs          (1440 and 375, slow then fast)
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task33/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const SLOW = {
  1440: { link: 'nav.sn a[href="/office/inventory"]', label: "Inventory" },
  375: { link: 'nav.bnav a[href="/office/inventory"]', label: "Stock" },
};
const FAST = {
  1440: { link: 'nav.sn a[href="/office"]', label: "Dashboard" },
  375: { link: 'nav.bnav a[href="/office"]', label: "Home" },
};
const HEIGHT = { 1440: 900, 375: 812 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);

const consoleErrors = [];
const httpErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 260));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 260)));
page.on("response", (res) => {
  if (res.status() >= 400) httpErrors.push({ url: res.url().replace(BASE, ""), status: res.status() });
});

const read = (sel) =>
  page.evaluate((sel) => {
    const a = document.querySelector(sel);
    const w = a?.querySelector(".nav-wait");
    const s = document.querySelector(".ts-store-state");
    const main = document.querySelector("main.main");
    const shown = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (
        cs.display !== "none" &&
        cs.visibility !== "hidden" &&
        Number(cs.opacity) > 0 &&
        r.width > 0 &&
        r.height > 0
      );
    };
    const nav = [...document.querySelectorAll("nav.sn, nav.bnav")].find(shown) ?? null;
    return {
      url: location.pathname + location.search,
      heading:
        document.querySelector("main.main h1")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      scrollY,
      linkVisible: shown(a),
      linkLabel: a?.getAttribute("aria-label") ?? null,
      navVisible: shown(nav),
      sign: w
        ? {
            text: w.innerText.replace(/\s+/g, " ").trim(),
            role: w.getAttribute("role"),
            visible: shown(w),
            spin: !!w.querySelector(".nav-wait__spin"),
          }
        : null,
      state: s
        ? {
            role: s.getAttribute("role"),
            title: s.querySelector(".ts-store-state__title")?.textContent ?? null,
            note: s.querySelector(".ts-store-state__note")?.textContent ?? null,
            visible: shown(s),
            inMain: !!(main && main.contains(s)),
          }
        : null,
    };
  }, sel);

// The Next dev indicator is a `nextjs-portal` fixed at the bottom-left; at 375 it sits over the
// bottom nav's first cell and intercepts pointer events. It does not exist in the product; remove
// it for the interaction (console errors are still captured).
const click = async (sel) => {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((el) => el.remove()));
  await page.click(sel);
};

const sampleAt = async (sel, samples, at, t0) => {
  await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
  const x = { at: Date.now() - t0, ...(await read(sel)) };
  samples.push(x);
  return x;
};

const r = { when: new Date().toISOString(), base: BASE, ua, readings: {} };
const problems = [];
let held = 0;

try {
  for (const width of [1440, 375]) {
    const slow = SLOW[width];
    const fast = FAST[width];
    const box = `${width}`;
    await page.setViewportSize({ width, height: HEIGHT[width] });

    // Install the hold before the dashboard's prefetches leave; every RSC request waits 6 s.
    await page.route("**/*", async (route, req) => {
      if (req.url().includes("_rsc=") || req.headers()["rsc"] === "1") {
        held++;
        await sleep(6000);
        return route.continue();
      }
      return route.continue();
    });
    held = 0;

    await page.goto(BASE + "/office", { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForSelector("main.main h1", { timeout: 60000 });
    await page.waitForTimeout(3000); // Link instances must be mounted for useLinkStatus to be set
    const before = await read(slow.link);

    // ---- slow soft navigation: /office -> /office/inventory under a 6 s RSC hold
    await click(slow.link);
    const t0 = Date.now();
    const slowSamples = [];
    for (const at of [100, 300, 500, 900, 1500, 3000, 5000, 7000, 8000, 9000]) {
      await sampleAt(slow.link, slowSamples, at, t0);
    }
    const pageAt = await page
      .waitForFunction(
        () => {
          const h = document.querySelector("main.main h1")?.textContent?.trim();
          return location.pathname === "/office/inventory" && h === "Inventory";
        },
        { timeout: 60000 },
      )
      .then(() => Date.now() - t0)
      .catch(() => null);
    const after = await read(slow.link);
    const heldSlow = held;

    // ---- fast soft navigation: inventory -> dashboard with the hold removed
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await click(fast.link);
    const ft0 = Date.now();
    const fastSamples = [];
    for (const at of [100, 300, 600, 1000]) await sampleAt(fast.link, fastSamples, at, ft0);
    const fastPageAt = await page
      .waitForFunction(
        () => {
          const h = document.querySelector("main.main h1")?.textContent?.trim();
          return location.pathname === "/office" && h === "Dashboard";
        },
        { timeout: 30000 },
      )
      .then(() => Date.now() - ft0)
      .catch(() => null);
    const fastAfter = await read(fast.link);

    const signFirst = slowSamples.find((x) => x.sign?.visible);
    const oldAtSign = slowSamples.filter(
      (x) => x.sign?.visible && x.url === "/office" && x.heading === "Dashboard",
    );
    const signVisible = slowSamples.filter((x) => x.sign?.visible);
    const goodSign = slowSamples.some(
      (x) => x.sign?.visible && x.sign.text === "Loading…" && x.sign.role === "status" && x.sign.spin,
    );
    const fullState = slowSamples.find((x) => x.state?.visible);

    if (!signFirst || signFirst.at > 1000)
      problems.push(`${box} slow: no visible sign within 1 s (first ${signFirst?.at ?? "-"})`);
    if (!goodSign) problems.push(`${box} slow: sign is not "Loading…" role=status with a spinner`);
    if (!oldAtSign.length)
      problems.push(`${box} slow: the sign never appeared over the unchanged page`);
    if (signVisible.length < 3)
      problems.push(`${box} slow: the sign did not stay up through the hold (${signVisible.length})`);
    if (!before.linkLabel) problems.push(`${box} slow: the link has no destination name`);
    if (before.linkLabel !== slow.label)
      problems.push(`${box} slow: link label is ${JSON.stringify(before.linkLabel)}`);
    if (!before.navVisible) problems.push(`${box} slow: the nav is not visible`);
    if (pageAt == null) problems.push(`${box} slow: the inventory page never arrived`);
    if (after.sign?.visible) problems.push(`${box} slow: the sign remained after the page`);
    if (slowSamples.some((x) => x.sign?.visible && x.sign.text !== "Loading…"))
      problems.push(`${box} slow: a sign sample has the wrong words`);

    if (fastSamples.some((x) => x.sign?.visible)) problems.push(`${box} fast: the sign flashed`);
    if (fastSamples.some((x) => x.state?.visible)) problems.push(`${box} fast: a waiting state showed`);
    if (fastPageAt == null) problems.push(`${box} fast: the dashboard never arrived`);
    if (fastAfter.sign?.visible) problems.push(`${box} fast: the sign remained after the page`);

    r.readings[box] = {
      slow: {
        before,
        held: heldSlow,
        samples: slowSamples,
        pageAt,
        after,
        fullState: fullState ?? null,
      },
      fast: { samples: fastSamples, pageAt: fastPageAt, after: fastAfter },
    };
  }

  r.problems = problems;
  r.consoleErrorTexts = consoleErrors;
  r.httpErrors = httpErrors;
  r.verdict = { problems: problems.length, console: consoleErrors.length, http: httpErrors.length };
  r.pass = problems.length === 0;

  console.log(`TASK 33: ${r.pass ? "PASS" : "FAIL"} · ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 25)) console.log(`  FAIL ${p}`);
  for (const [width, x] of Object.entries(r.readings)) {
    const s = x.slow.samples;
    const sign = s.find((y) => y.sign?.visible);
    const full = s.find((y) => y.state?.visible);
    console.log(
      `  ${width} slow: held=${x.slow.held} signAt=${sign ? sign.at : "-"} text=${JSON.stringify(sign?.sign?.text ?? null)} old=${JSON.stringify({ url: sign?.url, heading: sign?.heading })} signs=${s.filter((y) => y.sign?.visible).length} fullStateAt=${full ? full.at : "-"} title=${JSON.stringify(full?.state?.title ?? null)} pageAt=${x.slow.pageAt} after=${JSON.stringify({ url: x.slow.after.url, heading: x.slow.after.heading })}`,
    );
    console.log(
      `  ${width} fast: signSeen=${x.fast.samples.some((y) => y.sign?.visible)} stateSeen=${x.fast.samples.some((y) => y.state?.visible)} pageAt=${x.fast.pageAt} after=${JSON.stringify({ url: x.fast.after.url, heading: x.fast.after.heading })}`,
    );
  }
  console.log(`  console errors: ${consoleErrors.length}; http errors: ${httpErrors.length}`);
  for (const e of consoleErrors.slice(0, 5)) console.log(`    console: ${e}`);
  for (const e of httpErrors.slice(0, 5)) console.log(`    http: ${e.status} ${e.url}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}task33.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await detach(browser);
}
