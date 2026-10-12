// extract-rules.mjs — EXTRACT-001 rule-extraction proof.
//
//   node extract-rules.mjs <config.json> <outDir>
//
// Proves, with checkable evidence, that the runtime extraction captures:
//   1. every element on the page (count + tree), and the count matches the page's own count;
//   2. every CSS rule present, each flagged used/unused, with a stated reason for every unused;
//   3. for every element, a closed list of CSS properties — an absent property is visible as absent;
//   4. every handler that can change DOM/CSS (listener, inline on*, dynamic), named, and what it
//      changes when the page is driven;
//   5. the same run on the build yields a comparable inventory;
//   6. a planted/hidden/dynamic rule is caught once the page is driven;
//   7. nothing is invented.
//
// Runtime only. The two pages are never modified. One persistent Chrome (CDP :9222).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { connect, twoTabs, resize, clearResize, detach } from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";

let configPath, outDir, config, states;
const nowISO = () => new Date().toISOString();
const evalIn = (page, fn, arg) =>
  page.evaluate(arg === undefined ? `(${fn})()` : `(${fn})(${JSON.stringify(arg)})`);
const evalInArr = (page, fn, arr) => page.evaluate(`(${fn})(${JSON.stringify(arr)})`);

/* ─────────────────────────── CSS text parser ───────────────────────────
 * Parses a stylesheet text into a flat list of rules with character offsets,
 * so CDP coverage ranges (which are offsets) can be joined to rules. Handles
 * comments, strings, parens/brackets in selectors, nested at-rules and
 * keyframe frames. Pure: no DOM, no CDP.
 * ───────────────────────────────────────────────────────────────────── */
