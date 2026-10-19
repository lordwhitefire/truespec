// TASK-005 Task 36 — the device draft store, driven live.
//
// Read-only toward the store: the drive types into the office car form and a settings card and
// never presses Save. It proves the draft appears in localStorage under a ts-draft key, carries
// no photo bytes or customer/enquiry keys, survives a reload, and leaves no server write behind.
// Test drafts are removed at the end.
//
// Attach-only: the Chrome on :9222 is the owner's; this drive never launches one.
//
// usage: node task36.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task36/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const CAR_KEY = "ts-draft:car:new";
const SETTING_KEY = "ts-draft:settings:tagline";
const CAR_PROBE = "Task36 draft probe";
const TAG_PROBE = "Task36 draft probe";
const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(120000);

const consoleErrors = [];
const httpErrors = [];
const posts = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 300)));
page.on("response", (res) => {
  if (res.status() >= 400) httpErrors.push({ url: res.url().replace(BASE, ""), status: res.status() });
});
const typedAt = Date.now();
page.on("request", (req) => {
  if (req.method() !== "GET" && Date.now() >= typedAt) {
    const sameOrigin = req.url().startsWith(BASE);
    posts.push({
      method: req.method(),
      url: sameOrigin ? req.url().replace(BASE, "") : new URL(req.url()).origin,
      sameOrigin,
      action: req.headers()["next-action"] ?? null,
    });
  }
});

const readKeys = () =>
  page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith("ts-draft:"))
      .sort(),
  );

const readDraft = (key) =>
  page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw == null ? null : JSON.parse(raw);
  }, key);

const draftWait = (key) =>
  page.waitForFunction((k) => localStorage.getItem(k) != null, key, { timeout: 10000 });

try {
  // ---- car form ---------------------------------------------------------
  await page.goto(`${BASE}/office/car/new`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  check(page.url().includes("/office/car/new"), `car form did not load: ${page.url()}`);
  check(!page.url().includes("sign-in"), "the office is not signed in — cannot drive the car form");
  const brand = page.getByLabel("Brand", { exact: true });
  await brand.waitFor();

  // This feature is new; the keys can only be a previous run's. Start from a clean pair.
  await page.evaluate(
    ([carKey, settingKey]) => {
      localStorage.removeItem(carKey);
      localStorage.removeItem(settingKey);
    },
    [CAR_KEY, SETTING_KEY],
  );
  const keysBeforeCar = await readKeys();

  await brand.fill(CAR_PROBE);
  await draftWait(CAR_KEY);
  const car = await readDraft(CAR_KEY);
  const carKeys = await readKeys();

  check(car?.v === 1, "the car draft has no version");
  check(car?.data?.brand === CAR_PROBE, "the car draft did not keep the typed brand");
  check(typeof car?.data?.carId !== "string", "a new-car draft unexpectedly carries a car id");
  check(car?.photos?.length === 0, "a new-car draft unexpectedly carries photos");
  check(!Object.prototype.hasOwnProperty.call(car?.data ?? {}, "photo"), "the draft carries a photo input");
  const carJson = JSON.stringify(car ?? {});
  check(!/File|Blob|data:image|base64/i.test(carJson), "the car draft looks like it carries photo bytes");
  check(
    !Object.keys(car?.data ?? {}).some((key) => /customer|enquiry|buyer/i.test(key)),
    "the car draft has a customer-shaped key",
  );
  check(carKeys.includes(CAR_KEY), "the car draft is not under a ts-draft key");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  const carAfterReload = await readDraft(CAR_KEY);
  check(carAfterReload?.data?.brand === CAR_PROBE, "the car draft did not survive the reload");

  // ---- settings card ----------------------------------------------------
  await page.goto(`${BASE}/office/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  check(page.url().includes("/office/settings"), `settings did not load: ${page.url()}`);
  check(!page.url().includes("sign-in"), "the office is not signed in — cannot drive settings");
  const tagline = page.getByLabel("Tagline", { exact: true });
  await tagline.waitFor();
  const tagBase = await tagline.inputValue();

  await tagline.fill(TAG_PROBE);
  await draftWait(SETTING_KEY);
  const setting = await readDraft(SETTING_KEY);
  const keysAfterSettings = await readKeys();
  const settingJson = JSON.stringify(setting ?? {});

  check(setting?.v === 1, "the settings draft has no version");
  check(setting?.base === tagBase, "the settings draft did not keep the saved value as its base");
  check(setting?.value === TAG_PROBE, "the settings draft did not keep the typed value");
  check(!/customer|enquiry|buyer/i.test(settingJson), "the settings draft has a customer-shaped key");
  check(keysAfterSettings.includes(SETTING_KEY), "the settings draft is not under a ts-draft key");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByLabel("Tagline", { exact: true }).waitFor();
  const settingAfterReload = await readDraft(SETTING_KEY);
  check(settingAfterReload?.value === TAG_PROBE, "the settings draft did not survive the reload");

  const allKeys = await readKeys();
  check(
    allKeys.every((key) => key === CAR_KEY || key === SETTING_KEY),
    `unexpected device-draft keys: ${allKeys.join(", ")}`,
  );
  const savePosts = posts.filter((post) => post.action);
  check(savePosts.length === 0, `a server action was posted while typing: ${JSON.stringify(savePosts)}`);

  // ---- clean up the two test drafts (the feature is the product's; these values are not) ----
  await page.evaluate(
    ([carKey, settingKey]) => {
      localStorage.removeItem(carKey);
      localStorage.removeItem(settingKey);
    },
    [CAR_KEY, SETTING_KEY],
  );
  const keysAfterCleanup = await readKeys();

  const after = chromiumCount();
  check(after <= before, `a Chrome was launched (${before} → ${after})`);

  const readings = {
    ok: problems.length === 0,
    problems,
    url: page.url(),
    ua,
    chromium: { before, after },
    keysBeforeCar,
    car: {
      key: CAR_KEY,
      beforeReload: car,
      afterReload: carAfterReload,
      survivesReload: carAfterReload?.data?.brand === CAR_PROBE,
    },
    settings: {
      key: SETTING_KEY,
      beforeReload: setting,
      afterReload: settingAfterReload,
      survivesReload: settingAfterReload?.value === TAG_PROBE,
    },
    postLoads: posts,
    serverActionPosts: savePosts,
    consoleErrors,
    httpErrors,
    keysAfterCleanup,
    checkedAt: new Date().toISOString(),
  };
  writeFileSync(RUNS + "task36.json", JSON.stringify(readings, null, 2) + "\n");

  console.log(
    JSON.stringify(
      {
        ok: readings.ok,
        problems,
        chromium: readings.chromium,
        car: {
          key: CAR_KEY,
          brand: carAfterReload?.data?.brand ?? null,
          baseBrand: carAfterReload?.base?.brand ?? null,
          survivesReload: readings.car.survivesReload,
          dataKeys: Object.keys(car?.data ?? {}).sort(),
        },
        settings: {
          key: SETTING_KEY,
          value: settingAfterReload?.value ?? null,
          baseMatchesSaved: setting?.base === tagBase,
          survivesReload: readings.settings.survivesReload,
        },
        serverActionPosts: savePosts.length,
        consoleErrors,
        httpErrors,
        keysAfterCleanup,
      },
      null,
      2,
    ),
  );
  if (problems.length > 0) process.exitCode = 1;
} finally {
  await detach(browser);
}
