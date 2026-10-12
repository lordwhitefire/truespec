// verify-inventory.mjs — the EXTRACT-001 falsification run.
//
// Independent rule census of the live reference (+ build), then comparison
// against the inventory's claims. Two independent paths that are NOT the
// Builder's (Builder = CDP CSS.getStyleSheetText + hand-written parseCss):
//   * same-origin sheets  -> the browser's own CSSOM (document.styleSheets)
//   * cross-origin sheets -> text fetched by this process with the browser's
//                            User-Agent, re-parsed by the browser's own CSSOM
//                            via new CSSStyleSheet().replaceSync(text)
// Element counts come from querySelectorAll('*') and a TreeWalker.
// Closed-vocabulary values are re-read live and compared to the inventory's.

import { connect, detach } from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";

const REF = "http://localhost:3211/car.html?car=1999-not-a-real-car";
const BUILD = "http://localhost:3210/car/NOPE-9999";
const INV = "developer-workspace/scripts/runtime-ui-diff/runs/extract-001";
const OUT = ".saa/evidence";
mkdirSync(OUT, { recursive: true });

const normSel = (s) => (s || "")
  .replace(/\s+/g, " ")
  .replace(/\s*,\s*/g, ",")
  .replace(/="([-\w]+)"/g, "=$1")
  .replace(/(^|[^:]):(before|after|first-line|first-letter|placeholder|selection|marker|backdrop|file-selector-button|part)\b/g, "$1::$2")
  .replace(/\s*([>+~])\s*/g, "$1")   // child/adjacent/sibling combinator spacing (CSSOM inserts spaces)
  .replace(/\*::/g, "::")            // Chrome drops the redundant universal before a pseudo-element
  .trim();
const key = (sheetURL, selector) => sheetURL + "||" + normSel(selector);

// ---- in-page helpers (as source strings) ---------------------------------
const LIST_SHEETS = `() => {
  const sheets = [];
  for (const s of document.styleSheets) {
    let readable = true; try { s.cssRules; } catch (e) { readable = false; }
    sheets.push({ href: s.href, readable });
  }
  return { sheets, ua: navigator.userAgent };
}`;

// Enumerate ALL rules from (a) readable document/shadow sheets and
// (b) the cross-origin texts handed in. Recurses at-blocks AND keyframes.
const ENUM = `({ texts }) => {
  const normSel = (s) => (s || "").replace(/\\s+/g, " ").replace(/\\s*,\\s*/g, ",").replace(/="([-\\w]+)"/g, "=$1").replace(/(^|[^:]):(before|after|first-line|first-letter|placeholder|selection|marker|backdrop|file-selector-button|part)\\b/g, "$1::$2").replace(/\\s*([>+~])\\s*/g, "$1").replace(/\\*::/g, "::").trim();
  const out = [];
  const kindOf = (r) => {
    const n = r && r.constructor ? r.constructor.name : "";
    if (n === "CSSStyleRule") return "style";
    if (n === "CSSMediaRule" || n === "CSSSupportsRule" || n === "CSSLayerBlockRule" ||
        n === "CSSContainerRule" || n === "CSSScopeRule" || n === "CSSStartingStyleRule") return "at-block";
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
  for (const s of document.styleSheets) {
    try { walk(s.cssRules, s.href || location.href, 0); } catch (e) {}
  }
  for (const s of (document.adoptedStyleSheets || [])) { try { walk(s.cssRules, location.href, 0); } catch (e) {} }
  const scan = (root) => {
    for (const el of root.querySelectorAll("*")) {
      if (el.shadowRoot) {
        for (const s of (el.shadowRoot.adoptedStyleSheets || [])) { try { walk(s.cssRules, location.href, 0); } catch (e) {} }
        for (const st of el.shadowRoot.querySelectorAll("style")) { try { walk(st.sheet.cssRules, location.href, 0); } catch (e) {} }
        scan(el.shadowRoot);
      }
    }
  };
  scan(document);
  for (const t of texts) {
    try { const sh = new CSSStyleSheet(); sh.replaceSync(t.text); walk(sh.cssRules, t.href, 0); } catch (e) { out.push({ kind: "PARSE_ERROR", sheetURL: t.href, selector: String(e) }); }
  }
  return out;
}`;

