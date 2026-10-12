// independent-census.mjs — the verification instrument for EXTRACT-001.
//
// A session that did NOT run the extraction re-counts the live page from a
// DIFFERENT code path than the Builder's extractor:
//   * elements  -> document.querySelectorAll('*') + an independent TreeWalker
//   * CSS rules -> the page's own CSSOM (document.styleSheets[].cssRules),
//                  recursively, plus shadow-root adoptedStyleSheets/<style>.
// The Builder used CDP CSS.getStyleSheetText + a hand-written parseCss; this
// uses the browser's CSSOM parser instead. Neither accepts the inventory.
//
// Reuses the runtime-divergence browser layer (browser.mjs) per the user's
// chosen instrument. Read-only except the one authorized probe (item 4).
//
// Usage: node .saa/evidence/independent-census.mjs <outDir>

import { connect, detach } from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const REF = "http://localhost:3211/car.html?car=1999-not-a-real-car";
const BUILD = "http://localhost:3210/car/NOPE-9999";
const INV = "developer-workspace/scripts/runtime-ui-diff/runs/extract-001";
const outDir = process.argv[2] || ".saa/evidence";
mkdirSync(outDir, { recursive: true });

// Item 3 sample: props spread across the inventory's closed list, read live.
const closedList = JSON.parse(readFileSync(`${INV}/reference.json`, "utf8")).closedList;
const step = Math.max(1, Math.floor(closedList.length / 30));
const sampleProps = closedList.filter((_, i) => i % step === 0).slice(0, 30);

// ---- the in-page census (runs inside the browser) -------------------------
const CENSUS = `(sampleProps) => {
  const normSel = (s) => (s || "").replace(/\\s+/g, " ").replace(/\\s*,\\s*/g, ",").trim();
  const kinds = {};
  const styleSigs = {};        // "sheetURL||selector" -> count
  const allRules = [];         // one row per rule, for the ledger cross-check
  let crossOrigin = 0, sheetCount = 0, shadowRoots = 0;

  const classify = (r) => {
    const n = r && r.constructor ? r.constructor.name : "";
    if (n === "CSSStyleRule") return "style";
    if (n === "CSSMediaRule" || n === "CSSSupportsRule" ||
        n === "CSSLayerBlockRule" || n === "CSSContainerRule" ||
        n === "CSSScopeRule" || n === "CSSStartingStyleRule") return "at-block";
    if (n === "CSSKeyframesRule") return "keyframes";
    if (n === "CSSKeyframeRule") return "keyframe";
    if (n === "CSSFontFaceRule") return "font-face";
    if (n === "CSSImportRule") return "import";
    if (n === "CSSPropertyRule") return "property";
    if (n === "CSSLayerStatementRule") return "layer-statement";
    if (n === "CSSPageRule") return "page";
    if (n === "CSSNamespaceRule") return "namespace";
    return n || "unknown";
  };

  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };

  const walk = (ruleList, sheetURL, depth, fromShadow) => {
    if (!ruleList || depth > 8) return;
    for (const r of ruleList) {
      const kind = classify(r);
      bump(kinds, kind);
      let selector = null, cond = null, keyText = null;
      if (kind === "style") selector = normSel(r.selectorText);
      if (kind === "at-block") cond = (r.conditionText || (r.media && r.media.mediaText) || "");
      if (kind === "keyframes") selector = r.name || "";
      if (kind === "keyframe") keyText = r.keyText || "";
      if (kind === "import") {
        let href = r.href || "";
        try { if (r.styleSheet) { sheetCount++; walk(r.styleSheet.cssRules, r.styleSheet.href || href, depth + 1, fromShadow); } } catch (e) {}
        continue;
      }
      allRules.push({ kind, sheetURL, selector, cond, keyText, fromShadow });
      if (kind === "style") {
        const sig = sheetURL + "||" + selector;
        styleSigs[sig] = (styleSigs[sig] || 0) + 1;
      }
      // recurse into grouping rules (media/supports/layer/container)
      if (r.cssRules && (kind === "at-block")) walk(r.cssRules, sheetURL, depth + 1, fromShadow);
    }
  };

  const readSheet = (sheet, fromShadow) => {
    sheetCount++;
    let rs;
    try { rs = sheet.cssRules; } catch (e) { crossOrigin++; return; }
    walk(rs, sheet.href || location.href, 0, fromShadow);
  };

  for (const sheet of document.styleSheets) readSheet(sheet, false);
  for (const s of (document.adoptedStyleSheets || [])) readSheet(s, false);

  // shadow roots (Next.js dev overlay, web components)
  const shadowHosts = [];
  const walkShadow = (root) => {
    const hosts = root.querySelectorAll("*");
    for (const el of hosts) {
      if (el.shadowRoot) {
        shadowRoots++;
        shadowHosts.push({ tag: el.tagName.toLowerCase(), cls: [...el.classList] });
        for (const s of (el.shadowRoot.adoptedStyleSheets || [])) readSheet(s, true);
        for (const st of el.shadowRoot.querySelectorAll("style")) {
          if (st.sheet) readSheet(st.sheet, true);
        }
        // nested shadow
        try { walkShadow(el.shadowRoot); } catch (e) {}
      }
    }
  };
  walkShadow(document);

  // elements: two independent counts
  const countQSA = document.querySelectorAll("*").length;
  let countTreeWalker = 0;
  const tw = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT, null);
  while (tw.nextNode()) countTreeWalker++;

  // item 3 live spot-check: sample props on a few located elements
  const elAt = (path) => {
    // path like "html" or "body/0:div/1:a"
    const parts = path.split("/");
    let cur = document.documentElement;
    if (parts[0] === "html") { cur = document.documentElement; parts.shift(); }
    else if (parts[0] === "body") { cur = document.body; parts.shift(); }
    else return null;
    for (const p of parts) {
      const m = p.match(/^(\\d+):(.+)$/);
      if (!m) return null;
      cur = cur && cur.children[Number(m[1])];
    }
    return cur || null;
  };

  const probes = [];
  const sampleEls = [
    "html", "body/0:header", "body/1:main", "body/2:footer", "body/0:header/0:div"
  ];
  for (const p of sampleEls) {
    const el = elAt(p);
    if (!el) { probes.push({ path: p, found: false }); continue; }
    const cs = getComputedStyle(el);
    const vals = {};
    for (const prop of sampleProps) {
      // read both camelCase and dashed form; CSSOM accepts dashed
      let v = "";
      try { v = cs.getPropertyValue(prop); } catch (e) { v = "«err»"; }
      vals[prop] = v;
    }
    probes.push({ path: p, found: true, tag: el.tagName.toLowerCase(), vals });
  }

  return {
    url: location.href,
    title: document.title,
    viewport: [innerWidth, innerHeight],
    countQSA,
    countTreeWalker,
    sheetCount,
    crossOriginSheets: crossOrigin,
    shadowRoots,
    shadowHosts,
    kinds,
    ruleTotal: Object.values(kinds).reduce((a, b) => a + b, 0),
    styleRuleCount: kinds.style || 0,
    styleSigs,
    allRulesLen: allRules.length,
    sampleProps,
    probes,
    dataTheme: document.documentElement.getAttribute("data-theme"),
    darkRuleMatches: document.querySelectorAll("html[data-theme=dark]").length
  };
}`;

