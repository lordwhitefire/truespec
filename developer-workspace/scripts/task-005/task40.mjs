// TASK-005 Task 40 — a draft is never a record, and carries no customer data.
//
// Read-only toward the store: types a car draft and a settings draft, never presses Save, and
// inspects only localStorage. It proves:
//   - the car draft's payload is the car form's own fields (including the car's own two notes),
//     with no customer/enquiry key and no photo bytes;
//   - the settings draft is one saved base plus one typed value;
//   - the office's own inventory count is unchanged while either draft exists;
//   - no server action posts.
//
// It refuses to overwrite an existing draft, so the owner's unsaved typing is never lost.
// Attach-only: the Chrome on :9222 is the owner's; this drive never launches one.
//
// usage: node task40.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task40/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const CAR_KEY = "ts-draft:car:new";
const SETTING_KEY = "ts-draft:settings:tagline";
const CAR_PROBE = "Task40 boundary probe";
const TAG_PROBE = "Task40 boundary probe";
const CAR_NOTE = "Task40 car note (a car column, not a customer note)";
const ARRIVAL_NOTE = "Task40 arrival note";
const inventoryPath = `${BASE}/office/inventory`;
const carPath = `${BASE}/office/car/new`;
const settingsPath = `${BASE}/office/settings`;

