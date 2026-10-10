// screen-compare.mjs — RECON-001 inventory runtime HTML + CSS comparison.
// Generalised from developer-workspace/scripts/runtime-compare.mjs (plan §5):
//   - waitUntil "domcontentloaded" (never "load"; do-not-repeat §8.2)
//   - theme forced via localStorage ts-theme in addInitScript BEFORE load, + dataset.theme
//   - waits are state waits; no waitForTimeout
//   - captures DOM structure (landmarks, ids/controls, sidebar groups, counts, wording)
//     and CSS (root tokens + per-class computed styles + class counts)
// Read-only: navigates and reads. Exports analyzeSide / renderCompare for the runner.
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME || "/usr/bin/google-chrome";

export const PROPS = [
  "display", "position", "boxSizing", "width", "height",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
  "textAlign", "textTransform", "color", "backgroundColor", "backgroundImage",
  "borderTopWidth", "borderTopStyle", "borderTopColor", "borderRadius", "boxShadow",
  "gap", "gridTemplateColumns", "flexDirection", "justifyContent", "alignItems",
  "opacity", "maxWidth", "minHeight", "overflow", "textDecorationLine",
];

const INVENTORY_READY = `(() => {
  const o = document.querySelector("#out");
  return !!o && (o.querySelector(".grid") || o.querySelector(".lc") || o.querySelector(".empty"));
})()`;

export async function analyzeSide(browser, url, { width, mode, ready = INVENTORY_READY, extra = null }) {
  const ctx = await browser.newContext({ viewport: { width, height: 1200 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((m) => {
    try {
      localStorage.setItem("ts-theme", m);
      sessionStorage.setItem("ts-toast", "true");
      sessionStorage.setItem("ts-covering", "2");
    } catch (e) {}
  }, mode);
  const page = await ctx.newPage();
  const logs = [];
  const failed = [];
  page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });

  let status = null;
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    status = resp ? resp.status() : null;
  } catch (e) { logs.push("goto: " + e.message); }

  const rendered = await page
    .waitForFunction(ready, null, { timeout: 25000 })
    .then(() => true).catch(() => false);

  await page.evaluate((m) => { document.documentElement.dataset.theme = m; }, mode);
  await page.evaluate(() => (document.fonts ? document.fonts.ready : true));

  const data = await page.evaluate(({ props, mode }) => {
    document.documentElement.dataset.theme = mode;
    const rootVars = {};
    const rs = getComputedStyle(document.documentElement);
    for (const name of rs) if (name.startsWith("--")) rootVars[name] = rs.getPropertyValue(name).trim();

    const classCount = new Map();
    document.querySelectorAll("*").forEach((el) => {
      if (el.classList) el.classList.forEach((c) => classCount.set(c, (classCount.get(c) || 0) + 1));
    });

    const snap = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const o = {};
      for (const p of props) o[p] = cs.getPropertyValue(p);
      const r = el.getBoundingClientRect();
      o.__rect = `${Math.round(r.width)}x${Math.round(r.height)}`;
      o.__tag = el.tagName.toLowerCase();
      o.__text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      return o;
    };

    const classes = {};
    for (const c of classCount.keys()) {
      classes[c] = { count: classCount.get(c), snap: snap(document.querySelector("." + CSS.escape(c))) };
    }

    const txt = (el) => (el ? (el.textContent || "").replace(/\s+/g, " ").trim() : null);
    const tagCount = {};
    for (const t of ["header", "main", "aside", "section", "footer", "nav", "details", "summary", "button", "select", "input", "label", "a", "h1", "h2", "h3", "article"]) {
      tagCount[t] = document.querySelectorAll(t).length;
    }

    const ids = {};
    document.querySelectorAll("[id]").forEach((el) => {
      ids[el.id] = {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || null,
        ariaPressed: el.getAttribute("aria-pressed"),
        ariaExpanded: el.getAttribute("aria-expanded"),
        text: (txt(el) || "").slice(0, 60),
      };
    });

    const fs = [...document.querySelectorAll(".fs")].map((d) => ({
      summary: txt(d.querySelector("summary")),
      open: d.hasAttribute("open"),
      checkboxes: d.querySelectorAll('input[type="checkbox"]').length,
    }));

    const controls = [...document.querySelectorAll("button, select, input")].map((el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      name: el.getAttribute("name"),
      type: el.getAttribute("type"),
      text: (txt(el) || "").slice(0, 40),
      ariaLabel: el.getAttribute("aria-label"),
    }));

    const options = [...document.querySelectorAll("#sort option")].map((o) => txt(o));

    return {
      rootVars, classes, totalEls: document.querySelectorAll("*").length, title: document.title,
      headings: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => txt(h)),
      tagCount, ids, fs, controls, options,
      cnt: txt(document.querySelector("#cnt")),
      ttl: txt(document.querySelector("#ttl")),
      speak: txt(document.querySelector("#speak")),
      cardCount: document.querySelectorAll("#out .card").length,
      rowCount: document.querySelectorAll("#out .lc").length,
      gridCount: document.querySelectorAll("#out .grid").length,
      emptyCount: document.querySelectorAll("#out .empty").length,
      sidebarSummary: txt(document.querySelector(".sbh")),
    };
  }, { props: PROPS, mode });

  if (extra) Object.assign(data, await page.evaluate(extra));

  data.structure = await captureStructure(page);

  await ctx.close();
  return { url, status, rendered, logs, failed, ...data };
}

