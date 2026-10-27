// LAUNCH-001 Task 11 — robots.txt and sitemap.xml.
//
// Uses the existing build tab to fetch both routes through the browser, then compares the sitemap
// car set with the same public read path the site uses. No navigation, no new tab, no Chrome launch.
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
import { getPublicCars } from "../../../lib/public-cars.ts";
import { SITE_ORIGIN, absoluteUrl } from "../../../lib/site.ts";

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

try {
  browser = await attach();
  await assertOurs(browser);
  tabsBefore.push(...tabUrls(browser));
  page = findTab(browser, ORIGIN);

  const robots = await page.evaluate(async () => {
    const res = await fetch("/robots.txt", { cache: "no-store" });
    return {
      status: res.status,
      type: res.headers.get("content-type") ?? "",
      text: await res.text(),
    };
  });

  const sitemap = await page.evaluate(async () => {
    const res = await fetch("/sitemap.xml", { cache: "no-store" });
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "application/xml");
    return {
      status: res.status,
      type: res.headers.get("content-type") ?? "",
      text,
      parserError: doc.getElementsByTagName("parsererror").length > 0,
      locs: [...doc.querySelectorAll("url > loc")].map((node) => (node.textContent ?? "").trim()),
    };
  });

  const cars = await getPublicCars();
  const expectedCars = cars
    .map((car) => absoluteUrl(`/car/${encodeURIComponent(car.ref)}`))
    .sort();
  const sitemapCars = sitemap.locs.filter((url) => url.includes("/car/")).sort();
  const staticExpected = ["/", "/inventory", "/privacy", "/terms"].map(absoluteUrl).sort();
  const sitemapStatic = sitemap.locs.filter((url) => !url.includes("/car/")).sort();

  const privateRes = await fetch(`${BASE}/office`, { redirect: "manual" });
  const privateStatus = privateRes.status;
  const privateLocation = privateRes.headers.get("location");

  check("robots-served-200", robots.status === 200, JSON.stringify(robots));
  check("robots-is-plain-text", robots.type.includes("text/plain"), robots.type);
  check("robots-allows-public", /^Allow:\s*\/$/m.test(robots.text), robots.text);
  check("robots-disallows-office", /^Disallow:\s*\/office\/$/m.test(robots.text), robots.text);
  check("robots-disallows-api", /^Disallow:\s*\/api\/$/m.test(robots.text), robots.text);
  check(
    "robots-names-the-sitemap",
    robots.text.includes(`Sitemap: ${absoluteUrl("/sitemap.xml")}`),
    robots.text,
  );

  check("sitemap-served-200", sitemap.status === 200, JSON.stringify(sitemap));
  check("sitemap-is-xml", sitemap.type.includes("xml"), sitemap.type);
  check("sitemap-parses", !sitemap.parserError, sitemap.text.slice(0, 500));
  check(
    "sitemap-urls-are-absolute",
    sitemap.locs.length > 0 &&
      sitemap.locs.every((url) => url.startsWith(`${SITE_ORIGIN}/`)) &&
      sitemap.locs.every((url) => !url.includes("127.0.0.1")),
    JSON.stringify(sitemap.locs),
  );
  check(
    "sitemap-static-pages",
    JSON.stringify(sitemapStatic) === JSON.stringify(staticExpected),
    JSON.stringify({ sitemapStatic, staticExpected }),
  );
  check(
    "sitemap-has-every-public-car",
    JSON.stringify(sitemapCars) === JSON.stringify(expectedCars),
    JSON.stringify({ sitemapCars, expectedCars }),
  );
  check(
    "sitemap-has-no-duplicates",
    new Set(sitemap.locs).size === sitemap.locs.length,
    JSON.stringify(sitemap.locs),
  );
  check(
    "sitemap-omits-known-non-public-cars",
    !sitemap.locs.includes(absoluteUrl("/car/TS-1025")) &&
      !sitemap.locs.includes(absoluteUrl("/car/TS-1029")) &&
      !sitemap.locs.includes(absoluteUrl("/car/TS-9999")),
    JSON.stringify({
      sold: sitemap.locs.includes(absoluteUrl("/car/TS-1025")),
      unlisted: sitemap.locs.includes(absoluteUrl("/car/TS-1029")),
      unknown: sitemap.locs.includes(absoluteUrl("/car/TS-9999")),
    }),
  );
  check(
    "sitemap-includes-terms",
    sitemap.locs.includes(absoluteUrl("/terms")),
    JSON.stringify(sitemap.locs),
  );

  tabsAfter = tabUrls(browser);
  const buildTabStillOpen = tabsAfter.includes(BASE + "/car/TS-1001") ||
    tabsAfter.some((url) => url.startsWith(ORIGIN));
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
    robots: {
      status: robots.status,
      type: robots.type,
      sitemap: absoluteUrl("/sitemap.xml"),
      text: robots.text,
    },
    sitemap: {
      status: sitemap.status,
      type: sitemap.type,
      parserError: sitemap.parserError,
      locs: sitemap.locs,
      static: sitemapStatic,
      cars: sitemapCars,
    },
    publicCars: {
      count: cars.length,
      refs: cars.map((car) => car.ref),
    },
    privatePath: { status: privateStatus, location: privateLocation },
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