const COUNTS = `() => {
  const qsa = document.querySelectorAll("*").length;
  let tw = 0; const w = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT, null);
  while (w.nextNode()) tw++;
  let shadowHosts = 0; const scan = (r) => { for (const el of r.querySelectorAll("*")) { if (el.shadowRoot) { shadowHosts++; scan(el.shadowRoot); } } };
  scan(document);
  return { qsa, tw, shadowHosts, theme: document.documentElement.getAttribute("data-theme") };
}`;

// read the closed-list values live for one element located by the inventory path
const READVALS = `({ path, props }) => {
  const segs = path.split("/");
  let cur = null;
  if (segs[0] === "html") { cur = document.documentElement; segs.shift(); }
  for (const s of segs) {
    const m = s.match(/^(\\d+):(.+)$/);
    if (!cur || !m) return null;
    cur = cur.children[Number(m[1])];
  }
  if (!cur) return null;
  const cs = getComputedStyle(cur);
  return props.map((p) => cs.getPropertyValue(p));
}`;

// deterministic hidden/dynamic-rule drive (item 4)
const DRIVE = `(probeCss) => {
  const res = { steps: [] };
  const thm = document.querySelector("#thm");
  const theme = () => document.documentElement.getAttribute("data-theme");
  const dark = () => {
    let n = 0;
    for (const s of document.styleSheets) { let rs; try { rs = s.cssRules; } catch (e) { continue; }
      for (const r of rs) {
        if (r.selectorText && r.selectorText.replace(/\\s*([>+~])\\s*/g, "$1").replace(/\\*::/g, "::").replace(/\\s+/g, " ").trim() === "html[data-theme=dark]") n += document.querySelectorAll("html[data-theme=dark]").length ? 1 : 0;
      } }
    return document.querySelectorAll("html[data-theme=dark]").length;
  };
  res.themeBefore = theme();
  // normalise to LIGHT first (deterministic start)
  let clicks = 0;
  while (theme() !== "light" && clicks < 3) { if (thm) thm.click(); clicks++; res.steps.push({ click: clicks, theme: theme() }); }
  res.themeAtLight = theme();
  res.darkMatchesAtLight = dark();
  // one click must surface the load-inactive dark rule
  if (thm) thm.click();
  res.themeAfterClick = theme();
  res.darkMatchesAfterClick = dark();
  const st = document.createElement("style"); st.id = "verify-probe";
  st.textContent = probeCss; document.head.appendChild(st);
  const d = document.createElement("div"); d.className = "extract001-verify-planted"; document.body.appendChild(d);
  const cs = getComputedStyle(d);
  res.plantedOutline = cs.outline;
  res.plantedInSheets = false;
  for (const s of document.styleSheets) { let rs; try { rs = s.cssRules; } catch (e) { continue; }
    for (const r of rs) if (r.selectorText && r.selectorText.indexOf("extract001-verify-planted") >= 0) res.plantedInSheets = true; }
  return res;
}`;

// ---- helpers --------------------------------------------------------------
import { createHash } from "node:crypto";
const cacheDir = `${OUT}/sheet-cache`;
mkdirSync(cacheDir, { recursive: true });
async function fetchWithUA(href, ua) {
  const f = `${cacheDir}/${createHash("sha1").update(href).digest("hex")}.css`;
  try { return readFileSync(f, "utf8"); } catch (e) {}
  let last;
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(href, { headers: { "User-Agent": ua, "Accept": "text/css,*/*;q=0.1" }, signal: AbortSignal.timeout(25000) });
      const t = await r.text();
      writeFileSync(f, t);
      return t;
    } catch (e) { last = e; await new Promise((res) => setTimeout(res, 1500 * (i + 1))); }
  }
  throw last;
}