const show = (v) => (v === undefined ? "<absent>" : v);

// ---------------------------------------------------------------------------
// Normalized DOM element tree + accessibility tree (structural comparison).
// Volatile regions are collapsed so two pages can be compared as STRUCTURES:
//   - <img> photo src/srcset/alt are dropped (drops only the element's presence)
//   - price count-up amounts -> "₦…", clocks -> "⟨time⟩", dates -> "⟨date⟩",
//     relative ages -> "⟨age⟩", emails/phones -> placeholders
//   - generated / random ids -> "#⟨gen⟩"; content-hashed utility classes dropped
// Runs inside the page, so it must be self-contained (no external closures).
// ---------------------------------------------------------------------------
export function domTreeExtract() {
  const VOLATILE_ID = /^(:r[0-9a-z]+:|[0-9a-f]{8,}|.{40,}|(radix|headlessui|mui|ember|ng)-.*|_.*)$/i;
  const HASH_CLASS = /^(css-[0-9a-z]+|sc-[0-9a-zA-Z]+|jsx-[0-9a-z]+|[a-z]{1,3}-[0-9a-f]{5,})$/i;
  const normId = (id) => (!id ? "" : VOLATILE_ID.test(id) ? "#⟨gen⟩" : "#" + id);
  const normClasses = (el) =>
    [...(el.classList || [])].filter((c) => !HASH_CLASS.test(c)).sort().map((c) => "." + c).join("");
  const normText = (t) => {
    if (!t) return "";
    let s = t.replace(/\s+/g, " ").trim();
    s = s.replace(/₦\s?[\d.,]+/g, "₦…");
    s = s.replace(/\b\d{1,2}:\d{2}\s?[APap]\.?[Mm]\.?\b/g, "⟨time⟩");
    s = s.replace(/\b\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?\b/g, "⟨date⟩");
    s = s.replace(/\b\d+\s*(minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b(\s*ago)?/gi, "⟨age⟩");
    s = s.replace(/\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g, "⟨email⟩");
    s = s.replace(/\+?\d[\d\s().-]{7,}\d/g, "⟨phone⟩");
    return s.slice(0, 72);
  };
  const ROLE_TAG = { header: "banner", nav: "navigation", main: "main", aside: "complementary", footer: "contentinfo", section: "region", form: "form", article: "article", dialog: "dialog", ul: "list", ol: "list", li: "listitem", a: "link", button: "button", img: "img", table: "table", summary: "button", select: "combobox", input: "textbox", textarea: "textbox" };
  const LANDMARK = new Set(["banner", "navigation", "main", "complementary", "contentinfo", "region", "search"]);
  const TEXT_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "button", "a", "summary", "label", "p", "li", "td", "th", "time", "output", "option", "figcaption", "dt", "dd", "legend", "caption", "blockquote"]);
  const SKIP = new Set(["script", "style", "link", "meta", "noscript", "template"]);
  const walk = (el, depth) => {
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) return null;
    const role = el.getAttribute("role") || ROLE_TAG[tag] || "";
    const id = normId(el.id);
    const classes = normClasses(el);
    let text = "";
    if (TEXT_TAGS.has(tag)) {
      const hasElChild = [...el.children].some((c) => !SKIP.has(c.tagName.toLowerCase()));
      if (!hasElChild || /^h[1-6]$/.test(tag)) text = normText(el.textContent || "");
    }
    const children = [];
    for (const c of el.children) {
      const n = walk(c, depth + 1);
      if (n) children.push(n);
    }
    return { tag, role, id, classes, text, depth, landmark: LANDMARK.has(role) ? role : "", children };
  };
  return document.body ? walk(document.body, 0) : null;
}

