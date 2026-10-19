// TASK-005 Task 31 — live witness: a page's own read failing keeps its shell and puts the retry
// where the person is; the boundary above the shell still catches a layout failure.
//
// The failures are injected by a temporary `throw` in the file named by the mode (the drive itself
// injects nothing; the caller adds and removes the line around the run). Attach-only.
//
// usage: node task31.mjs site-page|office-page|site-layout|office-layout
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const mode = process.argv[2];
const MODES = {
  "site-page": { url: "/inventory", shell: "site", inner: true, widths: [1440, 375] },
  "office-page": { url: "/office/inventory", shell: "office", inner: true, widths: [1440, 375] },
  "site-layout": { url: "/", shell: "site", inner: false, widths: [1440, 375] },
  "office-layout": { url: "/office/inventory", shell: "office", inner: false, widths: [1440, 375] },
};
const spec = MODES[mode];
if (!spec) {
  console.error("usage: node task31.mjs site-page|office-page|site-layout|office-layout");
  process.exit(2);
}

const RUNS = new URL("./runs/task31/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const TITLE = "We couldn’t load this";
const NOTE = "We tried a few times but the server didn’t answer. Nothing was lost — please try again.";
const BUTTON = "Try again";
const FALSE_COUNT = ["0 OF", "0 cars", "No cars match", "0 MATCHING", "0 matching"];

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);
const cdp = await page.context().newCDPSession(page);

const consoleErrors = [];
const httpErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 240));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 240)));
page.on("response", (res) => {
  if (res.status() >= 400) httpErrors.push({ url: res.url().replace(BASE, ""), status: res.status() });
});

const withTimeout = (p, ms, msg) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });

const shot = async (name) => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const session = attempt === 0 ? cdp : await page.context().newCDPSession(page);
    try {
      const { data } = await withTimeout(
        session.send("Page.captureScreenshot", { format: "jpeg", quality: 78 }),
        15000,
        "capture timed out",
      );
      writeFileSync(`${RUNS}${name}.jpeg`, Buffer.from(data, "base64"));
      return;
    } catch (e) {
      console.log(`shot: attempt ${attempt + 1} — ${e.message}`);
    }
  }
};

