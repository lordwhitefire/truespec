// TASK-005 Task 35 — the office offline banner, driven live.
//
// Read-only toward the store: the drive types, goes offline, and never completes a save. It proves
// the approved line, the conservative appearance and quick withdrawal, the Save annotations and
// their reason, the refusal of a click while offline, and the clean reconnect. Test drafts are
// removed at the end.
//
// Attach-only: the Chrome on :9222 is the owner's; this drive never launches one.
//
// usage: node task35.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task35/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const LINE = "Offline, your draft is kept on this device.";
const BANNER_ID = "ts-office-offline";
const SAVE_CLASS = "ts-office-offline-save";
const CAR_KEY = "ts-draft:car:new";
const SETTING_KEY = "ts-draft:settings:tagline";
const CAR_PATH = `${BASE}/office/car/new`;
const SETTINGS_PATH = `${BASE}/office/settings`;
const CAR_PROBE = "Task35 car probe";
const TAG_PROBE = "Task35 tagline probe";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};
const progress = (label) => console.log(`${new Date().toISOString()} ${label}`);

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { ctx, b: page } = await twoTabs(browser);
page.setDefaultTimeout(120000);

// A hard stop for a wedged renderer: put the connection back and leave rather than hang the
// shell. The normal path finishes far inside this.
const watchdog = setTimeout(async () => {
  console.error("WATCHDOG: the live drive exceeded 180 s");
  try {
    await ctx.setOffline(false);
  } catch {
    /* the renderer may be wedged */
  }
  process.exit(2);
}, 180000);
watchdog.unref?.();

const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];
const nonGet = [];
const actionPosts = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push({ text: m.text().slice(0, 300), at: Date.now() });
});
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));
page.on("response", (res) => {
  if (res.status() >= 400) {
    let path = res.url();
    try {
      const u = new URL(path);
      path = u.origin + u.pathname;
    } catch {
      /* keep */
    }
    httpErrors.push({ url: path, status: res.status() });
  }
});
page.on("request", (req) => {
  if (req.method() !== "GET") {
    const sameOrigin = req.url().startsWith(BASE);
    const entry = {
      method: req.method(),
      sameOrigin,
      action: req.headers()["next-action"] ?? null,
    };
    nonGet.push(entry);
    if (entry.action) actionPosts.push(entry);
  }
});

async function readState(saveSelector) {
  return page.evaluate(
    ({ id, sel }) => {
      const banner = document.getElementById(id);
      const save = document.querySelector(sel);
      const bannerStyle = banner ? getComputedStyle(banner) : null;
      const saveStyle = save ? getComputedStyle(save) : null;
      const rect = banner ? banner.getBoundingClientRect() : null;
      const topbar = document.querySelector(".topbar");
      const side = document.querySelector(".side");
      const topbarStyle = topbar ? getComputedStyle(topbar) : null;
      const sideStyle = side ? getComputedStyle(side) : null;
      return {
        path: location.pathname,
        online: navigator.onLine,
        banner: banner
          ? {
              hidden: banner.hidden,
              visible: banner.getClientRects().length > 0,
              text: (banner.textContent ?? "").trim(),
              role: banner.getAttribute("role"),
              live: banner.getAttribute("aria-live"),
              position: bannerStyle.position,
              zIndex: bannerStyle.zIndex,
              rect: {
                top: Math.round(rect.top),
                left: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            }
          : null,
        marker: document.documentElement.hasAttribute("data-ts-office-offline"),
        varHeight: getComputedStyle(document.documentElement)
          .getPropertyValue("--ts-office-offline-h")
          .trim(),
        save: save
          ? {
              text: (save.textContent ?? "").replace(/\s+/g, " ").trim(),
              ariaDisabled: save.getAttribute("aria-disabled"),
              tabIndex: save.getAttribute("tabindex"),
              className: save.className,
              describedBy: save.getAttribute("aria-describedby"),
              disabled: save.disabled,
              cursor: saveStyle.cursor,
              filter: saveStyle.filter,
              opacity: saveStyle.opacity,
            }
          : null,
        saveCount: document.querySelectorAll("button.ts-office-offline-save").length,
        side: side
          ? {
              display: sideStyle.display,
              top: sideStyle.top,
              height: sideStyle.height,
              position: sideStyle.position,
            }
          : null,
        topbar: topbar
          ? {
              display: topbarStyle.display,
              top: topbarStyle.top,
              position: topbarStyle.position,
            }
          : null,
        scrollY: Math.round(scrollY),
        innerWidth,
        clientWidth: document.documentElement.clientWidth,
        bodyHeight: document.body.scrollHeight,
      };
    },
    { id: BANNER_ID, sel: saveSelector },
  );
}

async function waitBanner(saveSelector, visible, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await readState(saveSelector);
    const settled = visible
      ? state.banner?.visible === true && state.marker === true && state.varHeight.endsWith("px")
      : state.banner?.visible === false && state.marker === false && state.varHeight === "";
    if (settled) return { at: Date.now() - started, state };
    await sleep(60);
  }
  return { at: null, state: await readState(saveSelector) };
}

