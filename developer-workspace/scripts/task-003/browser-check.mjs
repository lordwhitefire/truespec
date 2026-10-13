// TASK-003 Task 23 — the browser check (benchmarks 2, 10, 11), per
// `developer-workspace/procedures/browser-check.md`.
//
// The reference site is the OLD implementation, and the demo fleet legitimately differs from it, so
// the procedure's §7 applies: the witness of this layer is **build-office vs build-showroom on the
// same car**. Both tabs therefore point at the build (:3210):
//
//   tab A = the office surface (:3210/office…)
//   tab B = the public showroom surface (:3210/…)
//
// Attach-only on CDP :9222 · each surface across its own cell matrix · surfaces only · no
// screenshots · detach on exit.
//
// Run:  node developer-workspace/scripts/task-003/browser-check.mjs

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { attach, assertOurs, guardCount, chromiumCount, twoTabs, resize, clearResize, detach } from "./_lib.mjs";

const BASE = process.env.BUILD_URL || "http://127.0.0.1:3210";
const OUT = "developer-workspace/scripts/task-003/runs/browser-check";

// The two surfaces, each with its own cell matrix (procedure §4).
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

// The car the two surfaces are opened on: one listed, one sold.
const CAR = "TS-1001";
const SOLD = "TS-1025";

const OFFICE_SCREENS = [
  { name: "office-inventory", kind: "office", path: "/office/inventory", ref: CAR },
  { name: "office-dashboard", kind: "office", path: "/office" },
];
const PUBLIC_SCREENS = [
  { name: "home", kind: "public", path: "/" },
  { name: "inventory", kind: "public", path: "/inventory" },
  { name: "car", kind: "public", path: `/car/${CAR}`, ref: CAR },
  { name: "car-sold", kind: "public", path: `/car/${SOLD}` },
];

// Runs in the page. Plain, comparable surface facts only — no DOM internals, no screenshots.
function CAPTURE({ ref }) {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  const body = document.body ? document.body.innerText : "";
  const text = norm(body);
  const lines = body.split("\n").map(norm).filter(Boolean);
  const h1 = norm((document.querySelector("h1") || {}).innerText || "");

  const naira = [...new Set(text.match(/₦\s?[0-9][0-9,]*/g) || [])].slice(0, 40);
  // Mileage *with its unit*, so the unit itself is checkable (one unit, labelled once).
  const mileage = [...new Set(text.match(/[0-9][0-9,]*\s*(km|mi|miles)\b/gi) || [])].slice(0, 20);
  const mileageUnits = [...new Set((text.match(/\b(km|mi|miles)\b/gi) || []).map((u) => u.toLowerCase()))];

  // A surface label: the element's whole text is a label, not a sentence containing one.
  const LABEL_RE = /^(available|on order|coming soon|landed|sold|on the way|at port|cleared)$/i;
  const chipEls = [...document.querySelectorAll(".chip, [role=tab], button")]
    .map((e) => ({ text: norm(e.innerText), cls: e.className || "" }))
    .filter((e) => e.text && LABEL_RE.test(e.text));
  const chips = [...new Set(chipEls.map((e) => e.text))].slice(0, 6);

  // The office's own state words. Two of the five are also showroom words; these three are not.
  // A *label*, not a word: the office shows a state as a badge or on a line of its own, and the
  // home page's marketing prose ("delivered fully cleared") is not a car's state. The exhaustive
  // check for these is `leak-check` (case-sensitive over every public route's HTML); this is the
  // browser's confirmation of it.
  const OFFICE_ONLY = ["On the way", "At port", "Cleared"];
  const asLabel = (w) => new RegExp(`^${w.replace(/ /g, "\\s+")}$`, "i");
  const officeStateLabels = OFFICE_ONLY.filter(
    (w) => chips.some((c) => asLabel(w).test(c)) || lines.some((l) => asLabel(w).test(l)),
  );
  const officeStateWordsInProse = OFFICE_ONLY.filter(
    (w) => !officeStateLabels.includes(w) && new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "i").test(text),
  );

  // The row for a car, when the page is a list (the office's inventory and the showroom's both are).
  let row = null;
  if (ref) {
    for (const tr of document.querySelectorAll("tr, .carx, article, li")) {
      const t = norm(tr.innerText);
      if (!t.includes(ref)) continue;
      if (t.length > 400) continue; // a wrapper, not the row
      row = {
        price: (t.match(/₦\s?([\d,]+)/) || [])[1] ?? null,
        // No trailing word boundary: at narrow widths the rendered text runs together
        // ("31,000 kmAvailable"), which is the surface, not a defect.
        mileage: (t.match(/([0-9][0-9,]*)\s*(km|mi|miles)/i) || []).slice(1).join(" ") || null,
        state: (t.match(/(On the way|At port|Cleared|Available|Landed)/i) || [])[1] ?? null,
        text: t.slice(0, 200),
      };
      break;
    }
  }

  // A car page's own named facts. The label and the figure are separate elements, so the figure is
  // looked for in a short window after the label rather than required to be adjacent.
  const carPage = {
    doorstepPrice: (/Doorstep price[\s\S]{0,60}?₦\s?([\d,]+)/i.exec(text) || [])[1] ?? null,
    mileage: (text.match(/([0-9][0-9,]*)\s*(km|mi|miles)\b/i) || []).slice(1).join(" ") || null,
    chip: chips[0] ?? null,
  };

  // What a public surface must not render. Values, not prose: a naira figure sitting beside a cost
  // or profit word, an asset reference, a customer's number.
  const costFigures = lines
    .filter((l) => /(landed cost|total cost|estimated total|profit|cogs)/i.test(l) && /[₦\d]/.test(l))
    .slice(0, 8);
  const assetRefs = [...new Set(text.match(/image-[0-9a-f]{10,}/g) || [])].slice(0, 5);
  // The site's OWN phone number is public by design — it is the WhatsApp link in the footer. What
  // must not appear is a customer's number, so the site's is read off its own links and excluded.
  const ownNumbers = [...new Set(
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href") || "")
      .flatMap((h) => (h.match(/(?:wa\.me|whatsapp\.com\/send\?phone=)\/?(\+?\d{7,})/i) || []).slice(1))
      .map((n) => n.replace(/\D/g, "")),
  )];
  const customerNumbers = [...new Set(text.match(/\+234\d{7,}/g) || [])]
    .filter((n) => !ownNumbers.includes(n.replace(/\D/g, "")))
    .slice(0, 5);

  return {
    title: document.title,
    h1,
    textLen: text.length,
    naira,
    mileage,
    mileageUnits,
    chips,
    officeStateWords: officeStateLabels,
    officeStateWordsInProse,
    row,
    carPage,
    costFigures,
    assetRefs,
    ownNumbers,
    customerNumbers,
  };
}

