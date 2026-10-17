// TASK-005 plan Task 4 — the refusal reaches the screen (the settings and inventory halves).
//
// The car-form half is witnessed on the live store (see `refusal-in-place.mjs`). These two cannot be
// forced from their own forms: `setting.value` is unbounded `text` and `deleteCar` writes only a
// nullable timestamp, so no value a form can send makes Postgres refuse. So the store itself is made
// to refuse: the dev server is pointed at the throwaway branch `task-005-witness`
// (`br-rapid-king-b287u6zy`, a copy of `production`) where a BEFORE-INSERT/UPDATE/DELETE trigger on
// `car` and `setting` raises SQLSTATE 42501. Reads and the `session`/`office_user` tables are
// untouched, so the page still renders and the session check still passes — the store simply refuses
// the write. Nothing on the live store can be touched while this dev server is running.
//
// Method: the standing procedure (`developer-workspace/procedures/browser-check.md`) — ATTACH, never
// launch, prove it is ours, reuse the signed-in tab, surfaces only, no screenshots, no
// `waitForTimeout`, detach on exit.
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

const RUNS = new URL("./runs/refusal-in-place/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const r = { when: new Date().toISOString(), base: BASE, store: "throwaway branch task-005-witness" };
let page = null;
let opened = false;
const resized = [];

try {
  r.ua = await assertOurs(browser);
  const found = await signedInPage(browser, BASE);
  page = found.page;
  opened = found.opened;
  if (!page) throw new Error(`no signed-in office tab in the Chrome on :9222 (${BASE})`);
  page.setDefaultTimeout(20000);
  resized.push(page);
  await resize(page.context(), page, 1440, 900);

  const chrome = async () => ({
    url: page.url(),
    sidebar: await page.locator("aside.side").isVisible().catch(() => false),
    nav: await page.locator('nav.sn[aria-label="Office"]').isVisible().catch(() => false),
    email: (await page.locator(".sfoot b").innerText().catch(() => "")).trim(),
    navLinks: await page.locator('nav.sn[aria-label="Office"] a').allInnerTexts().catch(() => []),
  });

  // ---------- 1. a settings save that the store refuses ------------------------------------
  await page.goto(`${BASE}/office/settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("#tagSave").waitFor({ state: "visible" });
  const tagBefore = (await page.locator("#tag").inputValue()) ?? "";
  r.settingsBefore = { tagline: tagBefore, chrome: await chrome() };

  // The Save button is disabled unless the value differs from its snapshot, so it has to be made
  // dirty for a POST to happen at all.
  await page.locator("#tag").fill(`${tagBefore.slice(0, 60)} witness`.slice(0, 80));
  r.tagSaveEnabled = await page.locator("#tagSave").isEnabled();

  const posts = [];
  page.on("response", (res) => {
    if (res.request().method() === "POST") posts.push({ status: res.status(), url: res.url() });
  });

  await page.locator("#tagSave").click();

  const tagCard = page.locator('section.card:has(h2:has-text("Tagline"))');
  const errP = tagCard.locator("p.err").first();
  let settingsRefused = true;
  try {
    await errP.waitFor({ state: "visible", timeout: 25000 });
  } catch {
    settingsRefused = false;
  }
  // The toast auto-clears after 4000 ms, so it is read the instant the refusal is on screen.
  const settingsToast = settingsRefused
    ? ((await page.locator("#tmsg").textContent().catch(() => "")) || "").trim()
    : null;

  r.settings = {
    refusedInPlace: settingsRefused,
    inlineError: settingsRefused ? (await errP.innerText().catch(() => "")).trim() : null,
    toast: settingsToast || null,
    actionPosts: posts.slice(),
    chrome: await chrome(),
    screenExcerpt: settingsRefused
      ? null
      : (await page.locator("main.main").innerText().catch(() => "")).slice(0, 600),
  };

  // Net-zero: reload and read the stored value back — the refusal must mean it never changed.
  await page.goto(`${BASE}/office/settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("#tag").waitFor({ state: "visible" });
  r.settings.taglineAfterReload = (await page.locator("#tag").inputValue()) ?? "";
  r.settings.taglineUnchanged = r.settings.taglineAfterReload === tagBefore;

  // ---------- 2. an inventory delete that the store refuses --------------------------------
  await page.goto(`${BASE}/office/inventory`, { waitUntil: "domcontentloaded", timeout: 45000 });
  const rows = page.locator("table.t tbody#rows tr");
  r.deleteBefore = { rows: await rows.count(), chrome: await chrome() };

  const del = page.locator("button.ab.del").first();
  r.deleteTarget = await del.getAttribute("aria-label");
  await del.click();
  await page.locator("#yes").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#yes").click();

  // The toast element exists even when empty (waiting for "visible" races ahead of the response, and
  // the row is optimistically removed while the call is in flight), so the read waits for the toast to
  // actually carry a message — then takes the role, the words and the row count at that moment.
  let deleteRefused = true;
  try {
    await page.waitForFunction(
      () => {
        const el = document.querySelector("#tmsg");
        return !!el && (el.textContent || "").trim().length > 0;
      },
      null,
      { timeout: 30000 },
    );
  } catch {
    deleteRefused = false;
  }
  const deleteToast = deleteRefused
    ? ((await page.locator("#tmsg").textContent().catch(() => "")) || "").trim()
    : null;

  r.delete = {
    refusedInPlace: deleteRefused,
    toastText: deleteToast || null,
    toastRole: deleteRefused ? await page.locator("#toast").getAttribute("role").catch(() => null) : null,
    rowsAfter: await rows.count(),
    rowsUnchanged: (await rows.count()) === r.deleteBefore.rows,
    chrome: await chrome(),
    screenExcerpt: deleteRefused
      ? null
      : (await page.locator("main.main").innerText().catch(() => "")).slice(0, 600),
  };

  writeFileSync(`${RUNS}refusal-in-place-2.json`, JSON.stringify(r, null, 2));
  console.log(JSON.stringify(r, null, 2));
} finally {
  for (const p of resized) await clearResize(p).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
