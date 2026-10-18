// TASK-005 Task 25 drive — a refusal keeps its own voice.
//
// Two surfaces, both read-only:
//
//  A. the from-file import — a filled car blank whose every page is refused (fixture built by
//     build-refused-pdf.ts) is uploaded through the office's own control. No car is readable
//     from the file, so the route answers 422 with the refusals and writes nothing: no draft
//     row, no held asset (app/api/upload/route.ts). The readings quote the refusal list the
//     owner actually sees.
//
//  B. the car form — a save refused by the server (an out-of-range year, an unreadable
//     mileage, a blank make), read from the form's own error block and its per-field marks.
//     Nothing is saved.
//
// Run with OUT=… to name the readings file (default runs/task25/readings.json) and FIXTURE=…
// to point at the built blank (default /tmp/opencode/refused-template.pdf).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const OUT = process.env.OUT ?? new URL("./runs/task25/readings.json", import.meta.url).pathname;
const FIXTURE = process.env.FIXTURE ?? "/tmp/opencode/refused-template.pdf";
mkdirSync(dirname(OUT), { recursive: true });

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);

const hydrated = (sel) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
      );
    },
    sel,
    { timeout: 180000 },
  );

const r = { when: new Date().toISOString(), base: BASE, ui: !/Headless/i.test(ua) };

try {
  // ---- A. the from-file import: every page refused, the refusals quoted ------------------
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector('input[aria-label="Create drafts from a file"]', {
    state: "attached",
    timeout: 180000,
  });
  await page.setInputFiles('input[aria-label="Create drafts from a file"]', FIXTURE);
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll('div[role="alert"]')).some((el) =>
        (el.textContent ?? "").includes("No car could be read from that file."),
      ),
    null,
    { timeout: 180000 },
  );
  await page.waitForTimeout(800);
  r.fromFile = await page.evaluate(() => {
    const box = Array.from(document.querySelectorAll('div[role="alert"]')).find((el) =>
      (el.textContent ?? "").includes("No car could be read from that file."),
    );
    if (!box) return null;
    return {
      reason: box.innerText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)[0] ?? "",
      refusals: Array.from(box.querySelectorAll("li")).map((li) =>
        (li.textContent ?? "").replace(/\s+/g, " ").trim(),
      ),
    };
  });

  // ---- B. the car form's own refusals ----------------------------------------------------
  await page.goto(BASE + "/office/car/new", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#f-mileage");
  await page.fill("#f-mileage", "not a number");
  await page.fill("#f-year", "1500");
  await page.click("#save");
  await page.waitForSelector("#formErr", { timeout: 180000 });
  await page.waitForTimeout(500);
  r.carForm = await page.evaluate(() => {
    const err = document.getElementById("formErr");
    return {
      messages: err
        ? Array.from(err.querySelectorAll("li")).map((li) => li.textContent.trim())
        : null,
      invalidFields: Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(
        (el) => el.id || el.tagName,
      ),
    };
  });

  console.log(JSON.stringify(r, null, 2));
  console.log(`\nTASK 25 drive done → ${OUT}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch by the drive)`;
  writeFileSync(OUT, JSON.stringify(r, null, 2) + "\n");
  await detach(browser);
}
