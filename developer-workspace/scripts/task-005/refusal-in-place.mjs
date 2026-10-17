// TASK-005 plan Task 4 — the refusal reaches the screen the person is in (the car form half).
//
// The claim under test: a store failure inside a write action becomes a REFUSAL returned to the
// screen the person is in — the car form's own result panel (`div[role="alert"]`) — and the office
// chrome is NOT replaced. That is exactly the measured defect (research-plan §5: a rejected Server
// Action inside `useTransition` reaches the page boundary and replaces the whole office shell).
//
// The failure is REAL and NET-ZERO. No fake, no stub, no dead port: the form sends a Mileage of
// 9999999999. The app's own reader accepts any run of digits with no ceiling
// (`lib/car-input.ts:97-101,149-152`) and the field is `type="text"` with no maxLength
// (`car-client.tsx:536-544`), while `car.mileage` is a Postgres `int` (`migrations/0003_car.sql:16`).
// Postgres refuses the statement (SQLSTATE 22003) and the statement rolls back — nothing is written —
// and `car.ts` has no special catch for that code, so it lands in the wrapper `storeQueryRefusing`
// (`lib/store-guard.ts:82-92`), which is the code this task is about. The refusal's own words come
// from `writeFailedClause` (`lib/store-refusal-rules.ts:36-37`), so their presence on screen also
// proves the request reached the action and the store refused it — not a client-side block.
//
// Method: the standing procedure (`developer-workspace/procedures/browser-check.md`) — ATTACH to the
// automation Chrome on CDP :9222, never launch, prove it is ours, reuse the signed-in tab, surfaces
// only, no screenshots, no `waitForTimeout`, detach on exit. There is no reference to compare against
// (the static site has no database), so this is the build-vs-build case: one tab of the build, read
// before and after.
import { mkdirSync, writeFileSync } from "node:fs";
import {
  BASE,
  attach,
  assertOurs,
  detach,
  guardCount,
  chromiumCount,
  resize,
  clearResize,
} from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const MARK = "ZZTEST-DEMO";
const RUNS = new URL("./runs/refusal-in-place/", import.meta.url).pathname;
// A mileage that passes the app (all digits) and cannot fit a Postgres `int`.
const MILEAGE = "9999999999";

mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const r = { when: new Date().toISOString(), base: BASE, mark: MARK, mileage: MILEAGE };
let page = null;
let checker = null;
let opened = false;
let resized = [];

try {
  r.ua = await assertOurs(browser);
  const found = await signedInPage(browser, BASE);
  page = found.page;
  opened = found.opened;
  if (!page) throw new Error(`no signed-in office tab in the Chrome on :9222 (${BASE})`);
  page.setDefaultTimeout(20000);
  // The office layout is width-driven (aside.side hidden ≤820px), so the desktop surface is pinned.
  resized.push(page);
  await resize(page.context(), page, 1440, 900);

  // --- net-zero, read on its own tab of the build, in the same session -----------------
  checker = await page.context().newPage();
  resized.push(checker);
  await resize(page.context(), checker, 1440, 900);
  const readInventory = async () => {
    await checker.goto(`${BASE}/office/inventory`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await checker.locator("table.t tbody#rows tr").first().waitFor({ state: "attached" }).catch(() => {});
    const count = (await checker.locator("p#count").innerText().catch(() => "")).trim();
    const rows = await checker.locator("table.t tbody#rows tr").count();
    // The list renders every car (no paging), so the marker cannot hide behind a filter.
    const texts = await checker.locator("table.t tbody#rows tr").allInnerTexts();
    return { count, rows, markedRows: texts.filter((t) => t.includes(MARK)).length };
  };
  r.inventoryBefore = await readInventory();

  // --- the car form, on the signed-in tab ----------------------------------------------
  await page.goto(`${BASE}/office/car/new`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("#save").waitFor({ state: "visible" });

  r.chromeBefore = {
    sidebar: await page.locator("aside.side").isVisible(),
    nav: await page.locator('nav.sn[aria-label="Office"]').isVisible(),
    email: (await page.locator(".sfoot b").innerText().catch(() => "")).trim(),
  };

  await page.locator("#f-brand").fill(MARK);
  await page.locator("#f-model").fill("ZZTEST");
  await page.locator("#f-year").fill(String(new Date().getFullYear()));
  await page.locator("#f-mileage").fill(MILEAGE);

  const stateButtons = page.locator("#states button.stb");
  r.stateOptions = await stateButtons.count();
  if (r.stateOptions === 0) throw new Error("the car form offered no primary state to pick");
  await stateButtons.first().click();
  r.stateIdSet = (await page.locator('input[name="stateId"]').inputValue()).length > 0;

  // --- the write that must be refused ---------------------------------------------------
  const posts = [];
  page.on("response", (res) => {
    if (res.request().method() === "POST") posts.push({ status: res.status(), url: res.url() });
  });

  await page.locator("#save").click();

  const box = page.locator('main.main div[role="alert"]', { hasText: "Could not save." }).first();
  let refused = true;
  try {
    await box.waitFor({ state: "visible", timeout: 25000 });
  } catch {
    refused = false;
  }

  r.refusedInPlace = refused;
  r.alertBoxText = refused ? (await box.innerText()).trim() : null;
  r.alertMessages = refused ? await box.locator("li").allInnerTexts() : [];
  r.actionPosts = posts;

  // The chrome must still be the chrome, and the form must still be the form (not a boundary page).
  r.afterSubmit = {
    url: page.url(),
    saveButtonStillThere: await page.locator("#save").isVisible().catch(() => false),
    sidebar: await page.locator("aside.side").isVisible().catch(() => false),
    nav: await page.locator('nav.sn[aria-label="Office"]').isVisible().catch(() => false),
    email: (await page.locator(".sfoot b").innerText().catch(() => "")).trim(),
    brandStillTyped: await page.locator("#f-brand").inputValue().catch(() => null),
    sidebarLinks: await page.locator('nav.sn[aria-label="Office"] a').allInnerTexts().catch(() => []),
  };
  if (!refused) {
    r.screenExcerpt = (await page.locator("main.main").innerText().catch(() => "")).slice(0, 800);
  }

  // --- net-zero: nothing was written ----------------------------------------------------
  r.inventoryAfter = await readInventory();
  r.netZero =
    r.inventoryAfter.rows === r.inventoryBefore.rows &&
    r.inventoryAfter.markedRows === 0 &&
    r.inventoryAfter.count === r.inventoryBefore.count;

  writeFileSync(`${RUNS}refusal-in-place.json`, JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
} finally {
  if (checker) await checker.close().catch(() => {});
  for (const p of resized) await clearResize(p).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
