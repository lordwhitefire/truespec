// TASK-005 Task 37 — the draft comes back, and the recovery line is true, driven live.
//
// Read-only toward the store: the drive types, goes offline, reconnects, and never presses Save.
// It proves the car form and a settings card are put back from the device draft on reload, the
// approved recovery line appears after a shown offline line only when a draft is present, the line
// stays until the draft is saved/discarded or the form leaves, and nothing is auto-sent.
// Test drafts are removed at the end.
//
// Attach-only: the Chrome on :9222 is the owner's; this drive never launches one.
//
// usage: node task37.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task37/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const OFFLINE_LINE = "Offline, your draft is kept on this device.";
const RECOVERY_LINE = "You're back online. Your draft is still here — press Save.";
const CAR_KEY = "ts-draft:car:new";
const SETTING_KEY = "ts-draft:settings:tagline";
const CAR_PATH = `${BASE}/office/car/new`;
const SETTINGS_PATH = `${BASE}/office/settings`;
const CAR_PROBE = "Task37 draft probe";
const TAG_PROBE = "Task37 tagline probe";

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
    const entry = { method: req.method(), sameOrigin, action: req.headers()["next-action"] ?? null };
    nonGet.push(entry);
    if (entry.action) actionPosts.push(entry);
  }
});

async function readState() {
  return page.evaluate((ids) => {
    const banner = document.getElementById(ids.banner);
    const style = banner ? getComputedStyle(banner) : null;
    const rect = banner ? banner.getBoundingClientRect() : null;
    const root = document.documentElement;
    const side = document.querySelector(".side");
    const topbar = document.querySelector(".topbar");
    const save = document.querySelector("#save");
    const saveStyle = save ? getComputedStyle(save) : null;
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
            position: style.position,
            rect: {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          }
        : null,
      offlineMarker: root.hasAttribute(ids.offline),
      recoveredMarker: root.hasAttribute(ids.recovered),
      draftMarker: root.hasAttribute(ids.draft),
      varHeight: getComputedStyle(root).getPropertyValue("--ts-office-offline-h").trim(),
      side: side
        ? {
            display: getComputedStyle(side).display,
            top: getComputedStyle(side).top,
          }
        : null,
      topbar: topbar
        ? {
            display: getComputedStyle(topbar).display,
            top: getComputedStyle(topbar).top,
          }
        : null,
      save: save
        ? {
            text: (save.textContent ?? "").replace(/\s+/g, " ").trim(),
            disabled: save.disabled,
            ariaDisabled: save.getAttribute("aria-disabled"),
            tabIndex: save.getAttribute("tabindex"),
            className: save.className,
            describedBy: save.getAttribute("aria-describedby"),
            cursor: saveStyle.cursor,
            filter: saveStyle.filter,
          }
        : null,
      scrollY: Math.round(scrollY),
    };
  }, {
    banner: "ts-office-offline",
    offline: "data-ts-office-offline",
    recovered: "data-ts-office-recovered",
    draft: "data-ts-office-draft",
  });
}

async function waitLine(text, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await readState();
    if (state.banner?.visible === true && state.banner.text === text) {
      return { at: Date.now() - started, state };
    }
    await sleep(60);
  }
  return { at: null, state: await readState() };
}

async function openCar() {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(CAR_PATH, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  await page.locator(".mbar").waitFor({ state: "attached" });
  await page.waitForTimeout(400);
}

async function openSettings() {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(SETTINGS_PATH, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Tagline", { exact: true }).waitFor();
  await page.locator("#toast").waitFor({ state: "attached" });
  await page.waitForTimeout(400);
}

async function readKeys() {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("ts-draft:"))
      .sort(),
  );
}

async function cleanDrafts() {
  await page.evaluate(
    ([carKey, settingKey]) => {
      localStorage.removeItem(carKey);
      localStorage.removeItem(settingKey);
    },
    [CAR_KEY, SETTING_KEY],
  );
  // The form's pending write (if any) is flushed on unmount; this cleanup runs on a page with no
  // draft form, so nothing can re-create the keys after it.
}

