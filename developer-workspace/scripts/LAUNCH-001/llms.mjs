// LAUNCH-001 Task 12 — llms.txt.
//
// Fetches the route through the existing build tab, compares the public facts with the same DB
// helpers the route uses, and scans the body with the leak-check token list. No navigation, no new
// tab, no Chrome launch.
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
import { getPublicCars, getSetting } from "../../../lib/public-cars.ts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, absoluteUrl } from "../../../lib/site.ts";

const ORIGIN = new URL(BASE).origin;

// Mirrors scripts/leak-check.ts: identifiers and quoted shapes, not bare marketing words.
const FORBIDDEN = [
  "purchase_price",
  '"shipping"',
  '"clearing"',
  "trucking_usa",
  "trucking_ng",
  "full_tank",
  "amount_minor",
  "rate_minor",
  "currency",
  "cost_line",
  "total_cost",
  "totalCost",
  "profit",
  "private_note",
  "doorstep_price_kobo",
  "kobo",
  /\bcost\b/,
  /\brate\b/,
];

// The B9 wording: no office, demo-only, customer, private-note, profit, cost or rate term.
const EXTRA = [
  /\boffice\b/i,
  /\bdemo\b/i,
  /\bcustomer\b/i,
  /\bprivate note\b/i,
  /\bprofit\b/i,
  /\bcost\b/i,
  /\brate\b/i,
  /\bkobo\b/i,
  /\bcurrency\b/i,
];

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

  const doc = await page.evaluate(async () => {
    const res = await fetch("/llms.txt", { cache: "no-store" });
    return {
      status: res.status,
      type: res.headers.get("content-type") ?? "",
      text: await res.text(),
    };
  });

  const [cars, number] = await Promise.all([getPublicCars(), getSetting("whatsapp_number")]);
  const digits = (number ?? "").replace(/\D/g, "");
  const expectedContact = digits
    ? `https://wa.me/${digits}`
    : "No WhatsApp number is saved yet.";
  const body = doc.text;
  const forbiddenHits = FORBIDDEN.filter((token) =>
    typeof token === "string" ? body.includes(token) : token.test(body),
  );
  const extraHits = EXTRA.filter((re) => re.test(body));
  const termsListed = body.includes(absoluteUrl("/terms"));

  check("llms-served-200", doc.status === 200, JSON.stringify(doc));
  check("llms-is-plain-text", doc.type.includes("text/plain"), doc.type);
  check("llms-names-the-business", body.includes(SITE_NAME), body.slice(0, 300));
  check("llms-carries-the-public-description", body.includes(SITE_DESCRIPTION), body.slice(0, 500));
  check(
    "llms-links-the-public-pages",
    body.includes(absoluteUrl("/")) &&
      body.includes(absoluteUrl("/inventory")) &&
      body.includes(absoluteUrl("/privacy")),
    body,
  );
  check(
    "llms-states-the-inventory-count",
    body.includes(`${cars.length} cars currently listed`),
    JSON.stringify({ count: cars.length, body }),
  );
  check(
    "llms-states-naira-prices",
    /\bnaira\b/i.test(body) && /\bNGN\b/.test(body) && /full amount to your door/i.test(body),
    body,
  );
  check(
    "llms-whatsapp-is-the-configured-number",
    body.includes(expectedContact) && /WhatsApp/i.test(body),
    JSON.stringify({ expectedContact, body }),
  );
  check("llms-is-plain-text-not-html", !/<\/?[a-z][\s\S]*>/i.test(body), body);
  check("llms-has-no-forbidden-token", forbiddenHits.length === 0, JSON.stringify(forbiddenHits));
  check("llms-has-no-office-or-demo-term", extraHits.length === 0, JSON.stringify(extraHits));
  check(
    "llms-includes-terms",
    termsListed,
    JSON.stringify({ termsListed, terms: absoluteUrl("/terms") }),
  );
  check(
    "llms-uses-the-canonical-origin",
    body.includes(SITE_ORIGIN) && !body.includes("127.0.0.1"),
    body,
  );

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
    llms: {
      status: doc.status,
      type: doc.type,
      body,
      forbiddenHits,
      extraHits,
      termsListed,
      expectedContact,
    },
    publicCars: { count: cars.length, refs: cars.map((car) => car.ref) },
    tabs: {
      before: tabsBefore,
      after: tabsAfter,
      ownerClosed: tabsBefore.filter((url) => !tabsAfter.includes(url)),
    },
    chrome: { before: chromeBefore, after: chromiumCount() },
    guard: guardCount(),
  };
  console.log(JSON.stringify(summary, null, 1));
  if (failures.length) process.exitCode = 1;
} finally {
  if (browser) await detach(browser).catch(() => {});
}
