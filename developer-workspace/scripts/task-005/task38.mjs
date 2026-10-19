// TASK-005 Task 38 — a draft is erased only by an act, driven live.
//
// Read-only toward the car store; the one demo write is the full-tank default, saved to a probe
// and then saved back to the value it held. The drive proves:
//   - Cancel (discard) clears the car draft;
//   - a reload alone does not clear it;
//   - a successful Save clears the settings draft and takes the recovery line down;
//   - signing out clears every ts-draft key and leaves other storage alone (a separate, sessionless
//     incognito context, so the owner's session is untouched);
//   - no server action happens on discard, reload, offline, or reconnect.
//
// Attach-only: the Chrome on :9222 is the owner's; this drive never launches one.
//
// usage: node task38.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task38/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const OFFLINE_LINE = "Offline, your draft is kept on this device.";
const RECOVERY_LINE = "You're back online. Your draft is still here — press Save.";
const CAR_KEY = "ts-draft:car:new";
const TANK_KEY = "ts-draft:settings:tank";
const CAR_PATH = `${BASE}/office/car/new`;
const SETTINGS_PATH = `${BASE}/office/settings`;
const DISCARD_PROBE = "Task38 discard probe";
const KEEP_PROBE = "Task38 kept probe";

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
    const entry = {
      method: req.method(),
      sameOrigin: req.url().startsWith(BASE),
      action: req.headers()["next-action"] ?? null,
    };
    nonGet.push(entry);
    if (entry.action) actionPosts.push(entry);
  }
});

async function readBanner() {
  return page.evaluate(() => {
    const banner = document.getElementById("ts-office-offline");
    return {
      hidden: banner?.hidden ?? null,
      visible: banner ? banner.getClientRects().length > 0 : false,
      text: (banner?.textContent ?? "").trim(),
      offlineMarker: document.documentElement.hasAttribute("data-ts-office-offline"),
      recoveredMarker: document.documentElement.hasAttribute("data-ts-office-recovered"),
      draftMarker: document.documentElement.hasAttribute("data-ts-office-draft"),
    };
  });
}

async function waitLine(text, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const state = await readBanner();
    if (state.visible && state.text === text) return { at: Date.now() - started, state };
    await sleep(60);
  }
  return { at: null, state: await readBanner() };
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
  await page.locator("#tank").waitFor();
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

async function removeTestKeys() {
  await page.evaluate(
    ([carKey, tankKey]) => {
      localStorage.removeItem(carKey);
      localStorage.removeItem(tankKey);
    },
    [CAR_KEY, TANK_KEY],
  );
}

async function waitToast(pattern) {
  await page.waitForFunction(
    (re) => {
      const toast = document.querySelector("#toast");
      return !!toast && new RegExp(re).test(toast.textContent ?? "");
    },
    pattern,
    { timeout: 15000 },
  );
}

