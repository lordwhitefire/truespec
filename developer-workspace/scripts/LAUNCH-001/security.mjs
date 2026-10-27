// LAUNCH-001 Task 16 — Security headers and CSP runtime checks (D6, D7).
//
// D6: Documented headers present on public responses.
// D7: Load home, inventory, car page with CSP active; console must have no CSP violation;
//     Clerk sign-in loads; fonts and icons load.
//
// Report-only exercise phase: captures console CSP violations; after the exercise is clean,
// flip next.config.mjs to enforcing and re-run. Attach-only browser; no new tab, no Chrome
// launch.
import {
  attach,
  findTab,
  detach,
  BASE,
  REF,
  chromiumCount,
  tabUrls,
} from "./_lib.mjs";

const ORIGIN = new URL(BASE).origin;
const checks = {};
const failures = [];
function check(name, ok, detail) {
  checks[name] = Boolean(ok);
  if (!ok) failures.push(`${name}: ${detail}`);
}

const chromeBefore = chromiumCount();
const tabsBefore = [];
let tabsAfter = [];
let browser;
let page;

async function gotoWithTimeout(p, ms = 15000) {
  return page
    .goto(BASE + p, { waitUntil: "domcontentloaded", timeout: ms })
    .then((r) => ({ ok: true, status: r.status(), headers: r.headers() }))
    .catch((e) => ({ ok: false, error: String(e) }));
}

try {
  browser = await attach();
  tabsBefore.push(...tabUrls(browser));
  page = findTab(browser, ORIGIN);

  const consoleMsgs = [];
  const failedResources = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (/content security policy|csp|refused to load/i.test(text)) {
      consoleMsgs.push({ type: msg.type(), text });
    }
  });
  page.on("pageerror", (err) => consoleMsgs.push({ type: "pageerror", text: String(err) }));
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (/_next\/static\/media\//.test(u) || /fontawesome/.test(u) || /clerk/.test(u)) {
      failedResources.push({ url: u, failure: req.failure()?.errorText });
    }
  });

  const pages = ["/", "/inventory", "/car/TS-1001", "/privacy", "/terms"];

  for (const p of pages) {
    const result = await gotoWithTimeout(p);
    if (!result.ok) {
      check(`d6-reachable-${p.replace(/\//g, "")}`, false, result.error);
      continue;
    }
    const { status, headers } = result;
    const csp =
      headers["content-security-policy"] ||
      headers["content-security-policy-report-only"] ||
      "";
    const hasHeaders =
      headers["x-content-type-options"] === "nosniff" &&
      headers["x-frame-options"] === "DENY" &&
      headers["referrer-policy"] &&
      headers["permissions-policy"] &&
      headers["strict-transport-security"];
    check(`d6-headers-${p.replace(/\//g, "")}`, hasHeaders, JSON.stringify(headers));
    check(`d6-csp-present-${p.replace(/\//g, "")}`, csp.length > 0, `csp: ${csp}`);
    check(`d6-status-${p.replace(/\//g, "")}`, status === 200, `status: ${status}`);
  }

  // D7: office sign-in anonymously (expect redirect to Clerk sign-in; no office data renders)
  const officeResult = await gotoWithTimeout("/office/sign-in", 20000);
  check("d7-office-signin-reachable", officeResult.ok, JSON.stringify(officeResult));
  if (officeResult.ok) {
    check(
      "d7-office-signin-status",
      [200, 307, 302].includes(officeResult.status),
      `status: ${officeResult.status}`,
    );
  }

  // Give pages a moment for CSP-violating resources to attempt load.
  await page.waitForTimeout(1500);
  const cspViolations = consoleMsgs.filter((m) =>
    /content security policy|csp|refused to load/i.test(m.text)
  );
  check("d7-no-csp-violations", cspViolations.length === 0, JSON.stringify(cspViolations));

  tabsAfter = tabUrls(browser);
  const buildTabStillOpen = tabsAfter.some((url) => url.startsWith(ORIGIN));
  const referenceTabStillOpen = tabsAfter.some((url) => url.startsWith(REF));
  check(
    "tabs-not-opened",
    tabsAfter.length <= tabsBefore.length,
    JSON.stringify({ tabsBefore, tabsAfter }),
  );
  check(
    "build-and-reference-tabs-still-open",
    buildTabStillOpen && referenceTabStillOpen,
    JSON.stringify({ buildTabStillOpen, referenceTabStillOpen, tabsAfter }),
  );
  check("no-chrome-launched", chromiumCount() === chromeBefore, `${chromeBefore} -> ${chromiumCount()}`);

  const summary = {
    verdict: checks,
    failures,
    consoleMsgs,
    cspViolations,
    failedResources,
    tabs: {
      before: tabsBefore,
      after: tabsAfter,
      ownerClosed: tabsBefore.filter((u) => !tabsAfter.includes(u)),
    },
    chrome: { before: chromeBefore, after: chromiumCount() },
  };
  console.log(JSON.stringify(summary, null, 1));
  if (failures.length) process.exitCode = 1;
} finally {
  if (browser) await detach(browser).catch(() => {});
}
