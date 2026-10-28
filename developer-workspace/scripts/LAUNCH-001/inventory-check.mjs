// B2 + C2 — inventory metadata, canonical and one H1; filtered URLs keep their results.
// Attach-only; reuses the existing build tab, then leaves it on the unfiltered inventory.
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

const WIDTH = 1440;
const HEIGHT = 900;
const before = chromiumCount();
const browser = await attach();
let page;
let widthSet = false;

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

async function probe(path, withCards) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  const onPageError = (err) => pageErrors.push(err.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1000);
    const facts = await page.evaluate((collectCards) => {
      const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content ?? null;
      const prop = (property) => document.querySelector(`meta[property="${property}"]`)?.content ?? null;
      const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((el) => ({
        level: Number(el.tagName[1]),
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
      }));
      const cards = collectCards ? [...document.querySelectorAll("#out .lc")] : [];
      const titles = cards.map((c) =>
        (c.querySelector("h3")?.textContent || "").replace(/\s+/g, " ").trim(),
      );
      const prices = cards.map((c) => {
        const pt = c.querySelector(".pt");
        const last = pt?.lastChild?.textContent ?? pt?.textContent ?? "";
        return last.replace(/[^\d]/g, "");
      });
      return {
        title: document.title,
        description: meta("description"),
        canonical: document.querySelector("link[rel='canonical']")?.href ?? null,
        ogTitle: prop("og:title"),
        twitterCard: meta("twitter:card"),
        h1Count: document.querySelectorAll("h1").length,
        h1: [...document.querySelectorAll("h1")].map((el) => (el.textContent || "").trim()),
        headings,
        resultHeading: (document.querySelector("#ttl")?.textContent || "")
          .replace(/\s+/g, " ")
          .trim(),
        cardCount: cards.length,
        cardTitles: titles,
        cardPrices: prices,
        allToyota: titles.length > 0 && titles.every((t) => t.includes("Toyota")),
        allAvailable: cards.length > 0 && cards.every((c) => c.textContent.includes("Available")),
        ascending:
          prices.length > 1 &&
          prices.every((p, i) => i === 0 || Number(p) >= Number(prices[i - 1])),
        search: location.search,
        overflow: Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      };
    }, withCards);
    return {
      path,
      status: response ? response.status() : null,
      ...facts,
      consoleErrors,
      pageErrors,
    };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

try {
  await assertOurs(browser);
  page = findTab(browser, BASE);
  const tabsBefore = tabUrls(browser).length;
  await resize(page, WIDTH, HEIGHT);
  widthSet = true;

  const page1 = await probe("/inventory?view=list", true);
  const page2 = await probe("/inventory?view=list&page=2", true);
  const filtered = await probe("/inventory?status=available&make=Toyota&sort=low&view=list", true);
  const allParams = await probe(
    "/inventory?status=available&make=Toyota&min=1000000&max=50000000&sort=high&view=grid&page=2",
    false,
  );

  const summary = (r) => ({
    path: r.path,
    status: r.status,
    title: r.title,
    description: r.description,
    canonical: r.canonical,
    ogTitle: r.ogTitle,
    twitterCard: r.twitterCard,
    h1Count: r.h1Count,
    h1: r.h1,
    headings: r.headings.slice(0, 8),
    resultHeading: r.resultHeading,
    cardCount: r.cardCount,
    cardTitles: r.cardTitles,
    cardPrices: r.cardPrices,
    allToyota: r.allToyota,
    allAvailable: r.allAvailable,
    ascending: r.ascending,
    search: r.search,
    overflow: r.overflow,
    consoleErrors: r.consoleErrors,
    pageErrors: r.pageErrors,
  });

  console.log(
    JSON.stringify(
      {
        tabsBefore,
        tabsAfter: tabUrls(browser).length,
        chromiumBefore: before,
        chromiumAfter: chromiumCount(),
        page1: summary(page1),
        page2: summary(page2),
        filtered: summary(filtered),
        allParams: summary(allParams),
        page2Differs: page2.cardTitles[0] !== page1.cardTitles[0],
      },
      null,
      2,
    ),
  );

  const tabsAfter = tabUrls(browser).length;
  if (tabsAfter !== tabsBefore) throw new Error(`a tab was opened (${tabsBefore} -> ${tabsAfter})`);
  if (chromiumCount() > before) throw new Error("a Chrome was launched");
  if (page1.h1Count !== 1) throw new Error(`page 1 has ${page1.h1Count} h1 elements`);
  if (page2.h1Count !== 1) throw new Error(`page 2 has ${page2.h1Count} h1 elements`);
  if (filtered.h1Count !== 1) throw new Error(`filtered has ${filtered.h1Count} h1 elements`);
  if (allParams.h1Count !== 1) throw new Error(`all-params has ${allParams.h1Count} h1 elements`);
  if (!filtered.allToyota) throw new Error("the Toyota filter did not hold");
  if (!filtered.allAvailable) throw new Error("the available filter did not hold");
  if (!filtered.ascending) throw new Error("the low-price sort did not hold");
  if (page2.cardTitles[0] === page1.cardTitles[0]) throw new Error("page 2 repeats page 1");
  for (const r of [page1, page2, filtered, allParams]) {
    if (r.canonical !== "https://truespec-k4y6.vercel.app/inventory") {
      throw new Error(`${r.path} canonical is ${r.canonical}`);
    }
    if (r.overflow !== 0) throw new Error(`${r.path} overflows by ${r.overflow}px`);
    if (r.consoleErrors.length || r.pageErrors.length) {
      throw new Error(`${r.path} has console/page errors`);
    }
  }
} finally {
  if (page) {
    try {
      await page.goto(`${BASE}/inventory`, { waitUntil: "load", timeout: 30000 });
    } catch {
      /* best-effort restore */
    }
  }
  if (widthSet) await clearResize(page);
  await detach(browser);
}