let savedTank = null;
let tankNeedsRestore = false;
let discardActions = 0;
let keepActions = 0;
let recoveryAfterSave = null;
let signoutKeys = null;
let fatal = null;
try {
  // ---- start clean on the car add form -----------------------------------------------------
  progress("car: opening clean");
  await openCar();
  await removeTestKeys();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  await page.locator(".mbar").waitFor({ state: "attached" });
  await page.waitForTimeout(400);
  check((await readKeys()).length === 0, "the test did not start from a clean draft store");
  check(actionPosts.length === 0, "an action posted while opening the clean car form");

  // ---- discard: Cancel clears the draft, with no action -----------------------------------
  await page.getByLabel("Brand", { exact: true }).fill(DISCARD_PROBE);
  await page.waitForTimeout(700);
  await page.waitForFunction((key) => localStorage.getItem(key) != null, CAR_KEY, { timeout: 10000 });
  check((await readBanner()).draftMarker === true, "the car form did not announce its draft");
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await page.waitForURL(/\/office\/inventory/, { timeout: 15000 });
  await page.waitForTimeout(500);
  discardActions = actionPosts.length;
  check(!(await readKeys()).includes(CAR_KEY), "Cancel did not erase the car draft");
  check((await readBanner()).draftMarker === false, "Cancel left the draft marker set");
  check(discardActions === 0, "Cancel (discard) posted a server action");
  progress("discard: car draft cleared, no action");

  // ---- reload alone does not erase; then Cancel discards it -------------------------------
  await openCar();
  await page.getByLabel("Brand", { exact: true }).fill(KEEP_PROBE);
  await page.waitForTimeout(700);
  await page.waitForFunction((key) => localStorage.getItem(key) != null, CAR_KEY, { timeout: 10000 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  await page.locator(".mbar").waitFor({ state: "attached" });
  await page.waitForTimeout(500);
  const keptBrand = await page.getByLabel("Brand", { exact: true }).inputValue();
  const keptState = await readBanner();
  check(keptBrand === KEEP_PROBE, "the reload did not put the kept draft back");
  check((await readKeys()).includes(CAR_KEY), "a reload alone erased the car draft");
  check(keptState.draftMarker === true, "the restored car form did not announce its draft");
  check(keptState.hidden === true, "a plain reload showed a recovery line");
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await page.waitForURL(/\/office\/inventory/, { timeout: 15000 });
  await page.waitForTimeout(500);
  keepActions = actionPosts.length;
  check(keepActions === 0, "the reload/discard leg posted a server action");
  check(!(await readKeys()).includes(CAR_KEY), "Cancel did not erase the kept car draft");
  progress("reload: draft kept; then discarded");

  // ---- save: one demo full-tank write, then restore it ------------------------------------
  await page.evaluate((key) => localStorage.removeItem(key), TANK_KEY);
  await openSettings();
  const tank = page.locator("#tank");
  savedTank = await tank.inputValue();
  const numeric = Number(savedTank);
  const probeTank = Number.isFinite(numeric) ? String(numeric + 5000) : "5000";
  check(probeTank !== savedTank, "the full-tank probe would not be a change");
  await tank.fill(probeTank);
  await page.waitForTimeout(700);
  await page.waitForFunction((key) => localStorage.getItem(key) != null, TANK_KEY, { timeout: 10000 });
  const tankDraft = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    TANK_KEY,
  );
  check(tankDraft?.base === savedTank, `the settings draft did not use the saved value as base (${tankDraft?.base} vs ${savedTank})`);
  check(tankDraft?.value === probeTank, "the settings draft did not keep the typed tank value");
  check((await readBanner()).draftMarker === true, "the settings form did not announce its draft");

  await ctx.setOffline(true);
  const off = await waitLine(OFFLINE_LINE);
  check(off.at !== null && off.at >= 1000, "the settings offline line did not appear conservatively");
  await sleep(120);
  await ctx.setOffline(false);
  const rec = await waitLine(RECOVERY_LINE);
  recoveryAfterSave = rec;
  check(rec.at !== null, "the recovery line did not appear before the settings save");
  check(rec.state.draftMarker === true, "the settings draft marker was missing before save");
  const saveBefore = actionPosts.length;
  await page.locator("#tankSave").click();
  await page.waitForFunction((key) => localStorage.getItem(key) == null, TANK_KEY, { timeout: 15000 });
  await waitToast("Default saved|Nothing changed");
  await page.waitForTimeout(300);
  const afterFirstSave = await readBanner();
  check(!(await readKeys()).includes(TANK_KEY), "a successful save did not erase the settings draft");
  check(afterFirstSave.draftMarker === false, "the draft marker survived a successful save");
  check(afterFirstSave.hidden === true, "the recovery line survived a successful save");
  check(actionPosts.length === saveBefore + 1, "the first settings save did not post exactly one action");
  tankNeedsRestore = true;
  progress(`save: draft cleared, recovery line down (${recoveryAfterSave.at} ms after reconnect)`);

  // Restore the original full-tank value — a second, separate save, so the probe is not left in the
  // store. The draft it creates is also erased by its save.
  await tank.fill(savedTank);
  await page.waitForTimeout(700);
  const restoreBefore = actionPosts.length;
  await page.locator("#tankSave").click();
  await page.waitForFunction((key) => localStorage.getItem(key) == null, TANK_KEY, { timeout: 15000 });
  await waitToast("Default saved|Nothing changed");
  await page.waitForTimeout(300);
  check(actionPosts.length === restoreBefore + 1, "the restore save did not post exactly one action");
  check(!(await readKeys()).includes(TANK_KEY), "the restore save left a settings draft");
  tankNeedsRestore = false;
  progress("save: original full-tank value restored");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#tank").waitFor();
  await page.locator("#toast").waitFor({ state: "attached" });
  await page.waitForTimeout(500);
  const storedTankAfter = await page.locator("#tank").inputValue();
  check(storedTankAfter === savedTank, `the full-tank default was not restored (${storedTankAfter} vs ${savedTank})`);
  check(!(await readKeys()).includes(TANK_KEY), "the settings draft survived the final reload");
  progress("save: store read back at the original value");

  // ---- sign-out: a sessionless incognito context, so the owner's session is untouched ----
  const signoutCtx = await browser.newContext();
  const so = await signoutCtx.newPage();
  await so.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await so.evaluate(() => {
    localStorage.setItem("ts-draft:car:new", "{}");
    localStorage.setItem("ts-draft:settings:tank", "{}");
    localStorage.setItem("ts-theme", "light");
    localStorage.setItem("not-a-draft", "keep");
  });
  await so.goto(BASE + "/office/sign-out", { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 60; i += 1) {
    try {
      signoutKeys = await so.evaluate(() => Object.keys(localStorage).sort());
    } catch {
      signoutKeys = null;
    }
    if (signoutKeys && !signoutKeys.some((key) => key.startsWith("ts-draft:"))) break;
    await sleep(200);
  }
  check(
    signoutKeys !== null && !signoutKeys.some((key) => key.startsWith("ts-draft:")),
    "sign-out did not erase every ts-draft key",
  );
  check(signoutKeys?.includes("ts-theme") === true, "sign-out erased the theme setting");
  check(signoutKeys?.includes("not-a-draft") === true, "sign-out erased a non-draft key");
  await signoutCtx.close();
  progress("sign-out: drafts erased, theme and non-draft key kept (incognito)");

  // ---- final cleanup and evidence ----------------------------------------------------------
  await page.goto(`${BASE}/office`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page.waitForTimeout(300);
  await removeTestKeys();
  const keysAfter = await readKeys();
  const after = chromiumCount();
  check(after <= before, `a Chrome was launched (${before} → ${after})`);
  check(keysAfter.length === 0, `test drafts survived cleanup: ${keysAfter.join(", ")}`);
  check(!tankNeedsRestore, "the demo full-tank write was not restored");
  check(actionPosts.length === 2, `expected exactly the two demo saves, saw ${actionPosts.length} actions`);

  const offlineTransport = /WebSocket connection to .*_next\/webpack-hmr.*failed|ERR_INTERNET_DISCONNECTED/i;
  const unexpectedConsole = consoleErrors.filter((entry) => !offlineTransport.test(entry.text));
  check(unexpectedConsole.length === 0, `console errors: ${JSON.stringify(unexpectedConsole.slice(0, 3))}`);
  check(pageErrors.length === 0, `page errors: ${JSON.stringify(pageErrors.slice(0, 3))}`);
  check(httpErrors.length === 0, `HTTP errors: ${JSON.stringify(httpErrors.slice(0, 3))}`);

  const readings = {
    ok: problems.length === 0,
    problems,
    ua,
    chromium: { before, after },
    discard: {
      probe: DISCARD_PROBE,
      keyAfter: (await readKeys()).includes(CAR_KEY),
      actions: discardActions,
    },
    keep: {
      probe: KEEP_PROBE,
      restoredBrand: keptBrand,
      keyAfterReload: true,
      actions: keepActions,
    },
    save: {
      savedTank,
      probeTank,
      recoveryAt: recoveryAfterSave?.at ?? null,
      recoveryText: recoveryAfterSave?.state.text ?? null,
      draftAfterSave: (await readKeys()).includes(TANK_KEY),
      storedTankAfter,
      actions: actionPosts.length,
    },
    signout: {
      keys: signoutKeys,
      draftsErased: signoutKeys !== null && !signoutKeys.some((key) => key.startsWith("ts-draft:")),
      themeKept: signoutKeys?.includes("ts-theme") ?? false,
      nonDraftKept: signoutKeys?.includes("not-a-draft") ?? false,
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
  writeFileSync(RUNS + "task38.json", JSON.stringify(readings, null, 2) + "\n");
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
  // A failed run must not leave the demo full-tank value changed. Best effort in the UI, then
  // remove the test's own draft key.
  if (tankNeedsRestore && savedTank !== null) {
    try {
      await openSettings();
      await page.locator("#tank").fill(savedTank);
      await page.waitForTimeout(700);
      await page.locator("#tankSave").click();
      await page.waitForFunction((key) => localStorage.getItem(key) == null, TANK_KEY, {
        timeout: 15000,
      });
    } catch {
      /* reported above as an unreconciled demo write */
    }
  }
  try {
    await removeTestKeys();
  } catch {
    /* page may be gone */
  }
  await detach(browser);
}
