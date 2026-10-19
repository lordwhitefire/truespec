// TASK-005 Task 34 — the showroom's offline line.
//
// Live, read-only (the page only; the tap route is aborted/fulfilled in the tab, never reaching the
// server). Attach-only: the Chrome on :9222 is the owner's; this drive never launches one.
//
// The line: the approved copy appears after the conservative delay, existing content stays, every
// network destination is disabled with the line as its aria-describedby reason, the open WhatsApp
// gate closes, a local control still works, and reconnecting withdraws it all. The failure leg
// aborts one same-origin fetch while `navigator.onLine` is true — the second, real signal.
//
// usage: node task34.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task34/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const LINE = "You are offline. Reload to see the site.";
const WIDTHS = [
  { width: 375, height: 812 },
  { width: 1440, height: 900 },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);

const consoleErrors = [];
const httpErrors = [];
const tapRequests = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 300)));
page.on("response", (res) => {
  if (res.status() >= 400) httpErrors.push({ url: res.url().replace(BASE, ""), status: res.status() });
});
page.on("request", (req) => {
  if (req.url().includes("/api/tap")) tapRequests.push(req.method());
});

const read = () =>
  page.evaluate(() => {
    const isShown = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (
        cs.display !== "none" &&
        cs.visibility !== "hidden" &&
        Number(cs.opacity) > 0 &&
        r.width > 0 &&
        r.height > 0
      );
    };
    const notice = document.querySelector("#ts-offline-notice");
    const waLinks = [...document.querySelectorAll('a[href^="https://wa.me/"]')];
    const wa = waLinks.find(isShown) ?? waLinks[0] ?? null;
    const privacyLinks = [...document.querySelectorAll('a[href="/privacy"]')];
    const privacy = privacyLinks.find(isShown) ?? privacyLinks[0] ?? null;
    const gate = document.querySelector("dialog.wagn");
    const gateContinue = document.querySelector("dialog.wagn [data-ts-network]");
    const header = document.querySelector("#site-header");
    const footer = document.querySelector("#site-footer");
    const main = document.querySelector(".sv, .hero, #ttl, main");
    const nav = document.querySelector(".nav");
    return {
      url: location.pathname + location.search + location.hash,
      online: navigator.onLine,
      scrollY: Math.round(scrollY),
      line: notice
        ? {
            text: (notice.textContent ?? "").trim(),
            hidden: notice.hasAttribute("hidden"),
            visible: isShown(notice),
            role: notice.getAttribute("role"),
            live: notice.getAttribute("aria-live"),
            position: getComputedStyle(notice).position,
            top: Math.round(notice.getBoundingClientRect().top),
            height: Math.round(notice.getBoundingClientRect().height),
            background: getComputedStyle(notice).backgroundColor,
            color: getComputedStyle(notice).color,
          }
        : null,
      wa: wa
        ? {
            visible: isShown(wa),
            href: wa.getAttribute("href"),
            ariaDisabled: wa.getAttribute("aria-disabled"),
            tabIndex: wa.getAttribute("tabindex"),
            describedBy: wa.getAttribute("aria-describedby"),
            className: typeof wa.className === "string" ? wa.className : "",
            marked: wa.hasAttribute("data-ts-offline"),
            cursor: getComputedStyle(wa).cursor,
            opacity: getComputedStyle(wa).opacity,
            filter: getComputedStyle(wa).filter,
          }
        : null,
      privacy: privacy
        ? {
            visible: isShown(privacy),
            ariaDisabled: privacy.getAttribute("aria-disabled"),
            tabIndex: privacy.getAttribute("tabindex"),
            describedBy: privacy.getAttribute("aria-describedby"),
            className: typeof privacy.className === "string" ? privacy.className : "",
          }
        : null,
      gate: gate
        ? { open: gate.hasAttribute("open"), modal: gate.matches(":modal") }
        : { open: false, modal: false },
      gateContinue: gateContinue
        ? {
            disabled: gateContinue.disabled,
            ariaDisabled: gateContinue.getAttribute("aria-disabled"),
            tabIndex: gateContinue.getAttribute("tabindex"),
            describedBy: gateContinue.getAttribute("aria-describedby"),
            marked: gateContinue.hasAttribute("data-ts-offline"),
          }
        : null,
      content: {
        header: isShown(header),
        footer: isShown(footer),
        main: isShown(main),
        scrollHeight: document.documentElement.scrollHeight,
      },
      htmlOffline: document.documentElement.hasAttribute("data-ts-offline"),
      navTop: nav ? getComputedStyle(nav).top : null,
      theme: document.documentElement.dataset.theme ?? null,
      storage: Object.keys(localStorage).sort(),
    };
  });