const read = () =>
  page.evaluate(
    ({ title, note, button, falseCount }) => {
      const state = document.querySelector(".ts-store-state");
      const header = document.querySelector("#site-header");
      const footer = document.querySelector("#site-footer");
      const shell = document.querySelector(".shell");
      const side = document.querySelector(".side");
      const topbar = document.querySelector(".topbar");
      const main = document.querySelector("main.main");
      const shown = (el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
      };
      const between = (a, b, s) => {
        if (!s) return false;
        const afterA = !a || (a.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        const beforeB = !b || (s.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        return afterA && beforeB;
      };
      const stateText = state?.innerText ?? "";
      const empties = [...document.querySelectorAll(".empty, .feed-empty, .nfx")].filter(shown);
      return {
        path: location.pathname + location.search,
        title: document.title,
        bodyText: document.body.innerText.slice(0, 2000),
        chrome: {
          siteHeader: !!header,
          siteHeaderVisible: shown(header),
          siteFooter: !!footer,
          siteFooterVisible: shown(footer),
          fab: !!document.querySelector("a.fab"),
          shell: !!shell,
          shellDisplay: shell ? getComputedStyle(shell).display : null,
          side: !!side,
          sideVisible: shown(side),
          topbar: !!topbar,
          topbarVisible: shown(topbar),
          main: !!main,
          signedIn: (shell?.textContent ?? "").includes("Signed in as"),
          stateInMain: !!main && !!state && main.contains(state),
          stateBetweenChrome: between(header, footer, state),
        },
        state: state
          ? {
              present: true,
              role: state.getAttribute("role"),
              visible: shown(state),
              title: state.querySelector(".ts-store-state__title")?.textContent ?? null,
              note: state.querySelector(".ts-store-state__note")?.textContent ?? null,
              button: state.querySelector(".ts-store-state__button")?.textContent ?? null,
              minHeight: getComputedStyle(state).minHeight,
              parentMain: state.parentElement?.matches("main.main") ?? false,
              insideMain: !!state.closest("main.main"),
            }
          : { present: false },
        falseCount: falseCount.filter((s) => stateText.includes(s) || document.body.innerText.includes(s)),
        visibleEmptyBlocks: empties.length,
      };
    },
    { title: TITLE, note: NOTE, button: BUTTON, falseCount: FALSE_COUNT },
  );

const r = { when: new Date().toISOString(), mode, ...spec, base: BASE, ua, readings: {} };
const problems = [];

function check(label, x) {
  if (!x.state.present) problems.push(`${label}: no retryable state`);
  else {
    if (x.state.role !== "alert") problems.push(`${label}: role is ${x.state.role}`);
    if (x.state.title !== TITLE) problems.push(`${label}: title is ${JSON.stringify(x.state.title)}`);
    if (x.state.note !== NOTE) problems.push(`${label}: note is ${JSON.stringify(x.state.note)}`);
    if (x.state.button !== BUTTON) problems.push(`${label}: button is ${JSON.stringify(x.state.button)}`);
    if (!x.state.visible) problems.push(`${label}: retryable state not visible`);
  }
  if (x.falseCount.length) problems.push(`${label}: false emptiness/count ${JSON.stringify(x.falseCount)}`);
  if (x.visibleEmptyBlocks) problems.push(`${label}: ${x.visibleEmptyBlocks} empty block(s) still visible`);

  if (spec.inner) {
    if (spec.shell === "site") {
      if (!x.chrome.siteHeader || !x.chrome.siteHeaderVisible)
        problems.push(`${label}: site header missing`);
      if (!x.chrome.siteFooter || !x.chrome.siteFooterVisible)
        problems.push(`${label}: site footer missing`);
      if (!x.chrome.stateBetweenChrome)
        problems.push(`${label}: retry is not between the site chrome`);
    } else {
      if (!x.chrome.shell) problems.push(`${label}: office shell missing`);
      if (x.chrome.shellDisplay !== "grid") problems.push(`${label}: shell css not loaded (${x.chrome.shellDisplay})`);
      if (!x.chrome.side && !x.chrome.topbar) problems.push(`${label}: no office navigation`);
      if (!x.chrome.main) problems.push(`${label}: no office main`);
      if (!x.chrome.signedIn) problems.push(`${label}: signed-in identity missing`);
      if (!x.chrome.stateInMain) problems.push(`${label}: retry is not in the office content area`);
      if (spec.shell === "office" && x.state.minHeight !== "0px")
        problems.push(`${label}: office retry still viewport-tall (${x.state.minHeight})`);
    }
  } else {
    if (x.chrome.siteHeader || x.chrome.siteFooter) problems.push(`${label}: site chrome survived the layout failure`);
    if (x.chrome.shell || x.chrome.side) problems.push(`${label}: office chrome survived the layout failure`);
  }
}

try {
  for (const width of spec.widths) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.waitForTimeout(600);
    const label = `${mode} ${width}`;
    const response = await page.goto(BASE + spec.url, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForSelector('.ts-store-state[role="alert"]', { timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(900);
    const x = await read();
    x.width = width;
    x.status = response?.status() ?? null;
    r.readings[String(width)] = x;
    check(label, x);

    // The retry control is live: resetting the boundary re-runs the failing segment, and the same
    // settled state returns. (The injected throw is still in place during this drive.)
    const retryVisible = await page
      .getByRole("button", { name: BUTTON })
      .isVisible()
      .catch(() => false);
    x.retryVisible = retryVisible;
    if (!retryVisible) problems.push(`${label}: “Try again” is not visible`);
    if (retryVisible) {
      await page.getByRole("button", { name: BUTTON }).click().catch(() => {});
      await page.waitForTimeout(1800);
      x.retryReturned = (await page.locator(".ts-store-state").count()) === 1;
      if (!x.retryReturned) problems.push(`${label}: retry did not return the boundary state`);
    }

    await shot(`${mode}-${width}`);
  }

  r.problems = problems;
  r.consoleErrorTexts = consoleErrors;
  r.httpErrors = httpErrors;
  r.verdict = { problems: problems.length, console: consoleErrors.length, http: httpErrors.length };
  r.pass = problems.length === 0;

  console.log(`${mode.toUpperCase()}: ${r.pass ? "PASS" : "FAIL"} · ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 25)) console.log(`  FAIL ${p}`);
  for (const [width, x] of Object.entries(r.readings)) {
    console.log(
      `  ${width}: status=${x.status} chrome=${JSON.stringify({ h: x.chrome.siteHeader, f: x.chrome.siteFooter, shell: x.chrome.shell, side: x.chrome.side, topbar: x.chrome.topbar, main: x.chrome.main })} state=${JSON.stringify({ role: x.state.role, min: x.state.minHeight, inMain: x.state.insideMain, between: x.chrome.stateBetweenChrome })} retry=${x.retryVisible}/${x.retryReturned}`,
    );
  }
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}${mode}.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await detach(browser);
}