export async function captureStructure(page) {
  const domTree = await page.evaluate(domTreeExtract);
  let aria = null;
  try {
    aria = await page.locator("body").ariaSnapshot({ timeout: 8000 });
  } catch (e) {
    aria = "⟨ariaSnapshot failed: " + String((e && e.message) || e) + "⟩";
  }
  return { domTree, aria };
}

// ---- tree helpers (Node side) ----
const keyRole = (n) => `${n.tag}${n.role ? ":" + n.role : ""}${n.id}`;
const keyFull = (n) => keyRole(n) + n.classes;
const lineOf = (n) => `${"  ".repeat(n.depth)}${n.tag}${n.role ? "[" + n.role + "]" : ""}${n.id}${n.classes}${n.text ? ` "${n.text}"` : ""}`;
const roleLineOf = (n) => `${"  ".repeat(n.depth)}${n.tag}${n.role ? "[" + n.role + "]" : ""}${n.id}`;

function flattenTree(root, out = []) {
  if (!root) return out;
  out.push(root);
  for (const c of root.children) flattenTree(c, out);
  return out;
}
function outlineLines(root, maxDepth = Infinity, maxLines = 900) {
  const L = [];
  let truncated = false;
  const walk = (n) => {
    if (L.length >= maxLines) { truncated = true; return; }
    if (n.depth <= maxDepth) L.push(lineOf(n));
    for (const c of n.children) walk(c);
  };
  if (root) walk(root);
  return { text: L.join("\n"), truncated };
}
function roleOutline(root) {
  if (!root) return "";
  return flattenTree(root).map(roleLineOf).join("\n");
}
function keySet(root) {
  const s = new Set();
  for (const n of flattenTree(root)) s.add(keyFull(n));
  return s;
}
function roleKeySet(root) {
  const s = new Set();
  for (const n of flattenTree(root)) s.add(keyRole(n));
  return s;
}
// top-most nodes whose full key never appears in `otherKeys`
function onlyTop(root, otherKeys) {
  const out = [];
  const walk = (n, covered) => {
    const only = !otherKeys.has(keyFull(n));
    if (only && !covered) { out.push(n); covered = true; }
    for (const c of n.children) walk(c, covered);
  };
  if (root) walk(root, false);
  return out;
}
// same full key present on both sides but under a different parent (re-nested)
function renested(rootA, rootB) {
  const parentMap = (root) => {
    const m = new Map();
    const walk = (n, pk) => {
      const k = keyFull(n);
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(pk);
      for (const c of n.children) walk(c, k);
    };
    if (root) walk(root, "<body>");
    return m;
  };
  const a = parentMap(rootA), b = parentMap(rootB);
  const out = [];
  for (const [k, pa] of a) {
    if (!b.has(k)) continue;
    const sa = [...pa].sort().join(","), sb = [...b.get(k)].sort().join(",");
    if (sa !== sb) out.push({ key: k, refParent: sa, buildParent: sb });
  }
  return out;
}

