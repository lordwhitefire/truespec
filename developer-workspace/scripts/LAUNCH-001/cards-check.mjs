// G2/G3 — card images are Sanity derivatives, lazy below the fold, and reserve their slot.
// Attach-only; reuses the existing build tab; leaves it on the unfiltered inventory.
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

const before = chromiumCount();
const browser = await attach();
let page;
let widthSet = false;
let routed = false;

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

async function facts(selectors) {
  return page.evaluate((sels) => {
    const out = {};
    for (const sel of sels) {
      out[sel] = [...document.querySelectorAll(sel)].slice(0, 6).map((card) => {
        const img = card.querySelector("img");
        const slot = img?.closest(".ph") || img?.parentElement;
        const slotRect = slot?.getBoundingClientRect();
        const imgRect = img?.getBoundingClientRect();
        let query = null;
        try {
          const u = new URL(img?.currentSrc || img?.src || "");
          query = { w: u.searchParams.get("w"), h: u.searchParams.get("h"), fit: u.searchParams.get("fit") };
        } catch {
          query = null;
        }
        return {
          currentSrc: img?.currentSrc || img?.src || null,
          query,
          loading: img?.getAttribute("loading"),
          widthAttr: img?.getAttribute("width"),
          heightAttr: img?.getAttribute("height"),
          naturalWidth: img?.naturalWidth ?? null,
          naturalHeight: img?.naturalHeight ?? null,
          complete: img?.complete ?? null,
          slot: slotRect
            ? { w: Math.round(slotRect.width), h: Math.round(slotRect.height) }
            : null,
          image: imgRect
            ? { w: Math.round(imgRect.width), h: Math.round(imgRect.height) }
            : null,
        };
      });
    }
    return {
      selectors: out,
      cls: typeof window.__cls === "number" ? window.__cls : null,
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    };
  }, selectors);
}

async function scrollToFirst(sel) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) el.scrollIntoView({ block: "center", behavior: "instant" });
  }, sel);
  await page.waitForTimeout(1200);
}

async function probe(path, width, height, selectors) {
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
    const first = await facts(selectors);
    for (const sel of selectors) await scrollToFirst(sel);
    const afterScroll = await facts(selectors);
    return {
      path,
      width,
      height,
      status: response ? response.status() : null,
      first,
      afterScroll,
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
  await page.addInitScript(() => {
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      window.__cls = null;
    }
  });

  const inventory390 = await (async () => {
    await resize(page, 390, 823);
    widthSet = true;
    return probe("/inventory", 390, 823, ["#out .card", "#out .lc"]);
  })();
  const home390 = await (async () => {
    await resize(page, 390, 823);
    return probe("/", 390, 823, ["#sl .card", "#grid .card"]);
  })();
  const list390 = await (async () => {
    await resize(page, 390, 823);
    return probe("/inventory?view=list", 390, 823, ["#out .lc"]);
  })();
  const inventory560 = await (async () => {
    await resize(page, 560, 900);
    return probe("/inventory", 560, 900, ["#out .card", "#out .lc"]);
  })();
  const home560 = await (async () => {
    await resize(page, 560, 900);
    return probe("/", 560, 900, ["#sl .card", "#grid .card"]);
  })();
  const list560 = await (async () => {
    await resize(page, 560, 900);
    return probe("/inventory?view=list", 560, 900, ["#out .lc"]);
  })();

  // Broken-image test: block Sanity images, load the inventory, scroll to the first card, and
  // compare the slot geometry with the normal 390 page. The placeholder must occupy the same slot.
  await resize(page, 390, 823);
  const normalSlots = inventory390.afterScroll.selectors["#out .card"].map((c) => c.slot);
  const normalCards = inventory390.afterScroll.selectors["#out .card"].map((c) => c.image);
  await page.route("**/cdn.sanity.io/images/**", (route) => route.abort());
  routed = true;
  const blockedConsole = [];
  const blockedPageErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") blockedConsole.push(msg.text());
  };
  const onPageError = (err) => blockedPageErrors.push(err.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  let blocked;
  try {
    await page.goto(`${BASE}/inventory`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1000);
    await scrollToFirst("#out .card");
    const blockedFacts = await facts(["#out .card"]);
    blocked = {
      cards: blockedFacts.selectors["#out .card"],
      cls: blockedFacts.cls,
      overflow: blockedFacts.overflow,
      consoleErrors: blockedConsole,
      pageErrors: blockedPageErrors,
    };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
  await page.unroute("**/cdn.sanity.io/images/**");
  routed = false;

  const summary = (r) => ({
    path: r.path,
    width: r.width,
    status: r.status,
    first: r.first.selectors,
    afterScroll: r.afterScroll.selectors,
    cls: r.afterScroll.cls,
    overflow: r.afterScroll.overflow,
    consoleErrors: r.consoleErrors,
    pageErrors: r.pageErrors,
  });

  const blockedSlots = blocked.cards.map((c) => c.slot);
  const blockedCards = blocked.cards.map((c) => c.image);
  const sameSlot = normalSlots.every(
    (s, i) =>
      s &&
      blockedSlots[i] &&
      Math.abs(s.w - blockedSlots[i].w) <= 1 &&
      Math.abs(s.h - blockedSlots[i].h) <= 1,
  );
  const sameCard = normalCards.every(
    (s, i) =>
      s &&
      blockedCards[i] &&
      Math.abs(s.w - blockedCards[i].w) <= 1 &&
      Math.abs(s.h - blockedCards[i].h) <= 1,
  );

  console.log(
    JSON.stringify(
      {
        tabsBefore,
        tabsAfter: tabUrls(browser).length,
        chromiumBefore: before,
        chromiumAfter: chromiumCount(),
        inventory390: summary(inventory390),
        home390: summary(home390),
        list390: summary(list390),
        inventory560: summary(inventory560),
        home560: summary(home560),
        list560: summary(list560),
        blocked: {
          cards: blocked.cards,
          cls: blocked.cls,
          overflow: blocked.overflow,
          consoleErrors: blocked.consoleErrors,
          pageErrors: blocked.pageErrors,
          sameSlot,
          sameCard,
          normalSlots,
          blockedSlots,
          normalCards,
          blockedCards,
        },
      },
      null,
      2,
    ),
  );

  const all = [inventory390, home390, list390, inventory560, home560, list560];
  for (const r of all) {
    for (const [sel, cards] of Object.entries(r.afterScroll.selectors)) {
      for (const c of cards) {
        if (!c.query || !c.query.w || !c.query.h) {
          throw new Error(`${r.path} ${sel} image is not a sized Sanity derivative: ${c.currentSrc}`);
        }
        if (c.loading !== "lazy") {
          throw new Error(`${r.path} ${sel} image is not lazy: ${c.loading}`);
        }
        if (Number(c.widthAttr) !== Number(c.query.w) || Number(c.heightAttr) !== Number(c.query.h)) {
          throw new Error(`${r.path} ${sel} width/height do not match the derivative`);
        }
      }
    }
    if (r.afterScroll.overflow !== 0) throw new Error(`${r.path} overflows`);
    if (r.consoleErrors.length || r.pageErrors.length) {
      throw new Error(`${r.path} has console/page errors`);
    }
  }
  if (!sameSlot || !sameCard) throw new Error("the failed-image placeholder changed the card size");
  if (blocked.overflow !== 0) throw new Error("blocked-image page overflows");
} finally {
  if (routed) {
    try {
      await page.unroute("**/cdn.sanity.io/images/**");
    } catch {
      /* best-effort */
    }
  }
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
