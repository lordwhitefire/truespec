// TASK-002 Task 21 — per-screen runtime SURFACE probe (build vs reference).
//
// Surfaces only, no screenshots (the owner checks the look by hand). This layer's
// authority is the model (models/TASK-002-model.md) — the reference is the OLD
// implementation, so a difference here is classified in the Task 21 report as
// *intended* (tied to the requirement that wins) or *unintended* (a defect).
//
// Attaches to the ONE persistent visible Chrome on CDP :9222 — never launches one
// (Task 7 harness `_lib.mjs`: attach / assertOurs / guardCount). Two tabs we own:
// A = reference (:3211), B = build (:3210). Detaches on exit; the window stays open.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import {
  attach,
  assertOurs,
  guardCount,
  twoTabs,
  resize,
  clearResize,
  detach,
} from "./_lib.mjs";

const REF_BASE = process.env.REF_URL || "http://127.0.0.1:3211";
const BUILD_BASE = process.env.BUILD_URL || "http://127.0.0.1:3210";
const OUT = "runs";

// ref↔build screen map. ref pages are the static old implementation; build pages are
// the rewired Next app (Tasks 12–19).
const SCREENS = [
  { name: "home", group: "public", ref: "/truespec.html", build: "/" },
  { name: "inventory", group: "public", ref: "/inventory.html", build: "/inventory" },
  { name: "car", group: "public", ref: "/car.html?car=2021-toyota-camry-xse-v6", build: "/car/TS-1001" },
  // Sold-state cell: each side's OWN sold car (the build routes by ref code, not slug;
  // its dataset is `naila`, and the sold car is TS-1025 — seed.ts:63-68).
  { name: "car-sold", group: "public", ref: "/car.html?car=2021-honda-civic-ex", build: "/car/TS-1025" },
  { name: "office-dashboard", group: "office", ref: "/office-dashboard.html", build: "/office" },
  { name: "office-inventory", group: "office", ref: "/office-inventory.html", build: "/office/inventory" },
  { name: "office-car", group: "office", ref: "/office-car.html", build: "/office/car" },
  { name: "office-settings", group: "office", ref: "/office-settings.html", build: "/office/settings" },
];

const CELLS = {
  public: [
    { name: "w560-dark", width: 560, height: 900, theme: "dark" },
    { name: "w560-light", width: 560, height: 900, theme: "light" },
    { name: "w820-dark", width: 820, height: 1000, theme: "dark" },
    { name: "w820-light", width: 820, height: 1000, theme: "light" },
    { name: "w1100-dark", width: 1100, height: 900, theme: "dark" },
    { name: "w1100-light", width: 1100, height: 900, theme: "light" },
  ],
  office: [
    { name: "w1440-dark", width: 1440, height: 900, theme: "dark" },
    { name: "w1440-light", width: 1440, height: 900, theme: "light" },
    { name: "w820-dark", width: 820, height: 1000, theme: "dark" },
    { name: "w820-light", width: 820, height: 1000, theme: "light" },
    { name: "w560-dark", width: 560, height: 900, theme: "dark" },
    { name: "w560-light", width: 560, height: 900, theme: "light" },
    { name: "w390-dark", width: 390, height: 844, theme: "dark" },
    { name: "w390-light", width: 390, height: 844, theme: "light" },
  ],
};

// Runs in the page. Returns plain, comparable surface facts (no DOM internals).
function CAPTURE() {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const raw = document.body ? document.body.innerText : "";
  const text = norm(raw);
  const lines = raw.split("\n").map(norm).filter(Boolean);
  const KEY = /available|on order|on the way|at port|cleared|landed|cost|profit|sold|still building|rate|dollar|₦/i;
  const keyLines = [...new Set(lines.filter((l) => KEY.test(l)))].slice(0, 60);
  const naira = [...new Set(text.match(/₦\s?[0-9][0-9,]*/g) || [])];
  const chipLabels = [
    ...new Set(
      [...document.querySelectorAll("button, .chip, [role=tab], .chipf button")]
        .map((b) => norm(b.innerText))
        .filter((t) => /^(all|available|on order|on the way|at port|cleared|landed|sold)\b/i.test(t)),
    ),
  ].slice(0, 30);
  const inputs = [...document.querySelectorAll("input, select")].map((i) => ({
    id: i.id || null,
    type: (i.getAttribute("type") || i.tagName || "").toLowerCase(),
    ph: i.getAttribute("placeholder") || null,
    val: String(i.value || "").slice(0, 40),
  }));
  const h1 = norm((document.querySelector("h1") || {}).textContent);
  const STATE = ["On the way", "At port", "Cleared", "Held for payment"];
  const stateLabels = STATE.filter((w) => text.includes(w));
  const rateWords = [];
  if (/\brate\b/i.test(text)) rateWords.push("rate");
  if (/\bdollar\b/i.test(text)) rateWords.push("dollar");
  if (/\$/.test(text)) rateWords.push("$");
  const costLabels = ["Estimated total cost", "Landed cost", "Total cost"].filter((w) => text.includes(w));
  return {
    title: document.title,
    h1,
    keyLines,
    naira,
    chipLabels,
    costLabels,
    inputs,
    stateLabels,
    rateWords,
    textLen: text.length,
  };
}