export function renderStructure(ref, build, width, mode, label = "Screen") {
  const out = [];
  const P = (x = "") => out.push(x);
  const R = ref.structure ? ref.structure.domTree : null;
  const B = build.structure ? build.structure.domTree : null;
  P(`# ${label} structure comparison @ ${width}px, ${mode}`);
  P(`ref   : ${ref.url}`);
  P(`build : ${build.url}`);
  P();
  if (!R || !B) {
    P(`(structure not captured: ref=${!!R} build=${!!B})`);
    return out.join("\n");
  }
  const rFlat = flattenTree(R), bFlat = flattenTree(B);
  const rOut = outlineLines(R), bOut = outlineLines(B);
  const fullSame = rOut.text === bOut.text;
  const roleSame = roleOutline(R) === roleOutline(B);
  const rKeys = keySet(R), bKeys = keySet(B);
  const common = [...rKeys].filter((k) => bKeys.has(k)).sort();
  const rRole = roleKeySet(R), bRole = roleKeySet(B);
  const commonRole = [...rRole].filter((k) => bRole.has(k)).sort();
  const rl = rOut.text ? rOut.text.split("\n") : [], bl = bOut.text ? bOut.text.split("\n") : [];
  let firstDiv = -1;
  for (let i = 0; i < Math.max(rl.length, bl.length); i++) if (rl[i] !== bl[i]) { firstDiv = i; break; }
  const refOnly = onlyTop(R, bKeys);
  const buildOnly = onlyTop(B, rKeys);
  const re = renested(R, B);

  P(`## Structure verdict`);
  P(`- nodes (ref/build): ${rFlat.length} / ${bFlat.length}`);
  P(`- DOM structure identical (tags+roles+ids+class hooks): ${fullSame ? "YES" : "NO"}`);
  P(`- DOM structure identical ignoring class hooks (tags+roles+ids): ${roleSame ? "YES" : "NO"}`);
  P(`- shared structural anchors (same tag+role+id+classes): ${common.length}`);
  P(`  ${common.length ? common.slice(0, 40).join("  ") : "(none)"}`);
  P(`- shared structural anchors ignoring class hooks (same tag+role+id): ${commonRole.length}`);
  P(`  ${commonRole.length ? commonRole.slice(0, 40).join("  ") : "(none)"}`);
  if (firstDiv >= 0) {
    P(`- first divergence (DFS line ${firstDiv}):`);
    P(`    ref   : ${rl[firstDiv] === undefined ? "<end>" : rl[firstDiv].trim()}`);
    P(`    build : ${bl[firstDiv] === undefined ? "<end>" : bl[firstDiv].trim()}`);
  } else {
    P(`- first divergence: none (outlines identical)`);
  }
  P();
  P(`## DOM element tree — REF (indented; volatile collapsed)`);
  P("```");
  P(rOut.text || "(empty)");
  if (rOut.truncated) P("… (truncated)");
  P("```");
  P();
  P(`## DOM element tree — BUILD (indented; volatile collapsed)`);
  P("```");
  P(bOut.text || "(empty)");
  if (bOut.truncated) P("… (truncated)");
  P("```");
  P();
  P(`## DOM-tree diff — present in REF, absent in BUILD (top-most)`);
  if (!refOnly.length) P("(none)");
  for (const n of refOnly) P(`- ${lineOf(n)}`);
  P();
  P(`## DOM-tree diff — present in BUILD, absent in REF (top-most)`);
  if (!buildOnly.length) P("(none)");
  for (const n of buildOnly) P(`- ${lineOf(n)}`);
  P();
  P(`## DOM-tree diff — same node, different parent (re-nested)`);
  if (!re.length) P("(none)");
  for (const x of re.slice(0, 60)) P(`- ${x.key}:  ref-parent=${x.refParent}  build-parent=${x.buildParent}`);
  P();
  P(`## Accessibility tree — REF (ariaSnapshot of <body>)`);
  P("```yaml");
  P(ref.structure.aria || "(none)");
  P("```");
  P();
  P(`## Accessibility tree — BUILD (ariaSnapshot of <body>)`);
  P("```yaml");
  P(build.structure.aria || "(none)");
  P("```");
  P();
  const normAria = (sValue) =>
    (sValue || "").split("\n").map((l) =>
      l.replace(/₦\s?[\d.,]+/g, "₦…")
       .replace(/\b\d{1,2}:\d{2}\s?[APap]\.?[Mm]\.?/g, "⟨time⟩")
       .replace(/\b\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?\b/g, "⟨date⟩")
       .replace(/\s+$/g, "")
    ).filter((l) => l.trim() !== "");
  const ra = normAria(ref.structure.aria), ba = normAria(build.structure.aria);
  let aFirst = -1;
  for (let i = 0; i < Math.max(ra.length, ba.length); i++) if (ra[i] !== ba[i]) { aFirst = i; break; }
  P(`## Accessible-structure diff`);
  P(`- REF nodes: ${ra.length}  BUILD nodes: ${ba.length}`);
  P(`- accessible trees identical (after volatile collapse): ${aFirst < 0 ? "YES" : "NO"}`);
  if (aFirst >= 0) {
    P(`- first divergence (line ${aFirst}):`);
    P(`    ref   : ${ra[aFirst] === undefined ? "<end>" : ra[aFirst]}`);
    P(`    build : ${ba[aFirst] === undefined ? "<end>" : ba[aFirst]}`);
  }
  P();
  return out.join("\n");
}