async function censusSide(page, label) {
  await page.bringToFront().catch(() => {});
  // force a clean default load
  await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await page.evaluate(`() => { try { localStorage.setItem("ts-theme", "light"); } catch (e) {} }`);
  await page.goto(page.url(), { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(700);
  // pin the default state deterministically (inventory default captured data-theme=light)
  await page.evaluate(`() => { try { document.documentElement.setAttribute("data-theme", "light"); } catch (e) {} }`);
  await page.waitForTimeout(200);

  const { sheets, ua } = await page.evaluate(eval(LIST_SHEETS));
  const texts = [];
  for (const s of sheets) if (s.href && !s.readable) texts.push({ href: s.href, text: await fetchWithUA(s.href, ua) });

  const rules = await page.evaluate(eval(ENUM), { texts });
  const counts = await page.evaluate(eval(COUNTS));

  const byKind = {};
  for (const r of rules) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  const perSheet = {};
  for (const r of rules) perSheet[r.sheetURL] = (perSheet[r.sheetURL] || 0) + 1;
  return { label, url: page.url(), ua, sheets, textsFetched: texts.map((t) => ({ href: t.href, bytes: t.text.length })), counts, byKind, perSheet, rules };
}

// ---- main -----------------------------------------------------------------
const browser = await connect();
const ctx = browser.contexts()[0];
const pages = ctx.pages().filter((p) => p.url().startsWith("http"));
const refPage = pages.find((p) => p.url().startsWith("http://localhost:3211"));
const buildPage = pages.find((p) => p.url().startsWith("http://localhost:3210"));

const refCensus = await censusSide(refPage, "reference");
const buildCensus = await censusSide(buildPage, "build");

// ---- compare against the inventory ---------------------------------------
function loadInv(side) {
  return JSON.parse(readFileSync(`${INV}/${side}.json`, "utf8"));
}
function invCounts(inv) {
  const rr = Object.values(inv.ruleRegistry);
  const byKind = {}; for (const r of rr) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  const perSheet = {}; for (const r of rr) perSheet[r.sheetURL] = (perSheet[r.sheetURL] || 0) + 1;
  return { rr, byKind, perSheet, total: rr.length };
}
function styleset(rules) {
  const m = new Map();
  for (const r of rules) if (r.kind === "style") { const k = key(r.sheetURL, r.selector); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}

const refInv = loadInv("reference");
const buildInv = loadInv("build");
const refInvC = invCounts(refInv);
const buildInvC = invCounts(buildInv);

const refIndepStyle = styleset(refCensus.rules);
const refInvStyle = styleset(refInvC.rr);
const onlyInv = [...refInvStyle.keys()].filter((k) => !refIndepStyle.has(k));   // possible invention
const onlyIndep = [...refIndepStyle.keys()].filter((k) => !refInvStyle.has(k)); // possible omission
const countMismatch = [...refInvStyle.keys()].filter((k) => refIndepStyle.has(k) && refInvStyle.get(k) !== refIndepStyle.get(k));

// element count independent vs inventory
const refSnap = refInv.snapshots && (refInv.snapshots.default || Object.values(refInv.snapshots)[0]);

// closed vocabulary (item 3)
const closedList = refInv.closedList;
const closedSize = refInv.closedListSize;
const els0 = (refSnap && refSnap.elements) || [];
const valsLens = els0.map((e) => (e.vals || []).length);
const absentSeen = els0.some((e) => (e.vals || []).includes("<absent>"));
// live spot-check: 3 elements x all closed props
const sample = [];
for (const e of els0.slice(0, 3)) {
  if (!e || !e.path) continue;
  const live = await refPage.evaluate(eval(READVALS), { path: e.path, props: closedList });
  let mismatch = 0, checked = 0; const details = [];
  if (live) for (let i = 0; i < closedList.length; i++) {
    checked++;
    const a = (e.vals[i] == null ? "" : String(e.vals[i]));
    const b = (live[i] == null ? "" : String(live[i]));
    if (a === "<absent>") { if (b !== "") { mismatch++; if (details.length < 40) details.push({ prop: closedList[i], inv: a, live: b }); } }
    else if (a !== b) { mismatch++; if (details.length < 40) details.push({ prop: closedList[i], inv: a, live: b }); }
  }
  sample.push({ path: e.path, checked, mismatch, details });
}

// drive + probe (reference), AFTER the light-state item-3 reads so the toggle cannot contaminate them
const drive = await refPage.evaluate(eval(DRIVE), ".extract001-verify-planted{outline:7px solid rgb(3,5,7)}");
drive.probeApplied = drive.plantedOutline === "rgb(3, 5, 7) solid 7px";
drive.item4ok = drive.themeAtLight === "light" && drive.darkMatchesAtLight === 0 &&
  drive.themeAfterClick === "dark" && drive.darkMatchesAfterClick === 1 && drive.plantedInSheets === true;

// item 6: reason for every rule (graded from the human-checkable ledger)
function parseLedger(side) {
  const lines = readFileSync(`${INV}/${side}-rule-ledger.txt`, "utf8").split("\n");
  const ruleLines = lines.filter((l) => /^\[/.test(l));
  const reasonLines = lines.filter((l) => /^\s+reason:/.test(l));
  const status = { used: 0, unused: 0 };
  for (const l of ruleLines) { if (/\]\s*USED\b/.test(l)) status.used++; else if (/\]\s*unused\b/.test(l)) status.unused++; }
  const cat = {};
  for (const l of reasonLines) {
    const r = l.replace(/^\s+reason:\s*/, "");
    let c;
    if (/^used/.test(r)) c = "used";
    else if (/no element matched/.test(r)) c = "unmatchedNoElement";
    else if (/inactive|media|support/i.test(r)) c = "unmatchedInactiveCond";
    else if (/unmatchable/i.test(r)) c = "unmatchable";
    else if (/^n\/a/.test(r)) c = "n/a-declaration";
    else c = "other";
    cat[c] = (cat[c] || 0) + 1;
  }
  return { ruleLines: ruleLines.length, reasonLines: reasonLines.length, status, cat };
}
const refLedger = parseLedger("reference");
const buildLedger = parseLedger("build");
// every unused rule must carry a reason line; every rule line accounted for
const unusedWithReason = refLedger.cat.unmatchedNoElement + refLedger.cat.unmatchedInactiveCond + (refLedger.cat.unmatchable || 0) + refLedger.cat["n/a-declaration"];
const item6ok = refLedger.reasonLines === refLedger.ruleLines &&
  (refLedger.cat.used || 0) === refLedger.status.used &&
  refLedger.status.unused === unusedWithReason;
const matchedRules = refInvC.rr.filter((r) => (r.matchedInStates || []).length > 0);

// ---- assemble results -----------------------------------------------------
const results = {
  when: new Date().toISOString(),
  reference: {
    independent: {
      elementQSA: refCensus.counts.qsa,
      elementTreeWalker: refCensus.counts.tw,
      shadowHosts: refCensus.counts.shadowHosts,
      byKind: refCensus.byKind, total: refCensus.rules.length,
      perSheet: refCensus.perSheet,
      sheets: refCensus.sheets, fetched: refCensus.textsFetched
    },
    inventory: {
      elementQSA: refSnap && refSnap.countQSA,
      byKind: refInvC.byKind, total: refInvC.total, perSheet: refInvC.perSheet
    }
  },
  build: {
    independent: { elementQSA: buildCensus.counts.qsa, elementTreeWalker: buildCensus.counts.tw, shadowHosts: buildCensus.counts.shadowHosts, byKind: buildCensus.byKind, total: buildCensus.rules.length, perSheet: buildCensus.perSheet, sheets: buildCensus.sheets, fetched: buildCensus.textsFetched },
    inventory: { byKind: buildInvC.byKind, total: buildInvC.total }
  },
  checks: {
    "1-element-count": {
      referenceIndependent: [refCensus.counts.qsa, refCensus.counts.tw],
      referenceInventory: refSnap && refSnap.countQSA,
      buildIndependent: [buildCensus.counts.qsa, buildCensus.counts.tw],
      verdict: (refCensus.counts.qsa === refCensus.counts.tw && refSnap && refCensus.counts.qsa === refSnap.countQSA) ? "PASS" : "FAIL"
    },
    "2-rule-completeness": {
      independentTotal: refCensus.rules.length, inventoryTotal: refInvC.total,
      independentByKind: refCensus.byKind, inventoryByKind: refInvC.byKind,
      onlyInInventory: onlyInv.length, onlyInIndependent: onlyIndep.length,
      verdict: (onlyInv.length === 0 && onlyIndep.length === 0) ? "PASS" : "FAIL"
    },
    "3-closed-vocabulary": {
      closedListSize: closedSize, closedListLen: closedList.length,
      elementValsLens: [...new Set(valsLens)], absentSeen, sample,
      verdict: (closedList.length === closedSize && valsLens.length > 0 && valsLens.every((l) => l === closedList.length) && sample.every((s) => s.mismatch === 0)) ? "PASS" : "FAIL"
    },
    "4-hidden-dynamic-rule": { ...drive, verdict: drive.item4ok ? "PASS" : "FAIL" },
    "5-no-invention": { onlyInInventory: onlyInv.length, examples: onlyInv.slice(0, 20), verdict: onlyInv.length === 0 ? "PASS" : "FAIL" },
    "6-reason-for-gaps": {
      reference: refLedger, build: buildLedger,
      matchedRules: matchedRules.length,
      verdict: item6ok ? "PASS" : "FAIL"
    }
  }
};

writeFileSync(`${OUT}/check-results.json`, JSON.stringify(results, null, 2));
writeFileSync(`${OUT}/independent-rules-reference.json`, JSON.stringify(refCensus.rules));
writeFileSync(`${OUT}/independent-rules-build.json`, JSON.stringify(buildCensus.rules));

const diffs = [
  `# Set differences — reference style rules`,
  `independent style rules: ${refIndepStyle.size} distinct (${[...refIndepStyle.values()].reduce((a, b) => a + b, 0)} total)`,
  `inventory   style rules: ${refInvStyle.size} distinct (${[...refInvStyle.values()].reduce((a, b) => a + b, 0)} total)`,
  ``,
  `## Only in inventory (possible invention) — ${onlyInv.length}`,
  ...onlyInv.slice(0, 200),
  ``,
  `## Only in independent (possible omission) — ${onlyIndep.length}`,
  ...onlyIndep.slice(0, 200),
  ``,
  `## Count mismatch (same key, different multiplicity) — ${countMismatch.length}`,
  ...countMismatch.slice(0, 200).map((k) => `${k}  inv=${refInvStyle.get(k)} indep=${refIndepStyle.get(k)}`)
].join("\n");
writeFileSync(`${OUT}/set-differences.txt`, diffs);

console.log(JSON.stringify({
  ref: results.reference,
  build: results.build,
  checks: {
    c1: results.checks["1-element-count"].verdict,
    c2: results.checks["2-rule-completeness"].verdict,
    c2onlyInv: onlyInv.length, c2onlyIndep: onlyIndep.length,
    c3: results.checks["3-closed-vocabulary"],
    c4: results.checks["4-hidden-dynamic-rule"],
    c5: results.checks["5-no-invention"],
    c6: results.checks["6-reason-for-gaps"]
  }
}, null, 2));

await detach(browser);