async function openCar(width, height) {
  await page.setViewportSize({ width, height });
  await page.goto(CAR_PATH, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  // The mounted portal is the client's own signal that the form is interactive.
  await page.locator(".mbar").waitFor({ state: "attached" });
  await page.waitForTimeout(400);
  await page.evaluate((key) => localStorage.removeItem(key), CAR_KEY);
}

async function typeCar(probe) {
  await page.getByLabel("Brand", { exact: true }).fill(probe);
  await sleep(650);
}

async function cleanDrafts() {
  await page.evaluate(
    ([carKey, settingKey]) => {
      localStorage.removeItem(carKey);
      localStorage.removeItem(settingKey);
    },
    [CAR_KEY, SETTING_KEY],
  );
}

function assertBaseline(state, label) {
  check(state.banner?.hidden === true, `${label}: the banner was not hidden online`);
  check(state.banner?.visible === false, `${label}: the banner was visible online`);
  check(state.banner?.text === "", `${label}: the hidden banner still had text`);
  check(state.marker === false, `${label}: the offline marker was set online`);
  check(state.varHeight === "", `${label}: the offline height variable was set online`);
  check(state.save?.ariaDisabled === null, `${label}: Save was aria-disabled online`);
  check(state.save?.tabIndex === null, `${label}: Save was outside the tab order online`);
  check(!(state.save?.className ?? "").includes(SAVE_CLASS), `${label}: Save had the offline class online`);
  check(
    !(state.save?.describedBy ?? "").split(/\s+/).includes(BANNER_ID),
    `${label}: Save pointed at the offline banner online`,
  );
}

function assertOffline(state, label, width, saveSelector) {
  check(state.online === false, `${label}: navigator.onLine was not false`);
  check(state.banner?.visible === true, `${label}: the banner did not show`);
  check(state.banner?.text === LINE, `${label}: the banner did not carry the approved line`);
  check(state.banner?.role === "status", `${label}: the banner is not a status region`);
  check(state.banner?.live === "polite", `${label}: the banner is not polite`);
  check(state.banner?.position === "sticky", `${label}: the banner is not sticky`);
  check(state.banner?.rect.top === 0, `${label}: the banner is not at the viewport top`);
  check(state.banner?.rect.left === 0, `${label}: the banner does not start at the left edge`);
  check(
    state.banner?.rect.width === state.clientWidth,
    `${label}: the banner does not span the content width (${state.banner?.rect.width} vs ${state.clientWidth})`,
  );
  check(state.banner?.rect.height >= 38, `${label}: the banner is too short`);
  check(state.marker === true, `${label}: the offline marker is absent`);
  check(state.varHeight.endsWith("px"), `${label}: no measured banner height was published`);
  check(
    Number.parseFloat(state.varHeight) === state.banner?.rect.height,
    `${label}: the published height does not match the banner`,
  );
  check(state.saveCount >= 1, `${label}: no Save control was annotated`);
  check(state.save?.ariaDisabled === "true", `${label}: Save is not aria-disabled`);
  check(state.save?.tabIndex === "-1", `${label}: Save is still in the tab order`);
  check((state.save?.className ?? "").includes(SAVE_CLASS), `${label}: Save has no offline class`);
  check(
    (state.save?.describedBy ?? "").split(/\s+/).includes(BANNER_ID),
    `${label}: Save does not name the banner as its reason`,
  );
  check(state.save?.cursor === "not-allowed", `${label}: Save does not look disabled`);
  check(/grayscale/.test(state.save?.filter ?? ""), `${label}: Save is not greyed`);
  check(saveSelector === "#save" || state.save?.disabled === false, `${label}: the Save control was natively disabled`);
}

function assertMobileBars(state, label) {
  check(state.side?.display === "none", `${label}: the desktop side is visible`);
  check(state.topbar?.display !== "none", `${label}: the mobile topbar is hidden`);
  check(state.topbar?.top === state.varHeight, `${label}: the topbar does not start below the banner`);
}

function assertDesktopBars(state, label) {
  check(state.topbar?.display === "none", `${label}: the desktop topbar is visible`);
  check(state.side?.display !== "none", `${label}: the side is hidden`);
  check(state.side?.top === state.varHeight, `${label}: the side does not start below the banner`);
}

function assertReconnected(state, label) {
  check(state.banner?.hidden === true, `${label}: the banner did not withdraw`);
  check(state.banner?.visible === false, `${label}: the banner is still visible`);
  check(state.banner?.text === "", `${label}: the withdrawn banner still has text`);
  check(state.marker === false, `${label}: the offline marker survived reconnect`);
  check(state.varHeight === "", `${label}: the height variable survived reconnect`);
  check(state.save?.ariaDisabled === null, `${label}: Save stayed aria-disabled`);
  check(state.save?.tabIndex === null, `${label}: Save stayed outside the tab order`);
  check(!(state.save?.className ?? "").includes(SAVE_CLASS), `${label}: Save kept the offline class`);
  check(
    !(state.save?.describedBy ?? "").split(/\s+/).includes(BANNER_ID),
    `${label}: Save still points at the offline banner`,
  );
  check(state.saveCount === 0, `${label}: annotated Save controls survived reconnect`);
  check(
    state.side?.top === "0px" || state.topbar?.top === "0px",
    `${label}: the shell did not return to the top`,
  );
}

let failureLeg = false;
let fatal = null;
try {
  // ---- 1440: the car form, Save annotations, click refusal, scroll, reconnect -------------
  progress("car 1440: opening");
  await openCar(1440, 900);
  progress("car 1440: open");
  assertBaseline(await readState("#save"), "car 1440 baseline");
  await typeCar(CAR_PROBE);
  progress("car 1440: typed");
  const carDraftBefore = await page.evaluate((key) => localStorage.getItem(key), CAR_KEY);
  check(carDraftBefore != null, "car 1440: the draft was not written before going offline");

  await ctx.setOffline(true);
  progress("car 1440: offline set");
  const shown1440 = await waitBanner("#save", true);
  const delay1440 = shown1440.at;
  progress(`car 1440: banner wait done (${delay1440} ms)`);
  check(delay1440 !== null, "car 1440: the banner never appeared");
  check(delay1440 !== null && delay1440 >= 1000, `car 1440: the banner appeared too fast (${delay1440} ms)`);
  assertOffline(shown1440.state, "car 1440 offline", 1440, "#save");
  assertDesktopBars(shown1440.state, "car 1440 offline");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(120);
  progress("car 1440: scrolled");
  const scrolled1440 = await readState("#save");
  check(scrolled1440.banner?.visible === true, "car 1440 scrolled: the banner is not visible");
  check(scrolled1440.banner?.rect.top === 0, "car 1440 scrolled: the banner did not stay at the top");
  check(scrolled1440.side?.top === scrolled1440.varHeight, "car 1440 scrolled: the side left the banner");

  const carPosts = actionPosts.length;
  const carPath = scrolled1440.path;
  await page.evaluate(() => document.querySelector("#save")?.click());
  await sleep(500);
  progress("car 1440: click refused check");
  const afterCarClick = await readState("#save");
  check(afterCarClick.path === carPath, "car 1440: clicking Save left the car form");
  check(actionPosts.length === carPosts, "car 1440: clicking Save posted a server action");
  check(!/Saving/i.test(afterCarClick.save?.text ?? ""), "car 1440: Save began saving while offline");

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByLabel("Brand", { exact: true }).fill(`${CAR_PROBE} offline`);
  await sleep(650);
  const carDraftOffline = await page.evaluate((key) => localStorage.getItem(key), CAR_KEY);
  check(carDraftOffline != null, "car 1440: typing offline did not update the draft");
  check(
    JSON.parse(carDraftOffline ?? "{}")?.data?.brand === `${CAR_PROBE} offline`,
    "car 1440: the draft does not hold the offline typing",
  );

  await page.evaluate(() => window.scrollTo(0, 0));
  await ctx.setOffline(false);
  progress("car 1440: reconnect set");
  const withdraw1440 = await waitBanner("#save", false);
  check(withdraw1440.at !== null, "car 1440: the banner never withdrew");
  progress(`car 1440: withdraw done (${withdraw1440.at} ms)`);
  check(withdraw1440.at !== null && withdraw1440.at < 600, `car 1440: withdrawal was slow (${withdraw1440.at} ms)`);
  assertReconnected(withdraw1440.state, "car 1440 reconnect");

  // ---- 375: the phone topbar sits below the line -----------------------------------------
  progress("car 375: opening");
  await openCar(375, 800);
  progress("car 375: open");
  assertBaseline(await readState("#save"), "car 375 baseline");
  await typeCar(CAR_PROBE);
  await ctx.setOffline(true);
  progress("car 375: offline set");
  const shown375 = await waitBanner("#save", true);
  const delay375 = shown375.at;
  progress(`car 375: banner wait done (${delay375} ms)`);
  check(delay375 !== null, "car 375: the banner never appeared");
  check(delay375 !== null && delay375 >= 1000, `car 375: the banner appeared too fast (${delay375} ms)`);
  assertOffline(shown375.state, "car 375 offline", 375, "#save");
  assertMobileBars(shown375.state, "car 375 offline");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(120);
  const scrolled375 = await readState("#save");
  check(scrolled375.banner?.rect.top === 0, "car 375 scrolled: the banner did not stay at the top");
  check(scrolled375.topbar?.top === scrolled375.varHeight, "car 375 scrolled: the topbar left the banner");

  await page.evaluate(() => window.scrollTo(0, 0));
  await ctx.setOffline(false);
  const withdraw375 = await waitBanner("#save", false);
  check(withdraw375.at !== null, "car 375: the banner never withdrew");
  check(withdraw375.at !== null && withdraw375.at < 600, `car 375: withdrawal was slow (${withdraw375.at} ms)`);
  assertReconnected(withdraw375.state, "car 375 reconnect");
  check(withdraw375.state.topbar?.top === "0px", "car 375 reconnect: the topbar did not return to the top");

  // ---- settings: the same annotation reaches the card saves ------------------------------
  progress("settings: opening");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(SETTINGS_PATH, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Tagline", { exact: true }).waitFor();
  // The toast portal only exists after the client has mounted; wait for it before typing so the
  // controlled input's React handler is listening.
  await page.locator("#toast").waitFor({ state: "attached" });
  await page.waitForTimeout(400);
  await page.evaluate((key) => localStorage.removeItem(key), SETTING_KEY);
  progress("settings: open");
  assertBaseline(await readState("#tagSave"), "settings baseline");

  const savedTagline = await page.getByLabel("Tagline", { exact: true }).inputValue();
  await page.getByLabel("Tagline", { exact: true }).fill(TAG_PROBE);
  await page.waitForFunction(() => {
    const save = document.querySelector("#tagSave");
    return save instanceof HTMLButtonElement && !save.disabled;
  });
  await sleep(650);
  const settingDraftBefore = await page.evaluate((key) => localStorage.getItem(key), SETTING_KEY);
  check(settingDraftBefore != null, "settings: the draft was not written before going offline");
  check(
    JSON.parse(settingDraftBefore ?? "{}")?.value === TAG_PROBE,
    "settings: the draft does not hold the typed tagline",
  );
  check(
    JSON.parse(settingDraftBefore ?? "{}")?.base === savedTagline,
    "settings: the draft did not keep the saved tagline as its base",
  );

  await ctx.setOffline(true);
  progress("settings: offline set");
  const shownSettings = await waitBanner("#tagSave", true);
  progress(`settings: banner wait done (${shownSettings.at} ms)`);
  check(shownSettings.at !== null, "settings: the banner never appeared");
  assertOffline(shownSettings.state, "settings offline", 1440, "#tagSave");
  assertDesktopBars(shownSettings.state, "settings offline");
  check(shownSettings.state.saveCount >= 3, "settings: not every card's Save was annotated");

  const settingsPosts = actionPosts.length;
  const settingsPath = shownSettings.state.path;
  await page.evaluate(() => document.querySelector("#tagSave")?.click());
  await sleep(600);
  progress("settings: click refused check");
  const afterSettingsClick = await readState("#tagSave");
  check(afterSettingsClick.path === settingsPath, "settings: clicking Save left the page");
  check(actionPosts.length === settingsPosts, "settings: clicking Save posted a server action");
  check(
    (await page.getByLabel("Tagline", { exact: true }).inputValue()) === TAG_PROBE,
    "settings: clicking Save changed the field",
  );

  await ctx.setOffline(false);
  progress("settings: reconnect set");
  const withdrawSettings = await waitBanner("#tagSave", false);
  check(withdrawSettings.at !== null, "settings: the banner never withdrew");
  progress(`settings: withdraw done (${withdrawSettings.at} ms)`);
  check(
    withdrawSettings.at !== null && withdrawSettings.at < 600,
    `settings: withdrawal was slow (${withdrawSettings.at} ms)`,
  );
  assertReconnected(withdrawSettings.state, "settings reconnect");
  check(withdrawSettings.state.save?.disabled === false, "settings: the dirty Save did not return");
  check(
    (await page.getByLabel("Tagline", { exact: true }).inputValue()) === TAG_PROBE,
    "settings: the typed tagline did not survive the offline leg",
  );

  // ---- the fetch-failure signal, with navigator.onLine still true ------------------------
  progress("failure leg: opening");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(CAR_PATH, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  await page.locator(".mbar").waitFor({ state: "attached" });
  await page.waitForTimeout(400);
  assertBaseline(await readState("#save"), "failure leg baseline");
  progress("failure leg: refused probe");
  await page.evaluate(() =>
    fetch("http://127.0.0.1:59999/offline-probe", { cache: "no-store" }).catch(() => {
      /* the banner now owns the failure */
    }),
  );
  const shownFail = await waitBanner("#save", true);
  const failDelay = shownFail.at;
  failureLeg = true;
  progress(`failure leg: banner wait done (${failDelay} ms)`);
  check(failDelay !== null, "failure leg: the banner never appeared");
  check(failDelay !== null && failDelay >= 1000, `failure leg: the banner appeared too fast (${failDelay} ms)`);
  check(shownFail.state.online === true, "failure leg: navigator.onLine should still be true");
  check(shownFail.state.banner?.text === LINE, "failure leg: the line is not the approved line");
  check(shownFail.state.save?.ariaDisabled === "true", "failure leg: Save is not annotated");
  progress("failure leg: success fetch");
  await page.evaluate(() => fetch(`/?probe=${Date.now()}`, { cache: "no-store" }));
  const clearFail = await waitBanner("#save", false);
  check(clearFail.at !== null, "failure leg: the banner did not withdraw after a successful fetch");
  progress(`failure leg: withdraw done (${clearFail.at} ms)`);
  check(clearFail.at !== null && clearFail.at < 600, `failure leg: withdrawal was slow (${clearFail.at} ms)`);
  assertReconnected(clearFail.state, "failure leg reconnect");
  check(shownFail.state.save?.disabled === false, "failure leg: the car Save was natively disabled");

  // ---- clean up ---------------------------------------------------------------------------
  progress("cleanup");
  await cleanDrafts();
  const keysAfter = await page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("ts-draft:"))
      .sort(),
  );
  const finalState = await readState("#save");

  const after = chromiumCount();
  check(after <= before, `a Chrome was launched (${before} → ${after})`);
  // The browser logs the offline transport failures itself (the Next dev HMR socket and any
  // resource fetch); they are the condition under test, not app errors. Any other console error
  // still fails the drive.
  const offlineTransport = /WebSocket connection to .*_next\/webpack-hmr.*failed|ERR_INTERNET_DISCONNECTED/i;
  const unexpectedConsole = consoleErrors.filter(
    (entry) =>
      !offlineTransport.test(entry.text) &&
      !(failureLeg && /favicon|ERR_FAILED|ERR_CONNECTION_REFUSED|Failed to fetch/i.test(entry.text)),
  );
  check(unexpectedConsole.length === 0, `console errors: ${JSON.stringify(unexpectedConsole.slice(0, 3))}`);
  check(pageErrors.length === 0, `page errors: ${JSON.stringify(pageErrors.slice(0, 3))}`);
  check(httpErrors.length === 0, `HTTP errors: ${JSON.stringify(httpErrors.slice(0, 3))}`);
  check(keysAfter.length === 0, `test drafts survived cleanup: ${keysAfter.join(", ")}`);
  check(finalState.banner?.hidden === true, "the banner was left visible");
  check(finalState.marker === false, "the offline marker was left set");
  check(finalState.saveCount === 0, "annotated Save controls were left behind");

  const readings = {
    ok: problems.length === 0,
    problems,
    ua,
    chromium: { before, after },
    lines: {
      car1440: {
        delayMs: delay1440,
        withdrawMs: withdraw1440.at,
        text: shown1440.state.banner?.text,
        save: shown1440.state.save,
        banner: shown1440.state.banner,
      },
      car375: {
        delayMs: delay375,
        withdrawMs: withdraw375.at,
        text: shown375.state.banner?.text,
        save: shown375.state.save,
        banner: shown375.state.banner,
        topbar: shown375.state.topbar,
        side: shown375.state.side,
      },
      settings: {
        delayMs: shownSettings.at,
        withdrawMs: withdrawSettings.at,
        saveCount: shownSettings.state.saveCount,
        text: shownSettings.state.banner?.text,
        save: shownSettings.state.save,
      },
      fetchFailure: {
        navigatorOnline: shownFail.state.online,
        delayMs: failDelay,
        withdrawMs: clearFail.at,
        save: shownFail.state.save,
      },
    },
    drafts: {
      carBeforeOffline: carDraftBefore != null,
      carAfterOffline: carDraftOffline != null,
      settingsBeforeOffline: settingDraftBefore != null,
      keysAfterCleanup: keysAfter,
    },
    network: {
      serverActionPosts: actionPosts.length,
      nonGetRequests: nonGet.map((entry) => ({ method: entry.method, sameOrigin: entry.sameOrigin, action: entry.action })),
    },
    consoleErrors,
    unexpectedConsole,
    pageErrors,
    httpErrors,
    checkedAt: new Date().toISOString(),
  };
  writeFileSync(RUNS + "task35.json", JSON.stringify(readings, null, 2) + "\n");

  console.log(
    JSON.stringify(
      {
        ok: readings.ok,
        problems,
        chromium: readings.chromium,
        car1440: {
          delayMs: delay1440,
          withdrawMs: withdraw1440.at,
          banner: shown1440.state.banner?.text,
          value: shown1440.state.save?.ariaDisabled,
          reason: (shown1440.state.save?.describedBy ?? "").includes(BANNER_ID),
        },
        car375: {
          delayMs: delay375,
          withdrawMs: withdraw375.at,
          topbarTop: shown375.state.topbar?.top,
          bannerHeight: shown375.state.varHeight,
        },
        settings: {
          delayMs: shownSettings.at,
          withdrawMs: withdrawSettings.at,
          saveCount: shownSettings.state.saveCount,
          clickPosts: actionPosts.length - settingsPosts,
        },
        fetchFailure: {
          online: shownFail.state.online,
          delayMs: failDelay,
          withdrawMs: clearFail.at,
        },
        serverActionPosts: actionPosts.length,
        keysAfter,
        unexpectedConsole,
        pageErrors,
        httpErrors,
      },
      null,
      2,
    ),
  );
  if (problems.length > 0) process.exitCode = 1;
} catch (error) {
  fatal = String(error?.stack ?? error);
  problems.push(`fatal: ${fatal}`);
  console.error(fatal);
  try {
    const readings = {
      ok: false,
      problems,
      ua,
      fatal,
      consoleErrors,
      pageErrors,
      httpErrors,
      actionPosts,
      checkedAt: new Date().toISOString(),
    };
    writeFileSync(RUNS + "task35.json", JSON.stringify(readings, null, 2) + "\n");
  } catch {
    /* nothing more to say */
  }
  process.exitCode = 1;
} finally {
  clearTimeout(watchdog);
  try {
    await ctx.setOffline(false);
  } catch {
    /* page may be gone */
  }
  try {
    await page.unroute("**/favicon.ico");
  } catch {
    /* no route */
  }
  try {
    await cleanDrafts();
  } catch {
    /* the page may be gone */
  }
  await detach(browser);
}
