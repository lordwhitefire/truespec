// LAUNCH-001 Task 10 — car images and heading order.
//
// Attaches to the existing Chrome on CDP :9222, reuses the build tab on :3210, resizes that tab
// at 390 / 560 / 1440, and reads the live and sold car pages. No headless, no new tab, no
// screenshot; detaches and clears the emulation at the end.
import {
  BASE,
  REF,
  attach,
  assertOurs,
  clearResize,
  chromiumCount,
  detach,
  findTab,
  guardCount,
  resize,
  tabUrls,
} from "./_lib.mjs";

const ORIGIN = new URL(BASE).origin;
const LIVE = "/car/TS-1001";
const SOLD = "/car/TS-1025";
const WIDTHS = [390, 560, 1440];
const GALLERY_WIDTHS = [640, 960, 1440];

const checks = {};
const failures = [];
function check(name, ok, detail) {
  checks[name] = Boolean(ok);
  if (!ok) failures.push(`${name}: ${detail}`);
}

function derivative(url, width, height) {
  try {
    const u = new URL(url);
    return (
      u.searchParams.get("w") === String(width) &&
      u.searchParams.get("h") === String(height) &&
      u.searchParams.get("fit") === "crop"
    );
  } catch {
    return false;
  }
}

function galleryWidth(displayWidth) {
  return GALLERY_WIDTHS.find((w) => w >= displayWidth) ?? GALLERY_WIDTHS.at(-1);
}