export function parseCss(text) {
  const out = [];
  const NESTING = /^@(media|supports|layer|container|document|-moz-document|scope|keyframes|-webkit-keyframes)\b/i;
  function classify(prelude) {
    if (/^@font-face\b/i.test(prelude)) return "font-face";
    if (/^@(media|supports|layer|container|document|-moz-document|scope)\b/i.test(prelude)) return "at-block";
    if (/^@(-webkit-)?keyframes\b/i.test(prelude)) return "keyframes";
    if (/^@(import|charset|namespace)\b/i.test(prelude)) return "statement";
    if (/^@page\b/i.test(prelude)) return "page";
    if (/^@/i.test(prelude)) return "at-other";
    return "style";
  }
  function isKeyframe(prelude) {
    return /^(from|to|\d+(\.\d+)?%)$/i.test(prelude.trim());
  }
  function scan(chunk, ctx, offset) {
    let i = 0; const n = chunk.length;
    const skipTrivia = () => {
      for (;;) {
        if (i >= n) return;
        const c = chunk[i];
        if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f") { i++; continue; }
        if (c === "/" && chunk[i + 1] === "*") { const e = chunk.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
        return;
      }
    };
    const scanPrelude = () => {
      const start = i; let par = 0, brk = 0;
      while (i < n) {
        const c = chunk[i];
        if (c === "/" && chunk[i + 1] === "*") { const e = chunk.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
        if (c === '"' || c === "'") { const q = c; i++; while (i < n && chunk[i] !== q) { if (chunk[i] === "\\") i++; i++; } i++; continue; }
        if (c === "(") par++; else if (c === ")") par = Math.max(0, par - 1);
        else if (c === "[") brk++; else if (c === "]") brk = Math.max(0, brk - 1);
        else if ((c === "{" || c === ";") && par === 0 && brk === 0) break;
        i++;
      }
      return chunk.slice(start, i).trim();
    };
    const scanBlock = () => {
      i++; const start = i; let depth = 1;
      while (i < n && depth > 0) {
        const c = chunk[i];
        if (c === "/" && chunk[i + 1] === "*") { const e = chunk.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
        if (c === '"' || c === "'") { const q = c; i++; while (i < n && chunk[i] !== q) { if (chunk[i] === "\\") i++; i++; } i++; continue; }
        if (c === "{") depth++; else if (c === "}") depth--; i++;
      }
      const end = depth === 0 ? i - 1 : i;
      return chunk.slice(start, end);
    };
    while (i < n) {
      skipTrivia();
      if (i >= n) break;
      const pStart = i;
      const prelude = scanPrelude();
      if (i >= n) break;
      if (chunk[i] === ";") { out.push({ kind: "statement", prelude, ctx: [...ctx], start: offset + pStart, end: offset + i + 1 }); i++; continue; }
      const blockStart = i;
      const body = scanBlock();
      const start = offset + pStart, end = offset + i;
      if (NESTING.test(prelude)) {
        out.push({ kind: classify(prelude), prelude, ctx: [...ctx], start, end });
        const innerCtx = prelude.startsWith("@") ? [...ctx, prelude] : ctx;
        // For @keyframes, mark context so frames classify as keyframe.
        if (/keyframes/i.test(prelude)) { scanKeyframes(body, offset + blockStart + 1, [...ctx, prelude], out); }
        else scan(body, innerCtx, offset + blockStart + 1);
      } else {
        const kind = isKeyframe(prelude) ? "keyframe" : classify(prelude);
        out.push({ kind, prelude, ctx: [...ctx], start, end, body: body.length <= 4000 ? body : body.slice(0, 4000) });
      }
    }
  }
  function scanKeyframes(body, offset, ctx, sink) {
    // frames: `from {/*...*/} to{...} 50%{...}` — reuse scan, but classify frames
    box(body, offset, (prelude, start, end, inner) => {
      sink.push({ kind: "keyframe", prelude, ctx: [...ctx], start, end, body: inner.slice(0, 2000) });
    });
  }
  function box(chunk, offset, emit) {
    let i = 0; const n = chunk.length;
    const skip = () => { for (;;) { if (i >= n) return; const c = chunk[i]; if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "\f") { i++; continue; } if (c === "/" && chunk[i + 1] === "*") { const e = chunk.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; } return; } };
    while (i < n) {
      skip(); if (i >= n) break;
      const s = i; while (i < n && chunk[i] !== "{" && !(chunk[i] === "/" && chunk[i + 1] === "*")) i++;
      if (chunk[i] === "/") { const e = chunk.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
      if (i >= n) break;
      const prelude = chunk.slice(s, i).trim();
      i++; const bs = i; let depth = 1;
      while (i < n && depth > 0) { if (chunk[i] === "{") depth++; else if (chunk[i] === "}") depth--; i++; }
      const be = depth === 0 ? i - 1 : i;
      emit(prelude, offset + s, offset + i, chunk.slice(bs, be));
    }
  }
  scan(text, [], 0);
  return out;
}

/* ─────────────────────────── in-page functions ───────────────────────────
 * Serialised into the page. Each is fully self-contained.
 * ───────────────────────────────────────────────────────────────────── */
const inPagePath = `function pathOf(el){const parts=[];let n=el;while(n&&n.nodeType===1&&n!==document.documentElement){const p=n.parentNode;let i=0,s=n;while(s.previousElementSibling){i++;s=s.previousElementSibling;}parts.unshift(i+':'+n.tagName.toLowerCase());n=p;}return 'html'+(parts.length?'/':'')+parts.join('/');}`;

const FN_VOCAB = `() => {
  const bag = new Set();
  for (const el of document.querySelectorAll('*')) { const cs = getComputedStyle(el); for (const p of cs) bag.add(p); }
  return [...bag].sort();
}`;

const FN_COUNTS = `() => {
  const qsa = document.querySelectorAll('*').length;
  const tag = document.getElementsByTagName('*').length;
  let shadowHosts = 0, shadowRoots = 0, shadowNodes = 0;
  for (const el of document.querySelectorAll('*')) if (el.shadowRoot) { shadowHosts++; shadowRoots++; shadowNodes += el.shadowRoot.querySelectorAll('*').length; }
  return { qsa, tag, shadowHosts, shadowRoots, shadowNodes, iframes: document.querySelectorAll('iframe').length };
}`;

const FN_SNAPSHOT = `(closedList) => {
  ${inPagePath}
  const implicitRole = (el) => { const t=el.tagName.toLowerCase();
    if(t==='a')return el.hasAttribute('href')?'link':'generic';
    if(t==='button')return 'button';
    if(t==='img')return el.getAttribute('alt')?'img':'presentation';
    if(t==='nav')return 'navigation'; if(t==='main')return 'main'; if(t==='header')return 'banner';
    if(t==='footer')return 'contentinfo'; if(/^h[1-6]$/.test(t))return 'heading';
    if(t==='input')return (el.type||'text')==='checkbox'?'checkbox':((el.type||'text')==='radio'?'radio':'textbox');
    if(t==='select')return 'combobox'; if(t==='textarea')return 'textbox';
    if(t==='ul'||t==='ol')return 'list'; if(t==='li')return 'listitem';
    return el.getAttribute('role')||'generic'; };
  const accName = (el) => { const al=el.getAttribute('aria-label'); if(al&&al.trim())return al.trim();
    const lb=el.getAttribute('aria-labelledby'); if(lb){const s=lb.split(/\\s+/).map(id=>{const e=document.getElementById(id);return e?e.textContent:'';}).join(' ').replace(/\\s+/g,' ').trim(); if(s)return s;}
    if(el.getAttribute('alt'))return el.getAttribute('alt').trim();
    if(el.getAttribute('title'))return el.getAttribute('title').trim();
    if(!el.children.length){const t=(el.textContent||'').replace(/\\s+/g,' ').trim(); if(t)return t.slice(0,80);} return ''; };
  const isHidden = (el) => { let n=el; while(n&&n.nodeType===1){const cs=getComputedStyle(n);
    if(cs.display==='none'||cs.visibility==='hidden'||cs.visibility==='collapse')return true;
    if(n.hidden||n.getAttribute('aria-hidden')==='true')return true;
    if(parseFloat(cs.opacity)===0)return true; n=n.parentElement;} return false; };
  const attrs = (el) => { const o={}; for(const a of el.attributes) o[a.name]= (a.value||'').slice(0,120); return o; };
  const els = [...document.querySelectorAll('*')];
  const elements = els.map(el => {
    const cs = getComputedStyle(el);
    const present = new Set(); for (const p of cs) present.add(p);
    const vals = closedList.map(p => present.has(p) ? cs.getPropertyValue(p) : '<absent>');
    const r = el.getBoundingClientRect();
    return { path: pathOf(el), tag: el.tagName.toLowerCase(), id: el.id||null, cls: [...el.classList],
      role: implicitRole(el), name: accName(el), hidden: isHidden(el),
      box: [Math.round(r.width), Math.round(r.height)],
      attrs: attrs(el),
      inlineHandlers: [...el.attributes].map(a=>a.name).filter(n=>/^on/.test(n)),
      text: (!el.children.length && (el.textContent||'').trim()) ? (el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,120) : null,
      vals };
  });
  const rootCs = getComputedStyle(document.documentElement);
  const custom = [];
  for (let i=0;i<rootCs.length;i++){ const p=rootCs[i]; if(p.startsWith('--')) custom.push(p); }
  const customProps = {}; for(const p of custom.sort()) customProps[p]=rootCs.getPropertyValue(p).trim();
  return { url: location.href, title: document.title, viewport: [innerWidth, innerHeight],
    countQSA: els.length,
    elements, rootCustom: customProps };
}`;

const FN_MATCH = `(rules) => {
  const out = [];
  for (const r of rules) {
    let count = -1, unmatchable = false;
    try { count = document.querySelectorAll(r.selector).length; }
    catch(e) {
      try { count = document.querySelectorAll(r.selector.replace(/::(before|after|backdrop|first-line|first-letter|placeholder|marker|selection|file-selector-button|part\([^)]*\)|slotted\([^)]*\))/g,'').replace(/:(before|after|backdrop|first-line|first-letter|placeholder|marker|selection|file-selector-button)/g,'')).length; }
      catch(e2) { count = -2; unmatchable = true; }
    }
    const inactive = [];
    for (const c of (r.conds||[])) {
      try {
        if (c.type==='media' && !matchMedia(c.text).matches) inactive.push('media ' + c.text);
        else if (c.type==='supports' && !CSS.supports(c.text)) inactive.push('supports ' + c.text);
      } catch(e) { inactive.push(c.type + ' ' + c.text + ' (?unparseable)'); }
    }
    out.push({ i: r.i, count, unmatchable, inactive });
  }
  return out;
}`;

const FN_INSTALL_REC = `() => {
  ${inPagePath}
  window.__ext = { mutations: [], started: Date.now() };
  const rec = new MutationObserver(muts => {
    for (const m of muts) {
      const t = m.target;
      if (window.__ext.mutations.length > 1500) return;
      if (m.type==='attributes') window.__ext.mutations.push({ k:'attr', path:pathOf(t), attr:m.attributeName, was:m.oldValue, now:t.getAttribute(m.attributeName) });
      else if (m.type==='childList') window.__ext.mutations.push({ k:'child', path:pathOf(t), added:m.addedNodes.length, removed:m.removedNodes.length });
      else if (m.type==='characterData') window.__ext.mutations.push({ k:'text', path:pathOf(t.parentElement||t) });
    }
  });
  rec.observe(document.documentElement, { subtree:true, childList:true, attributes:true, attributeOldValue:true, characterData:true });
  window.__ext.rec = rec;
  return true;
}`;

const FN_READ_REC = `() => (window.__ext ? window.__ext.mutations.slice(0,1500) : [])`;

const FN_VERIFY_PLANT = `(probeText) => {
  const out = { inStyleSheets: false, ruleCount: 0, probeSheetTextLen: 0 };
  for (const s of document.styleSheets) {
    const ownerText = (s.ownerNode && s.ownerNode.nodeType === 1 && s.ownerNode.tagName === 'STYLE') ? (s.ownerNode.textContent || '') : '';
    if (ownerText.includes(probeText)) {
      out.inStyleSheets = true;
      out.probeSheetTextLen = ownerText.length;
      try { out.ruleCount = (s.cssRules || []).length; } catch (e) {}
    }
  }
  return out;
}`;

const FN_PLANT = `(args) => {
  ${inPagePath}
  const { css, className, probeAttr } = args;
  const s = document.createElement('style');
  s.id = 'extract001-planted-style';
  s.textContent = css;
  document.head.appendChild(s);
  const probe = document.createElement('div');
  probe.setAttribute(probeAttr, '1');
  probe.className = className;
  probe.textContent = 'extract001';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  return { styleSheetCount: document.styleSheets.length, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, matched: document.querySelectorAll('.' + className).length };
}`;

/* ─────────────────────────── driver helpers ─────────────────────────── */
function locator(page, spec) {
  if (spec.role) return page.getByRole(spec.role, spec.name ? { name: spec.name } : {});
  if (spec.text) return page.getByText(spec.text).first();
  if (spec.css) return page.locator(spec.css).first();
  throw new Error("action needs role+name, text, or css");
}
async function applyActions(page, actions = []) {
  const applied = [], failed = [];
  for (const act of actions) {
    try {
      if (act.resize) await resize(undefined, page, act.resize[0], act.resize[1]);
      else if (act.click) {
        const loc = typeof act.click === "string" ? page.getByText(act.click).first() : locator(page, act.click);
        if ((await loc.count()) === 0) { failed.push({ action: JSON.stringify(act), missing: true, error: "CONTROL MISSING: " + JSON.stringify(act.click) }); continue; }
        await loc.click({ timeout: 6000 });
      } else if (act.hover) {
        const loc = typeof act.hover === "string" ? page.getByText(act.hover).first() : locator(page, act.hover);
        if ((await loc.count()) === 0) { failed.push({ action: JSON.stringify(act), missing: true, error: "CONTROL MISSING: " + JSON.stringify(act.hover) }); continue; }
        await loc.hover({ timeout: 6000 });
      } else if (act.press) await page.keyboard.press(act.press);
      else if (act.wait) await page.waitForTimeout(act.wait);
      else if (act.scroll) await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      else if (act.eval) await page.evaluate(act.eval);
      else throw new Error("unknown action " + JSON.stringify(act));
      applied.push(JSON.stringify(act));
    } catch (e) { failed.push({ action: JSON.stringify(act), error: String(e.message || e).split("\n")[0] }); }
  }
  if (actions.length) await page.waitForTimeout(250).catch(() => {});
  return { applied, failed };
}

/* ─────────────────────────── CDP: sheets + listeners ─────────────────────────── */
async function cdpWatch(cdp, page) {
  const sheets = [];
  const scripts = new Map();
  cdp.on("CSS.styleSheetAdded", (e) => sheets.push(e.header));
  cdp.on("Debugger.scriptParsed", (e) => scripts.set(e.scriptId, e.url));
  return { sheets, scripts };
}
async function enableDomains(cdp) {
  await cdp.send("DOM.enable");
  await cdp.send("Debugger.enable");
  await cdp.send("CSS.enable").catch(() => {});
}

function normSheetUrl(u) {
  if (!u) return u;
  try { const x = new URL(u, "http://inspect.local"); x.search = ""; x.hash = ""; return x.href.replace(/\/$/, ""); }
  catch (e) { return u.split("?")[0].split("#")[0]; }
}

function contextConds(preludes) {
  const conds = [];
  for (const p of preludes) {
    const media = /^@media\s*(.+)$/i.exec(p); if (media) { conds.push({ type: "media", text: media[1].trim() }); continue; }
    const sup = /^@supports\s*(.+)$/i.exec(p); if (sup) { conds.push({ type: "supports", text: sup[1].trim() }); continue; }
  }
  return conds;
}

/* ─────────────────────────── one side ─────────────────────────── */
async function runSide(page, cdp, label, url, shadow, console_) {
  const { sheets, scripts } = shadow;
  const side = { label, url, states: [], ruleRegistry: {}, handlers: [], handlerObjects: [] };

  let vocab = new Set();
  let closedList = null;

  // capture one state: load the page, drive the actions, and record everything.
  // Returns null when the page that loaded is obviously broken (transient dev
  // error/compile page with only a handful of elements) so the caller can retry.
  const captureState = async (state, force) => {
    sheets.length = 0;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(300);

    // The Next.js dev build occasionally serves a transient error/compile page
    // (tens of elements instead of a real page). A stable, real page has far
    // more than 100 elements on both sides here; retry once and record it.
    let n0 = await evalIn(page, FN_COUNTS);
    for (let attempt = 0; attempt < 5 && (n0.qsa ?? 0) < 100; attempt++) {
      side.loadRetries = (side.loadRetries || 0) + 1;
      await page.waitForTimeout(1500);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1500);
      n0 = await evalIn(page, FN_COUNTS);
    }

    // 1) vocabulary (union across states)
    const v = await evalIn(page, FN_VOCAB);
    for (const p of v) vocab.add(p);

    // 2) install mutation recorder, then drive
    await page.waitForTimeout(300);
    await evalIn(page, FN_INSTALL_REC).catch(() => {});
    const acts = await applyActions(page, state.actions || []);
    const mutations = await evalIn(page, FN_READ_REC).catch(() => []);

    // 3) counts (independent of our walk); broken-page guard
    const counts = await evalIn(page, FN_COUNTS);
    if (!force && (counts.qsa ?? 0) < 50) return null;
    if (counts.shadowHosts > 0) side.notesShadow = counts.shadowHosts;

    // 4) stylesheet texts + parsed rules for this state
    const sheetTexts = [];
    for (const h of sheets) {
      let text = null;
      try { text = (await cdp.send("CSS.getStyleSheetText", { styleSheetId: h.styleSheetId })).text; } catch (e) { text = null; }
      sheetTexts.push({ header: h, text });
    }
    const stateRules = [];
    for (const st of sheetTexts) {
      const sheetKey = `${normSheetUrl(st.header.sourceURL || "(inline)")}@${st.header.isInline ? "inline" : "link"}`;
      if (st.text == null) { side.missingSheetText = (side.missingSheetText || []).concat([sheetKey]); continue; }
      const parsed = parseCss(st.text);
      parsed.forEach((r, idx) => {
        const sig = `${sheetKey}::${r.start}-${r.end}::${r.prelude}`;
        stateRules.push({ sig, sheetKey, sheetURL: st.header.sourceURL || "(inline)", sheetOrigin: st.header.origin, idx, kind: r.kind, selector: r.prelude, ctx: r.ctx, conds: contextConds(r.ctx), start: r.start, end: r.end, bodyLen: (r.body || "").length });
      });
    }

    // 5) match every style rule against the current DOM
    const matchable = stateRules.map((r, i) => ({ i, selector: r.selector, conds: r.conds })).filter((r) => stateRules[r.i].kind === "style");
    const report = await evalInArr(page, FN_MATCH, matchable);

    // merge into the cross-state registry
    for (const r of stateRules) {
      if (!side.ruleRegistry[r.sig]) {
        side.ruleRegistry[r.sig] = { sig: r.sig, selector: r.selector, kind: r.kind, conds: r.conds, ctx: r.ctx,
          sheetURL: r.sheetURL, sheetOrigin: r.sheetOrigin, matchedInStates: [], firstSeen: state.name, unmatchable: false, inactiveConds: [] };
      }
    }
    // record matched-this-state sigs, applying match results by index
    const matchedThisState = [];
    matchable.forEach((mr, gi) => {
      const r = stateRules[mr.i];
      const reg = side.ruleRegistry[r.sig];
      const m = report[gi];
      if (!m) return;
      if (m.count > 0) { matchedThisState.push(r.sig); if (!reg.matchedInStates.includes(state.name)) reg.matchedInStates.push(state.name); }
      if (m.unmatchable) reg.unmatchable = true;
      for (const c of m.inactive) if (!reg.inactiveConds.includes(c)) reg.inactiveConds.push(c);
    });
    side.stateMatches = side.stateMatches || {};
    side.stateMatches[state.name] = matchedThisState;

    // 6) per-element snapshot EVERY state (not just baseline): the fare modal
    // and other elements exist only in a driven state, and property values can
    // change by state. The column list closes at the baseline state (later
    // states add no new properties — verified by propsOnlyInDrivenStates == 0),
    // so the same column order is used for every state's snapshot.
    if (state.name === states[0].name) closedList = [...vocab].sort();
    const snapshot = await evalInArr(page, FN_SNAPSHOT, closedList);
    if (snapshot) snapshot.closed = closedList;

    return {
      name: state.name, actions: state.actions || [], applied: acts.applied, failed: acts.failed,
      viewport: await page.evaluate(() => [innerWidth, innerHeight]),
      counts, ruleCountThisState: stateRules.length,
      mutations,
      snapshot,
    };
  };

  for (const state of states) {
    await clearResize(page);
    // test-setup: some references keep a per-session budget (e.g. 2 modals per
    // visit). To drive those states we emulate a fresh visitor by clearing the
    // same-origin sessionStorage before the navigation. This only resets the
    // inspection tab's session state — the site files themselves are untouched.
    if (state.resetSession) {
      await page.evaluate(() => { try { sessionStorage.clear(); } catch (e) {} });
    }

    // fresh stylesheet census for this navigation
    await cdp.send("CSS.disable").catch(() => {});
    sheets.length = 0;
    await cdp.send("CSS.enable").catch(() => {});
    await page.waitForTimeout(150);
    sheets.length = 0;

    let rec = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      rec = await captureState(state, false);
      if (rec) break;
      side.stateRetries = (side.stateRetries || 0) + 1;
      await page.waitForTimeout(2500);
    }
    if (!rec) throw new Error(label + ": could not load a real page for state " + state.name);
    side.snapshots = side.snapshots || {};
    if (rec.snapshot) side.snapshots[rec.name] = rec.snapshot;
    if (rec.name === states[0].name) side.snapshot = rec.snapshot;
    side.states.push(rec);

    const missing = rec.failed.filter((f) => f.missing).length;
    console_(`  ${label}/${rec.name}: ${rec.counts.qsa} els, ${rec.ruleCountThisState} rules${missing ? `  !! ${missing} missing control(s)` : ""}`);
  }

  // derive, per rule, the first state in which it matched (proves hidden/dynamic activation)
  const order = side.states.map((s) => s.name);
  for (const reg of Object.values(side.ruleRegistry)) {
    reg.firstMatchedState = order.find((n) => (side.stateMatches[n] || []).includes(reg.sig)) || null;
  }
  side.firstMatchedNewly = Object.values(side.ruleRegistry).filter((r) => r.firstMatchedState && r.firstMatchedState !== order[0]).length;

  // 7) closed list: full longhand vocabulary across all states (custom props recorded separately)
  const longhand = [...vocab].filter((p) => !p.startsWith("CUSTOM ")).sort();
  side.closedList = longhand;
  side.closedListSize = longhand.length;

  // honesty check: if any longhand property first appeared AFTER the baseline
  // state, that state's snapshot lacks the column and disclosing it matters.
  // Empirically this set is empty — the property list closes at baseline.
  const nonCustom = (cl) => (cl || []).filter((q) => !q.startsWith("CUSTOM "));
  const baselineClosed = (side.snapshots[states[0].name] || {}).closed || closedList;
  side.propsOnlyInDrivenStates = longhand.filter((p) => !nonCustom(baselineClosed).includes(p));
  // per-snapshot column accounting: name exactly which final columns a state
  // snapshot could not provide (only the build's dev-overlay tokens do this).
  for (const snap of Object.values(side.snapshots)) {
    snap.missingProps = longhand.filter((p) => !nonCustom(snap.closed).includes(p));
  }

  // 8) coverage (once, corroborating) — reload and record the browser's own used set
  try {
    await cdp.send("CSS.disable").catch(() => {});
    sheets.length = 0;
    await cdp.send("CSS.enable").catch(() => {});
    await page.waitForTimeout(150); sheets.length = 0;
    await cdp.send("CSS.startRuleUsageTracking");
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(800);
    const cov = await cdp.send("CSS.stopRuleUsageTracking");
    const sheetIdToKey = new Map();
    for (const h of sheets) sheetIdToKey.set(h.styleSheetId, `${h.sourceURL || "(inline)"}@${h.isInline ? "inline" : "link"}`);
    side.coverage = { entries: cov.ruleUsage.length, usedRanges: cov.ruleUsage.filter((r) => r.used).length, bySheet: {} };
    // offset-join: a rule is coverage-used if any used range overlaps it
    const overlaps = (a, b, c, d) => a < d && c < b;
    for (const reg of Object.values(side.ruleRegistry)) {
      if (reg.kind !== "style" && reg.kind !== "keyframe") continue;
      const key = reg.sig.split("::")[0];
      const [startS, endS] = reg.sig.split("::")[1].split("-");
      const s0 = +startS, e0 = +endS;
      let used = false, anyRange = false;
      for (const ru of cov.ruleUsage) {
        if (sheetIdToKey.get(ru.styleSheetId) !== key) continue;
        anyRange = true;
        if (ru.used && overlaps(ru.startOffset, ru.endOffset, s0, e0)) { used = true; break; }
      }
      reg.coverageUsed = used;
      reg.coverageHadRange = anyRange;
    }
  } catch (e) { side.coverage = { error: String(e.message || e).split("\n")[0] }; }

  // 9) handlers via CDP
  try {
    const { root } = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
    const nodePaths = new Map(); const elementIds = [];
    const walk = (node, path) => {
      if (node.nodeType === 1) { nodePaths.set(node.nodeId, path); elementIds.push(node.nodeId); }
      const kids = node.children || [];
      let ei = 0;
      for (const c of kids) {
        const tag = (c.localName || c.nodeName || "").toLowerCase();
        const isShadow = c.nodeName === "#document-fragment";
        const childPath = isShadow ? path + "/#shadow" : node.nodeType === 9 /*document*/ ? "html" : path + "/" + (ei++) + ":" + tag;
        if (isShadow) { walk(c, path + "/#shadow"); } else walk(c, childPath);
      }
    };
    walk(root, "html");
    // window + document listeners
    for (const [expr, target] of [["window", "window"], ["document", "document"]]) {
      try {
        const r = await cdp.send("Runtime.evaluate", { expression: expr });
        const lr = await cdp.send("DOMDebugger.getEventListeners", { objectId: r.result.objectId, depth: -1, pierce: true });
        for (const l of lr.listeners) side.handlers.push(describeListener(l, target, scripts));
      } catch (e) { /* ignore */ }
    }
    for (const nodeId of elementIds) {
      let lr;
      try { lr = await cdp.send("DOMDebugger.getEventListeners", { nodeId, depth: -1, pierce: true }); } catch (e) { continue; }
      for (const l of lr.listeners) side.handlers.push(describeListener(l, nodePaths.get(nodeId) || ("node#" + nodeId), scripts));
    }
    side.handlerCount = side.handlers.length;
  } catch (e) { side.handlers = [{ error: String(e.message || e).split("\n")[0] }]; }

  // inline on* handlers (from the baseline snapshot)
  if (side.snapshot) {
    side.inlineHandlers = side.snapshot.elements
      .filter((e) => e.inlineHandlers.length)
      .map((e) => ({ path: e.path, tag: e.tag, handlers: e.inlineHandlers }));
  }

  // 10) planted-rule probe — prove a dynamic rule is caught once the page is driven
  try {
    const probeCss = config.probe?.plantCss || ".extract001-planted{outline:7px solid rgb(7,7,7)}";
    const className = config.probe?.className || "extract001-planted";
    const probeAttr = "data-extract001-probe";
    const planted = await evalIn(page, FN_PLANT, { css: probeCss, className, probeAttr });
    await page.waitForTimeout(200);
    // in-page authoritative check: the planted sheet is present in document.styleSheets
    const verify = await evalIn(page, FN_VERIFY_PLANT, ".extract001-planted");
    side.plant = { css: probeCss, className, appliedComputedOutline: planted.outlineWidth + " " + planted.outlineColor + (planted.outlineStyle ? " " + planted.outlineStyle : ""), matchedProbeEls: planted.matched, sheetCountAfter: planted.styleSheetCount, inStyleSheets: verify.inStyleSheets, plantedSheetRuleCount: verify.ruleCount };
  } catch (e) { side.plant = { error: String(e.message || e).split("\n")[0] }; }

  return side;
}

function describeListener(l, target, scripts) {
  const url = scripts.get(l.scriptId) || (l.scriptId ? "(script " + l.scriptId + ")" : "(?)");
  return {
    target, type: l.type, capture: !!l.useCapture, passive: !!l.passive, once: !!l.once,
    where: url + (l.lineNumber >= 0 ? ":" + (l.lineNumber + 1) : ""),
    line: l.lineNumber, column: l.columnNumber,
  };
}

/* ─────────────────────────── comparison ─────────────────────────── */
function summarise(side) {
  const rules = Object.values(side.ruleRegistry);
  const byKind = {};
  for (const r of rules) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  const styleRules = rules.filter((r) => r.kind === "style");
  const used = styleRules.filter((r) => r.matchedInStates.length > 0);
  const unused = styleRules.filter((r) => r.matchedInStates.length === 0);
  return {
    label: side.label, url: side.url,
    elementCount: side.states[0]?.counts?.qsa ?? null,
    elementCountIndependent: side.states[0]?.counts?.tag ?? null,
    shadowHosts: side.states[0]?.counts?.shadowHosts ?? 0,
    closedListSize: side.closedListSize,
    ruleTotal: rules.length, rulesByKind: byKind,
    styleRules: styleRules.length, usedStyleRules: used.length, unusedStyleRules: unused.length,
    unmatchedBecauseInactiveMedia: unused.filter((r) => r.inactiveConds.length).length,
    unmatchedBecauseNoElement: unused.filter((r) => !r.inactiveConds.length && !r.unmatchable).length,
    unmatchableSelectors: unused.filter((r) => r.unmatchable).length,
    handlers: side.handlerCount ?? (side.handlers ? side.handlers.length : 0),
    inlineHandlerElements: (side.inlineHandlers || []).length,
    states: side.states.length,
  };
}
function ruleReason(r) {
  if (r.kind === "style" && r.matchedInStates.length > 0) return "used — selector matched an element in state(s): " + r.matchedInStates.join(", ");
  switch (r.kind) {
    case "style":
      if (r.unmatchable) return "unused — selector not matchable by querySelectorAll (e.g. pseudo-element syntax): " + r.selector;
      if (r.inactiveConds.length) return "unused — inside inactive condition: " + r.inactiveConds.join(", ") + " (and selector matched no element)";
      return "unused — no element matched selector " + r.selector + " in any driven state";
    case "keyframe": return "n/a — @keyframes frame, not a selector rule (activates only via animation-name)";
    case "keyframes": return "n/a — @keyframes definition (activates via animation-name, not by matching)";
    case "font-face": return "n/a — @font-face declaration (applies to font loading, not element matching)";
    case "at-block": return "n/a — grouping at-rule block (" + r.selector + ")";
    case "statement": return "n/a — at-statement (" + r.selector + ")";
    case "page": return "n/a — @page rule (print context)";
    case "at-other": return "n/a — other at-rule (" + r.selector + ")";
    default: return "n/a — " + r.kind;
  }
}
function compare(ref, build) {
  const rk = ref.ruleRegistry, bk = build.ruleRegistry;
  const onlyRef = Object.keys(rk).filter((k) => !bk[k]);
  const onlyBuild = Object.keys(bk).filter((k) => !rk[k]);
  const refSel = new Set(Object.values(rk).filter((r) => r.kind === "style").map((r) => r.selector));
  const buildSel = new Set(Object.values(bk).filter((r) => r.kind === "style").map((r) => r.selector));
  return {
    ref: summarise(ref), build: summarise(build),
    rulesOnlyInReference: onlyRef.length, rulesOnlyInBuild: onlyBuild.length,
    selectorsOnlyInReference: [...refSel].filter((s) => !buildSel.has(s)).sort(),
    selectorsOnlyInBuild: [...buildSel].filter((s) => !refSel.has(s)).sort(),
  };
}

/* ─────────────────────────── main ─────────────────────────── */
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) await main();

