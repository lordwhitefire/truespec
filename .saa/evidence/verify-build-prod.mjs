// verify-build-prod.mjs — close EXTRACT-001 gap G1.
// Census the STABLE production build (next start, no HMR) twice, prove the two
// independent censuses agree (stability), then compare that stable capture to the
// saved build inventory (build.json, which was captured from `next dev`).
//
// Same independent method as verify-inventory.mjs: browser CSSOM for same-origin
// sheets; cross-origin text fetched with the browser UA and re-parsed via
// new CSSStyleSheet().replaceSync; elements via querySelectorAll + TreeWalker.

import { connect, detach } from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const PROD = process.env.PROD_URL || "http://localhost:3212/car/NOPE-9999";
const INV = "developer-workspace/scripts/runtime-ui-diff/runs/extract-001";
const OUT = ".saa/evidence";
mkdirSync(OUT, { recursive: true });
const cacheDir = `${OUT}/sheet-cache`;
mkdirSync(cacheDir, { recursive: true });

const normSel = (s) => (s || "")
  .replace(/\s+/g, " ").replace(/\s*,\s*/g, ",")
  .replace(/="([-\w]+)"/g, "=$1")
  .replace(/(^|[^:]):(before|after|first-line|first-letter|placeholder|selection|marker|backdrop|file-selector-button|part)\b/g, "$1::$2")
  .replace(/\s*([>+~])\s*/g, "$1").replace(/\*::/g, "::").trim();
const key = (sheetURL, selector) => sheetURL + "||" + normSel(selector);

const LIST_SHEETS = `() => {
  const sheets = [];
  for (const s of document.styleSheets) { let readable = true; try { s.cssRules; } catch (e) { readable = false; } sheets.push({ href: s.href, readable }); }
  return { sheets, ua: navigator.userAgent };
}`;

const ENUM = `({ texts }) => {
  const normSel = (s) => (s || "").replace(/\\s+/g, " ").replace(/\\s*,\\s*/g, ",").replace(/="([-\\w]+)"/g, "=$1").replace(/(^|[^:]):(before|after|first-line|first-letter|placeholder|selection|marker|backdrop|file-selector-button|part)\\b/g, "$1::$2").replace(/\\s*([>+~])\\s*/g, "$1").replace(/\\*::/g, "::").trim();
  const out = [];
  const kindOf = (r) => {
    const n = r && r.constructor ? r.constructor.name : "";
    if (n === "CSSStyleRule") return "style";
    if (n === "CSSMediaRule" || n === "CSSSupportsRule" || n === "CSSLayerBlockRule" || n === "CSSContainerRule" || n === "CSSScopeRule" || n === "CSSStartingStyleRule") return "at-block";
    if (n === "CSSKeyframesRule") return "keyframes";
    if (n === "CSSKeyframeRule") return "keyframe";
    if (n === "CSSFontFaceRule") return "font-face";
    if (n === "CSSPropertyRule") return "property";
    if (n === "CSSLayerStatementRule") return "layer-statement";
    if (n === "CSSPageRule") return "page";
    if (n === "CSSNamespaceRule") return "namespace";
    return n || "unknown";
  };
  const walk = (list, sheetURL, depth) => {
    if (!list || depth > 8) return;
    for (const r of list) {
      const kind = kindOf(r);
      let selector = null, cond = null, keyText = null;
      if (kind === "style") selector = normSel(r.selectorText);
      if (kind === "at-block") cond = (r.conditionText || (r.media && r.media.mediaText) || "");
      if (kind === "keyframes") selector = r.name || "";
      if (kind === "keyframe") keyText = r.keyText || "";
      out.push({ kind, sheetURL, selector, cond, keyText, declCount: r.style ? r.style.length : null });
      if (r.cssRules && (kind === "at-block" || kind === "keyframes")) walk(r.cssRules, sheetURL, depth + 1);
    }
  };
  for (const s of document.styleSheets) { try { walk(s.cssRules, s.href || location.href, 0); } catch (e) {} }
  for (const s of (document.adoptedStyleSheets || [])) { try { walk(s.cssRules, location.href, 0); } catch (e) {} }
  const scan = (root) => { for (const el of root.querySelectorAll("*")) { if (el.shadowRoot) { for (const s of (el.shadowRoot.adoptedStyleSheets || [])) { try { walk(s.cssRules, location.href, 0); } catch (e) {} } for (const st of el.shadowRoot.querySelectorAll("style")) { try { walk(st.sheet.cssRules, location.href, 0); } catch (e) {} } scan(el.shadowRoot); } } };
  scan(document);
  for (const t of texts) { try { const sh = new CSSStyleSheet(); sh.replaceSync(t.text); walk(sh.cssRules, t.href, 0); } catch (e) { out.push({ kind: "PARSE_ERROR", sheetURL: t.href, selector: String(e) }); } }
  return out;
}`;

const COUNTS = `() => {
  const qsa = document.querySelectorAll("*").length;
  let tw = 0; const w = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT, null);
  while (w.nextNode()) tw++;
  let shadowHosts = 0; const scan = (r) => { for (const el of r.querySelectorAll("*")) { if (el.shadowRoot) { shadowHosts++; scan(el.shadowRoot); } } };
  scan(document);
  return { qsa, tw, shadowHosts };
}`;

