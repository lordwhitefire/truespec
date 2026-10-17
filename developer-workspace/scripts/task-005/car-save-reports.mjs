// TASK-005 plan Task 5 — a save reports what actually changed (the car form).
//
// The claim: the store's own answer to "did anything move?" reaches the screen, so a save that
// changed nothing says **"Nothing changed."** and a save that did change something keeps the words
// it always had — *"Saved as <ref>. The showroom updates immediately."* (DR23, which also forbids
// using the no-op words for a failure: a failure is red and says it failed).
//
// The car is a **demo** car on the live store (`is_demo = true` — the fleet the demonstration
// seeded, the same rows `demo:wipe` empties). The one field the drive touches is put back exactly
// as it was before the drive ends, so the fleet reads the same afterwards. What is *not* claimed
// as no-trace: the two real saves move the car's `version` twice and write two `car.updated` rows,
// and that is what really happened — the readings say so.
//
// Method: the standing procedure (`developer-workspace/procedures/browser-check.md`) — ATTACH to the
// automation Chrome on CDP :9222, never launch, prove it is ours, reuse the signed-in tab, surfaces
// only, no screenshots, detach on exit. There is no reference to compare against (the static site
// has no database), so this is the build-vs-build case: one tab of the build, read step by step.
//
// The one harness lesson this file carries: **wait for hydration before clicking.** In dev the car
// page is ~1779 modules compiled on demand and hydration lands about five seconds after
// `domcontentloaded`; a click before that is swallowed and the browser submits the form itself (a GET
// that rewrites the url with every field in it — seen in `runs/car-save-reports/car-save-reports.json`
// from the first attempt). Next injects `<nextjs-portal>` only after the client bundle has run, which
// is the signal used here; each save is then awaited on its own POST response.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const REF = "TS-1001"; // a demo car (is_demo = true), read from the live store before the run
const FIELD = "#f-arr"; // the arrival note: empty on this car, so the probe writes it and clears it again
const PROBE = "TASK-005 check";
const RUNS = new URL("./runs/car-save-reports/", import.meta.url).pathname;

mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const r = { when: new Date().toISOString(), base: BASE, ref: REF, field: FIELD, probe: PROBE, steps: [] };
let page = null;
let opened = false;
let resized = false;

try {
  r.ua = await assertOurs(browser);
  const found = await signedInPage(browser, BASE);
  page = found.page;
  opened = found.opened;
  if (!page) throw new Error(`no signed-in office tab in the Chrome on :9222 (${BASE})`);
  page.setDefaultTimeout(20000);
  await resize(page.context(), page, 1440, 900);
  resized = true;

  // The result panel is the form's own `div[role="status"]` — found from the save button, so the
  // toast (also a `role="status"`) can never be mistaken for it. Both were read live first
  // (`car-save-probe.mjs`): the panel sits at `main.main > div.cols > form > div`.
  const panelFn = () => {
    const form = document.querySelector("#save")?.closest("form");
    const el = form?.querySelector('div[role="status"]');
    return el ? el.innerText.trim() : null;
  };
  const toastFn = () => {
    const t = document.querySelector("#toast");
    return t
      ? { text: (t.querySelector("#tmsg")?.innerText || "").trim(), shown: t.className.includes("show") }
      : null;
  };
  const alertFn = () => {
    const el = document.querySelector('main.main div[role="alert"]');
    return el ? el.innerText.trim().slice(0, 200) : null;
  };

  const t0 = Date.now();
  await page.goto(`${BASE}/office/car/${REF}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("#save").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelectorAll("nextjs-portal").length > 0, { timeout: 60000 });
  r.hydratedAfterMs = Date.now() - t0;

  r.original = await page.locator(FIELD).inputValue();
  r.chrome = {
    sidebar: await page.locator("aside.side").isVisible(),
    nav: await page.locator('nav.sn[aria-label="Office"]').isVisible(),
    email: (await page.locator(".sfoot b").innerText().catch(() => "")).trim(),
  };

  const posts = [];
  page.on("response", (res) => {
    if (res.request().method() === "POST") posts.push({ status: res.status(), url: res.url() });
  });

  // One save: click, wait for the action's own POST to come back, then wait for the transition to
  // finish (`#save` enabled and the result panel present). Waiting on the button and the response
  // rather than on the panel's words is deliberate: two different changes produce the *same*
  // sentence, so the words alone cannot tell one save from the next.
  const save = async (label) => {
    const from = posts.length;
    const panelBefore = await page.evaluate(panelFn);
    const answered = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes(`/office/car/${REF}`),
      { timeout: 45000 },
    );
    await page.locator("#save").click();
    const response = await answered;
    await page.waitForFunction(
      () => {
        const b = document.querySelector("#save");
        const panel = b?.closest("form")?.querySelector('div[role="status"]');
        return !!b && !b.disabled && !!panel;
      },
      { timeout: 45000 },
    );
    const step = {
      step: label,
      panelBefore,
      panel: await page.evaluate(panelFn),
      toast: await page.evaluate(toastFn),
      alert: await page.evaluate(alertFn),
      answered: response.status(),
      posts: posts.slice(from).map((p) => p.status),
      fieldValue: await page.locator(FIELD).inputValue(),
      url: page.url(),
    };
    r.steps.push(step);
    const words = step.panel ?? "(no panel)";
    console.log(`${label}: “${words}” — POST ${step.posts.join(",") || "none"} — alert=${step.alert ?? "none"}`);
    return step;
  };

  // 1. Save the car exactly as it is: nothing changed, and the screen must say so.
  r.saveNoChange = await save("save with nothing changed");

  // 2. Change one field and save: a save that moved something keeps its old words.
  await page.locator(FIELD).fill(PROBE);
  r.saveChanged = await save("save with one field changed");

  // 3. Put the field back exactly as it was: the fleet reads as it did (this second real save is
  //    recorded as such — a change, not a no-op).
  await page.locator(FIELD).fill(r.original);
  r.saveRestored = await save("save that puts the field back");

  r.after = {
    url: page.url(),
    fieldBackToOriginal: (await page.locator(FIELD).inputValue()) === r.original,
    sidebar: await page.locator("aside.side").isVisible().catch(() => false),
    nav: await page.locator('nav.sn[aria-label="Office"]').isVisible().catch(() => false),
    email: (await page.locator(".sfoot b").innerText().catch(() => "")).trim(),
    sidebarLinks: await page.locator('nav.sn[aria-label="Office"] a').allInnerTexts().catch(() => []),
  };

  r.verdict = {
    noChangeSaidNothingChanged: (r.saveNoChange.panel ?? "").includes("Nothing changed."),
    noChangeSaidItInTheToastToo: (r.saveNoChange.toast?.text ?? "").includes("Nothing changed."),
    noChangeNeverClaimedSaved: !(r.saveNoChange.panel ?? "").includes("Saved"),
    changedSaidSaved: (r.saveChanged.panel ?? "").includes(`Saved as ${REF}`),
    restoredSaidSaved: (r.saveRestored.panel ?? "").includes(`Saved as ${REF}`),
    everySaveAnswered200: r.steps.every((s) => s.answered === 200),
    noRedBoxEverShown: r.steps.every((s) => s.alert === null),
    urlNeverLeftTheCar: r.steps.every((s) => s.url === `${BASE}/office/car/${REF}`),
    fieldBackToOriginal: r.after.fieldBackToOriginal,
  };
  console.log("\nverdict:", JSON.stringify(r.verdict, null, 2));

  writeFileSync(`${RUNS}car-save-reports.json`, JSON.stringify(r, null, 2));
} finally {
  if (resized && page) await clearResize(page).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