const problems = [];
const check = (ok, message) => {
  if (!ok) problems.push(message);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The car form's own names, as the live payload records them. `arrivalNote` and `privateNote` are
// car columns; `stateId` is an office state key; `photos` would be asset references, never bytes.
const CAR_FIELDS = new Set([
  "brand",
  "model",
  "trim",
  "year",
  "mileage",
  "price",
  "wasPrice",
  "exteriorColor",
  "interiorColor",
  "features",
  "cost.purchase_price",
  "cost.shipping",
  "cost.clearing",
  "cost.trucking_usa",
  "cost.trucking_ng",
  "cost.full_tank",
  "stateId",
  "arrivalNote",
  "privateNote",
  "photos",
  "secondaryStateIds",
  "salePrice",
  "saleDate",
  "carId",
  "note",
]);

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(120000);

const consoleErrors = [];
const pageErrors = [];
const httpErrors = [];
const nonGet = [];
const actionPosts = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 300)));
page.on("response", (res) => {
  if (res.status() >= 400) {
    let url = res.url();
    try {
      url = new URL(url).origin + new URL(url).pathname;
    } catch {
      /* keep */
    }
    httpErrors.push({ url, status: res.status() });
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

const waitDraft = (key) =>
  page.waitForFunction((k) => localStorage.getItem(k) != null, key, { timeout: 10000 });

async function inventoryCount() {
  await page.goto(inventoryPath, { waitUntil: "domcontentloaded" });
  await page.locator("#count").waitFor();
  await page.waitForTimeout(300);
  return (await page.locator("#count").innerText()).replace(/\s+/g, " ").trim();
}

let car = null;
let setting = null;
let countBefore = null;
let countAfterCar = null;
let countAfterSetting = null;
let fatal = null;
let createdCar = false;
let createdSetting = false;
try {
  // Do not overwrite anything the owner may have typed. This feature is new; any key here is a
  // previous run's unless the owner is mid-edit. Stop rather than destroy it.
  const existing = await page.goto(inventoryPath, { waitUntil: "domcontentloaded" }).then(async () => {
    await page.locator("#count").waitFor();
    return readKeys();
  });
  check(
    existing.length === 0,
    `existing device drafts found; not overwriting them: ${existing.join(", ")}`,
  );
  if (existing.length > 0) throw new Error("existing drafts — stopping before typing");

  countBefore = await inventoryCount();

  // ---- car form: only the car's own fields ------------------------------------------------
  await page.goto(carPath, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Brand", { exact: true }).waitFor();
  // Let React hydrate before typing: an input event before the form's onInput listener exists
  // would leave no draft at all (the server-rendered field accepts the text, but nothing listens).
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(700);
  await page.getByLabel("Brand", { exact: true }).fill(CAR_PROBE);
  await page.locator("#f-note").fill(CAR_NOTE);
  await page.locator("#f-arr").fill(ARRIVAL_NOTE);
  await waitDraft(CAR_KEY);
  createdCar = true;
  car = await readDraft(CAR_KEY);
  const carKeys = await readKeys();

  check(car?.v === 1, "the car draft has no version");
  check(car?.data?.brand === CAR_PROBE, "the car draft did not keep the typed brand");
  check(car?.data?.privateNote === CAR_NOTE, "the car draft lost the car's own private note");
  check(car?.data?.arrivalNote === ARRIVAL_NOTE, "the car draft lost the car's own arrival note");
  check(!Object.prototype.hasOwnProperty.call(car?.data ?? {}, "photo"), "the draft carries a photo input");
  const carJson = JSON.stringify(car ?? {});
  check(!/File|Blob|data:image|base64/i.test(carJson), "the car draft looks like it carries photo bytes");
  check(
    !Object.keys(car?.data ?? {}).some((key) => /(^|[:._-])(customer|buyer|enquir(?:y|ies)|lead|contact)([:._-]|$)/i.test(key)),
    "the car draft has a customer/enquiry-shaped key",
  );
  for (const key of [
    "name",
    "fullName",
    "firstName",
    "lastName",
    "phone",
    "whatsapp",
    "email",
    "address",
    "message",
    "customerNote",
    "enquiryNote",
  ]) {
    check(!Object.prototype.hasOwnProperty.call(car?.data ?? {}, key), `the car draft carries ${key}`);
  }
  const unknownCarFields = Object.keys(car?.data ?? {}).filter((key) => !CAR_FIELDS.has(key));
  check(unknownCarFields.length === 0, `the car draft carries non-form keys: ${unknownCarFields.join(", ")}`);
  check(carKeys.includes(CAR_KEY), "the car draft is not under a ts-draft key");

  countAfterCar = await inventoryCount();
  check(
    countAfterCar === countBefore,
    `the inventory count changed while a car draft existed (${countBefore} → ${countAfterCar})`,
  );

  // ---- settings card: one base, one typed value -------------------------------------------
  await page.goto(settingsPath, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Tagline", { exact: true }).waitFor();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(700);
  const tagBase = await page.getByLabel("Tagline", { exact: true }).inputValue();
  await page.getByLabel("Tagline", { exact: true }).fill(TAG_PROBE);
  await waitDraft(SETTING_KEY);
  createdSetting = true;
  setting = await readDraft(SETTING_KEY);
  const settingKeys = Object.keys(setting ?? {}).sort();
  const settingJson = JSON.stringify(setting ?? {});

  check(setting?.v === 1, "the settings draft has no version");
  check(setting?.base === tagBase, "the settings draft did not keep the saved value as its base");
  check(setting?.value === TAG_PROBE, "the settings draft did not keep the typed value");
  check(
    settingKeys.join(",") === "base,v,value",
    `the settings draft has unexpected keys: ${settingKeys.join(", ")}`,
  );
  check(!/customer|enquiry|buyer|phone|email|address/i.test(settingJson), "the settings draft has customer-shaped content");
  check((await readKeys()).includes(SETTING_KEY), "the settings draft is not under a ts-draft key");

  countAfterSetting = await inventoryCount();
  check(
    countAfterSetting === countBefore,
    `the inventory count changed while both drafts existed (${countBefore} → ${countAfterSetting})`,
  );

  // ---- no save, no record, no server action ------------------------------------------------
  check(actionPosts.length === 0, `a server action was posted while typing: ${JSON.stringify(actionPosts)}`);

  // ---- clean up only the drafts this drive created ----------------------------------------
  if (createdCar && (await readDraft(CAR_KEY))?.data?.brand === CAR_PROBE) {
    await page.evaluate((key) => localStorage.removeItem(key), CAR_KEY);
  }
  if (createdSetting && (await readDraft(SETTING_KEY))?.value === TAG_PROBE) {
    await page.evaluate((key) => localStorage.removeItem(key), SETTING_KEY);
  }
  const keysAfterCleanup = await readKeys();
  check(!keysAfterCleanup.includes(CAR_KEY), "the car test draft survived cleanup");
  check(!keysAfterCleanup.includes(SETTING_KEY), "the settings test draft survived cleanup");

  const after = chromiumCount();
  check(after <= before, `a Chrome was launched (${before} → ${after})`);
  check(consoleErrors.length === 0, `console errors: ${JSON.stringify(consoleErrors.slice(0, 3))}`);
  check(pageErrors.length === 0, `page errors: ${JSON.stringify(pageErrors.slice(0, 3))}`);
  check(httpErrors.length === 0, `HTTP errors: ${JSON.stringify(httpErrors.slice(0, 3))}`);

  const readings = {
    ok: problems.length === 0,
    problems,
    ua,
    chromium: { before, after },
    url: page.url(),
    keysBefore: existing,
    countBefore,
    countAfterCar,
    countAfterSetting,
    car: {
      key: CAR_KEY,
      payload: car,
      dataKeys: Object.keys(car?.data ?? {}).sort(),
      unknownFields: unknownCarFields,
      photoBytes: /File|Blob|data:image|base64/i.test(carJson),
      customerKeys: Object.keys(car?.data ?? {}).filter((key) =>
        /(^|[:._-])(customer|buyer|enquir(?:y|ies)|lead|contact)([:._-]|$)/i.test(key),
      ),
      ownNotes: {
        privateNote: car?.data?.privateNote,
        arrivalNote: car?.data?.arrivalNote,
      },
    },
    setting: {
      key: SETTING_KEY,
      payload: setting,
      keys: Object.keys(setting ?? {}).sort(),
      savedBase: tagBase,
    },
    serverActionPosts: actionPosts,
    nonGetRequests: nonGet,
    consoleErrors,
    pageErrors,
    httpErrors,
    keysAfterCleanup,
    checkedAt: new Date().toISOString(),
  };
  writeFileSync(RUNS + "task40.json", JSON.stringify(readings, null, 2) + "\n");
  console.log(JSON.stringify(readings, null, 2));
  if (problems.length > 0) process.exitCode = 1;
} catch (error) {
  fatal = String(error);
  problems.push(`fatal: ${fatal}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  // If the run failed after creating a draft, remove only a draft that still carries this run's
  // probe. Never remove an owner's draft.
  try {
    if (createdCar) {
      const current = await readDraft(CAR_KEY);
      if (current?.data?.brand === CAR_PROBE) await page.evaluate((key) => localStorage.removeItem(key), CAR_KEY);
    }
    if (createdSetting) {
      const current = await readDraft(SETTING_KEY);
      if (current?.value === TAG_PROBE) await page.evaluate((key) => localStorage.removeItem(key), SETTING_KEY);
    }
  } catch {
    /* page may be gone */
  }
  try {
    await page.goto(`${BASE}/office`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  } catch {
    /* page may be gone */
  }
  await detach(browser);
}
