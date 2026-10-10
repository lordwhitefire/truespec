// car-probe.mjs — RECON-001 car-page interactive-UI probe.
// Harness lessons carried over from the inventory probe (screen-probe.mjs):
//   - theme via localStorage in addInitScript BEFORE load
//   - build is Next.js so hydration is awaited (ensureLive) before clicking
//   - no waitForTimeout for control flow — web-first state waits only
// SKILL (playwright-core): queries are role-first where the element HAS an accessible
// role; the few exceptions (the ref stage image is alt="" i.e. decorative, and the gold
// "More cars" rail region) are named in the proof table. An "absent in build" claim is
// only reported as proven when the SAME locator resolves on the reference (see the
// "Locator resolution (proof)" table at the end of every cell).
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
    const crumb = document.querySelector("#crumb");
    const h1 = document.querySelector("h1");
    return (crumb && crumb.textContent.trim().length > 0) || (h1 && h1.textContent.trim().length > 0);
  }, null, { timeout: 25000 });
}

// Build is a Next.js app: wait for React keys on a controlled node before clicking.
async function ensureLive(page) {
  const isReact = await page
    .evaluate(() => !!document.querySelector('script[src*="/_next/"]') || !!document.querySelector("#__next"))
    .catch(() => false);
  if (!isReact) return;
  await page
    .waitForFunction(() => {
      const hasKey = (el) => el && Object.keys(el).some((k) => k.startsWith("__reactProps$") || k.startsWith("__reactFiber$"));
      const nodes = [document.querySelector(".gallery"), document.querySelector(".thm"), document.querySelector("button")];
      return nodes.some(hasKey) || Object.keys(document.body).some((k) => k.startsWith("__reactContainer$"));
    }, null, { timeout: 15000 })
    .catch(() => {});
}

const textT = (page, sel) => page.locator(sel).first().evaluate((el) => (el.textContent || "").trim()).catch(() => "");

// Wait until a text node's value repeats (the ref price count-up writes an exact
// value before and after, so two equal reads means it has settled). No fixed timeout.
async function settleText(page, sel) {
  await page
    .waitForFunction((s) => {
      const el = document.querySelector(s);
      const now = el ? el.textContent.trim() : "";
      if (!now) return false;
      const prev = window.__settlePrev;
      window.__settlePrev = now;
      return now === prev;
    }, sel, { timeout: 9000, polling: 700 })
    .catch(() => {});
  return textT(page, sel);
}

// ---- role-first locators ---------------------------------------------------
// Controls have accessible names on BOTH sides, so these resolve identically:
const NEXT_PHOTO = (p) => p.getByRole("button", { name: "Next photo", exact: true });
const TAB_FEATURES = (p) => p.getByRole("tab", { name: "Features", exact: true });
const RAIL_NEXT = (p) => p.locator(".rn, .related").getByRole("button", { name: "Next", exact: true });
const THEME_TOGGLE = (p) => p.getByRole("button", { name: "Toggle dark mode" });
// Icon-font note: the reference's controls prepend a FontAwesome glyph to their
// accessible name (e.g. "\uf1e0Share this"), so icon-bearing controls match by
// substring, not exact. This is itself an accessible-structure finding.
const SHARE_CHIP = (p) => p.getByRole("button", { name: /Share this/ });
const MBAR_CTA = (p) => p.getByRole("link", { name: /Chat now/ });
const WA_MAIN = (p) => p.getByRole("link", { name: /Chat on WhatsApp/ });
// Thumbnails carry different roles per side (a structural difference the probe records):
const THUMB_BTN = (p) => p.getByRole("button", { name: /^Photo \d+$/ });   // reference
const THUMB_IMG = (p) => p.getByRole("img", { name: /thumbnail \d+/ });    // build
// No accessible role on either side (ref #gi is alt="" i.e. decorative): locator justified.
const STAGE_IMG = (p) => p.locator("#gal img, .gallery .stage img").first();
const GALLERY_REGION = (p) => p.locator("#gal, .gallery").first();

async function countOf(loc) {
  return loc.count().catch(() => 0);
}

// Proof table: resolve every locator on the current side and report its count.
// This is what makes an "absent in build" claim provable — the same locator must
// resolve on the reference where the element exists.
const PROOF = [
  { name: "button 'Next photo'", loc: NEXT_PHOTO },
  { name: "tab 'Features'", loc: TAB_FEATURES },
  { name: "button 'Next' exact (related rail)", loc: RAIL_NEXT },
  { name: "button 'Toggle dark mode'", loc: THEME_TOGGLE },
  { name: "button 'Share this'", loc: SHARE_CHIP },
  { name: "link 'Chat now' (mobile bar)", loc: MBAR_CTA },
  { name: "link 'Chat on WhatsApp' (anywhere)", loc: WA_MAIN },
  { name: "button /^Photo \\d+$/ (ref thumbnail role)", loc: THUMB_BTN },
  { name: "img  /thumbnail/ (build thumbnail role)", loc: THUMB_IMG },
];
async function proofCounts(page) {
  const out = [];
  for (const p of PROOF) out.push({ name: p.name, count: await countOf(p.loc(page)) });
  return out;
}

