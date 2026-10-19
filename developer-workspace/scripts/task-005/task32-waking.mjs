// TASK-005 Task 32 — the waking state rendered live, wording verbatim, never a count or an empty
// block. The read-failure half was forced live in Task 31 (`runs/task31/site-page.json` /
// `office-page.json`); this drive adds the waiting half by making the page slow with a temporary
// delay (injected and removed by the caller). Attach-only.
//
// usage: node task32-waking.mjs site|office
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const which = process.argv[2];
const SPEC = {
  site: { url: "/inventory", shell: "site", widths: [1440, 375] },
  office: { url: "/office/inventory", shell: "office", widths: [1440, 375] },
};
const spec = SPEC[which];
if (!spec) {
  console.error("usage: node task32-waking.mjs site|office");
  process.exit(2);
}

const RUNS = new URL("./runs/task32/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const TITLE = "Just a moment";
const NOTE = "Setting things up — this can take a few seconds after a quiet spell.";
const FALSE_COUNT = ["0 OF", "0 cars", "No cars match", "0 MATCHING", "0 matching"];

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);

const consoleErrors = [];
const httpErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 240));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 240)));
page.on("response", (res) => {
  if (res.status() >= 400) httpErrors.push({ url: res.url().replace(BASE, ""), status: res.status() });
});

const read = () =>
  page.evaluate(
    ({ title, note, falseCount }) => {
      const state = document.querySelector(".ts-store-state");
      const waking = document.querySelector(".ts-store-state--waking");
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
      const text = state?.innerText ?? "";
      const empties = [...document.querySelectorAll(".empty, .feed-empty")].filter(shown);
      return {
        path: location.pathname + location.search,
        title: document.title,
        chrome: {
          siteHeader: !!header,
          siteHeaderVisible: shown(header),
          siteFooter: !!footer,
          siteFooterVisible: shown(footer),
          shell: !!shell,
          shellDisplay: shell ? getComputedStyle(shell).display : null,
          side: !!side,
          sideVisible: shown(side),
          topbar: !!topbar,
          topbarVisible: shown(topbar),
          main: !!main,
          stateInMain: !!main && !!state && main.contains(state),
          stateBetweenChrome: between(header, footer, state),
        },
        state: state
          ? {
              present: true,
              waking: !!waking,
              role: state.getAttribute("role"),
              ariaLive: state.getAttribute("aria-live"),
              visible: shown(state),
              title: state.querySelector(".ts-store-state__title")?.textContent ?? null,
              note: state.querySelector(".ts-store-state__note")?.textContent ?? null,
              spinner: !!state.querySelector(".ts-store-state__spinner"),
              minHeight: getComputedStyle(state).minHeight,
              parentMain: state.parentElement?.matches("main.main") ?? false,
            }
          : { present: false },
        falseCount: falseCount.filter((s) => text.includes(s)),
        visibleEmptyBlocks: empties.length,
        heading: document.querySelector("h1, h2")?.textContent.replace(/\s+/g, " ").trim() ?? null,
        bodyText: document.body.innerText.slice(0, 1600),
      };
    },
    { title: TITLE, note: NOTE, falseCount: FALSE_COUNT },
  );

const r = { when: new Date().toISOString(), which, ...spec, base: BASE, ua, readings: {} };
const problems = [];