async function fetchWithUA(href, ua) {
  const f = `${cacheDir}/${createHash("sha1").update(href).digest("hex")}.css`;
  try { return readFileSync(f, "utf8"); } catch (e) {}
  let last;
  for (let i = 0; i < 5; i++) {
    try { const r = await fetch(href, { headers: { "User-Agent": ua, "Accept": "text/css,*/*;q=0.1" }, signal: AbortSignal.timeout(25000) }); const t = await r.text(); writeFileSync(f, t); return t; }
    catch (e) { last = e; await new Promise((res) => setTimeout(res, 1500 * (i + 1))); }
  }
  throw last;
}

async function census(page, label) {
  await page.goto(PROD, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(900);
  const { sheets, ua } = await page.evaluate(eval(LIST_SHEETS));
  const texts = [];
  for (const s of sheets) if (s.href && !s.readable) texts.push({ href: s.href, text: await fetchWithUA(s.href, ua) });
  const rules = await page.evaluate(eval(ENUM), { texts });
  const counts = await page.evaluate(eval(COUNTS));
  const byKind = {}; for (const r of rules) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  const perSheet = {}; for (const r of rules) perSheet[r.sheetURL] = (perSheet[r.sheetURL] || 0) + 1;
  return { label, url: page.url(), counts, sheets, textsFetched: texts.map((t) => ({ href: t.href, bytes: t.text.length })), byKind, perSheet, rules };
}
const styleset = (rules) => { const m = new Map(); for (const r of rules) if (r.kind === "style") { const k = key(r.sheetURL, r.selector); m.set(k, (m.get(k) || 0) + 1); } return m; };
const eqSets = (a, b) => { for (const k of a.keys()) if (!b.has(k) || a.get(k) !== b.get(k)) return false; for (const k of b.keys()) if (!a.has(k)) return false; return true; };

const browser = await connect();
const ctx = browser.contexts()[0];
const page = await ctx.newPage();
const a = await census(page, "prod-cold-1");
const b = await census(page, "prod-cold-2");

const inv = JSON.parse(readFileSync(`${INV}/build.json`, "utf8"));
const rr = Object.values(inv.ruleRegistry);
const invByKind = {}; for (const r of rr) invByKind[r.kind] = (invByKind[r.kind] || 0) + 1;
const invPerSheet = {}; for (const r of rr) invPerSheet[r.sheetURL] = (invPerSheet[r.sheetURL] || 0) + 1;
const invSnap = inv.snapshots && (inv.snapshots.default || Object.values(inv.snapshots)[0]);

const stable = a.counts.qsa === b.counts.qsa && a.counts.tw === b.counts.tw && a.rules.length === b.rules.length && eqSets(styleset(a.rules), styleset(b.rules));
const invStyleSet = styleset(rr);
const prodStyleSet = styleset(a.rules);
const onlyProd = [...prodStyleSet.keys()].filter((k) => !invStyleSet.has(k));
const onlyInv = [...invStyleSet.keys()].filter((k) => !prodStyleSet.has(k));

const out = {
  when: new Date().toISOString(),
  prodUrl: PROD,
  stability: {
    cold1: { elementQSA: a.counts.qsa, elementTreeWalker: a.counts.tw, shadowHosts: a.counts.shadowHosts, ruleTotal: a.rules.length, byKind: a.byKind },
    cold2: { elementQSA: b.counts.qsa, elementTreeWalker: b.counts.tw, shadowHosts: b.counts.shadowHosts, ruleTotal: b.rules.length, byKind: b.byKind },
    identical: stable,
    verdict: stable ? "STABLE" : "UNSTABLE"
  },
  prod: { elementQSA: a.counts.qsa, elementTreeWalker: a.counts.tw, shadowHosts: a.counts.shadowHosts, byKind: a.byKind, total: a.rules.length, perSheet: a.perSheet, sheets: a.sheets },
  inventory_dev: { elementQSA: invSnap && invSnap.countQSA, byKind: invByKind, total: rr.length, perSheet: invPerSheet },
  compare_prod_vs_dev_inventory: {
    elementMatch: (invSnap && invSnap.countQSA) === a.counts.qsa,
    ruleTotalMatch: rr.length === a.rules.length,
    byKindMatch: JSON.stringify(invByKind) === JSON.stringify(a.byKind),
    onlyInProd: onlyProd.length, onlyInInventory: onlyInv.length,
    note: "The saved build.json was captured from `next dev`; a production build legitimately differs (no dev overlay, bundled/hashed CSS). A difference here is NOT an error in the inventory — it measures dev-vs-prod drift."
  }
};
writeFileSync(`${OUT}/build-prod-census.json`, JSON.stringify(out, null, 2));
writeFileSync(`${OUT}/independent-rules-build-prod.json`, JSON.stringify(a.rules));
await page.close();
await detach();
console.log(JSON.stringify(out, null, 2));
