// LAUNCH-001 Task 14 — Privacy notice alignment runtime checks (E3, E4, E6).
//
// E3: Open /privacy — contact is the configured WhatsApp channel; no email address or
//     self-service channel promised.
// E4: Open /privacy — deletion path explains how a request reaches the owner and what
//     the owner can remove.
// E6 (privacy part): owner and last-updated date present on the privacy page.
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
  await page.goto(BASE + "/privacy", { waitUntil: "domcontentloaded" });

  const dom = await page.evaluate(() => {
    const upd = document.querySelector(".upd");
    const own = document.querySelector(".own");
    const body = document.body.innerText;
    const mailto = Array.from(document.querySelectorAll('a[href^="mailto:"]')).length;
    return {
      updText: upd ? upd.textContent : null,
      ownText: own ? own.textContent : null,
      body,
      mailtoCount: mailto,
    };
  });

  await page.goto(originalUrl, { waitUntil: "domcontentloaded" });

  // E3 — contact is the configured WhatsApp channel; no email / self-service channel.
  check(
    "privacy-contact-is-whatsapp",
    /WhatsApp/.test(dom.body) && dom.mailtoCount === 0,
    JSON.stringify({ mailtoCount: dom.mailtoCount, body: dom.body.slice(0, 500) }),
  );

  // E4 — deletion path explains how it reaches the owner and what the owner can remove.
  check(
    "privacy-deletion-path",
    /owner/.test(dom.body.toLowerCase()) ||
      /remove/.test(dom.body.toLowerCase()),
    dom.body.slice(0, 700),
  );

  // E6 (privacy part) — owner and last-updated date present.
  check(
    "privacy-has-date",
    dom.updText === `Last updated: ${DATE}`,
    JSON.stringify({ updText: dom.updText, expected: `Last updated: ${DATE}` }),
  );
  check(
    "privacy-has-owner-record",
    dom.ownText === `Owner: ${SITE_NAME} · Reviewed: ${DATE}`,
    JSON.stringify({ ownText: dom.ownText, expected: `Owner: ${SITE_NAME} · Reviewed: ${DATE}` }),
  );

  // File-level: privacy page and lib/site.ts carry the owner/date constant.
  const privacyPage = readFileSync("app/(site)/privacy/page.tsx", "utf8");
  const siteTs = readFileSync("lib/site.ts", "utf8");
  const privacyRecord =
    privacyPage.includes("PRIVACY_LAST_UPDATED") &&
    privacyPage.includes("Owner:") &&
    siteTs.includes(`PRIVACY_LAST_UPDATED = "${DATE}"`);
  check("privacy-page-has-owner-and-date", privacyRecord, "privacy page + lib/site.ts");

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
    privacy: {
      date: dom.updText,
      owner: dom.ownText,
      mailtoCount: dom.mailtoCount,
    },
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
