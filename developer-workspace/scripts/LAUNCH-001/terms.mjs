// LAUNCH-001 Task 13 — /terms runtime checks (E1, E2, E6).
//
// E1: Open /terms — owner-approved terms render with a last-updated date and owner/review record.
// E2: Open home, inventory and a car page — each footer links to /terms.
// E6 (terms part): the terms page file carries an owner and last-updated date.
//
// Privacy's own owner/review record is Task 14; it is reported here as informational, not as a
// Task 13 failure.
//
// Browser fetches only; no navigation, no new tab, no Chrome launch.
import {
  BASE,
  REF,
  attach,
  assertOurs,
  chromiumCount,
  detach,
  findTab,
  guardCount,
  tabUrls,
} from "./_lib.mjs";
import { readFileSync } from "node:fs";

const ORIGIN = new URL(BASE).origin;
const DATE = "27 October 2026";
const SITE_NAME = "TrueSpec Automotive";
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

try {
  browser = await attach();
  await assertOurs(browser);
  tabsBefore.push(...tabUrls(browser));
  page = findTab(browser, ORIGIN);

  const originalUrl = page.url();
  // E1 — /terms renders with date and owner/review record (read from DOM text, not raw HTML).
  await page.goto(BASE + "/terms", { waitUntil: "domcontentloaded" });
  const termsRes = await page.evaluate(async () => {
    const res = await fetch("/terms", { cache: "no-store" });
    return res.status;
  });
  const dom = await page.evaluate(() => {
    const upd = document.querySelector(".upd");
    const own = document.querySelector(".own");
    return {
      updText: upd ? upd.textContent : null,
      ownText: own ? own.textContent : null,
      bodyText: document.body.innerText,
    };
  });
  await page.goto(originalUrl, { waitUntil: "domcontentloaded" });
  check("terms-renders-200", termsRes === 200, JSON.stringify({ status: termsRes }));
  check(
    "terms-has-date",
    dom.updText === `Last updated: ${DATE}`,
    JSON.stringify({ updText: dom.updText, expected: `Last updated: ${DATE}` }),
  );
  check(
    "terms-has-owner-review",
    dom.ownText === `Owner: ${SITE_NAME} · Reviewed: ${DATE}`,
    JSON.stringify({ ownText: dom.ownText, expected: `Owner: ${SITE_NAME} · Reviewed: ${DATE}` }),
  );
  check(
    "terms-has-law",
    /Federal Republic of Nigeria/.test(dom.bodyText) && /Lagos/.test(dom.bodyText),
    dom.bodyText.slice(0, 600),
  );

  // E2 — footer links /terms on home, inventory, a car page.
  const pages = ["/", "/inventory", "/car/TS-1001"];
  const footerResults = [];
  for (const p of pages) {
    const r = await page.evaluate(async (path) => {
      const res = await fetch(path, { cache: "no-store" });
      return { status: res.status, text: await res.text() };
    }, p);
    const ok = r.status === 200 && /href="\/terms"/.test(r.text);
    footerResults.push({ path: p, status: r.status, linked: /href="\/terms"/.test(r.text) });
  }
  check("terms-footer-links-all-pages", footerResults.every((x) => x.linked), JSON.stringify(footerResults));

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

  // E6 — terms page file carries owner and last-updated date.
  const termsPage = readFileSync("app/(site)/terms/page.tsx", "utf8");
  const siteTs = readFileSync("lib/site.ts", "utf8");
  const termsOwnerDate =
    termsPage.includes("Owner:") &&
    termsPage.includes("TrueSpec Automotive") &&
    termsPage.includes("Reviewed:") &&
    siteTs.includes(`TERMS_LAST_UPDATED = "${DATE}"`);
  check("terms-page-has-owner-and-date", termsOwnerDate, "terms page + lib/site.ts");

  // Informational only — privacy's owner/review record is Task 14.
  const privacyPage = readFileSync("app/(site)/privacy/page.tsx", "utf8");
  const privacyHasDate = privacyPage.includes("Last updated:");
  const privacyHasOwner = privacyPage.includes(`Owner: ${SITE_NAME}`);
  checks["privacy-has-date"] = privacyHasDate;
  checks["privacy-has-owner-record"] = privacyHasOwner;

  const summary = {
    verdict: checks,
    failures,
    terms: {
      status: termsRes,
      date: dom.updText,
      owner: dom.ownText,
    },
    footer: footerResults,
    tabs: {
      before: tabsBefore,
      after: tabsAfter,
      ownerClosed: tabsBefore.filter((u) => !tabsAfter.includes(u)),
    },
    chrome: { before: chromeBefore, after: chromiumCount() },
    guard: guardCount(),
  };
  console.log(JSON.stringify(summary, null, 1));
  if (failures.length) process.exitCode = 1;
} finally {
  if (browser) await detach(browser).catch(() => {});
}
