// TASK-006 T19 — runtime browser check for the changed surfaces.
//
// Attach-only to the visible Chrome on :9222. Build :3210 is branch-backed (no live writes);
// reference :3211 is the old static implementation. No screenshots. Surfaces only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE,
  REF,
  attach,
  assertOurs,
  chromiumCount,
  detach,
  guardCount,
  resize,
  setTheme,
} from "./_lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const runDir = path.join(here, "runs");
fs.mkdirSync(runDir, { recursive: true });

const failures = [];
const results = [];
const officeWidths = [1440, 820, 560, 390];
const publicWidths = [560, 820, 1100];
const themes = ["dark", "light"];

function check(ok, label, detail = "") {
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

const raf = (page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function waitForH1(page) {
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 15000 });
}

async function buildCell(page, screen, pathname, width, theme) {
  await page.goto(`${BASE}${pathname}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForH1(page);
  if (page.url().includes("/office/sign-in")) {
    throw new Error(`the office session is not valid at ${BASE}${pathname}`);
  }
  await setTheme(page, theme);
  await resize(page, width);
  await raf(page);

  if (screen === "settings") {
    const tab = page.getByRole("tab", { name: "Account" });
    if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
    await page.locator("#cleanup-title").waitFor({ state: "visible", timeout: 10000 });
  }
  if (screen === "activity") {
    await page.locator(".entry .who").first().waitFor({ state: "visible", timeout: 10000 });
  }
  if (screen === "add") {
    await page.locator('input[name="submissionId"]').waitFor({ state: "attached", timeout: 10000 });
  }
  if (screen === "enquiries") {
    await page.getByText(/ENQ-\d{4}/).first().waitFor({ state: "visible", timeout: 10000 });
  }
  await raf(page);

  const body = await page.locator("body").innerText();
  const facts = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    who: document.querySelectorAll(".entry .who, .rowl .who").length,
    mailto: document.querySelectorAll('a[href^="mailto:"]').length,
    wa: document.querySelectorAll('a[href*="wa.me/"]').length,
    submissionId: document.querySelectorAll('input[name="submissionId"]').length,
    accountTab: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() ?? "",
  }));
  const h1 = (await page.locator("h1").first().innerText()).trim();

  const cell = {
    screen,
    path: pathname,
    width,
    theme,
    url: page.url(),
    h1,
    bodyLength: body.length,
    ...facts,
  };

  if (screen === "enquiries") {
    check(/ENQUIRIES/i.test(body), `${screen} ${width}/${theme}: heading`);
    check(/ENQ-\d{4}/.test(body), `${screen} ${width}/${theme}: enquiry rows`);
  }
  if (screen === "add") {
    check(/ADD A CAR/i.test(body), `${screen} ${width}/${theme}: heading`);
    check(facts.submissionId === 1, `${screen} ${width}/${theme}: one form-session key`);
    check(/Save car/.test(body), `${screen} ${width}/${theme}: save control`);
  }
  if (screen === "activity") {
    check(/ACTIVITY LOG/i.test(body), `${screen} ${width}/${theme}: heading`);
    check(facts.who > 0, `${screen} ${width}/${theme}: visible actor labels`);
    check(/@/.test(body), `${screen} ${width}/${theme}: actor email visible`);
  }
  if (screen === "settings") {
    check(/SYSTEM/i.test(body), `${screen} ${width}/${theme}: system card`);
    check(/Database/.test(body), `${screen} ${width}/${theme}: database line`);
    check(/Photos and files/.test(body), `${screen} ${width}/${theme}: photos/files line`);
    check(/Backup is current|No backup recorded yet|Last backup was|Backup status could not be read/.test(body), `${screen} ${width}/${theme}: backup line`);
    check(/WAITING TO BE CLEARED/i.test(body), `${screen} ${width}/${theme}: cleanup card`);
    check(/DELETED CARS/.test(body) && /ENQUIRIES AT THEIR YEAR/.test(body), `${screen} ${width}/${theme}: cleanup groups`);
    check(facts.accountTab === "Account", `${screen} ${width}/${theme}: Account tab stays selected`);
  }
  if (screen === "privacy") {
    check(/YOUR RIGHTS/i.test(body), `${screen} ${width}/${theme}: rights heading`);
    check(/message us on WhatsApp/.test(body), `${screen} ${width}/${theme}: WhatsApp instruction`);
    check(/imported sheet/.test(body), `${screen} ${width}/${theme}: imported-sheet consequence`);
    check(/tap record/.test(body), `${screen} ${width}/${theme}: tap-record consequence`);
    check(facts.mailto === 0, `${screen} ${width}/${theme}: no mailto`);
    check(!body.includes("@"), `${screen} ${width}/${theme}: no email address`);
    check(facts.wa > 0, `${screen} ${width}/${theme}: WhatsApp link`);
  }
  if (facts.theme !== theme) failures.push(`${screen} ${width}/${theme}: theme is ${facts.theme}`);
  if (facts.overflow > 1) failures.push(`${screen} ${width}/${theme}: horizontal overflow ${facts.overflow}px`);

  results.push(cell);
  return cell;
}

async function refFacts(page, pathname, width, theme, screen) {
  await page.goto(`${REF}${pathname}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForH1(page);
  if (screen === "add") {
    const addMode = page.locator('[data-mode="add"]');
    if (await addMode.count()) {
      await addMode.click();
      await page.waitForFunction(() => document.querySelector("h1")?.textContent?.trim() === "Add a car");
    }
  }
  await setTheme(page, theme);
  await resize(page, width);
  await raf(page);
  const body = await page.locator("body").innerText();
  const facts = await page.evaluate(() => ({
    who: document.querySelectorAll(".entry .who, .rowl .who").length,
    mailto: document.querySelectorAll('a[href^="mailto:"]').length,
    wa: document.querySelectorAll('a[href*="wa.me/"]').length,
    submissionId: document.querySelectorAll('input[name="submissionId"]').length,
    formFields: document.querySelectorAll("input, select, textarea").length,
    entries: document.querySelectorAll(".entry").length,
  }));
  const h1 = (await page.locator("h1").first().innerText()).trim();
  return { screen, path: pathname, width, theme, url: page.url(), h1, bodyLength: body.length, rights: (body.match(/YOUR RIGHTS[\s\S]{0,700}/i) || [""])[0], body, ...facts };
}

async function main() {
  const before = guardCount();
  const browser = await attach();
  const ctx = browser.contexts()[0];
  const tabs = ctx.pages();
  if (tabs.length !== 2) {
    throw new Error(`expected exactly 2 tabs, found ${tabs.length} — the owner allows 2; reuse them, never call newPage()`);
  }
  const [build, ref] = tabs;
  const tabsBefore = tabs.length;
  try {
    const ua = await assertOurs(browser);
    console.log(`attached :9222 — ours (UA has no Headless)`);
    console.log(`  UA: ${ua}`);
    console.log(`tabs: ${tabsBefore} (build, reference); chromium before: ${before} (guard 10)`);

    const screens = [
      ["enquiries", "/office/enquiries", officeWidths],
      ["add", "/office/car/new", officeWidths],
      ["activity", "/office/activity", officeWidths],
      ["settings", "/office/settings", officeWidths],
      ["privacy", "/privacy", publicWidths],
    ];

    for (const [screen, pathname, widths] of screens) {
      const rows = [];
      for (const width of widths) {
        for (const theme of themes) {
          const cell = await buildCell(build, screen, pathname, width, theme);
          rows.push(cell);
          console.log(
            `${screen.padEnd(10)} ${String(width).padStart(4)} ${theme.padEnd(5)} ` +
              `h1=${cell.h1.slice(0, 28).padEnd(28)} who=${cell.who} wa=${cell.wa} ` +
              `sid=${cell.submissionId} overflow=${cell.overflow}`,
          );
        }
      }
      const dir = path.join(runDir, screen);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "surface-probe.json"), JSON.stringify(rows, null, 2));
      fs.writeFileSync(
        path.join(dir, "surface-probe.txt"),
        rows
          .map(
            (r) =>
              `${r.width}/${r.theme} ${r.url}\n  h1=${r.h1}\n  body=${r.bodyLength} who=${r.who} wa=${r.wa} mailto=${r.mailto} sid=${r.submissionId} overflow=${r.overflow}`,
          )
          .join("\n\n") + "\n",
      );
    }

    const refPrivacy = await refFacts(ref, "/privacy.html", 1100, "light", "privacy");
    const refActivity = await refFacts(ref, "/office-activity.html", 1440, "light", "activity");
    const refAdd = await refFacts(ref, "/office-car.html", 1440, "light", "add");

    check(refPrivacy.body.includes("YOUR RIGHTS"), "ref privacy: rights heading");
    check(refPrivacy.mailto === 0, "ref privacy: no mailto");
    check(refActivity.entries > 0, "ref activity: rows");
    check(refActivity.who === 0, "ref activity: no visible actor label (old behaviour)");
    check(!refActivity.body.includes("@"), "ref activity: no email");
    check(refAdd.formFields > 0, "ref add: form fields");
    check(refAdd.submissionId === 0, "ref add: no form-session key (old behaviour)");

    const refDir = path.join(runDir, "reference");
    fs.mkdirSync(refDir, { recursive: true });
    fs.writeFileSync(
      path.join(refDir, "surface-probe.json"),
      JSON.stringify({ privacy: refPrivacy, activity: refActivity, add: refAdd }, null, 2),
    );
    fs.writeFileSync(
      path.join(refDir, "surface-probe.txt"),
      [
        `privacy ${refPrivacy.width}/${refPrivacy.theme} ${refPrivacy.url}\n  h1=${refPrivacy.h1} mailto=${refPrivacy.mailto} wa=${refPrivacy.wa}\n  rights=${refPrivacy.rights.slice(0, 500)}`,
        `activity ${refActivity.width}/${refActivity.theme} ${refActivity.url}\n  h1=${refActivity.h1} entries=${refActivity.entries} who=${refActivity.who} at=${refActivity.body.includes("@")}`,
        `add ${refAdd.width}/${refAdd.theme} ${refAdd.url}\n  h1=${refAdd.h1} fields=${refAdd.formFields} submissionId=${refAdd.submissionId}`,
      ].join("\n\n") + "\n",
    );

    const tabsAfter = ctx.pages().length;
    const summary = {
      at: new Date().toISOString(),
      buildUrl: BASE,
      refUrl: REF,
      chromiumBefore: before,
      chromiumAfter: chromiumCount(),
      tabsBefore,
      tabsAfter,
      buildCells: results.length,
      refCells: 3,
      failures,
      screens: Object.fromEntries(
        screens.map(([screen]) => [screen, results.filter((r) => r.screen === screen).length]),
      ),
      ref: {
        privacy: { h1: refPrivacy.h1, mailto: refPrivacy.mailto, wa: refPrivacy.wa },
        activity: { h1: refActivity.h1, entries: refActivity.entries, who: refActivity.who },
        add: { h1: refAdd.h1, fields: refAdd.formFields, submissionId: refAdd.submissionId },
      },
    };
    fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
    fs.writeFileSync(
      path.join(runDir, "browser-check.txt"),
      [
        `build cells: ${results.length}`,
        `ref cells: 3`,
        `tabs: ${tabsBefore} -> ${tabsAfter}`,
        `chromium: ${before} -> ${summary.chromiumAfter}`,
        `failures: ${failures.length}`,
        ...failures.map((f) => `  FAIL ${f}`),
      ].join("\n") + "\n",
    );
    console.log(`\nbuild cells: ${results.length}; ref cells: 3`);
    console.log(`chromium: ${before} -> ${summary.chromiumAfter}`);
    console.log(failures.length ? `FAILURES:\n${failures.join("\n")}` : "ALL CHECKS PASSED");
    if (summary.chromiumAfter > before) {
      throw new Error(`a Chrome was launched during the check (${before} -> ${summary.chromiumAfter})`);
    }
    if (failures.length) process.exitCode = 1;
  } finally {
    await detach(browser);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
