// C7 — WCAG 2.2 AA scan with axe-core, injected into the existing build tab.
// Attach-only; reuses the build tab; no new tab, no launch, no screenshot.
// axe-core lives outside the repo (installed in /tmp) so the tree is untouched.
import fs from "node:fs";
import {
  BASE,
  attach,
  assertOurs,
  chromiumCount,
  clearResize,
  detach,
  findTab,
  resize,
  tabUrls,
} from "./_lib.mjs";

const AXE = "/tmp/opencode/axe/node_modules/axe-core/axe.min.js";
const axeSource = fs.readFileSync(AXE, "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const DESKTOP = [
  ["/", "/"],
  ["/inventory", "/inventory"],
  ["/car/TS-1001", "/car/TS-1001"],
  ["/privacy", "/privacy"],
  ["/terms", "/terms"],
  ["/office/sign-in", "/office/sign-in"],
];
const MOBILE = [
  ["/", "/"],
  ["/inventory", "/inventory"],
  ["/car/TS-1001", "/car/TS-1001"],
];

const before = chromiumCount();
const browser = await attach();
let page;
let resized = false;
const runs = [];

async function scan(label, path, width, height) {
  if (width) {
    await resize(page, width, height);
    resized = true;
  }
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(900);
  await page.evaluate(axeSource);
  const result = await page.evaluate(async (tags) => {
    const r = await window.axe.run(document, {
      runOnly: { type: "tag", values: tags },
    });
    return {
      violations: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 8).map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      passes: r.passes.length,
      incomplete: r.incomplete.map((v) => ({ id: v.id, impact: v.impact })),
    };
  }, TAGS);
  runs.push({ label, path, width: width || 1440, status: response ? response.status() : null, ...result });
}

try {
  await assertOurs(browser);
  page = findTab(browser, BASE);
  const tabsBefore = tabUrls(browser).length;

  for (const [label, path] of DESKTOP) await scan(label, path, 1440, 900);
  for (const [label, path] of MOBILE) await scan(`${label}@390`, path, 390, 823);

  const tabsAfter = tabUrls(browser).length;
  const after = chromiumCount();
  const out = {
    axe: "4.14.0",
    tags: TAGS,
    runs,
    totalViolations: runs.reduce((n, r) => n + r.violations.length, 0),
    tabs: [tabsBefore, tabsAfter],
    chromium: [before, after],
  };
  console.log(JSON.stringify(out, null, 2));
  // The rule is "no new tab"; a tab the owner closes during the run is not ours to reopen.
  if (tabsAfter > tabsBefore) throw new Error(`a tab was opened (${tabsBefore} -> ${tabsAfter})`);
  if (after > before) throw new Error(`a Chrome was launched (${before} -> ${after})`);
} finally {
  if (page) {
    try {
      await page.goto(`${BASE}/inventory`, { waitUntil: "load", timeout: 30000 });
    } catch {
      /* best-effort restore */
    }
  }
  if (resized) await clearResize(page);
  await detach(browser);
}