let offlineShown = null;
let recoveryShown = null;
let settingsRecovery = null;
let settingsOfflineAt = null;
let fatal = null;
try {
  // ---- start clean: the keys can only be a previous run's --------------------------------
  progress("car: opening clean");
  await openCar();
  await cleanDrafts();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  await page.locator(".mbar").waitFor({ state: "attached" });
  await page.waitForTimeout(400);
  check((await readKeys()).length === 0, "the test did not start from a clean draft store");

  // ---- type, change the primary state, then reload ---------------------------------------
  const brand = page.getByLabel("Brand", { exact: true });
  await brand.fill(CAR_PROBE);
  // Capture the target before the click: the locator is live, and after the click the first
  // `:not(.on)` button is the one that has just been deselected.
  const stateButton = page.locator(".stb:not(.on)").first();
  const typedStateId = await stateButton.getAttribute("data-st");
  const typedStateLabel = (await stateButton.textContent())?.trim() ?? "";
  await stateButton.click();
  await page.waitForTimeout(700);
  await page.waitForFunction((key) => localStorage.getItem(key) != null, CAR_KEY, { timeout: 10000 });
  const carDraft = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), CAR_KEY);
  check(carDraft?.data?.brand === CAR_PROBE, "the car draft did not hold the typed brand");
  check(carDraft?.data?.stateId === typedStateId, "the car draft did not hold the chosen state");
  progress(`car: typed and draft written (state ${typedStateLabel})`);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  await page.locator(".mbar").waitFor({ state: "attached" });
  await page.waitForTimeout(600);
  const afterReloadBrand = await page.getByLabel("Brand", { exact: true }).inputValue();
  const afterReloadStateId = await page.locator(".stb.on").getAttribute("data-st");
  const afterReload = await readState();
  const draftAfterReload = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    CAR_KEY,
  );
  check(afterReloadBrand === CAR_PROBE, `the car brand was not restored (got ${afterReloadBrand})`);
  check(afterReloadStateId === typedStateId, "the car primary state was not restored");
  check(draftAfterReload?.data?.brand === CAR_PROBE, "the car draft did not survive the reload");
  check(afterReload.banner?.hidden === true, "the recovery line appeared on a plain online reload");
  check(afterReload.draftMarker === true, "the restored car form did not announce its draft");
  check(afterReload.recoveredMarker === false, "the recovery marker was set on a plain reload");
  progress("car: restored after reload");

  // ---- offline, then back: the approved recovery line ------------------------------------
  await ctx.setOffline(true);
  progress("car: offline set");
  offlineShown = await waitLine(OFFLINE_LINE);
  check(offlineShown.at !== null, "the offline line never appeared on the car form");
  check(offlineShown.at !== null && offlineShown.at >= 1000, "the offline line appeared too fast");
  check(offlineShown.state.draftMarker === true, "the car form did not announce its draft offline");
  check(offlineShown.state.offlineMarker === true, "the offline marker is missing");
  await sleep(150);
  await ctx.setOffline(false);
  progress("car: online set");
  recoveryShown = await waitLine(RECOVERY_LINE);
  check(recoveryShown.at !== null, "the approved recovery line never appeared");
  check(recoveryShown.state.online === true, "navigator.onLine was not true after reconnect");
  check(recoveryShown.state.offlineMarker === false, "the offline marker survived reconnect");
  check(recoveryShown.state.recoveredMarker === true, "the recovery marker is missing");
  check(recoveryShown.state.draftMarker === true, "the draft marker is missing after reconnect");
  check(recoveryShown.state.banner?.role === "status", "the recovery line is not a status region");
  check(recoveryShown.state.banner?.live === "polite", "the recovery line is not polite");
  check(recoveryShown.state.banner?.position === "sticky", "the recovery line is not sticky");
  check(recoveryShown.state.banner?.rect.top === 0, "the recovery line is not at the top");
  check(recoveryShown.state.side?.top === recoveryShown.state.varHeight, "the side does not sit below the recovery line");
  check(recoveryShown.state.save?.ariaDisabled === null, "Save stayed aria-disabled after reconnect");
  check(recoveryShown.state.save?.tabIndex === null, "Save stayed out of the tab order after reconnect");
  check(
    !(recoveryShown.state.save?.className ?? "").includes("ts-office-offline-save"),
    "Save kept the offline class after reconnect",
  );
  check(
    (await page.getByLabel("Brand", { exact: true }).inputValue()) === CAR_PROBE,
    "the restored car brand was lost on reconnect",
  );
  check(actionPosts.length === 0, "a server action was posted while the draft was restored or during reconnect");
  progress(`car: recovery line shown (${recoveryShown.at} ms after online)`);

  await sleep(1400);
  const stillUp = await readState();
  check(stillUp.banner?.visible === true && stillUp.banner.text === RECOVERY_LINE, "the recovery line did not stay up");
  check(stillUp.draftMarker === true, "the draft marker vanished while the line was up");
  progress("car: recovery line stayed up (no timer)");

  // ---- settings: the same restore and line ----------------------------------------------
  // Clean the settings key before the settings client mounts, so this leg starts clean. The car
  // form's own draft stays; leaving the car form takes its presence marker down.
  await page.evaluate((key) => localStorage.removeItem(key), SETTING_KEY);
  await openSettings();
  const settingsBannerAtOpen = await readState();
  check(settingsBannerAtOpen.banner?.hidden === true, "the recovery line survived leaving the car form");
  check(settingsBannerAtOpen.draftMarker === false, "the car draft marker survived leaving the car form");
  const tagline = page.getByLabel("Tagline", { exact: true });
  const savedTagline = await tagline.inputValue();
  await tagline.fill(TAG_PROBE);
  await page.waitForTimeout(700);
  await page.waitForFunction((key) => localStorage.getItem(key) != null, SETTING_KEY, { timeout: 10000 });
  const settingDraft = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    SETTING_KEY,
  );
  check(settingDraft?.base === savedTagline, "the settings draft did not keep the saved tagline as base");
  check(settingDraft?.value === TAG_PROBE, "the settings draft did not keep the typed tagline");
  progress("settings: typed and draft written");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("Tagline", { exact: true }).waitFor();
  await page.locator("#toast").waitFor({ state: "attached" });
  await page.waitForTimeout(600);
  const afterSettingsReload = await page.getByLabel("Tagline", { exact: true }).inputValue();
  const settingsStateAfterReload = await readState();
  check(afterSettingsReload === TAG_PROBE, `the tagline was not restored (got ${afterSettingsReload})`);
  check(settingsStateAfterReload.banner?.hidden === true, "the recovery line appeared on a plain settings reload");
  check(settingsStateAfterReload.draftMarker === true, "the restored settings form did not announce its draft");
  check(
    await page.evaluate(() => {
      const save = document.querySelector("#tagSave");
      return save instanceof HTMLButtonElement && !save.disabled;
    }),
    "the restored tagline did not make its Save available",
  );
  progress("settings: restored after reload");

  await ctx.setOffline(true);
  const settingsOffline = await waitLine(OFFLINE_LINE);
  settingsOfflineAt = settingsOffline.at;
  check(settingsOffline.at !== null, "the offline line never appeared on settings");
  check(settingsOffline.at !== null && settingsOffline.at >= 1000, "the settings offline line appeared too fast");
  check(settingsOffline.state.offlineMarker === true, "the settings offline marker is missing");
  await sleep(150);
  await ctx.setOffline(false);
  settingsRecovery = await waitLine(RECOVERY_LINE);
  check(settingsRecovery.at !== null, "the recovery line never appeared on settings");
  check(settingsRecovery.state.recoveredMarker === true, "the settings recovery marker is missing");
  check(settingsRecovery.state.offlineMarker === false, "the settings offline marker survived reconnect");
  check(settingsRecovery.state.draftMarker === true, "the settings draft marker is missing after reconnect");
  check(
    (await page.getByLabel("Tagline", { exact: true }).inputValue()) === TAG_PROBE,
    "the restored tagline was lost on reconnect",
  );
  check(
    await page.evaluate(() => {
      const save = document.querySelector("#tagSave");
      return save instanceof HTMLButtonElement && !save.disabled;
    }),
    "the settings Save was not available with the restored draft",
  );
  check(actionPosts.length === 0, "a server action was posted during the settings restore/reconnect");
  progress(`settings: recovery line shown (${settingsRecovery.at} ms after online)`);

  // ---- leaving the form takes the line down; the draft itself stays until an act ----------
  await page.goto(`${BASE}/office`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page.waitForTimeout(300);
  const left = await readState();
  check(left.banner?.hidden === true, "the recovery line survived leaving the draft form");
  check(left.draftMarker === false, "the draft marker survived leaving the draft form");
  const keysAfterLeaving = await readKeys();
  check(keysAfterLeaving.includes(CAR_KEY), "the car draft was erased merely by leaving");
  check(keysAfterLeaving.includes(SETTING_KEY), "the settings draft was erased merely by leaving");
  progress("leaving: line down, drafts kept");

  await cleanDrafts();
  const keysAfter = await readKeys();
  const after = chromiumCount();
  check(after <= before, `a Chrome was launched (${before} → ${after})`);
  const offlineTransport = /WebSocket connection to .*_next\/webpack-hmr.*failed|ERR_INTERNET_DISCONNECTED/i;
  const unexpectedConsole = consoleErrors.filter((entry) => !offlineTransport.test(entry.text));
  check(unexpectedConsole.length === 0, `console errors: ${JSON.stringify(unexpectedConsole.slice(0, 3))}`);
  check(pageErrors.length === 0, `page errors: ${JSON.stringify(pageErrors.slice(0, 3))}`);
  check(httpErrors.length === 0, `HTTP errors: ${JSON.stringify(httpErrors.slice(0, 3))}`);
  check(keysAfter.length === 0, `test drafts survived cleanup: ${keysAfter.join(", ")}`);

  const readings = {
    ok: problems.length === 0,
    problems,
    ua,
    chromium: { before, after },
    car: {
      probe: CAR_PROBE,
      typedStateId,
      typedStateLabel,
      restoredBrand: afterReloadBrand,
      restoredStateId: afterReloadStateId,
      draftAfterReload,
      offlineAt: offlineShown?.at ?? null,
      recoveryAt: recoveryShown?.at ?? null,
      recoveryText: recoveryShown?.state.banner?.text ?? null,
      recoveryMarker: recoveryShown?.state.recoveredMarker ?? false,
      stillUpAfterMs: 1400,
    },
    settings: {
      probe: TAG_PROBE,
      savedBase: savedTagline,
      restoredValue: afterSettingsReload,
      offlineAt: settingsOfflineAt,
      recoveryAt: settingsRecovery?.at ?? null,
      recoveryText: settingsRecovery?.state.banner?.text ?? null,
      recoveryMarker: settingsRecovery?.state.recoveredMarker ?? false,
    },
    left: {
      bannerHidden: left.banner?.hidden ?? null,
      draftMarker: left.draftMarker,
      keysAfterLeaving,
    },
    serverActionPosts: actionPosts.length,
    nonGetRequests: nonGet,
    consoleErrors,
    unexpectedConsole,
    pageErrors,
    httpErrors,
    keysAfterCleanup: keysAfter,
    checkedAt: new Date().toISOString(),
  };
  writeFileSync(RUNS + "task37.json", JSON.stringify(readings, null, 2) + "\n");
  console.log(JSON.stringify(readings, null, 2));
  if (problems.length > 0) process.exitCode = 1;
} catch (error) {
  fatal = String(error);
  problems.push(`fatal: ${fatal}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    await ctx.setOffline(false);
  } catch {
    /* the renderer may be gone */
  }
  await detach(browser);
}