async function readPage(page) {
  return page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    const image = (img) => {
      if (!img) return null;
      return {
        currentSrc: img.currentSrc || img.src || "",
        src: img.getAttribute("src"),
        srcset: img.getAttribute("srcset"),
        sizes: img.getAttribute("sizes"),
        width: img.getAttribute("width"),
        height: img.getAttribute("height"),
        loading: img.getAttribute("loading"),
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        box: box(img),
        parent: img.parentElement
          ? {
              tag: img.parentElement.tagName,
              cls: typeof img.parentElement.className === "string" ? img.parentElement.className : "",
              box: box(img.parentElement),
            }
          : null,
      };
    };
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
      level: Number(h.tagName[1]),
      text: h.innerText.replace(/\s+/g, " ").trim(),
      id: h.id,
      cls: typeof h.className === "string" ? h.className : "",
    }));
    const skips = [];
    for (let i = 1; i < headings.length; i += 1) {
      if (headings[i].level - headings[i - 1].level > 1) {
        skips.push({ from: headings[i - 1], to: headings[i] });
      }
    }
    return {
      url: location.href,
      innerWidth: window.innerWidth,
      dpr: window.devicePixelRatio,
      gal: box(document.querySelector("#gal")),
      main: image(document.querySelector("#gal img")),
      thumbs: [...document.querySelectorAll("#thumbs img")].map(image),
      related: [...document.querySelectorAll(".rc img")].map(image),
      soldHero: image(document.querySelector(".nfbox img")),
      h1Count: headings.filter((h) => h.level === 1).length,
      h1: headings.find((h) => h.level === 1)?.text ?? null,
      headings,
      skips,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function settle(page, selectors) {
  await page.waitForSelector(selectors, { timeout: 20000 });
  await page.evaluate(() => {
    document.querySelector("#thumbs")?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.querySelector(".rel")?.scrollIntoView({ block: "center" });
  });
  await page
    .waitForFunction(
      () => [...document.querySelectorAll("#thumbs img, .rc img")].every((im) => im.complete),
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.waitForTimeout(300);
}

const chromeBefore = chromiumCount();
const tabsBefore = [];
let tabsAfter = [];
let browser;
let page;
let resized = false;
const consoleErrors = [];
const pageErrors = [];
const liveReads = [];
const soldReads = [];

try {
  browser = await attach();
  await assertOurs(browser);
  tabsBefore.push(...tabUrls(browser));
  page = findTab(browser, ORIGIN);

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  for (const width of WIDTHS) {
    await resize(page, width, 900);
    resized = true;

    await page.goto(BASE + LIVE, { waitUntil: "domcontentloaded", timeout: 30000 });
    await settle(page, "#gal img");
    const live = await readPage(page);
    liveReads.push({ width, ...live });

    const expected = galleryWidth(live.gal?.w ?? width);
    check(
      `live-${width}-main-is-display-derivative`,
      derivative(live.main?.currentSrc, expected, Math.round(expected * 0.6)) &&
        (live.main?.naturalWidth ?? 0) > 0 &&
        (live.main?.naturalHeight ?? 0) > 0,
      JSON.stringify({
        currentSrc: live.main?.currentSrc,
        expected,
        naturalWidth: live.main?.naturalWidth,
      }),
    );
    check(
      `live-${width}-main-reserves-space`,
      live.main?.width === "1200" &&
        live.main?.height === "720" &&
        typeof live.main?.sizes === "string" &&
        live.main.sizes.length > 0 &&
        (live.gal?.h ?? 0) > 0 &&
        (live.main?.box?.h ?? 0) > 0,
      JSON.stringify({
        width: live.main?.width,
        height: live.main?.height,
        sizes: live.main?.sizes,
        gal: live.gal,
        box: live.main?.box,
      }),
    );
    check(
      `live-${width}-thumbs-are-display-derivatives`,
      live.thumbs.length > 0 &&
        live.thumbs.every(
          (t) =>
            derivative(t.currentSrc, 320, 180) &&
            t.width === "320" &&
            t.height === "180" &&
            t.loading === "lazy" &&
            (t.box?.h ?? 0) > 0,
        ),
      JSON.stringify(live.thumbs),
    );
    check(
      `live-${width}-related-are-display-derivatives`,
      live.related.length > 0 &&
        live.related.every(
          (r) =>
            derivative(r.currentSrc, 580, 320) &&
            r.width === "580" &&
            r.height === "320" &&
            r.loading === "lazy" &&
            (r.box?.h ?? 0) > 0,
        ),
      JSON.stringify(live.related),
    );
    check(`live-${width}-one-h1`, live.h1Count === 1, JSON.stringify(live.headings));
    check(`live-${width}-no-heading-skip`, live.skips.length === 0, JSON.stringify(live.skips));
    check(`live-${width}-no-horizontal-overflow`, !live.horizontalOverflow, String(live.horizontalOverflow));

    if (width === 1440) {
      await page.click("#thumbs button:nth-child(2)");
      await page
        .waitForFunction(
          () => {
            const im = document.querySelector("#gi");
            return im && /[?&]w=960(?:&|$)/.test(im.currentSrc);
          },
          { timeout: 5000 },
        )
        .catch(() => {});
      await page.waitForTimeout(200);
      const stepped = await page.evaluate(() => {
        const im = document.querySelector("#gi");
        return {
          currentSrc: im.currentSrc || im.src || "",
          src: im.getAttribute("src"),
          srcset: im.getAttribute("srcset"),
          alt: im.alt,
        };
      });
      check(
        "live-1440-thumb-step-keeps-the-derivative",
        derivative(stepped.currentSrc, 960, 576) &&
          typeof stepped.srcset === "string" &&
          stepped.srcset.includes("w=960") &&
          /photo 2$/.test(stepped.alt),
        JSON.stringify(stepped),
      );
    }

    await page.goto(BASE + SOLD, { waitUntil: "domcontentloaded", timeout: 30000 });
    await settle(page, ".nfbox img");
    const sold = await readPage(page);
    soldReads.push({ width, ...sold });

    check(
      `sold-${width}-hero-is-display-derivative`,
      derivative(sold.soldHero?.currentSrc, 840, 525) &&
        sold.soldHero?.width === "840" &&
        sold.soldHero?.height === "525" &&
        (sold.soldHero?.box?.h ?? 0) > 0,
      JSON.stringify(sold.soldHero),
    );
    check(
      `sold-${width}-related-are-display-derivatives`,
      sold.related.length > 0 &&
        sold.related.every(
          (r) =>
            derivative(r.currentSrc, 580, 320) &&
            r.width === "580" &&
            r.height === "320" &&
            r.loading === "lazy" &&
            (r.box?.h ?? 0) > 0,
        ),
      JSON.stringify(sold.related),
    );
    check(`sold-${width}-one-h1`, sold.h1Count === 1, JSON.stringify(sold.headings));
    check(`sold-${width}-no-heading-skip`, sold.skips.length === 0, JSON.stringify(sold.skips));
    check(`sold-${width}-no-horizontal-overflow`, !sold.horizontalOverflow, String(sold.horizontalOverflow));
  }

  // Broken-image test: the gallery frame must keep its box when the photo cannot load.
  await resize(page, 1440, 900);
  await page.goto(BASE + LIVE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await settle(page, "#gal img");
  const before = await page.evaluate(() => {
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    return { gal: box(document.querySelector("#gal")), img: box(document.querySelector("#gi")) };
  });
  await page.evaluate(() => {
    const im = document.querySelector("#gi");
    im.removeAttribute("srcset");
    im.src = `${location.origin}/__missing-car-photo__.jpg`;
  });
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => {
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };
    const im = document.querySelector("#gi");
    return {
      gal: box(document.querySelector("#gal")),
      img: box(im),
      src: im.getAttribute("src"),
      srcset: im.getAttribute("srcset"),
      alt: im.alt,
    };
  });
  check(
    "broken-gallery-keeps-its-space",
    Math.abs(after.gal.h - before.gal.h) <= 1 &&
      Math.abs(after.img.h - before.img.h) <= 1 &&
      after.gal.h > 0 &&
      after.img.h > 0,
    JSON.stringify({ before, after }),
  );
  check(
    "broken-gallery-drops-the-address",
    !after.src && !after.srcset,
    JSON.stringify(after),
  );

  const unexpectedConsole = consoleErrors.filter(
    (text) => !/__missing-car-photo__/.test(text) && !/404 \(Not Found\)/.test(text),
  );
  check("no-unexpected-console-errors", unexpectedConsole.length === 0, JSON.stringify(unexpectedConsole));
  check("no-page-errors", pageErrors.length === 0, JSON.stringify(pageErrors));

  tabsAfter = tabUrls(browser);
  const buildTabStillOpen = tabsAfter.includes(BASE + LIVE);
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
} finally {
  if (resized && page) await clearResize(page).catch(() => {});
  if (page) await page.goto(BASE + LIVE, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  if (browser) await detach(browser).catch(() => {});
}

const summary = {
  verdict: checks,
  failures,
  live: liveReads.map((r) => ({
    width: r.width,
    gal: r.gal,
    main: r.main && {
      currentSrc: r.main.currentSrc,
      width: r.main.width,
      height: r.main.height,
      sizes: r.main.sizes,
      naturalWidth: r.main.naturalWidth,
      naturalHeight: r.main.naturalHeight,
      box: r.main.box,
    },
    thumbs: r.thumbs.length,
    related: r.related.length,
    h1Count: r.h1Count,
    h1: r.h1,
    skips: r.skips.length,
  })),
  sold: soldReads.map((r) => ({
    width: r.width,
    hero: r.soldHero && {
      currentSrc: r.soldHero.currentSrc,
      width: r.soldHero.width,
      height: r.soldHero.height,
      naturalWidth: r.soldHero.naturalWidth,
      naturalHeight: r.soldHero.naturalHeight,
      box: r.soldHero.box,
    },
    related: r.related.length,
    h1Count: r.h1Count,
    h1: r.h1,
    skips: r.skips.length,
  })),
  chrome: { before: chromeBefore, after: chromiumCount() },
  tabs: {
    before: tabsBefore,
    after: tabsAfter,
    ownerClosed: tabsBefore.filter((url) => !tabsAfter.includes(url)),
  },
  guard: guardCount(),
};

console.log(JSON.stringify(summary, null, 1));
if (failures.length) process.exitCode = 1;