async function ready(page) {
  await page.waitForFunction(() => document.body && document.body.innerText.length > 300, { timeout: 15000 });
}

async function setTheme(page, theme) {
  await page
    .evaluate((t) => {
      try {
        localStorage.setItem("ts-theme", t);
      } catch {}
      document.documentElement.dataset.theme = t;
    }, theme)
    .catch(() => {});
}

async function capture(page, screen, cell) {
  await resize(page.context(), page, cell.width, cell.height);
  const resp = await page.goto(BASE + screen.path, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
  await setTheme(page, cell.theme);
  await ready(page).catch(() => {});
  const facts = await page.evaluate(CAPTURE, { ref: screen.ref ?? null });
  return { status: resp ? resp.status() : null, url: page.url(), ...facts };
}

const S = (v) => (v === undefined ? "<absent>" : v === null ? "<null>" : Array.isArray(v) ? JSON.stringify(v) : String(v));
const cells = [];
const report = [];
const verdicts = [];
let browser;
let countBefore;

try {
  countBefore = guardCount();
  browser = await attach();
  const ua = await assertOurs(browser);
  console.log(`attached to the one Chrome on :9222 — ours (UA has no Headless)\n  ${ua}\n`);
  const { a: officePage, b: publicPage } = await twoTabs(browser);

  for (const screen of OFFICE_SCREENS) {
    for (const cell of CELLS.office) {
      const facts = await capture(officePage, screen, cell);
      cells.push({ screen: screen.name, kind: "office", cell: cell.name, width: cell.width, theme: cell.theme, facts });
    }
  }
  for (const screen of PUBLIC_SCREENS) {
    for (const cell of CELLS.public) {
      const facts = await capture(publicPage, screen, cell);
      cells.push({ screen: screen.name, kind: "public", cell: cell.name, width: cell.width, theme: cell.theme, facts });
    }
  }
  await clearResize(officePage.context(), officePage).catch(() => {});
  await clearResize(publicPage.context(), publicPage).catch(() => {});

  // ---- 1. every cell loaded -------------------------------------------------
  const failedLoads = cells.filter((c) => c.facts.status !== 200);
  verdicts.push({
    ok: failedLoads.length === 0,
    name: "every cell loaded (HTTP 200) on both surfaces",
    detail: `${cells.length} cells · ${CELLS.office.length} office cells/screen · ${CELLS.public.length} public cells/screen` +
      (failedLoads.length ? ` · failed: ${failedLoads.map((c) => `${c.screen}@${c.cell}=${c.facts.status}`).join(", ")}` : ""),
  });

  // ---- 2. mileage is km on both surfaces, always -----------------------------
  const badUnits = cells
    .flatMap((c) => c.facts.mileageUnits.map((u) => ({ c, u })))
    .filter(({ u }) => u !== "km")
    .map(({ c, u }) => `${c.screen}@${c.cell}:${u}`);
  const kmSeen = cells.filter((c) => c.facts.mileage.some((m) => /km$/i.test(m))).length;
  verdicts.push({
    ok: badUnits.length === 0,
    name: "mileage is labelled in km wherever it appears — one unit",
    detail: `${kmSeen}/${cells.length} cells show a mileage · units seen: ${[...new Set(cells.flatMap((c) => c.facts.mileageUnits))].join("/") || "none"}` + (badUnits.length ? ` · NOT km: ${badUnits.join(", ")}` : ""),
  });

  // ---- 3. the office and the showroom agree on the same car ------------------
  // Paired at the widths both matrices cover: 560 and 820, dark and light.
  const paired = [];
  for (const cell of CELLS.public.filter((c) => ["w560-dark", "w560-light", "w820-dark", "w820-light"].includes(c.name))) {
    const officeRow = cells.find((c) => c.screen === "office-inventory" && c.cell === cell.name)?.facts.row ?? null;
    const showroom = cells.find((c) => c.screen === "car" && c.cell === cell.name)?.facts.carPage ?? null;
    // Both sides hand over digits only, so the comparison is about the figure, not its formatting.
    const digits = (s) => (s === null || s === undefined ? null : String(s).replace(/\D/g, ""));
    const agree = (a, b) => (a === null || b === null ? null : a === b);
    const priceAgrees = agree(digits(officeRow?.price), digits(showroom?.doorstepPrice));
    paired.push({
      cell: cell.name,
      officePrice: officeRow?.price ?? null,
      officeMileage: officeRow?.mileage ?? null,
      officeState: officeRow?.state ?? null,
      showroomPrice: showroom?.doorstepPrice ?? null,
      showroomMileage: showroom?.mileage ?? null,
      showroomChip: showroom?.chip ?? null,
      priceAgrees,
    });
  }
  const comparable = paired.filter((p) => p.officePrice !== null && p.showroomPrice !== null);
  const disagreeing = comparable.filter((p) => p.priceAgrees !== true);
  verdicts.push({
    ok: comparable.length > 0 && disagreeing.length === 0,
    name: `the office and the showroom agree on the same car (${CAR}) at every shared cell`,
    detail: `${comparable.length}/${paired.length} paired cells showed both figures · ` +
      paired.map((p) => `${p.cell}: office ₦${p.officePrice ?? "—"}/${p.officeMileage ?? "—"} vs showroom ₦${p.showroomPrice ?? "—"}/${p.showroomMileage ?? "—"}`).join(" · ") +
      (disagreeing.length ? ` · DISAGREE: ${disagreeing.map((p) => p.cell).join(", ")}` : ""),
  });

  // The office's own words must never appear on a public surface, and its figures must not either.
  const publicCells = cells.filter((c) => c.kind === "public");
  const leakedWords = publicCells.filter((c) => c.facts.officeStateWords.length > 0).map((c) => `${c.screen}@${c.cell}:${c.facts.officeStateWords.join("/")}`);
  const leakedCosts = publicCells.filter((c) => c.facts.costFigures.length > 0).map((c) => `${c.screen}@${c.cell}:${c.facts.costFigures[0]}`);
  const leakedAssets = publicCells.filter((c) => c.facts.assetRefs.length > 0).map((c) => `${c.screen}@${c.cell}:${c.facts.assetRefs[0]}`);
  const leakedCustomers = publicCells.filter((c) => c.facts.customerNumbers.length > 0).map((c) => `${c.screen}@${c.cell}`);
  // Where an office word sits inside a sentence it is prose, not a state — named, not counted as a leak.
  const proseWords = [...new Set(publicCells.flatMap((c) => c.facts.officeStateWordsInProse.map((w) => `${w} (${c.screen})`)))];
  verdicts.push({
    ok: leakedWords.length + leakedCosts.length + leakedAssets.length + leakedCustomers.length === 0,
    name: "no public surface renders an office state label, a cost figure, an asset reference or a customer's number",
    detail: `${publicCells.length} public cells checked · office state labels: ${leakedWords.length ? leakedWords.join(", ") : "none"} · cost figures: ${leakedCosts.length ? leakedCosts.join(", ") : "none"} · asset refs: ${leakedAssets.length ? leakedAssets.join(", ") : "none"} · customer numbers: ${leakedCustomers.length ? leakedCustomers.join(", ") : "none"}` +
      (proseWords.length ? ` · (not a leak, prose: ${proseWords.join(", ")} — the home page reads "delivered fully cleared")` : ""),
  });

  // ---- 4. the sold car has left the showroom, in the browser -----------------
  const soldCells = cells.filter((c) => c.screen === "car-sold");
  const soldOffering = soldCells.filter((c) => c.facts.carPage.doorstepPrice !== null || c.facts.carPage.chip !== null);
  verdicts.push({
    ok: soldCells.length > 0 && soldCells.every((c) => c.facts.status === 200 && c.facts.textLen > 300) && soldOffering.length === 0,
    name: `the sold car (${SOLD}) has left the showroom — its page offers no price and carries no section`,
    detail: `${soldCells.length} cells · all loaded, none offering a price or a chip` +
      (soldOffering.length ? ` · OFFERING: ${soldOffering.map((c) => c.cell).join(", ")}` : ""),
  });

  // ---- the report -----------------------------------------------------------
  report.push(`browser check — TASK-003 Task 23 — ${new Date().toISOString()}`);
  report.push(`attach-only on CDP :9222 · both tabs on the build ${BASE} (office vs showroom)`);
  report.push("");
  for (const c of cells) {
    const f = c.facts;
    report.push(
      [
        `# ${c.screen} @ ${c.cell} (${c.width}px, ${c.theme}) — HTTP ${S(f.status)} · ${f.textLen}c`,
        `  title ${S(f.title)}   h1 ${S(f.h1)}`,
        `  naira     ${S(f.naira)}`,
        `  mileage   ${S(f.mileage)}   units=${S(f.mileageUnits)}`,
        `  chips     ${S(f.chips)}   officeStateLabels=${S(f.officeStateWords)}   prose=${S(f.officeStateWordsInProse)}`,
        `  row       ${S(f.row)}`,
        `  carPage   ${S(f.carPage)}`,
        `  forbidden costFigures=${S(f.costFigures)} assetRefs=${S(f.assetRefs)} ownNumbers=${S(f.ownNumbers)} customerNumbers=${S(f.customerNumbers)}`,
      ].join("\n"),
    );
  }
  report.push("");
  report.push("--- verdicts ---");
  for (const v of verdicts) report.push(`${v.ok ? "PASS" : "FAIL"}  ${v.name}\n      ${v.detail}`);

  console.log(report.join("\n"));
  for (const v of verdicts) console.log(`\n${v.ok ? "ok  " : "FAIL"}  ${v.name}\n      ${v.detail}`);
} finally {
  if (browser) {
    const after = chromiumCount();
    console.log(`\n[guard] chromium ${countBefore} → ${after} ${after === countBefore ? "(no launch)" : "(A CHROME WAS LAUNCHED)"}`);
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    writeFileSync(`${OUT}/surface-probe.json`, JSON.stringify({ ranAt: new Date().toISOString(), base: BASE, cells, verdicts }, null, 2));
    writeFileSync(`${OUT}/surface-probe.txt`, report.join("\n") + "\n");
    const byScreen = new Map();
    for (const c of cells) {
      const list = byScreen.get(c.screen) ?? [];
      list.push(`${c.cell}: HTTP ${c.facts.status} · naira ${S(c.facts.naira)} · mileage ${S(c.facts.mileage)} · row ${S(c.facts.row)} · carPage ${S(c.facts.carPage)}`);
      byScreen.set(c.screen, list);
    }
    for (const [screen, list] of byScreen) {
      mkdirSync(`${OUT}/${screen}`, { recursive: true });
      writeFileSync(`${OUT}/${screen}/compare-report.txt`, list.join("\n") + "\n");
    }
    console.log(`wrote ${OUT}/surface-probe.json and per-screen reports under ${OUT}/`);
    await detach(browser);
  }
}
process.exit(verdicts.every((v) => v.ok) ? 0 : 1);