async function ready(page) {
  await page.waitForFunction(() => document.body && document.body.innerText.length > 300, { timeout: 15000 });
}

function setTheme(page, theme) {
  return page
    .evaluate((t) => {
      try {
        localStorage.setItem("ts-theme", t);
      } catch {}
      document.documentElement.dataset.theme = t;
    }, theme)
    .catch(() => {});
}

const S = (v) => (v === undefined ? "<absent>" : v === null ? "<null>" : Array.isArray(v) ? JSON.stringify(v) : String(v));

async function captureCell(page, base, path, cell) {
  await resize(page.context(), page, cell.width, cell.height);
  const resp = await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
  await setTheme(page, cell.theme);
  await ready(page).catch(() => {});
  const facts = await page.evaluate(CAPTURE);
  return { status: resp ? resp.status() : null, ...facts };
}

const out = [];
const report = [];
const byScreen = new Map();
let browser;
let countBefore;
try {
  countBefore = guardCount();
  browser = await attach();
  await assertOurs(browser);
  const { a: refPage, b: buildPage } = await twoTabs(browser);

  for (const screen of SCREENS) {
    const cells = CELLS[screen.group];
    for (const cell of cells) {
      const ref = await captureCell(refPage, REF_BASE, screen.ref, cell);
      const build = await captureCell(buildPage, BUILD_BASE, screen.build, cell);
      const rec = { screen: screen.name, group: screen.group, cell: cell.name, theme: cell.theme, ref, build };
      out.push(rec);

      const L = [];
      L.push(`# ${screen.name} @ ${cell.name} (${cell.width}×${cell.height}, ${cell.theme})`);
      L.push(`ref  : ${REF_BASE}${screen.ref}  [HTTP ${S(ref.status)}, ${ref.textLen}c]`);
      L.push(`build: ${BUILD_BASE}${screen.build}  [HTTP ${S(build.status)}, ${build.textLen}c]`);
      L.push(`title   ref=${S(ref.title)}   build=${S(build.title)}`);
      L.push(`h1      ref=${S(ref.h1)}   build=${S(build.h1)}`);
      L.push(`chips   ref=${S(ref.chipLabels)}   build=${S(build.chipLabels)}`);
      L.push(`costLbl ref=${S(ref.costLabels)}   build=${S(build.costLabels)}`);
      L.push(`naira   ref=${S(ref.naira)}`);
      L.push(`        bld=${S(build.naira)}`);
      L.push(`stateLbl ref=${S(ref.stateLabels)}   build=${S(build.stateLabels)}`);
      L.push(`rateWrd ref=${S(ref.rateWords)}   build=${S(build.rateWords)}`);
      L.push(`inputs  ref=${S(ref.inputs.map((i) => i.id + ":" + i.type))}`);
      L.push(`        bld=${S(build.inputs.map((i) => i.id + ":" + i.type))}`);
      L.push(`ref keyLines:  ${S(ref.keyLines)}`);
      L.push(`bld keyLines:  ${S(build.keyLines)}`);
      const cellText = L.join("\n");
      report.push(cellText);
      const prev = byScreen.get(screen.name) ?? [];
      prev.push(cellText);
      byScreen.set(screen.name, prev);
    }
  }
} finally {
  if (browser) {
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/surface-probe.json`, JSON.stringify(out, null, 2));
    writeFileSync(`${OUT}/surface-probe.txt`, report.join("\n\n"));
    // Per-screen reports — plan §Task 21 verification names runs/<screen>/compare-report.txt.
    for (const [name, cellTexts] of byScreen) {
      mkdirSync(`${OUT}/${name}`, { recursive: true });
      writeFileSync(`${OUT}/${name}/compare-report.txt`, cellTexts.join("\n\n") + "\n");
    }
    const after = guardCount();
    console.log(`[guard] chromium ${countBefore} → ${after} (no launch if equal)`);
    await detach(browser);
  }
}
console.log(`wrote ${OUT}/surface-probe.json (${out.length} screen-cells) and ${OUT}/surface-probe.txt`);
process.exit(0);