async function main() {
[configPath, outDir = "runs/extract-001"] = process.argv.slice(2);
if (!configPath) { console.error("usage: node extract-rules.mjs <config.json> [outDir]"); process.exit(2); }
config = JSON.parse(readFileSync(configPath, "utf8"));
states = config.states?.length ? config.states : [{ name: "default" }];
const out = join(outDir);
mkdirSync(out, { recursive: true });
const log = (...a) => console.log(...a);

const browser = await connect();
const { a, b } = await twoTabs(browser);
const cdpA = await a.context().newCDPSession(a);
const cdpB = await b.context().newCDPSession(b);
await enableDomains(cdpA); await enableDomains(cdpB);
const shadowA = await cdpWatch(cdpA, a);
const shadowB = await cdpWatch(cdpB, b);

let refer, build;
try {
  log("== reference ==");
  refer = await runSide(a, cdpA, "reference", config.ref, shadowA, log);
  writeFileSync(join(out, "reference.json"), JSON.stringify(refer, null, 2));
  log("== build ==");
  build = await runSide(b, cdpB, "build", config.build, shadowB, log);
  writeFileSync(join(out, "build.json"), JSON.stringify(build, null, 2));
} finally {
  await detach(browser);
}

const comp = compare(refer, build);
writeFileSync(join(out, "comparison.json"), JSON.stringify(comp, null, 2));
writeFileSync(join(out, "meta.json"), JSON.stringify({ when: nowISO(), config }, null, 2));

// rule ledger (human-checkable) for each side
for (const [name, side] of [["reference", refer], ["build", build]]) {
  const lines = [];
  lines.push(`# ${name} rule ledger — ${side.url}`);
  lines.push(`# every rule present, with used/unused and a reason. ${Object.keys(side.ruleRegistry).length} rules.`);
  lines.push("");
  const rows = Object.values(side.ruleRegistry).sort((x, y) => (x.sheetURL + x.selector).localeCompare(y.sheetURL + y.selector));
  for (const r of rows) {
    const cov = r.coverageUsed === undefined ? "?" : (r.coverageUsed ? "cov-used" : "cov-unused");
    lines.push(`[${r.kind}] ${r.matchedInStates.length ? "USED" : "unused "} (${cov}) ${JSON.stringify(r.selector)}  <- ${r.sheetURL}${r.conds?.length ? " ctx:" + r.conds.map((c) => c.type + " " + c.text).join(";") : ""}`);
    lines.push(`        reason: ${ruleReason(r)}`);
    if (r.matchedInStates.length > 1) lines.push(`        states: ${r.matchedInStates.join(", ")}`);
  }
  writeFileSync(join(out, `${name}-rule-ledger.txt`), lines.join("\n"));
}

log("\n=== SUMMARY ===");
log(JSON.stringify(comp, null, 2));
log("\ndone ->", out);
}
