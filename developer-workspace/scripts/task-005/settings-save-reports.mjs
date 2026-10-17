// TASK-005 plan Task 6 — a settings card reports what actually changed.
//
// The claim: a card saved with no effective change says **"Nothing changed."** and never claims a
// save; a card whose value really moved keeps its own sentence — *"WhatsApp number saved. Every chat
// button on the site now uses it."*, *"Tagline saved. The home page updates immediately."*, *"Default
// saved. Full tank is pre-filled on every new car."* (DR23). The fact is the store's own answer: the
// statement compares the stored value with the one about to be written and writes nothing when they
// are the same, so the audit line under a card cannot move behind words that say nothing changed.
//
// Two modes, because one arm writes and one does not:
//   · `noop` — the live store. Only the arm that writes **nothing at all** is driven: the WhatsApp
//     number is typed in a different form that normalises to exactly what is stored, so the save is a
//     true no-op and the store is untouched (checked directly before and after, in the shell).
//   · `all`  — a throwaway copy of production. The same no-op arm, then a real change and its
//     restoration (real writes; the copy is deleted afterwards), so both wordings are driven live.
//
// Method: the standing procedure (`developer-workspace/procedures/browser-check.md`) — ATTACH to the
// automation Chrome on CDP :9222, never launch, prove it is ours, reuse the signed-in tab, surfaces
// only, no screenshots, detach on exit. Hydration is awaited on `<nextjs-portal>` (a click before it
// is swallowed and the browser submits natively — the lesson Task 5's readings record), and each save
// is awaited on its own POST response, with the button going **disabled** as the card's own signal
// that the answer has landed (both a no-op and a real save leave the card clean).
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const MODE = process.argv[2] === "all" ? "all" : "noop";
const RUNS = new URL("./runs/settings-save-reports/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const r = { when: new Date().toISOString(), base: BASE, mode: MODE, store: process.env.TASK005_STORE ?? "live", steps: [] };
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

  const toastFn = () => ({
    text: (document.querySelector("#tmsg")?.innerText || "").trim(),
    shown: document.querySelector("#toast")?.className.includes("show") ?? false,
  });
  const auditsFn = () =>
    [...document.querySelectorAll("p.audit")].map((el) => el.innerText.replace(/\s+/g, " ").trim());

  // The card's toast hides itself after four seconds, and a save on a cold server can take longer than
  // that — so the words are **recorded as they appear** rather than read afterwards. The recorder
  // watches `document.body`, not the toast node: a re-render that replaces the node would leave a
  // node-level observer watching a detached element and record nothing (that is how the first
  // recording failed — the toast was there, the observer was not looking). It also plants a marker so
  // a full page reload can be told apart from a re-render.
  const armRecorder = () =>
    page.evaluate(() => {
      const carried = (() => {
        const t = document.querySelector("#toast");
        const msg = (document.querySelector("#tmsg")?.innerText || "").trim();
        return t && t.className.includes("show") ? msg : null;
      })();
      window.__marker = `armed-${Date.now()}`;
      window.__toasts = [];
      window.__recCount = 0;
      window.__recLast = null;
      const rec = () => {
        const toast = document.querySelector("#toast");
        const msg = (document.querySelector("#tmsg")?.innerText || "").trim();
        window.__recCount += 1;
        window.__recLast = { cls: toast?.className ?? null, msg };
        if (toast && toast.className.includes("show") && msg && window.__toasts[window.__toasts.length - 1] !== msg) {
          window.__toasts.push(msg);
        }
      };
      window.__recObs?.disconnect();
      window.__recObs = new MutationObserver(rec);
      window.__recObs.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
      rec();
      return { marker: window.__marker, carried };
    });
  const seenToasts = () =>
    page.evaluate(() => ({
      toasts: window.__toasts ?? [],
      marker: window.__marker ?? null,
      recCount: window.__recCount ?? null,
      recLast: window.__recLast ?? null,
      now: {
        cls: document.querySelector("#toast")?.className ?? null,
        msg: (document.querySelector("#tmsg")?.innerText || "").trim(),
      },
    }));

  const t0 = Date.now();
  await page.goto(`${BASE}/office/settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#waSave", { timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll("nextjs-portal").length > 0, { timeout: 60000 });
  r.hydratedAfterMs = Date.now() - t0;

  const posts = [];
  page.on("response", (res) => {
    if (res.request().method() === "POST") posts.push({ status: res.status(), url: res.url() });
  });

  // One save: click, wait for its own POST, then wait for the card's button to go disabled — the card
  // is clean again, which is true of both a no-op and a real save. Reading a *text* transition would
  // not do: two real saves on the same card produce the same sentence.
  const save = async (label, button, expected) => {
    const from = posts.length;
    const before_ = { toast: await page.evaluate(toastFn), audits: await page.evaluate(auditsFn) };
    const dirtyFlag = await page
      .locator(button.replace("Save", "Dirty"))
      .isVisible()
      .catch(() => null);
    // The card's toast from the *previous* save can still be on screen when this step arms, and a
    // recorder that reads it would credit it to this save — that is exactly what happened on the copy
    // run, whose tagline step opened with the WhatsApp step's “Nothing changed.”. So the screen is given
    // its own time to clear first: the toast's four-second timer dropping `show` is the signal, not a
    // sleep, and the state at arm time is recorded either way.
    await page
      .waitForFunction(() => !document.querySelector("#toast")?.className.includes("show"), { timeout: 15000 })
      .catch(() => {});
    const armed = await armRecorder();
    const answered = page.waitForResponse(
      (res) => res.request().method() === "POST" && res.url().includes("/office/settings"),
      { timeout: 45000 },
    );
    await page.locator(button).click();
    const response = await answered;
    await page.waitForFunction((sel) => document.querySelector(sel)?.disabled === true, button, { timeout: 45000 });
    await page.waitForTimeout(1500);
    const rec = await seenToasts();
    const shown = rec.toasts;
    const step = {
      step: label,
      unsavedChangeShownBeforeThePress: dirtyFlag,
      toastBefore: before_.toast,
      toastCarriedOverAtArmTime: armed.carried,
      toastsShown: shown,
      toast: { text: shown[shown.length - 1] ?? "", at: "recorded as it appeared" },
      pageReloadedDuringTheSave: rec.marker !== armed.marker,
      recorder: { callbacks: rec.recCount, lastSeen: rec.recLast, toastAtReadTime: rec.now },
      auditsBefore: before_.audits,
      audits: await page.evaluate(auditsFn),
      answered: response.status(),
      posts: posts.slice(from).map((p) => p.status),
      url: page.url(),
    };
    r.steps.push(step);
    console.log(
      `${label}: ${shown.map((t) => `“${t}”`).join(" then ") || "(no toast seen)"} — POST ${step.posts.join(",") || "none"} — answered ${step.answered}`,
    );
    if (expected && !shown.some((t) => t.includes(expected))) {
      console.log(JSON.stringify(step, null, 1));
      throw new Error(`${label}: the toasts were ${JSON.stringify(shown)}, expected one to contain “${expected}”`);
    }
    return step;
  };

  // ---- the no-op arm: the same number, typed the way a person would write it ------------------
  const stored = await page.locator("#wa").inputValue();
  r.whatsapp = { stored };
  if (!/^\+234\d{10}$/.test(stored)) {
    throw new Error(`the stored WhatsApp number is not a normalisable +234 number: “${stored}”`);
  }
  const typed = `0${stored.slice(4)}`.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3");
  r.whatsapp.typedInstead = typed;
  await page.locator("#wa").fill(typed);
  r.whatsapp.unsavedChangeAppeared = await page.locator("#waDirty").isVisible();
  r.saveNoChange = await save("WhatsApp: the same number in another form", "#waSave", "Nothing changed.");
  r.whatsapp.inputAfterTheSave = await page.locator("#wa").inputValue();

  // ---- the changed arm (throwaway copy only) ---------------------------------------------------
  if (MODE === "all") {
    const tagStored = await page.locator("#tag").inputValue();
    r.tagline = { stored: tagStored };
    await page.locator("#tag").fill(`${tagStored} — probe`);
    r.saveChanged = await save("Tagline: one field really changed", "#tagSave", "Tagline saved.");
    r.tagline.afterTheChange = await page.locator("#tag").inputValue();

    await page.locator("#tag").fill(tagStored);
    r.saveRestored = await save("Tagline: put back as it was", "#tagSave", "Tagline saved.");
    r.tagline.afterTheRestore = await page.locator("#tag").inputValue();
  }

  r.after = {
    url: page.url(),
    sidebar: await page.locator("aside.side").isVisible().catch(() => false),
    nav: await page.locator('nav.sn[aria-label="Office"]').isVisible().catch(() => false),
    email: await page.locator(".sfoot b").innerText().catch(() => ""),
  };
  r.verdict = {
    noChangeSaidNothingChanged: r.steps[0].toast.text.includes("Nothing changed."),
    noChangeNeverClaimedASave: !/saved/i.test(r.steps[0].toast.text),
    noChangeAnswered200: r.steps[0].answered === 200,
    auditLineUnmovedByTheNoOp: JSON.stringify(r.steps[0].auditsBefore) === JSON.stringify(r.steps[0].audits),
    unsavedChangeWasShown: r.whatsapp.unsavedChangeAppeared === true,
    inputShowsWhatTheStoreHolds: r.whatsapp.inputAfterTheSave === stored,
  };
  if (MODE === "all") {
    r.verdict.changedSaidSaved = /saved/i.test(r.steps[1].toast.text);
    r.verdict.auditLineMovedOnTheChange = JSON.stringify(r.steps[1].audits) !== JSON.stringify(r.steps[1].auditsBefore);
    r.verdict.restoredSaidSaved = /saved/i.test(r.steps[2].toast.text);
    r.verdict.taglineBackToOriginal = r.tagline.afterTheRestore === r.tagline.stored;
  }
  console.log("\nverdict:", JSON.stringify(r.verdict, null, 2));

  writeFileSync(`${RUNS}${MODE}.json`, JSON.stringify(r, null, 2));
} finally {
  if (resized && page) await clearResize(page).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
