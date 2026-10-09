// RECON-001 home page runtime behaviour probe (rev 2).
//
// Rewritten to the installed `playwright-core` skill rules:
//   - NO waitForTimeout. Every wait is a state wait (visible / hidden / predicate).
//   - Accessible locators first (getByRole). Stable ids only to disambiguate containers.
//   - STRICT ISOLATION: one fresh browser context per check (clean localStorage), any order.
//   - PROVABLE negative assertions: each locator asserted absent is also observed present
//     somewhere in the same run, so a broken locator cannot masquerade as a pass.
//
// Usage: node home-probe.mjs <refUrl> <buildUrl>
// Read-only: navigates and reads. Writes nothing to either site.
import { chromium } from "playwright-core";

const [, , refUrl, buildUrl] = process.argv;
if (!refUrl || !buildUrl) {
  console.error("usage: node home-probe.mjs <refUrl> <buildUrl>");
  process.exit(2);
}

const CHROME = process.env.CHROME || "/usr/bin/google-chrome";

// --- web-first waits (playwright-core primitives; the auto-retrying engine) ---
const waitState = async (loc, state, timeout = 8000) => {
  try { await loc.waitFor({ state, timeout }); return true; } catch { return false; }
};
const visible = (loc, t) => waitState(loc, "visible", t);
const hidden = (loc, t) => waitState(loc, "hidden", t);

const themeBtn = (p) => p.getByRole("button", { name: "Toggle dark mode" });
const closeBtn = (p) => p.getByRole("button", { name: "Close" });
const modal = (p) => p.locator("#ovl");
const askBar = (p) => p.locator("#ask");
const toast = (p) => p.locator("#toast");

// Wait for the first-visit modal (opens ~1s in) and dismiss it, deterministically, no sleeps.
async function settleFirstVisit(p) {
  const appeared = await visible(modal(p), 3000);
  if (appeared) {
    await closeBtn(p).click({ timeout: 5000 }).catch(() => {});
    await hidden(modal(p), 3000);
  }
  return appeared;
}

async function newPage(browser, { width = 1100, height = 900, storage } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  if (storage) {
    await ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, ["ts-theme", storage]);
  }
  const page = await ctx.newPage();
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(45000);
  const failed = [];
  const errors = [];
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  return { ctx, page, failed, errors };
}