export function renderCompare(ref, build, width, mode) {
  const out = [];
  const P = (s = "") => out.push(s);

  P(`# Inventory runtime comparison @ ${width}px, ${mode}`);
  P(`ref   : ${ref.url}`);
  P(`build : ${build.url}`);
  P();
  P(`## Load`);
  P(`ref   HTTP ${ref.status}  rendered=${ref.rendered}  failed-requests=${ref.failed.length}`);
  P(`build HTTP ${build.status}  rendered=${build.rendered}  failed-requests=${build.failed.length}`);
  P();
  P(`## Page`);
  P(`title  ref="${ref.title}"  build="${build.title}"  ${ref.title === build.title ? "MATCH" : "DIFF"}`);
  P(`total elements  ref=${ref.totalEls}  build=${build.totalEls}`);
  P();
  P(`## Landmarks / element counts (ref/build)`);
  const tags = [...new Set([...Object.keys(ref.tagCount), ...Object.keys(build.tagCount)])];
  const tagDiffs = tags.filter((t) => ref.tagCount[t] !== build.tagCount[t]);
  for (const t of tagDiffs) P(`${t}: ref=${ref.tagCount[t]}  build=${build.tagCount[t]}`);
  if (!tagDiffs.length) P("(no count differences)");
  P(`all: ` + tags.map((t) => `${t}:${ref.tagCount[t]}/${build.tagCount[t]}`).join(" "));
  P();
  P(`## Inventory counts (initial view)`);
  P(`cards  ref=${ref.cardCount}  build=${build.cardCount}`);
  P(`rows   ref=${ref.rowCount}  build=${build.rowCount}`);
  P(`grid   ref=${ref.gridCount}  build=${build.gridCount}`);
  P(`empty  ref=${ref.emptyCount}  build=${build.emptyCount}`);
  P(`#cnt   ref="${ref.cnt}"  build="${build.cnt}"`);
  P(`#ttl   ref="${ref.ttl}"  build="${build.ttl}"`);
  P(`#speak ref="${ref.speak}"  build="${build.speak}"`);
  P(`sidebar header  ref="${ref.sidebarSummary}"  build="${build.sidebarSummary}"`);
  P();
  P(`## Sidebar groups (.fs), in order`);
  const n = Math.max(ref.fs.length, build.fs.length);
  for (let i = 0; i < n; i++) {
    const a = ref.fs[i], b = build.fs[i];
    P(`${i + 1}: ref=${a ? `"${a.summary}" open=${a.open} boxes=${a.checkboxes}` : "<none>"}   build=${b ? `"${b.summary}" open=${b.open} boxes=${b.checkboxes}` : "<none>"}`);
  }
  P();
  P(`## Sort options`);
  P(`ref   [${ref.options.join(", ")}]`);
  P(`build [${build.options.join(", ")}]`);
  P();
  P(`## Shared ids (tag[type])`);
  const wanted = ["out", "sb", "cnt", "ttl", "speak", "vg", "vl", "sort", "sbt", "pmin", "pmax", "clr", "thm", "ovl", "toast"];
  for (const id of wanted) {
    const a = ref.ids[id], b = build.ids[id];
    const f = (x) => (x ? `${x.tag}${x.type ? `[${x.type}]` : ""}` : "<absent>");
    P(`${id}: ref=${f(a)}  build=${f(b)}${a && b && f(a) !== f(b) ? "  DIFF" : ""}`);
  }
  P();
  P(`## Headings`);
  P(`ref   [${ref.headings.length}]: ${ref.headings.join(" | ")}`);
  P(`build [${build.headings.length}]: ${build.headings.join(" | ")}`);
  P();
  P(`## :root token differences`);
  const allVars = new Set([...Object.keys(ref.rootVars), ...Object.keys(build.rootVars)]);
  let vd = 0;
  for (const k of [...allVars].sort()) {
    const a = ref.rootVars[k], b = build.rootVars[k];
    if (a !== b) { vd++; P(`${k}\n    ref   = ${show(a)}\n    build = ${show(b)}`); }
  }
  if (!vd) P("(no token differences)");
  P();
  P(`## Per-class computed-style differences (classes present in the reference; per-selector deltas)`);
  const classDiffs = [];
  const missingInBuild = [];
  for (const c of Object.keys(ref.classes).sort()) {
    const b = build.classes[c];
    if (!b) { missingInBuild.push(c); continue; }
    const a = ref.classes[c].snap, bs = b.snap;
    if (!a || !bs) continue;
    const ds = [];
    for (const p of PROPS) if (a[p] !== bs[p]) ds.push([p, a[p], bs[p]]);
    if (ds.length) classDiffs.push({ c, ds, a, bs });
  }
  P(`classes in ref not found in build: ${missingInBuild.length ? missingInBuild.join(", ") : "(none)"}`);
  P();
  classDiffs.sort((x, y) => y.ds.length - x.ds.length);
  for (const { c, ds, a, bs } of classDiffs) {
    P(`### .${c}   (ref ${a.__tag} ${a.__rect} | build ${bs.__tag} ${bs.__rect})`);
    for (const [p, x, y] of ds) P(`    ${p}: ref="${x}"  build="${y}"`);
  }
  P();
  P(`## Class count differences (same class, different number of elements)`);
  let cd = 0;
  for (const c of Object.keys(ref.classes).sort()) {
    const b = build.classes[c];
    if (!b) continue;
    if (ref.classes[c].count !== b.count) { cd++; P(`.${c}: ref=${ref.classes[c].count}  build=${b.count}`); }
  }
  if (!cd) P("(no count differences)");
  P();
  P(`## Console / JS + failed requests`);
  for (const [name, r] of [["REF", ref], ["BUILD", build]]) {
    const interesting = r.logs.filter((l) => !/\[Fast Refresh\]|Download the React DevTools|DevTools/.test(l));
    P(`${name}: ${interesting.length} console message(s), ${r.failed.length} failed request(s)`);
    for (const l of interesting.slice(0, 40)) P(`    ${l}`);
    for (const f of r.failed.slice(0, 20)) P(`    HTTP ${f}`);
  }
  P();
  return out.join("\n");
}

// ---- standalone CLI (one browser, one cell) ----
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [, , refUrl, buildUrl, widthArg = "1100", mode = "dark", outFile] = process.argv;
  if (!refUrl || !buildUrl) {
    console.error("usage: node screen-compare.mjs <refUrl> <buildUrl> [width] [dark|light] [outFile]");
    process.exit(2);
  }
  const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const ref = await analyzeSide(browser, refUrl, { width: Number(widthArg), mode });
    const build = await analyzeSide(browser, buildUrl, { width: Number(widthArg), mode });
    const md = renderCompare(ref, build, Number(widthArg), mode);
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
}
