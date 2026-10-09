// RECON-001 runtime comparison helper.
// Usage: node runtime-compare.mjs <refUrl> <buildUrl> [width] [dark|light]
// Opens both pages in real Chrome and diffs what the BROWSER computes:
//   - CSS custom properties (tokens) on <html>
//   - per-class computed styles (first element of each reference class)
//   - DOM structure (class signatures present in one side only)
//   - console / JS errors
// Read-only: it only navigates and reads.
import { chromium } from "playwright-core";

const [, , refUrl, buildUrl, widthArg = "1440", theme = "dark"] = process.argv;
if (!refUrl || !buildUrl) {
  console.error("usage: node runtime-compare.mjs <refUrl> <buildUrl> [width] [dark|light]");
  process.exit(2);
}
const W = Number(widthArg);

const PROPS = [
  "display", "position", "boxSizing", "width", "height",
  "marginTop", "marginRight", "marginBottom", "marginLeft",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing",
  "textAlign", "textTransform", "color", "backgroundColor", "backgroundImage",
  "borderTopWidth", "borderTopStyle", "borderTopColor", "borderRadius", "boxShadow",
  "gap", "gridTemplateColumns", "flexDirection", "justifyContent", "alignItems",
  "opacity", "maxWidth", "minHeight", "overflow", "textDecorationLine",
];

const browser = await chromium.launch({
  executablePath: process.env.CHROME || "/usr/bin/google-chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function analyze(url) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: 1000 },
    deviceScaleFactor: 1,
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("ts-theme", "dark");
      localStorage.setItem("ts-asked", "true");
      localStorage.setItem("ts-visits", "3");
    } catch {}
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch((e) => logs.push("goto: " + e.message));
  await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  await page.waitForTimeout(2000);

  const data = await page.evaluate((props) => {
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
      o.__text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
      return o;
    };

    const classes = {};
    for (const c of classCount.keys()) {
      classes[c] = { count: classCount.get(c), snap: snap(document.querySelector("." + CSS.escape(c))) };
    }
    return {
      rootVars,
      classes,
      totalEls: document.querySelectorAll("*").length,
      title: document.title,
      headings: [...document.querySelectorAll("h1,h2,h3,h4")].map((h) => (h.textContent || "").replace(/\s+/g, " ").trim()),
    };
  }, PROPS);

  await ctx.close();
  return { url, logs, ...data };
}

const ref = await analyze(refUrl);
const build = await analyze(buildUrl);
await browser.close();

const out = [];
const P = (s = "") => out.push(s);

P(`# Runtime comparison @ ${W}px, ${theme}`);
P(`ref   : ${ref.url}`);
P(`build : ${build.url}`);
P();

P(`## Page`);
P(`title  ref="${ref.title}"  build="${build.title}"`);
P(`total elements  ref=${ref.totalEls}  build=${build.totalEls}`);
P();

// --- tokens ---
P(`## CSS custom properties on <html>`);
const allVars = new Set([...Object.keys(ref.rootVars), ...Object.keys(build.rootVars)]);
const varDiffs = [];
for (const k of [...allVars].sort()) {
  const a = ref.rootVars[k], b = build.rootVars[k];
  if (a !== b) varDiffs.push([k, a, b]);
}
if (varDiffs.length === 0) P("(no token differences)");
for (const [k, a, b] of varDiffs) P(`${k}\n    ref   = ${a === undefined ? "<absent>" : a}\n    build = ${b === undefined ? "<absent>" : b}`);
P();

// --- class computed-style diffs (reference classes = meaningful set) ---
P(`## Per-class computed-style differences (classes present in the reference)`);
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

// --- class signatures present one side only (structure) ---
P(`## Class count differences (same class, different number of elements)`);
for (const c of Object.keys(ref.classes).sort()) {
  const b = build.classes[c];
  if (!b) continue;
  if (ref.classes[c].count !== b.count) P(`.${c}: ref=${ref.classes[c].count}  build=${b.count}`);
}
P();

// --- headings ---
P(`## Headings`);
P(`ref   [${ref.headings.length}]: ${ref.headings.join(" | ")}`);
P(`build [${build.headings.length}]: ${build.headings.join(" | ")}`);
P();

// --- console ---
P(`## Console / JS`);
for (const [name, r] of [["REF", ref], ["BUILD", build]]) {
  const interesting = r.logs.filter((l) => !/\[Fast Refresh\]|Download the React DevTools/.test(l));
  P(`${name}: ${interesting.length} message(s)`);
  for (const l of interesting.slice(0, 40)) P(`    ${l}`);
}
P();

console.log(out.join("\n"));
