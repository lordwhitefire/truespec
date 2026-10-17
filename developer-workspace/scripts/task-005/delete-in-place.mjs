// TASK-005 plan Task 4 — the inventory delete half of the refusal witness, with diagnostics.
//
// Runs against the same setup as `refusal-in-place-2.mjs`: the dev server on `:3210` is pointed at the
// throwaway branch `task-005-witness`, where BEFORE-INSERT/UPDATE/DELETE triggers on `car` and
// `setting` raise SQLSTATE 42501. Reads and the session tables are untouched, so the page renders and
// the session still works — the store simply refuses the write. The live store cannot be reached from
// this server at all, which is what makes driving a delete safe here.
//
// The refusal itself is also checked at the store afterwards, not only on screen: a refused delete
// leaves `deleted_at` null on both branches.
//
// Method: the standing procedure (`browser-check.md`) — attach, never launch, prove it is ours, reuse
// the signed-in tab, surfaces only, no screenshots, no `waitForTimeout`, detach.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
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

  await page.goto(`${BASE}/office/inventory`, { waitUntil: "domcontentloaded", timeout: 45000 });
  const rows = page.locator("table.t tbody#rows tr");
  r.rowsBefore = await rows.count();
  r.chromeBefore = {
    url: page.url(),
    sidebar: await page.locator("aside.side").isVisible(),
    nav: await page.locator('nav.sn[aria-label="Office"]').isVisible(),
    email: (await page.locator(".sfoot b").innerText().catch(() => "")).trim(),
  };

  const del = page.locator("button.ab.del").first();
  r.target = await del.getAttribute("aria-label");
  r.diagnostics = {
    delButtons: await page.locator("button.ab.del").count(),
    firstDelVisible: await del.isVisible(),
    ovlPresent: await page.locator("#ovl").count(),
    ovlHiddenAttrBefore: await page.locator("#ovl").getAttribute("hidden").catch(() => null),
  };

  await del.click();
  try {
    await page.locator("#ovl:not([hidden])").waitFor({ state: "visible", timeout: 15000 });
    r.diagnostics.modalOpened = true;
  } catch {
    r.diagnostics.modalOpened = false;
    r.diagnostics.ovlHiddenAttrAfter = await page.locator("#ovl").getAttribute("hidden").catch(() => null);
    r.diagnostics.dltText = await page.locator("#dlt").textContent().catch(() => null);
    r.diagnostics.dialogCount = await page.locator('[role="dialog"]').count();
    r.diagnostics.screenExcerpt = (await page.locator("main.main").innerText().catch(() => "")).slice(0, 500);
    writeFileSync(`${RUNS}delete-in-place.json`, JSON.stringify(r, null, 2));
    console.log(JSON.stringify(r, null, 2));
  }

  if (r.diagnostics.modalOpened) {
    await page.locator("#yes").click();

    // The toast element exists even when empty, and the row is optimistically removed while the call
    // is in flight — so wait for the toast to actually carry a message, then take role + words + rows.
    r.refusedInPlace = true;
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
      r.refusedInPlace = false;
    }
    r.toastText = r.refusedInPlace
      ? ((await page.locator("#tmsg").textContent().catch(() => "")) || "").trim()
      : null;
    r.toastRole = await page.locator("#toast").getAttribute("role").catch(() => null);
    r.rowsAfter = await rows.count();
    r.rowsUnchanged = r.rowsAfter === r.rowsBefore;
    r.chromeAfter = {
      url: page.url(),
      sidebar: await page.locator("aside.side").isVisible().catch(() => false),
      nav: await page.locator('nav.sn[aria-label="Office"]').isVisible().catch(() => false),
      email: (await page.locator(".sfoot b").innerText().catch(() => "")).trim(),
      navLinks: await page.locator('nav.sn[aria-label="Office"] a').allInnerTexts().catch(() => []),
    };
    if (!r.refusedInPlace) {
      r.screenExcerpt = (await page.locator("main.main").innerText().catch(() => "")).slice(0, 600);
    }
    writeFileSync(`${RUNS}delete-in-place.json`, JSON.stringify(r, null, 2));
    console.log(JSON.stringify(r, null, 2));
  }
} finally {
  for (const p of resized) await clearResize(p).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