async function waitForLine(visible, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const r = await read();
    if (r.line?.visible === visible) return { r, at: Date.now() - started };
    await sleep(80);
  }
  return { r: await read(), at: null };
}

async function clickVisibleWa() {
  await page.locator('a[href^="https://wa.me/"]:visible').first().click({ noWaitAfter: true });
}

// The disabled actions are deliberately `aria-disabled`, which Playwright (correctly) treats as
// not enabled. For the refusal legs, dispatch the real click event from the page itself: the
// document guard is what is being tested, and the browser's default is what must not happen.
async function clickLinkDom(selector) {
  await page.evaluate((sel) => {
    const isShown = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return (
        cs.display !== "none" &&
        cs.visibility !== "hidden" &&
        Number(cs.opacity) > 0 &&
        r.width > 0 &&
        r.height > 0
      );
    };
    const el = [...document.querySelectorAll(sel)].find(isShown);
    if (el instanceof HTMLElement) el.click();
  }, selector);
}

async function waitGate(open, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const r = await read();
    if (r.gate.open === open) return { r, at: Date.now() - started };
    await sleep(60);
  }
  return { r: await read(), at: null };
}

const problems = [];
const r = {
  task: "TASK-005 Task 34 — the showroom's offline line",
  when: new Date().toISOString(),
  ua,
  base: BASE,
  approvedLine: LINE,
  widths: {},
};