// ---- C1: next arrow advances the gallery photo (and the counter) ----
async function galleryNext(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const before = await STAGE_IMG(page).getAttribute("src").catch(() => null);
  const next = NEXT_PHOTO(page);
  const hasNext = await countOf(next) > 0;
  await next.first().click({ timeout: 4000 }).catch(() => {});
  const changed = await page.waitForFunction((b) => {
    const img = document.querySelector("#gal img") || document.querySelector(".gallery .stage img");
    return img && img.getAttribute("src") && img.getAttribute("src") !== b;
  }, before, { timeout: 6000 }).then(() => true).catch(() => false);
  R.push(["C1 next arrow advances the photo", hasNext && changed, `next=${hasNext} srcChanged=${changed}`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C2: clicking a thumbnail makes it the active one ----
async function thumbSelect(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  // Role-first: reference exposes thumbnails as buttons, build as clickable images.
  let loc = THUMB_BTN(page), role = "button 'Photo N'";
  if ((await countOf(loc)) === 0) { loc = THUMB_IMG(page); role = "img 'thumbnail N'"; }
  const n = await countOf(loc);
  let pass = false, obs = `role=${role} thumbs=${n}`;
  if (n > 1) {
    await loc.nth(1).click({ timeout: 4000 }).catch(() => {});
    pass = await page.waitForFunction(() => {
      const t = [...document.querySelectorAll("#thumbs button, .gallery .thumbs img")];
      return t[1] && (t[1].classList.contains("on") || t[1].getAttribute("data-active") === "true");
    }, null, { timeout: 5000 }).then(() => true).catch(() => false);
    obs += ` secondActive=${pass}`;
  }
  R.push(["C2 thumbnail click selects that photo", pass, obs]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C3: clicking the gallery opens the lightbox ----
async function lightbox(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const lbPresent = await page.locator("#lb, .lb").count();
  await GALLERY_REGION(page).click({ timeout: 4000 }).catch(() => {});
  const opened = await page.waitForFunction(
    () => { const lb = document.querySelector("#lb") || document.querySelector(".lb"); return !!lb && lb.classList.contains("open"); },
    null, { timeout: 5000 },
  ).then(() => true).catch(() => false);
  R.push(["C3 gallery click opens the lightbox", opened, `lbPresent=${lbPresent} opened=${opened}`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C4: a tab click switches the visible panel ----
async function tabs(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const tabN = await countOf(TAB_FEATURES(page));
  let pass = false, obs = `tab 'Features' count=${tabN}`;
  if (tabN >= 1) {
    const tab = TAB_FEATURES(page).first();
    await tab.scrollIntoViewIfNeeded().catch(() => {});
    await tab.click({ timeout: 4000 }).catch(() => {});
    pass = await page.waitForFunction(() => {
      const p2 = document.querySelector("#p2");
      const p1 = document.querySelector("#p1");
      return p2 && p2.classList.contains("on") && p1 && !p1.classList.contains("on");
    }, null, { timeout: 5000 }).then(() => true).catch(() => false);
    obs += ` p2Shown=${pass}`;
  }
  R.push(["C4 tab click switches the panel", pass, obs]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C5: related-rail next button scrolls the rail ----
async function relatedRail(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const railN = await page.locator("#rt2 .rc, .related .rc").count();
  const btnN = await countOf(RAIL_NEXT(page));
  const before = await page.locator("#rt2, .related .rt").first().evaluate((el) => el.scrollLeft).catch(() => 0);
  await RAIL_NEXT(page).first().click({ timeout: 4000 }).catch(() => {});
  const moved = await page.waitForFunction((b) => {
    const el = document.querySelector("#rt2") || document.querySelector(".related .rt");
    return el && el.scrollLeft !== b;
  }, before, { timeout: 4000 }).then(() => true).catch(() => false);
  R.push(["C5 related rail next scrolls the rail", btnN > 0 && railN > 0 && moved, `cards=${railN} railNext=${btnN} moved=${moved}`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C6: theme toggle flips and persists ----
async function themeToggle(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: null });
  const R = [];
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await ensureLive(page);
  const before = await page.locator("html").getAttribute("data-theme");
  let flipped = false;
  for (let i = 0; i < 4 && !flipped; i++) {
    await THEME_TOGGLE(page).first().click({ timeout: 4000 }).catch(() => {});
    flipped = await page.waitForFunction((b) => document.documentElement.dataset.theme !== b, before, { timeout: 3500 }).then(() => true).catch(() => false);
  }
  const after = await page.locator("html").getAttribute("data-theme");
  const stored = await page.evaluate(() => { try { return localStorage.getItem("ts-theme"); } catch { return null; } });
  R.push(["C6 theme toggle flips + persists (ts-theme)", flipped && !!after && after !== before && stored === after, `${before}->${after} stored=${stored}`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C7: ≤820 the mobile bar appears once the price card is scrolled past ----
async function mobileBar(browser, url) {
  const { ctx, page, errors } = await newPage(browser, { width: 560, preset: "dark" });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const present = await countOf(MBAR_CTA(page));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
  await page.waitForFunction(() => (window.scrollY || 0) > 400, null, { timeout: 5000 }).catch(() => {});
  const shown = await page.waitForFunction(
    () => { const m = document.querySelector("#mbar") || document.querySelector(".mbar"); return !!m && m.classList.contains("show"); },
    null, { timeout: 5000 },
  ).then(() => true).catch(() => false);
  R.push(["C7 ≤820 mobile bar appears after scrolling past price", present > 0 && shown, `mbarCta=${present} shown=${shown}`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C8: the Share chip copies the link and shows the toast ----
async function shareChip(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const shareBtn = SHARE_CHIP(page);
  const present = await countOf(shareBtn);
  await shareBtn.first().click({ timeout: 4000 }).catch(() => {});
  const shown = await page.waitForFunction(
    () => { const t = document.querySelector("#stoast") || document.querySelector(".stoast"); return !!t && t.classList.contains("show"); },
    null, { timeout: 5000 },
  ).then(() => true).catch(() => false);
  const txt = await textT(page, "#stoast, .stoast");
  R.push(["C8 Share chip shows the copy toast", present > 0 && shown, `shareBtn=${present} shown=${shown} text="${txt}"`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C9: the price settles at one exact naira figure ----
async function priceValue(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const final = await settleText(page, "#pr, .big-price");
  R.push(["C9 price settles at an exact ₦ figure", /₦\s?\d[\d,]*/.test(final || ""), `price="${final}"`]);
  await ctx.close();
  return { results: R, errors };
}

// ---- C10: the primary WhatsApp CTA is a wa.me link carrying this car ----
async function waCta(browser, url, { width, mode }) {
  const { ctx, page, errors } = await newPage(browser, { width, preset: mode });
  const R = [];
  await goto(page, url);
  await ensureLive(page);
  const links = WA_MAIN(page);
  const n = await countOf(links);
  let href = null, carHref = null;
  for (let i = 0; i < n; i++) {
    const h = await links.nth(i).getAttribute("href").catch(() => null);
    if (h && /wa\.me\/\d+/.test(h)) {
      if (!href) href = h;
      if (/(TS-1001|Camry|2021)/.test(decodeURIComponent(h))) { carHref = h; break; }
    }
  }
  const chosen = carHref || href;
  const decoded = chosen ? decodeURIComponent(chosen) : "";
  R.push(["C10 primary WhatsApp CTA is a wa.me link for this car", !!chosen && /(TS-1001|Camry|2021)/.test(decoded), `waLinks=${n} href="${chosen}"`]);
  await ctx.close();
  return { results: R, errors };
}

const SPECS = [
  { name: "galleryNext", fn: galleryNext, maxWidth: Infinity },
  { name: "thumbSelect", fn: thumbSelect, maxWidth: Infinity },
  { name: "lightbox", fn: lightbox, maxWidth: Infinity },
  { name: "tabs", fn: tabs, maxWidth: Infinity },
  { name: "relatedRail", fn: relatedRail, maxWidth: Infinity },
  { name: "themeToggle", fn: themeToggle, maxWidth: Infinity },
  { name: "mobileBar", fn: mobileBar, maxWidth: 820 },
  { name: "shareChip", fn: shareChip, maxWidth: Infinity },
  { name: "priceValue", fn: priceValue, maxWidth: Infinity },
  { name: "waCta", fn: waCta, maxWidth: Infinity },
];

async function runOne(browser, url, spec, cell) {
  try {
    const r = await spec.fn(browser, url, cell);
    return { results: r.results, errors: r.errors };
  } catch (e) {
    return { results: [[`${spec.name} THREW`, false, String(e.message || e).split("\n")[0]]], errors: [] };
  }
}

async function proofFor(browser, url, cell) {
  let ctx = null;
  try {
    const opened = await newPage(browser, { width: cell.width, preset: cell.mode });
    ctx = opened.ctx;
    await goto(opened.page, url);
    await ensureLive(opened.page);
    return { rows: await proofCounts(opened.page), errors: opened.errors };
  } catch (e) {
    return { rows: [], errors: ["proof: " + String((e && e.message) || e)] };
  } finally {
    if (ctx) await ctx.close().catch(() => {});
  }
}

export async function runCarProbe(browser, refUrl, buildUrl, cells) {
  const out = [];
  const P = (s = "") => out.push(s);
  P("# Car interactive-UI probe (REF vs BUILD)");
  P();
  P("Legend: PASS/FAIL per assertion. `obs` is the observed values. Queries are role-first");
  P("(getByRole) wherever the element has an accessible role.");
  P();
  const sideBySide = [];
  for (const cell of cells) {
    P(`## Cell ${cell.width} / ${cell.mode}`);
    P();
    try {
      for (const spec of SPECS) {
        if (cell.width > spec.maxWidth) continue;
        const refR = await runOne(browser, refUrl, spec, cell);
        const buildR = await runOne(browser, buildUrl, spec, cell);
        const n = Math.max(refR.results.length, buildR.results.length);
        for (let i = 0; i < n; i++) {
          const a = refR.results[i], b = buildR.results[i];
          const fmt = (x) => (x ? `[${x[1] ? "PASS" : "FAIL"}] ${x[0]}${x[2] ? `  (${x[2]})` : ""}` : "<none>");
          P(`- ${spec.name}:  REF ${fmt(a)}   |   BUILD ${fmt(b)}`);
          if (a && b) sideBySide.push({ cell, name: `${b[0]}`, verdict: a[1] === b[1] ? (b[1] ? "BOTH PASS" : "BOTH FAIL") : "DIVERGE", ref: a[1], build: b[1], refObs: a[2] || "", buildObs: b[2] || "" });
        }
        if (refR.errors.length || buildR.errors.length) {
          for (const e of refR.errors) P(`    REF js: ${e}`);
          for (const e of buildR.errors) P(`    BUILD js: ${e}`);
        }
      }
      // Locator resolution (proof) for this cell.
      const refProof = await proofFor(browser, refUrl, cell);
      const buildProof = await proofFor(browser, buildUrl, cell);
      P();
      P(`### Locator resolution (proof) — ${cell.width}/${cell.mode}`);
      P(`| locator | REF count | BUILD count | proves |`);
      P(`| --- | --- | --- | --- |`);
      for (let i = 0; i < Math.max(refProof.rows.length, buildProof.rows.length); i++) {
        const r = refProof.rows[i] || { name: "(none)", count: "-" };
        const b = buildProof.rows[i] || { name: "(none)", count: "-" };
        const proves = r.count > 0 && b.count === 0 ? "yes (ref resolves, build absent)" : r.count === 0 && b.count > 0 ? "build-only" : r.count > 0 && b.count > 0 ? "present both" : "present neither";
        P(`| \`${r.name}\` | ${r.count} | ${b.count} | ${proves} |`);
      }
      P();
    } catch (e) {
      P(`(cell aborted: ${String((e && e.message) || e)})`);
      P();
      if (!browser.isConnected || !browser.isConnected()) {
        P("(browser disconnected — stopping probe)");
        break;
      }
    }
  }
  P("## Side by side (REF vs BUILD verdict)");
  for (const l of sideBySide) {
    P(`${l.verdict.padEnd(10)} ${String(l.cell.width).padStart(4)}/${l.cell.mode.padEnd(5)}  ${l.name}  ref=${l.ref} build=${l.build}`);
  }
  P();
  // Explicit proof of every absence claim: a DIVERGE where BUILD fails is only proven
  // when REF passes the identical assertion (i.e. the locator resolved on the reference).
  P("## Absence proof (every DIVERGE where BUILD fails)");
  const proofs = sideBySide.filter((l) => l.verdict === "DIVERGE" && !l.build);
  if (!proofs.length) P("(no build-failing divergences)");
  for (const l of proofs) {
    P(`- ${l.name} @ ${l.cell.width}/${l.cell.mode}: BUILD fails; REF ${l.ref ? "PASSES the same assertion — proven divergent" : "also fails — claim NOT proven"}`);
    P(`    ref   obs: ${l.refObs}`);
    P(`    build obs: ${l.buildObs}`);
  }
  P();
  return out.join("\n");
}

// ---- standalone CLI (one browser, one cell) ----
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [, , refUrl, buildUrl, widthArg = "1100", mode = "dark", outFile] = process.argv;
  if (!refUrl || !buildUrl) {
    console.error("usage: node car-probe.mjs <refUrl> <buildUrl> [width] [dark|light] [outFile]");
    process.exit(2);
  }
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const md = await runCarProbe(browser, refUrl, buildUrl, [{ width: Number(widthArg), mode }]);
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
