// TASK-005 plan Task 7 — the activity log as it stands, read live and read-only (the "before").
//
// The claim under test: one word does not cover two actions — a restored item reads as a restoration
// and is not counted as a deletion (D31/DR24; `testing.md` group 5). This reads the log's own surfaces:
// the type chips and their counts, the newest rows (word · ref · chip · clock), and the count line. It
// writes nothing and clicks nothing — the drive for the delete→undo pair is the one that acts.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const TAG = process.argv[2] ?? "before";
const RUNS = new URL("./runs/activity-read/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
let page = null;
let opened = false;
let resized = false;
try {
  await assertOurs(browser);
  const found = await signedInPage(browser, BASE);
  page = found.page;
  opened = found.opened;
  if (!page) throw new Error("no signed-in office tab");
  await resize(page.context(), page, 1440, 900);
  resized = true;

  await page.goto(`${BASE}/office/activity`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#types", { timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll("nextjs-portal").length > 0, { timeout: 60000 });

  const reading = await page.evaluate(() => ({
    url: location.href,
    chips: [...document.querySelectorAll("#types button")].map((b) => ({
      label: b.childNodes[0]?.textContent?.trim() ?? "",
      count: b.querySelector("em")?.textContent?.trim() ?? "",
    })),
    countLine: document.querySelector("#count")?.innerText.trim() ?? null,
    rows: [...document.querySelectorAll("#log .entry")].slice(0, 14).map((e) => {
      const tag = e.querySelector(".tag");
      return {
        words: e.querySelector("p")?.childNodes[0]?.textContent?.trim() ?? "",
        ref: e.querySelector(".ref")?.textContent?.trim() ?? null,
        chip: tag ? tag.textContent.trim() : null,
        chipClass: tag ? tag.className : null,
        clock: e.querySelector("time")?.textContent?.trim() ?? null,
      };
    }),
    meta: {
      sidebar: !!document.querySelector("aside.side"),
      nav: !!document.querySelector('nav.sn[aria-label="Office"]'),
    },
  }));
  reading.when = new Date().toISOString();
  console.log(JSON.stringify(reading, null, 2));
  writeFileSync(`${RUNS}${TAG}.json`, JSON.stringify(reading, null, 2));
} finally {
  if (resized && page) await clearResize(page).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
