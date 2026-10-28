// Font, icon and hero-image probe for the launch checklist (G2, G4, G5).
// Attach-only; reuses the existing build tab. Usage:
//   node developer-workspace/scripts/LAUNCH-001/perf-check.mjs --width=412 --height=823
import {
  BASE,
  attach,
  assertOurs,
  chromiumCount,
  clearResize,
  detach,
  findTab,
  resize,
  tabUrls,
} from "./_lib.mjs";

const args = process.argv.slice(2);
const path = args.find((arg) => arg.startsWith("--path="))?.split("=")[1] || "/";
const width = Number(args.find((arg) => arg.startsWith("--width="))?.split("=")[1] || 0);
const height = Number(args.find((arg) => arg.startsWith("--height="))?.split("=")[1] || 900);

const before = chromiumCount();
const browser = await attach();
let page;

try {
  await assertOurs(browser);
  page = findTab(browser, BASE);
  const tabsBefore = tabUrls(browser).length;
  if (width) await resize(page, width, height);

  await page.addInitScript(() => {
    window.__lcp = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__lcp.push({
          startTime: Math.round(entry.startTime),
          size: entry.size,
          tag: entry.element?.tagName ?? null,
          url: entry.url || null,
        });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "load",
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  const facts = await page.evaluate(() => {
    const resource = (name) =>
      performance
        .getEntriesByType("resource")
        .filter((entry) => entry.name.includes(name))
        .map((entry) => ({
          url: entry.name,
          type: entry.initiatorType,
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          duration: Math.round(entry.duration),
          renderBlockingStatus: entry.renderBlockingStatus ?? null,
        }));
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const hero = [...document.querySelectorAll(".hsl-img")].map((img) => ({
      src: img.getAttribute("src"),
      srcset: img.getAttribute("srcset"),
      currentSrc: img.currentSrc,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      loading: img.getAttribute("loading"),
      fetchPriority: img.getAttribute("fetchpriority"),
    }));
    const icon = document.querySelector("i.fa-solid");
    const iconBefore = icon ? getComputedStyle(icon, "::before").content : null;
    const firstFamily = (el) =>
      el
        ? getComputedStyle(el)
            .fontFamily.split(",")[0]
            .trim()
            .replace(/^["']|["']$/g, "")
        : null;
    const bodyFamily = firstFamily(document.body);
    const headFamily = firstFamily(document.querySelector("h1"));
    const iconFamily = firstFamily(icon);
    const localFonts = performance
      .getEntriesByType("resource")
      .filter((entry) => /\.woff2?(\?|$)/.test(entry.name))
      .map((entry) => ({
        url: entry.name,
        transferSize: entry.transferSize,
        duration: Math.round(entry.duration),
      }));
    return {
      fonts: {
        bodyFamily,
        headFamily,
        iconFamily,
        bodyLoaded: bodyFamily ? document.fonts.check(`16px "${bodyFamily}"`) : null,
        headLoaded: headFamily ? document.fonts.check(`600 16px "${headFamily}"`) : null,
        iconLoaded: iconFamily ? document.fonts.check(`900 16px "${iconFamily}"`) : null,
      },
      icon: icon
        ? {
            family: getComputedStyle(icon).fontFamily,
            before: iconBefore,
          }
        : null,
      hero,
      timing: {
        ttfb: nav ? Math.round(nav.responseStart) : null,
        fcp: fcp ? Math.round(fcp.startTime) : null,
        lcp: window.__lcp?.length ? window.__lcp[window.__lcp.length - 1] : null,
      },
      resources: {
        sanity: resource("cdn.sanity.io"),
        googleFonts: resource("fonts.googleapis.com"),
        googleStatic: resource("fonts.gstatic.com"),
        localFonts,
      },
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    };
  });

  const tabsAfter = tabUrls(browser).length;
  const after = chromiumCount();
  console.log(
    JSON.stringify(
      {
        path,
        width: width || null,
        height: width ? height : null,
        status: response ? response.status() : null,
        tabsBefore,
        tabsAfter,
        chromiumBefore: before,
        chromiumAfter: after,
        ...facts,
      },
      null,
      2,
    ),
  );
  if (tabsAfter !== tabsBefore) throw new Error(`a tab was opened (${tabsBefore} -> ${tabsAfter})`);
  if (after > before) throw new Error(`a Chrome was launched (${before} -> ${after})`);
} finally {
  if (page && width) await clearResize(page);
  await detach(browser);
}