try {
  for (const width of spec.widths) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.waitForTimeout(400);
    const label = `${which}-waking ${width}`;
    const response = await page.goto(BASE + spec.url, { waitUntil: "commit", timeout: 180000 });
    const woke = await page
      .waitForSelector(".ts-store-state--waking", { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(700); // the 450 ms fade-in
    const x = await read();
    x.width = width;
    x.status = response?.status() ?? null;
    x.woke = woke;
    if (!woke) problems.push(`${label}: the waking state never appeared`);
    if (!x.state.present || !x.state.waking) problems.push(`${label}: not the waking state`);
    else {
      if (x.state.role !== "status") problems.push(`${label}: role is ${x.state.role}`);
      if (x.state.ariaLive !== "polite") problems.push(`${label}: aria-live is ${x.state.ariaLive}`);
      if (x.state.title !== TITLE) problems.push(`${label}: title is ${JSON.stringify(x.state.title)}`);
      if (x.state.note !== NOTE) problems.push(`${label}: note is ${JSON.stringify(x.state.note)}`);
      if (!x.state.spinner) problems.push(`${label}: no spinner`);
      if (!x.state.visible) problems.push(`${label}: waking state not visible`);
      if (spec.shell === "site") {
        if (!x.chrome.siteHeader || !x.chrome.siteHeaderVisible)
          problems.push(`${label}: site header missing`);
        if (!x.chrome.siteFooter || !x.chrome.siteFooterVisible)
          problems.push(`${label}: site footer missing`);
        if (!x.chrome.stateBetweenChrome) problems.push(`${label}: waking state not between the chrome`);
      } else {
        if (!x.chrome.shell) problems.push(`${label}: office shell missing`);
        if (x.chrome.shellDisplay !== "grid")
          problems.push(`${label}: shell css not loaded (${x.chrome.shellDisplay})`);
        if (!x.chrome.topbar && !x.chrome.side) problems.push(`${label}: no office navigation`);
        if (!x.chrome.main) problems.push(`${label}: no office main`);
        if (!x.chrome.stateInMain) problems.push(`${label}: waking state not in the content area`);
        if (x.state.minHeight !== `${width === 375 ? 812 : 900}px`)
          problems.push(`${label}: waking state height changed (${x.state.minHeight})`);
      }
    }
    if (x.falseCount.length) problems.push(`${label}: false count ${JSON.stringify(x.falseCount)}`);
    if (x.visibleEmptyBlocks) problems.push(`${label}: ${x.visibleEmptyBlocks} empty block(s) visible`);

    // A frame, if the animated state lets the browser settle. Playwright disables animations for
    // this call; the reading is the evidence either way.
    try {
      await page.screenshot({
        path: `${RUNS}${which}-waking-${width}.jpeg`,
        type: "jpeg",
        quality: 78,
        animations: "disabled",
        timeout: 20000,
      });
      x.shot = true;
    } catch {
      x.shot = false;
    }

    // The wait ends: the real page replaces it — this is a slow read, not an error.
    const settled = await page
      .waitForFunction(() => !document.querySelector(".ts-store-state--waking"), { timeout: 30000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(900);
    const after = await read();
    x.settled = settled;
    x.settledHasWaking = !!after.state.waking;
    x.settledState = after.state.present;
    x.settledHeading = after.heading;
    x.settledText = after.bodyText.slice(0, 240);
    if (!settled) problems.push(`${label}: the waking state never cleared`);
    if (after.state.present) problems.push(`${label}: a store state remained after the page loaded`);
    if (!after.heading) problems.push(`${label}: no page heading after the wait`);

    r.readings[String(width)] = x;
  }

  r.problems = problems;
  r.consoleErrorTexts = consoleErrors;
  r.httpErrors = httpErrors;
  r.verdict = { problems: problems.length, console: consoleErrors.length, http: httpErrors.length };
  r.pass = problems.length === 0;

  console.log(`${which.toUpperCase()}-WAKING: ${r.pass ? "PASS" : "FAIL"} · ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 25)) console.log(`  FAIL ${p}`);
  for (const [width, x] of Object.entries(r.readings)) {
    console.log(
      `  ${width}: woke=${x.woke} status=${x.status} chrome=${JSON.stringify({ h: x.chrome.siteHeader, f: x.chrome.siteFooter, shell: x.chrome.shell, main: x.chrome.main })} state=${JSON.stringify({ role: x.state.role, title: x.state.title, note: x.state.note, min: x.state.minHeight, inMain: x.chrome.stateInMain })} shot=${x.shot} settled=${x.settled} heading=${JSON.stringify(x.settledHeading)}`,
    );
  }
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}${which}.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await detach(browser);
}
