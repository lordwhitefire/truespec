// inv-run.mjs — RECON-001 inventory runtime check runner.
// ONE browser instance for the whole run; all checks serial; a fresh context per cell/check.
// Hard guard: abort before launching if this run already has >10 chromium processes.
// The owner's interactive GUI Chrome is NOT ours and is never counted or touched — we count
// only chrome processes carrying Playwright's temp profile marker.
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { analyzeSide, renderCompare } from "./screen-compare.mjs";
import { runProbe } from "./screen-probe.mjs";

const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const REF = "http://localhost:3211/inventory.html";
const BUILD = "http://localhost:3210/inventory";
const WIDTHS = [560, 820, 1100];
const MODES = ["dark", "light"];

function ourChromiumCount() {
  try {
    const ps = execSync("ps -eo args", { encoding: "utf8" });
    return ps.split("\n").filter((l) => /chrome|chromium/i.test(l) && /playwright/i.test(l)).length;
  } catch {
    return 0;
  }
}

const before = ourChromiumCount();
console.log(`[guard] our chromium processes before launch: ${before}`);
if (before > 10) {
  console.error(`[guard] ABORT: ${before} > 10 chromium processes in this run`);
  process.exit(3);
}

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const width of WIDTHS) {
    for (const mode of MODES) {
      const t0 = Date.now();
      const ref = await analyzeSide(browser, REF, { width, mode });
      const build = await analyzeSide(browser, BUILD, { width, mode });
      const md = renderCompare(ref, build, width, mode);
      const file = `/tmp/opencode/inv-compare-${width}-${mode}.md`;
      writeFileSync(file, md);
      console.log(`[compare] ${width}/${mode}: ref HTTP ${ref.status} (rendered ${ref.rendered}, cards ${ref.cardCount}) | build HTTP ${build.status} (rendered ${build.rendered}, cards ${build.cardCount}) -> ${file} (${Date.now() - t0}ms)`);
    }
  }

  // Probe on three representative cells (desktop dark, mobile dark, desktop light).
  // Running all six was what starved the single browser on run 1; the compare matrix covers all six.
  const cells = [
    { width: 1100, mode: "dark" },
    { width: 560, mode: "dark" },
    { width: 1100, mode: "light" },
  ];
  const probe = await runProbe(browser, REF, BUILD, cells);
  writeFileSync("/tmp/opencode/inv-probe.md", probe);
  const bothFail = (probe.match(/ref=false build=false/g) || []).length;
  const diverge = (probe.match(/^DIVERGE/gm) || []).length;
  console.log(`[probe] wrote /tmp/opencode/inv-probe.md (${bothFail} both-fail, ${diverge} diverge)`);
} finally {
  await browser.close();
  console.log("[done] browser closed");
}
process.exit(0);