try {
  for (const { width, height } of WIDTHS) {
    const key = String(width);
    await page.setViewportSize({ width, height });
    await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#site-header");
    await page.waitForSelector(".sv, .hero, #ttl");
    await page.waitForFunction(() => document.querySelector("#thm")?.tagName === "BUTTON");
    await sleep(1000);

    const baseline = await read();
    if (baseline.online !== true) problems.push(`${key}: baseline navigator.onLine is not true`);
    if (baseline.line?.visible !== false || baseline.line?.hidden !== true) {
      problems.push(`${key}: the line is not hidden at rest`);
    }
    if (baseline.line?.text !== "") problems.push(`${key}: hidden line still has text`);
    if (!baseline.content.header || !baseline.content.footer || !baseline.content.main) {
      problems.push(`${key}: baseline content is not all visible`);
    }
    if (baseline.gate.open) problems.push(`${key}: a gate was open at baseline`);

    // Open the real gate first, then drop the network under it. It must close so the line is the
    // visible reason rather than a greyed Continue behind a modal.
    await clickVisibleWa();
    const gateOpened = await waitGate(true);
    if (!gateOpened.r.gate.open) problems.push(`${key}: the WhatsApp gate did not open online`);
    if (tapRequests.length !== 0) problems.push(`${key}: a tap was sent just by opening the gate`);

    const beforeTheme = (await read()).theme;
    const t0 = Date.now();
    await page.context().setOffline(true);
    const shown = await waitForLine(true, 5000);
    if (!shown.r.line?.visible) problems.push(`${key}: the line never appeared offline`);
    if (shown.at === null || shown.at < 900 || shown.at > 3000) {
      problems.push(`${key}: the line appeared at ${shown.at} ms (expected the conservative delay)`);
    }

    await sleep(200);
    const off = await read();
    if (off.online !== false) problems.push(`${key}: navigator.onLine is not false offline`);
    if (off.line?.text !== LINE) problems.push(`${key}: wrong line text: ${JSON.stringify(off.line?.text)}`);
    if (off.line?.role !== "status") problems.push(`${key}: line role is ${off.line?.role}`);
    if (off.line?.live !== "polite") problems.push(`${key}: line aria-live is ${off.line?.live}`);
    if (off.line?.position !== "sticky") problems.push(`${key}: line is not sticky`);
    if (off.line?.height !== 38) problems.push(`${key}: line height is ${off.line?.height}`);
    if (!off.htmlOffline) problems.push(`${key}: html has no offline marker`);
    if (off.navTop !== "38px") problems.push(`${key}: sticky nav top is ${off.navTop}`);
    if (off.gate.open) problems.push(`${key}: the gate stayed open when the line appeared`);
    if (!off.content.header || !off.content.footer || !off.content.main) {
      problems.push(`${key}: existing content disappeared offline`);
    }
    if (!off.wa) problems.push(`${key}: no WhatsApp action found`);
    else {
      if (off.wa.ariaDisabled !== "true") problems.push(`${key}: chat link is not aria-disabled`);
      if (off.wa.tabIndex !== "-1") problems.push(`${key}: chat link still in the tab order`);
      if (off.wa.describedBy !== "ts-offline-notice") {
        problems.push(`${key}: chat link reason is ${JSON.stringify(off.wa.describedBy)}`);
      }
      if (!off.wa.marked || !off.wa.className.includes("ts-offline-action")) {
        problems.push(`${key}: chat link is not visibly marked`);
      }
      if (off.wa.cursor !== "not-allowed" || off.wa.filter === "none") {
        problems.push(`${key}: chat link is not greyed (${off.wa.cursor} / ${off.wa.filter})`);
      }
    }
    if (!off.privacy) problems.push(`${key}: no internal page link found`);
    else if (off.privacy.ariaDisabled !== "true" || off.privacy.describedBy !== "ts-offline-notice") {
      problems.push(`${key}: internal page link is not disabled with the reason`);
    }
    if (!off.gateContinue) problems.push(`${key}: the gate Continue button was not found`);
    else {
      if (!off.gateContinue.disabled) problems.push(`${key}: gate Continue is not disabled`);
      if (off.gateContinue.describedBy !== "ts-offline-notice") {
        problems.push(`${key}: gate Continue reason is ${JSON.stringify(off.gateContinue.describedBy)}`);
      }
    }

    // A network action refuses and does not leave the product.
    const waUrl = page.url();
    const pagesBefore = page.context().pages().length;
    await clickLinkDom('a[href^="https://wa.me/"]');
    await sleep(350);
    const afterWa = await read();
    if (page.context().pages().length !== pagesBefore) {
      problems.push(`${key}: the blocked chat opened a new tab`);
    }
    if (page.url() !== waUrl) problems.push(`${key}: the chat action navigated offline`);
    if (afterWa.gate.open) problems.push(`${key}: the gate opened offline`);
    if (!afterWa.line?.visible) problems.push(`${key}: the line vanished after a blocked chat action`);
    if (tapRequests.length !== 0) problems.push(`${key}: a tap was queued/sent offline`);

    // An internal page link refuses too, with the line sticking at the top wherever the person is.
    const privateUrl = page.url();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await sleep(150);
    await clickLinkDom('a[href="/privacy"]');
    await sleep(300);
    const afterPrivacy = await read();
    if (page.url() !== privateUrl) problems.push(`${key}: an internal link navigated offline`);
    if (!afterPrivacy.line?.visible) problems.push(`${key}: the line vanished after a blocked link`);
    if (afterPrivacy.line?.top !== 0) {
      problems.push(`${key}: sticky line not at the viewport top after scrolling (${afterPrivacy.line?.top})`);
    }

    // A local control still works; the block is scoped to the network.
    await page.locator("#thm").click();
    await sleep(150);
    const afterLocal = await read();
    if (afterLocal.theme === beforeTheme) {
      problems.push(`${key}: local theme control did not work offline`);
    }
    if (!afterLocal.line?.visible) problems.push(`${key}: the line vanished after a local action`);

    // Reconnect: quick withdrawal, restore the attributes, and the action works again.
    const t1 = Date.now();
    await page.context().setOffline(false);
    const hidden = await waitForLine(false, 3000);
    const withdrawAt = hidden.at ?? null;
    if (withdrawAt === null) problems.push(`${key}: the line did not withdraw on reconnect`);
    if (withdrawAt !== null && withdrawAt > 1000) {
      problems.push(`${key}: withdrawal took ${withdrawAt} ms (not quick)`);
    }
    await sleep(120);
    const back = await read();
    if (back.online !== true) problems.push(`${key}: navigator.onLine is not true after reconnect`);
    if (back.line?.visible) problems.push(`${key}: the line is still visible after reconnect`);
    if (back.htmlOffline || back.navTop !== "0px") {
      problems.push(`${key}: the offline marker/nav offset survived reconnect`);
    }
    if (back.wa?.ariaDisabled !== null || back.wa?.tabIndex !== null) {
      problems.push(`${key}: the chat link was not restored`);
    }
    if (back.wa?.className.includes("ts-offline-action")) {
      problems.push(`${key}: the chat link kept the disabled class`);
    }
    if (back.gateContinue?.disabled !== false || back.gateContinue?.marked) {
      problems.push(`${key}: the gate Continue was not restored`);
    }

    await clickVisibleWa();
    const gateBack = await waitGate(true);
    if (!gateBack.r.gate.open) problems.push(`${key}: the gate did not open after reconnect`);
    if (gateBack.r.gate.open) {
      await page.locator("dialog.wagn .wagn-cancel").click({ noWaitAfter: true });
      await waitGate(false);
    }

    r.widths[key] = {
      viewport: { width, height },
      baseline,
      gateOpened,
      shownAt: shown.at,
      off,
      afterWa,
      afterPrivacy,
      afterLocal,
      beforeTheme,
      afterTheme: afterLocal.theme,
      withdrawAt,
      back,
      gateBack,
      tapOffline: tapRequests.length,
    };
  }

  // The second signal: a same-origin fetch fails while navigator.onLine is true.
  const failureLeg = {};
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#site-header");
  await page.waitForSelector(".sv, .hero, #ttl");
  await sleep(800);
  const failureBaseline = await read();
  const consoleMark = consoleErrors.length;

  await page.route("**/api/tap", (route) => route.abort("failed"));
  const t2 = Date.now();
  await page.evaluate(() => {
    void fetch("/api/tap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }).catch(() => {});
  });
  const failureShown = await waitForLine(true, 5000);
  await sleep(200);
  const failureRead = await read();
  const expectedConsole = consoleErrors.slice(consoleMark);

  if (failureRead.online !== true) problems.push("failure leg: navigator.onLine was not true");
  if (!failureRead.line?.visible) problems.push("failure leg: the line did not appear after a failed fetch");
  if (failureRead.line?.text !== LINE) problems.push("failure leg: wrong line text");
  if (failureShown.at === null || failureShown.at < 900) {
    problems.push(`failure leg: line appeared at ${failureShown.at} ms (expected the delay)`);
  }

  await page.unroute("**/api/tap");
  await page.route("**/api/tap", (route) => route.fulfill({ status: 204, body: "" }));
  const t3 = Date.now();
  await page.evaluate(() => {
    void fetch("/api/tap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }).catch(() => {});
  });
  const failureHidden = await waitForLine(false, 3000);
  await page.unroute("**/api/tap");
  if (failureHidden.at === null) problems.push("failure leg: the line did not withdraw after a successful fetch");

  failureLeg.baseline = failureBaseline;
  failureLeg.shownAt = failureShown.at;
  failureLeg.read = failureRead;
  failureLeg.withdrawAt = failureHidden.at ?? Date.now() - t3;
  failureLeg.expectedConsole = expectedConsole;
  failureLeg.tapRequestsWhileFailure = tapRequests.slice(-2);
  r.failure = failureLeg;

  const integrity = await page.evaluate(async () => {
    const regs =
      "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : null;
    const cacheKeys = "caches" in window ? await caches.keys() : null;
    let databases = null;
    try {
      databases = indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : null;
    } catch {
      databases = "unreadable";
    }
    return {
      serviceWorkers: regs,
      caches: cacheKeys,
      databases,
      localStorage: Object.keys(localStorage).sort(),
      sessionStorage: Object.keys(sessionStorage).sort(),
    };
  });
  r.integrity = integrity;
  if (integrity.serviceWorkers !== 0) problems.push(`a service worker was registered (${integrity.serviceWorkers})`);
  if (Array.isArray(integrity.caches) && integrity.caches.length !== 0) {
    problems.push(`the site created a cache: ${JSON.stringify(integrity.caches)}`);
  }
  const outboxKeys = [...integrity.localStorage, ...integrity.sessionStorage].filter((k) =>
    /outbox|queue|pending|draft|offline/i.test(k),
  );
  if (outboxKeys.length) problems.push(`an outbox-like key exists: ${JSON.stringify(outboxKeys)}`);

  // The offline leg must have sent nothing. The two test fetches in the failure leg are the only
  // /api/tap requests, and both were intercepted in the tab (never the server).
  r.tapRequests = tapRequests;
  const offlineLegTapCounts = Object.fromEntries(
    Object.entries(r.widths).map(([w, x]) => [w, x.tapOffline]),
  );
  r.offlineLegTapCounts = offlineLegTapCounts;
  if (Object.values(offlineLegTapCounts).some((n) => n !== 0)) {
    problems.push("an offline leg sent a tap request");
  }
  if (tapRequests.length !== 2) {
    problems.push(`expected only the two intercepted failure-leg fetches, saw ${tapRequests.length}`);
  }

  r.problems = problems;
  r.consoleErrorTexts = consoleErrors;
  r.httpErrors = httpErrors;
  r.verdict = {
    problems: problems.length,
    console: consoleErrors.length,
    http: httpErrors.length,
    mainConsole: consoleErrors.length - (failureLeg.expectedConsole?.length ?? 0),
  };
  r.pass = problems.length === 0;

  console.log(`TASK 34: ${r.pass ? "PASS" : "FAIL"} · ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 40)) console.log(`  FAIL ${p}`);
  for (const [w, x] of Object.entries(r.widths)) {
    console.log(
      `  ${w}: line ${x.shownAt} ms · ${JSON.stringify(x.off.line?.text)} · gateOpen=${x.off.gate.open} · gateContinue disabled=${x.off.gateContinue?.disabled} · chat ${x.off.wa?.ariaDisabled}/${x.off.wa?.tabIndex}/${JSON.stringify(x.off.wa?.describedBy)} · navTop=${x.off.navTop} · content=${x.off.content.header}/${x.off.content.footer}/${x.off.content.main} · withdraw ${x.withdrawAt} ms · tapOffline=${x.tapOffline}`,
    );
    console.log(
      `       after blocked chat ${JSON.stringify(x.afterWa.url)} gate=${x.afterWa.gate.open}; after link ${JSON.stringify(x.afterPrivacy.url)} lineTop=${x.afterPrivacy.line?.top}; local ${JSON.stringify(x.beforeTheme)} -> ${JSON.stringify(x.afterTheme)}; restored ${x.back.wa?.ariaDisabled}/${x.back.wa?.tabIndex} gate=${x.gateBack.r.gate.open}`,
    );
  }
  console.log(
    `  failure leg: online=${r.failure.read.online} lineAt=${r.failure.shownAt} text=${JSON.stringify(r.failure.read.line?.text)} withdraw=${r.failure.withdrawAt} expectedConsole=${r.failure.expectedConsole.length}`,
  );
  console.log(
    `  integrity: SW=${JSON.stringify(r.integrity.serviceWorkers)} caches=${JSON.stringify(r.integrity.caches)} local=${JSON.stringify(r.integrity.localStorage)} session=${JSON.stringify(r.integrity.sessionStorage)} tapRequests=${JSON.stringify(r.tapRequests)}`,
  );
  console.log(`  console errors: ${consoleErrors.length} (main ${r.verdict.mainConsole}); http: ${httpErrors.length}`);
  for (const e of consoleErrors.slice(0, 6)) console.log(`    console: ${e}`);
  for (const e of httpErrors.slice(0, 6)) console.log(`    http: ${e.status} ${e.url}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}task34.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await page.context().setOffline(false).catch(() => {});
  await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {});
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await detach(browser);
}
