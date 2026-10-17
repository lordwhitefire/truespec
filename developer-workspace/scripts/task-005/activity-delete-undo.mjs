// TASK-005 plan Task 7 — "the record names what happened", driven live on a demo car.
//
// One demo car (default TS-1011) is deleted and the delete undone at once: the tombstone is the
// only column set and the undo clears it, so the car is exactly as it was — net-zero, demo-only.
// The claim under test is what the record then *says* (D31/DR24; `testing.md` group 5): a row for
// the deletion chipped "Deleted", a row for the restoration chipped "Restored" — never one word
// covering both actions — and every chip's count agreeing with the rows and with its own name.
//
// The log is read before the pair and after it, in the same run, and the readings are compared:
// Deleted +1, Restored +1, everything else unmoved, and the two new rows tell the two events apart.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const REF = process.argv[2] ?? "TS-1011";
const RUNS = new URL("./runs/activity-delete-undo/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const readLog = async (page) => {
  await page.goto(`${BASE}/office/activity`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#types", { timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll("nextjs-portal").length > 0, { timeout: 60000 });
  return page.evaluate(() => ({
    chips: [...document.querySelectorAll("#types button")].map((b) => ({
      k: b.getAttribute("data-tp"),
      label: b.childNodes[0]?.textContent?.trim() ?? "",
      count: Number(b.querySelector("em")?.textContent ?? "0"),
    })),
    countLine: document.querySelector("#count")?.innerText.trim() ?? null,
    rows: [...document.querySelectorAll("#log .entry")].map((e) => {
      const tag = e.querySelector(".tag");
      return {
        words: e.querySelector("p")?.childNodes[0]?.textContent?.trim() ?? "",
        ref: e.querySelector(".ref")?.textContent?.trim() ?? null,
        chip: tag ? tag.textContent.trim() : null,
        chipClass: tag ? tag.className : null,
        clock: e.querySelector("time")?.textContent?.trim() ?? null,
      };
    }),
    screen: {
      sidebar: !!document.querySelector("aside.side"),
      nav: !!document.querySelector('nav.sn[aria-label="Office"]'),
    },
  }));
};

const before = guardCount();
const browser = await attach();
let page = null;
let opened = false;
let resized = false;
const posts = [];
try {
  await assertOurs(browser);
  const found = await signedInPage(browser, BASE);
  page = found.page;
  opened = found.opened;
  if (!page) throw new Error("no signed-in office tab");
  page.on("response", (res) => {
    const u = res.url();
    if (res.request().method() === "POST" && u.includes("/office/inventory")) {
      posts.push({ status: res.status(), at: new Date().toISOString() });
    }
  });
  await resize(page.context(), page, 1440, 900);
  resized = true;

  const r = { ref: REF, when: new Date().toISOString(), steps: {} };

  // ---- the log before the pair -------------------------------------------------------------
  r.steps.logBefore = await readLog(page);

  // ---- the delete, and the undo, in one sitting --------------------------------------------
  await page.goto(`${BASE}/office/inventory`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#rows tr", { timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll("nextjs-portal").length > 0, { timeout: 60000 });
  r.steps.rowsBefore = await page.locator("#rows tr").count();

  const row = page.locator("#rows tr", { hasText: REF });
  await row.locator("button.ab.del").click();
  await page.waitForSelector("#dlt", { state: "visible", timeout: 15000 });
  r.steps.confirmText = (await page.locator("#dlt").locator("xpath=..").innerText()).replace(/\s+/g, " ").trim();

  const postsBeforeDelete = posts.length;
  const delivered = page.waitForResponse(
    (res) => res.request().method() === "POST" && res.url().includes("/office/inventory"),
    { timeout: 45000 },
  );
  await page.locator("#yes").click();
  const delRes = await delivered;
  await page.locator("#undo").waitFor({ state: "visible", timeout: 45000 });
  r.steps.deleteToast = await page.locator("#tmsg").innerText();
  r.steps.deleteAnswered = delRes.status();
  r.steps.rowsAfterDelete = await page.locator("#rows tr").count();

  const postsBeforeUndo = posts.length;
  const undone = page.waitForResponse(
    (res) => res.request().method() === "POST" && res.url().includes("/office/inventory"),
    { timeout: 45000 },
  );
  await page.locator("#undo").click();
  const undoRes = await undone;
  await page.waitForFunction(
    () => (document.querySelector("#tmsg")?.innerText ?? "").includes("restored"),
    { timeout: 45000 },
  );
  r.steps.undoToast = await page.locator("#tmsg").innerText();
  r.steps.undoAnswered = undoRes.status();
  r.steps.rowsAfterUndo = await page.locator("#rows tr").count();
  r.steps.posts = { deletePhase: posts.slice(postsBeforeDelete, postsBeforeUndo), undoPhase: posts.slice(postsBeforeUndo) };

  // ---- the log after the pair ---------------------------------------------------------------
  r.steps.logAfter = await readLog(page);

  // ---- the verdicts --------------------------------------------------------------------------
  const chip = (reading, k) => reading.chips.find((c) => c.k === k)?.count ?? null;
  const b = r.steps.logBefore;
  const a = r.steps.logAfter;
  const delRow = a.rows.find((x) => x.words === "Deleted a car" && x.ref === REF && x.chip === "Deleted");
  const resRow = a.rows.find(
    (x) => x.words === "Restored a car" && x.ref === REF && x.chip === "Restored" && x.chipClass === "tag res",
  );
  const shownChipCount = (reading, label) => reading.rows.filter((x) => x.chip === label).length;
  r.verdict = {
    theDeleteIsNamedAsADeletion: !!delRow,
    theRestorationIsNamedAsARestoration: !!resRow,
    noRestorationIsChippedDeleted: a.rows.every((x) => !(x.words.startsWith("Restored") && x.chip === "Deleted")),
    deletedCountMovedByOne: chip(a, "del") === chip(b, "del") + 1,
    restoredCountMovedByOne: chip(a, "res") === chip(b, "res") + 1,
    allCountMovedByTwo: chip(a, "all") === chip(b, "all") + 2,
    otherChipsUnmoved: ["add", "edit", "state", "sold", "imp", "set"].every((k) => chip(a, k) === chip(b, k)),
    everyCountMatchesItsRows:
      chip(a, "del") === shownChipCount(a, "Deleted") &&
      chip(a, "res") === shownChipCount(a, "Restored") &&
      chip(a, "all") === a.rows.length,
    theCarCameBack: r.steps.rowsAfterUndo === r.steps.rowsBefore,
    theDeleteToastSaidDeleted: r.steps.deleteToast.includes("deleted"),
    theUndoToastSaidRestored: r.steps.undoToast.includes("restored"),
    screenIntact: a.screen.sidebar && a.screen.nav,
  };
  writeFileSync(`${RUNS}${REF}.json`, JSON.stringify(r, null, 2));

  console.log(`rows before: ${r.steps.rowsBefore} — delete toast: “${r.steps.deleteToast}” (answered ${r.steps.deleteAnswered}) — rows after delete: ${r.steps.rowsAfterDelete}`);
  console.log(`undo toast: “${r.steps.undoToast}” (answered ${r.steps.undoAnswered}) — rows after undo: ${r.steps.rowsAfterUndo}`);
  console.log(
    `log before: ${b.chips.map((c) => `${c.label} ${c.count}`).join(" · ")}\n` +
      `log after : ${a.chips.map((c) => `${c.label} ${c.count}`).join(" · ")}`,
  );
  console.log(`newest two rows after: ${JSON.stringify(a.rows.slice(0, 2).map((x) => `${x.words} ${x.ref} · ${x.chip}`))}`);
  console.log(`\nverdict: ${JSON.stringify(r.verdict, null, 1)}`);
  const bad = Object.entries(r.verdict).filter(([, v]) => !v);
  if (bad.length) throw new Error(`unmet: ${bad.map(([k]) => k).join(", ")}`);
} finally {
  if (resized && page) await clearResize(page).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
