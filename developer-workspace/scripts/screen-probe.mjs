// screen-probe.mjs — RECON-001 inventory interactive-UI probe.
// Generalised from developer-workspace/scripts/home-probe.mjs (plan §5).
// Hard-won harness rules (from run 1, which FAILed on both sides = harness artifact):
//   - at ≤900px #sb is display:none, so every #sb control needs the sidebar opened via #sbt first;
//   - the build is a Next.js app: server HTML is interactive only after hydration, so wait for a
//     React key on a controlled node before clicking (ref is vanilla — no wait);
//   - `.pt` renders "<s>was</s>price", so a price parse must drop the <s> node or it concatenates;
//   - theme is read from textContent (not innerText), which differs in case from CSS uppercasing.
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME || "/usr/bin/google-chrome";

async function newPage(browser, { width = 1100, height = 1000, preset = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript((p) => {
    try {
      sessionStorage.setItem("ts-toast", "true");
      sessionStorage.setItem("ts-covering", "2");
      if (p) localStorage.setItem("ts-theme", p);
    } catch (e) {}
  }, preset);
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(45000);
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  return { ctx, page, errors };
}

async function goto(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(() => {
    const o = document.querySelector("#out");
    return !!o && (o.querySelector(".grid") || o.querySelector(".lc") || o.querySelector(".empty"));
  }, null, { timeout: 25000 });
}

// Wait for the build to be interactive (React hydrated). No-op on the vanilla reference.
async function ensureLive(page) {
  const isReact = await page
    .evaluate(() => !!document.querySelector('script[src*="/_next/"]') || !!document.querySelector("#__next"))
    .catch(() => false);
  if (!isReact) return;
  await page
    .waitForFunction(() => {
      const hasKey = (el) => el && Object.keys(el).some((k) => k.startsWith("__reactProps$") || k.startsWith("__reactFiber$"));
      const nodes = [document.querySelector(".thm"), document.querySelector("#sort"), document.querySelector("#sb"), document.querySelector(".sbt")];
      return nodes.some(hasKey) || Object.keys(document.body).some((k) => k.startsWith("__reactContainer$"));
    }, null, { timeout: 15000 })
    .catch(() => {});
}

// #sb is hidden below 900px; open it through #sbt so its controls are actionable.
async function ensureSidebar(page) {
  if (await page.locator("#sb").isVisible().catch(() => false)) return;
  const sbt = page.locator("#sbt");
  if (await sbt.isVisible().catch(() => false)) {
    await sbt.click().catch(() => {});
    await page
      .waitForFunction(() => document.querySelector("#sb") && getComputedStyle(document.querySelector("#sb")).display !== "none", null, { timeout: 5000 })
      .catch(() => {});
  }
}

const textT = (page, sel) => page.locator(sel).evaluate((el) => (el.textContent || "").trim()).catch(() => "");

// prices from `.pt`, dropping the struck-through "was" node so only the current price counts
const PRICES = `[...document.querySelectorAll("#out .card .pt")].map(e=>{const c=e.cloneNode(true);c.querySelectorAll("s").forEach(s=>s.remove());return parseInt(c.textContent.replace(/[^0-9]/g,""),10)}).filter(n=>Number.isFinite(n))`;

// ---- S1–S4: a status checkbox filters the grid, updates #cnt/#ttl and #speak ----
async function statusFilter(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  await ensureSidebar(page);
  const label = page.locator("#sb label.ck").first();
  const expected = parseInt(((await label.locator("em").innerText()) || "").replace(/[^0-9]/g, ""), 10);
  const baseTtl = await textT(page, "#ttl");
  await label.locator('input[type="checkbox"]').check();
  const filtered = await page
    .waitForFunction((e) => document.querySelectorAll("#out .card").length === e, expected, { timeout: 7000 })
    .then(() => true).catch(() => false);
  const cards = await page.locator("#out .card").count();
  const cnt = await textT(page, "#cnt");
  const ttl = await textT(page, "#ttl");
  const speak = await textT(page, "#speak");
  R.push(["S1 status filter marks the title as matching", filtered && ttl !== baseTtl && /match/i.test(ttl), `ttl="${ttl}"`]);
  R.push(["S2 grid shows exactly the checkbox count", cards === expected, `cards=${cards} expected=${expected}`]);
  R.push(["S3 #cnt shows 'X of N'", /of/i.test(cnt), `cnt="${cnt}"`]);
  R.push(["S4 #speak answers with a match sentence", /match/i.test(speak), `speak="${speak}"`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- S5–S6: the sort select reorders the grid by current price ----
async function sortSpec(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const asc = `(()=>{const n=${PRICES};return n.length>1&&n.every((v,i)=>i===0||n[i-1]<=v)})()`;
  const desc = `(()=>{const n=${PRICES};return n.length>1&&n.every((v,i)=>i===0||n[i-1]>=v)})()`;
  await page.selectOption("#sort", "low");
  const lowOk = await page.waitForFunction(asc, null, { timeout: 7000 }).then(() => true).catch(() => false);
  await page.selectOption("#sort", "high");
  const highOk = await page.waitForFunction(desc, null, { timeout: 7000 }).then(() => true).catch(() => false);
  R.push(["S5 sort 'low→high' orders prices ascending", lowOk]);
  R.push(["S6 sort 'high→low' orders prices descending", highOk]);
  await ctx.close();
  return { results: R, errors };
}

// ---- S7–S8: #vg / #vl switch .grid ↔ .lc rows ----
async function viewSpec(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  let listOk = false;
  for (let i = 0; i < 4 && !listOk; i++) {
    await page.click("#vl").catch(() => {});
    listOk = await page
      .waitForFunction(() => document.querySelectorAll("#out .lc").length > 0 && !document.querySelector("#out .grid"), null, { timeout: 4000 })
      .then(() => true).catch(() => false);
  }
  R.push(["S7 #vl shows list rows (.lc, no .grid)", listOk && (await page.locator("#vl").getAttribute("aria-pressed")) === "true"]);
  let gridOk = false;
  for (let i = 0; i < 4 && !gridOk; i++) {
    await page.click("#vg").catch(() => {});
    gridOk = await page
      .waitForFunction(() => document.querySelectorAll("#out .grid .card").length > 0, null, { timeout: 4000 })
      .then(() => true).catch(() => false);
  }
  R.push(["S8 #vg shows grid (.grid .card)", gridOk && (await page.locator("#vg").getAttribute("aria-pressed")) === "true"]);
  await ctx.close();
  return { results: R, errors };
}

// ---- S9–S11: Clear all resets ----
async function clearSpec(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  await ensureSidebar(page);
  await page.locator("#sb label.ck").first().locator('input[type="checkbox"]').check();
  await page.waitForFunction(() => /match/i.test(document.querySelector("#ttl").textContent), null, { timeout: 6000 }).catch(() => {});
  await page.click("#clr").catch(() => {});
  const allOk = await page.waitForFunction(() => /all inventory/i.test(document.querySelector("#ttl").textContent), null, { timeout: 6000 }).then(() => true).catch(() => false);
  const checked = await page.locator('#sb input[type="checkbox"]:checked').count();
  const speak = await textT(page, "#speak");
  R.push(["S9 Clear all resets #ttl to 'All inventory'", allOk]);
  R.push(["S10 Clear all unchecks every box", checked === 0, `checked=${checked}`]);
  R.push(["S11 Clear all speaks the cleared line", /Showing everything/i.test(speak), `speak="${speak}"`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- S12–S13: no-match empty state ----
async function emptySpec(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  await ensureSidebar(page);
  await page.fill("#pmin", "999999999").catch(() => {});
  await page.press("#pmin", "Tab").catch(() => {});
  const emptyOk = await page.locator("#out .empty").waitFor({ state: "visible", timeout: 7000 }).then(() => true).catch(() => false);
  const speak = await textT(page, "#speak");
  R.push(["S12 impossible price → #out .empty visible", emptyOk]);
  R.push(["S13 empty state speaks 'Nothing matches'", /Nothing matches/i.test(speak), `speak="${speak}"`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- S14–S16: theme toggle swaps and persists ts-theme ----
async function themeSpec(browser, url, { width }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: null });
  const R = [];
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await ensureLive(page);
  const before = await page.locator("html").getAttribute("data-theme");
  let flipped = false;
  for (let i = 0; i < 4 && !flipped; i++) {
    await page.locator(".thm").first().click({ timeout: 4000 }).catch(() => {});
    flipped = await page
      .waitForFunction((b) => document.documentElement.dataset.theme !== b, before, { timeout: 3500 })
      .then(() => true).catch(() => false);
  }
  const after = await page.locator("html").getAttribute("data-theme");
  const stored = await page.evaluate(() => { try { return localStorage.getItem("ts-theme"); } catch { return null; } });
  R.push(["S14 .thm flips the theme", flipped && !!after && after !== before, `${before}→${after}`]);
  R.push(["S15 theme stored under ts-theme", stored === after, `stored=${stored}`]);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction((t) => document.documentElement.dataset.theme === t, after, { timeout: 8000 }).catch(() => {});
  const persisted = await page.locator("html").getAttribute("data-theme");
  R.push(["S16 theme persists across reload", persisted === after && !!after, `persisted=${persisted}`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- S17–S19: ≤900px "Search options" toggles the sidebar ----
async function sidebarSpec(browser, url, { mode }) {
  const { ctx, page, errors } = await newPage(browser, { width: 560, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const sbtVisible = await page.locator("#sbt").isVisible();
  const sbHidden = !(await page.locator("#sb").isVisible());
  await page.locator("#sbt").click();
  const opened = await page
    .waitForFunction(() => document.querySelector("#sb") && getComputedStyle(document.querySelector("#sb")).display !== "none", null, { timeout: 5000 })
    .then(() => true).catch(() => false);
  const expanded = await page.locator("#sbt").getAttribute("aria-expanded");
  await page.locator("#sbt").click();
  const closed = await page
    .waitForFunction(() => document.querySelector("#sb") && getComputedStyle(document.querySelector("#sb")).display === "none", null, { timeout: 5000 })
    .then(() => true).catch(() => false);
  R.push(["S17 ≤900 Search options visible, sidebar hidden", sbtVisible && sbHidden, `sbt=${sbtVisible} sbHidden=${sbHidden}`]);
  R.push(["S18 Search options opens the sidebar", opened && expanded === "true", `open=${opened} aria-expanded=${expanded}`]);
  R.push(["S19 Search options closes the sidebar again", closed]);
  await ctx.close();
  return { results: R, errors };
}

const SPECS = [
  { name: "statusFilter", fn: statusFilter, maxWidth: Infinity },
  { name: "sort", fn: sortSpec, maxWidth: Infinity },
  { name: "viewToggle", fn: viewSpec, maxWidth: Infinity },
  { name: "clearAll", fn: clearSpec, maxWidth: Infinity },
  { name: "emptyState", fn: emptySpec, maxWidth: Infinity },
  { name: "themeToggle", fn: themeSpec, maxWidth: Infinity },
  { name: "mobileSidebar", fn: sidebarSpec, maxWidth: 900 },
];

async function runOne(browser, url, spec, cell) {
  try {
    const r = await spec.fn(browser, url, cell);
    return { results: r.results, errors: r.errors };
  } catch (e) {
    return { results: [[`${spec.name} THREW`, false, String(e.message || e).split("\n")[0]]], errors: [] };
  }
}

export async function runProbe(browser, refUrl, buildUrl, cells) {
  const out = [];
  const P = (s = "") => out.push(s);
  P("# Inventory interactive-UI probe (REF vs BUILD)");
  P();
  P("Legend: PASS/FAIL per assertion. `obs` is the observed text/values.");
  P();
  const sideBySide = [];
  for (const cell of cells) {
    P(`## Cell ${cell.width} / ${cell.mode}`);
    P();
    for (const spec of SPECS) {
      if (cell.width > spec.maxWidth) continue;
      const refR = await runOne(browser, refUrl, spec, cell);
      const buildR = await runOne(browser, buildUrl, spec, cell);
      const n = Math.max(refR.results.length, buildR.results.length);
      for (let i = 0; i < n; i++) {
        const a = refR.results[i], b = buildR.results[i];
        const fmt = (x) => (x ? `[${x[1] ? "PASS" : "FAIL"}] ${x[0]}${x[2] ? `  (${x[2]})` : ""}` : "<none>");
        P(`- ${spec.name}:  REF ${fmt(a)}   |   BUILD ${fmt(b)}`);
        if (a && b) sideBySide.push(`${a[1] === b[1] ? (b[1] ? "BOTH PASS" : "BOTH FAIL") : "DIVERGE  "}  ${String(cell.width).padStart(4)}/${cell.mode.padEnd(5)}  ${b[0]}  ref=${a[1]} build=${b[1]}`);
      }
      if (refR.errors.length || buildR.errors.length) {
        for (const e of refR.errors) P(`    REF js: ${e}`);
        for (const e of buildR.errors) P(`    BUILD js: ${e}`);
      }
    }
    P();
  }
  P("## Side by side (REF vs BUILD verdict)");
  for (const l of sideBySide) P(l);
  P();
  return out.join("\n");
}

// ---- standalone CLI (one browser, one cell) ----
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [, , refUrl, buildUrl, widthArg = "1100", mode = "dark", outFile] = process.argv;
  if (!refUrl || !buildUrl) {
    console.error("usage: node screen-probe.mjs <refUrl> <buildUrl> [width] [dark|light] [outFile]");
    process.exit(2);
  }
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const md = await runProbe(browser, refUrl, buildUrl, [{ width: Number(widthArg), mode }]);
    if (outFile) {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(outFile, md);
      console.log(`wrote ${outFile}`);
    } else {
      console.log(md);
    }
  } finally {
    await browser.close();
  }
  process.exit(0);
}