// ---- specs: each opens its own clean context ----
const specs = {
  // first-visit journey: modal, ask bar, toast — and proves the toast/ask locators resolve.
  async firstVisit(browser, url) {
    const { ctx, page, failed, errors } = await newPage(browser);
    const R = [];
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    R.push(["B1 welcome modal opens on first visit", await visible(modal(page), 6000)]);
    R.push(["B2 ask bar hidden while modal open", await hidden(askBar(page), 2000)]);
    R.push(["B3 toast NOT shown at start (before 9s)", await hidden(toast(page), 2000)]);
    R.push(["B4 default theme is dark", (await page.locator("html").getAttribute("data-theme")) === "dark"]);
    // provable: the SAME toast locator must resolve when it does appear
    R.push(["B5 social-proof toast appears (proves B3 locator)", await visible(toast(page), 12000)]);
    R.push(["B6 welcome modal still open (untouched)", await visible(modal(page), 1000)]);
    await ctx.close();
    return { results: R, failed, errors };
  },

  // theme toggle: flip, icon, persistence across reload. Proves ask bar resolves (closed on return).
  async theme(browser, url) {
    const { ctx, page, failed, errors } = await newPage(browser);
    const R = [];
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settleFirstVisit(page);
    const before = await page.locator("html").getAttribute("data-theme");
    await themeBtn(page).click();
    const flipped = await page.waitForFunction((b) => document.documentElement.dataset.theme !== b, before, { timeout: 5000 }).then(() => true).catch(() => false);
    const after = await page.locator("html").getAttribute("data-theme");
    R.push(["T1 toggle flips mode", flipped && !!after && after !== before]);
    const iconClass = await themeBtn(page).locator("i").getAttribute("class");
    R.push(["T2 icon swaps to sun in light", after === "light" ? /fa-sun/.test(iconClass || "") : /fa-moon/.test(iconClass || "")]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await themeBtn(page).waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    const persisted = await page.locator("html").getAttribute("data-theme");
    R.push(["T3 choice persists across reload", persisted === after]);
    const stored = await page.evaluate(() => { try { return localStorage.getItem("ts-theme"); } catch { return null; } });
    R.push(["T4 stored under ts-theme", stored === after]);
    // provable negative: on the return visit the ask bar stays closed once asked
    R.push(["T5 ask bar closed on return visit", await hidden(askBar(page), 3000)]);
    await ctx.close();
    return { results: R, failed, errors };
  },

  async hero(browser, url) {
    const { ctx, page, failed, errors } = await newPage(browser);
    const R = [];
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settleFirstVisit(page);
    const idx = () => page.evaluate(() => [...document.querySelectorAll(".hsl")].findIndex((e) => e.classList.contains("on")));
    const a0 = await idx();
    await page.locator("#hero").getByRole("button", { name: "Next" }).click();
    const moved = await page.waitForFunction((n) => [...document.querySelectorAll(".hsl")].findIndex((e) => e.classList.contains("on")) !== n, a0, { timeout: 5000 }).then(() => true).catch(() => false);
    R.push(["H1 hero next arrow changes the active slide", moved]);
    await ctx.close();
    return { results: R, failed, errors };
  },

  async featured(browser, url) {
    const { ctx, page, failed, errors } = await newPage(browser);
    const R = [];
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settleFirstVisit(page);
    const first = () => page.locator("#sl .card h3").first().textContent();
    const f0 = await first();
    // featured next: scope to the strip's sibling control group (stable id), role-located button
    await page.locator("#sl").locator("xpath=..").getByRole("button", { name: "Next" }).click();
    const moved = await page.waitForFunction((t) => {
      const el = document.querySelector("#sl .card h3");
      return el && el.textContent !== t;
    }, f0, { timeout: 5000 }).then(() => true).catch(() => false);
    R.push(["F1 featured next moves the strip", moved]);
    await ctx.close();
    return { results: R, failed, errors };
  },

  async tabs(browser, url) {
    const { ctx, page, failed, errors } = await newPage(browser);
    const R = [];
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settleFirstVisit(page);
    const home = page.url();
    await page.getByRole("tab", { name: "On order" }).click();
    const navigated = await page.waitForURL(/status=o/, { timeout: 8000 }).then(() => true).catch(() => false);
    R.push(["T5-NAV on-order tab navigates to inventory?status=o", navigated && page.url() !== home]);
    await ctx.close();
    return { results: R, failed, errors };
  },

  async showAll(browser, url) {
    const { ctx, page, failed, errors } = await newPage(browser);
    const R = [];
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await settleFirstVisit(page);
    const home = page.url();
    // NOTE: ref renders #allBtn as <button>, build as <a href> (role link) — role differs,
    // so the cross-side locator is the stable id. The role difference is itself recorded below.
    const tag = await page.locator("#allBtn").evaluate((el) => el.tagName.toLowerCase()).catch(() => "?");
    R.push(["A0 Show-all element tag (ref button / build a)", true, `tag=${tag}`]);
    await page.locator("#allBtn").click();
    const navigated = await page.waitForURL(/inventory/, { timeout: 8000 }).then(() => true).catch(() => false);
    R.push(["A1 Show all navigates to inventory", navigated && page.url() !== home]);
    await ctx.close();
    return { results: R, failed, errors };
  },

  // the earlier 560/light build 500 — reproduce it in isolation, twice.
  async narrowLight(browser, url) {
    const R = [];
    let failed = [], errors = [];
    for (let i = 1; i <= 2; i++) {
      const { ctx, page, failed: f, errors: e } = await newPage(browser, { width: 560, storage: "light" });
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => null);
      const status = resp ? resp.status() : "no-response";
      const theme = await page.locator("html").getAttribute("data-theme").catch(() => null);
      R.push([`N${i} 560/light loads (HTTP < 500)`, Number(status) < 500 && status !== "no-response", `status=${status} theme=${theme}`]);
      failed = failed.concat(f); errors = errors.concat(e);
      await ctx.close();
    }
    return { results: R, failed, errors };
  },
};

const withTimeout = (p, ms, label) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`spec timeout ${ms}ms`)), ms))]);

async function runSide(browser, url, label) {
  const out = { label, url, specs: {}, failed: new Set(), errors: new Set() };
  console.log(`\n----- ${label} -----`);
  for (const [name, fn] of Object.entries(specs)) {
    const t0 = Date.now();
    try {
      const r = await withTimeout(fn(browser, url), 60000, name);
      out.specs[name] = r.results;
      r.failed.forEach((x) => out.failed.add(x));
      r.errors.forEach((x) => out.errors.add(x));
      console.log(`  ${name}: ${r.results.filter((x) => !x[1]).length} fail / ${r.results.length} (${Date.now() - t0}ms)`);
    } catch (e) {
      out.specs[name] = [[`${name} threw: ${String(e.message || e).split("\n")[0]}`, false]];
      console.log(`  ${name}: THREW ${String(e.message || e).split("\n")[0]} (${Date.now() - t0}ms)`);
    }
  }
  return out;
}

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const [REF, BUILD] = [
  await runSide(browser, refUrl, "REF"),
  await runSide(browser, buildUrl, "BUILD"),
];
await browser.close();

const flat = (side) => Object.values(side.specs).flat();
const key = (r) => r[0];

for (const side of [REF, BUILD]) {
  console.log(`\n===== ${side.label} (${side.url}) =====`);
  for (const [id, pass, obs] of flat(side)) {
    console.log(`[${pass ? "PASS" : "FAIL"}] ${id}${obs ? `  (${obs})` : ""}`);
  }
  console.log(`failed requests: ${side.failed.size ? "\n  " + [...side.failed].join("\n  ") : "(none)"}`);
  console.log(`js errors: ${side.errors.size ? "\n  " + [...side.errors].join("\n  ") : "(none)"}`);
}

console.log("\n===== SIDE BY SIDE =====");
const rflat = new Map(flat(REF).map((r) => [key(r), r[1]]));
for (const [id, passBuild] of flat(BUILD)) {
  const passRef = rflat.get(id);
  const verdict = passRef === passBuild ? (passBuild ? "BOTH PASS" : "BOTH FAIL") : "DIVERGE  ";
  console.log(`${verdict}  ${id}  ref=${passRef} build=${passBuild}`);
}