// ---- drive + probe (item 4, authorized) -----------------------------------
const PROBE_CSS = ".extract001-verify-planted{outline:7px solid rgb(17,17,17)}";
const PLANT_AND_PROBE = `(css) => {
  const st = document.createElement("style");
  st.id = "extract001-verify-style";
  st.textContent = css;
  document.head.appendChild(st);
  const d = document.createElement("div");
  d.className = "extract001-verify-planted";
  d.id = "extract001-verify-probe";
  document.body.appendChild(d);
  const cs = getComputedStyle(d);
  // is the injected rule visible in the browser's own CSSOM?
  let inStyleSheets = false, sheetRuleMatches = 0;
  for (const sheet of document.styleSheets) {
    let rs; try { rs = sheet.cssRules; } catch (e) { continue; }
    for (const r of rs) {
      if (r.selectorText && r.selectorText.includes("extract001-verify-planted")) { inStyleSheets = true; sheetRuleMatches++; }
    }
  }
  return {
    inStyleSheets, sheetRuleMatches,
    outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, outlineColor: cs.outlineColor,
    computedOutline: cs.outline
  };
}`;

async function runSide(page, label, { probe }) {
  await page.bringToFront().catch(() => {});
  // deterministic baseline: reload so the state is "as loaded"
  await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(500);

  const census = await page.evaluate(eval(CENSUS), sampleProps);

  let probeResult = null;
  if (probe) {
    const beforeDark = census.darkRuleMatches;
    // drive a state: click the theme toggle (#thm) if present
    let clicked = false;
    try {
      const thm = page.locator("#thm").first();
      if (await thm.count()) { await thm.click({ timeout: 3000 }); clicked = true; await page.waitForTimeout(300); }
    } catch (e) {}
    const after = await page.evaluate(eval(`() => ({
      theme: document.documentElement.getAttribute("data-theme"),
      darkRuleMatches: document.querySelectorAll("html[data-theme=dark]").length,
      htmlColor: getComputedStyle(document.documentElement).color
    })`));
    // inject the authorized probe (dynamically-created CSS)
    const planted = await page.evaluate(eval(PLANT_AND_PROBE), PROBE_CSS);
    probeResult = { clickedThemeToggle: clicked, beforeDarkRuleMatches: beforeDark, after, planted };
  }

  return { label, census, probeResult };
}

// ---- main -----------------------------------------------------------------
const browser = await connect();
const ctx = browser.contexts()[0];
const pages = ctx.pages().filter((p) => p.url().startsWith("http"));
const refPage = pages.find((p) => p.url().startsWith("http://localhost:3211"));
const buildPage = pages.find((p) => p.url().startsWith("http://localhost:3210"));
if (!refPage || !buildPage) {
  console.error("Missing tabs:", pages.map((p) => p.url()));
  process.exit(2);
}

const out = { when: new Date().toISOString(), sampleProps, sides: {} };
out.sides.reference = await runSide(refPage, "reference", { probe: true });
out.sides.build = await runSide(buildPage, "build", { probe: true });

writeFileSync(`${outDir}/census-result.json`, JSON.stringify(out, null, 1));

// compact summary
const sum = {};
for (const [k, v] of Object.entries(out.sides)) {
  sum[k] = {
    url: v.census.url, title: v.census.title,
    countQSA: v.census.countQSA, countTreeWalker: v.census.countTreeWalker,
    sheets: v.census.sheetCount, crossOrigin: v.census.crossOriginSheets,
    shadowRoots: v.census.shadowRoots,
    ruleTotal: v.census.ruleTotal, byKind: v.census.kinds,
    probe: v.probeResult && {
      theme: v.probeResult.after.theme,
      darkBefore: v.probeResult.beforeDarkRuleMatches, darkAfter: v.probeResult.after.darkRuleMatches,
      plantedInSheets: v.probeResult.planted.inStyleSheets,
      plantedOutline: v.probeResult.planted.computedOutline
    }
  };
}
writeFileSync(`${outDir}/census-summary.json`, JSON.stringify(sum, null, 1));
console.log(JSON.stringify(sum, null, 2));

await detach(browser);
