// car-run.mjs — RECON-001 car-page runtime check runner.
// ONE browser instance for the whole run; all checks serial; a fresh context per cell/check.
// Hard guard: abort before launching if this run already has >10 chromium processes.
// We count only chrome processes carrying Playwright's temp profile marker; the owner's
// interactive GUI Chrome is not ours and is never counted or touched.
import { chromium } from "playwright-core";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { analyzeCar, renderCarCompare } from "./car-compare.mjs";
import { renderStructure } from "./screen-compare.mjs";
import { runCarProbe } from "./car-probe.mjs";

const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const REF = (slug) => `http://localhost:3211/car.html?car=${encodeURIComponent(slug)}`;
const BUILD = (ref) => `http://localhost:3210/car/${encodeURIComponent(ref)}`;

const NORMAL = { label: "Car (normal: 2021 Camry XSE V6 / TS-1001)", ref: REF("2021-toyota-camry-xse-v6"), build: BUILD("TS-1001") };
const SOLD = { label: "Car (sold slug 2021-honda-civic-ex)", ref: REF("2021-honda-civic-ex"), build: BUILD("2021-honda-civic-ex") };
const NOTFOUND = { label: "Car (not found slug)", ref: REF("no-such-car-xyz"), build: BUILD("TS-0000") };

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
  // 1) Normal car at all six cells.
  for (const width of WIDTHS) {
    for (const mode of MODES) {
      const t0 = Date.now();
      const ref = await analyzeCar(browser, NORMAL.ref, { width, mode });
      const build = await analyzeCar(browser, NORMAL.build, { width, mode });
      const md = renderCarCompare(ref, build, width, mode, NORMAL.label);
      const file = `/tmp/opencode/car-compare-${width}-${mode}.md`;
      writeFileSync(file, md);
      const smd = renderStructure(ref, build, width, mode, NORMAL.label);
      const sfile = `/tmp/opencode/car-structure-${width}-${mode}.md`;
      writeFileSync(sfile, smd);
      const verdict = (smd.match(/DOM structure identical[^\n]*/) || ["?"])[0];
      console.log(`[compare] normal ${width}/${mode}: ref HTTP ${ref.status} (rendered ${ref.rendered}) | build HTTP ${build.status} (rendered ${build.rendered}) -> ${file} (${Date.now() - t0}ms)`);
      console.log(`[structure] ${width}/${mode}: ${verdict} -> ${sfile}`);
    }
  }

  // 2) Sold + not-found states at two representative cells.
  for (const state of [SOLD, NOTFOUND]) {
    const key = state === SOLD ? "sold" : "notfound";
    for (const { width, mode } of [{ width: 1100, mode: "dark" }, { width: 560, mode: "dark" }]) {
      const ref = await analyzeCar(browser, state.ref, { width, mode });
      const build = await analyzeCar(browser, state.build, { width, mode });
      const md = renderCarCompare(ref, build, width, mode, state.label);
      const file = `/tmp/opencode/car-${key}-${width}-${mode}.md`;
      writeFileSync(file, md);
      const smd = renderStructure(ref, build, width, mode, state.label);
      const sfile = `/tmp/opencode/car-${key}-structure-${width}-${mode}.md`;
      writeFileSync(sfile, smd);
      console.log(`[compare] ${key} ${width}/${mode}: ref HTTP ${ref.status} (rendered ${ref.rendered}) | build HTTP ${build.status} (rendered ${build.rendered}) -> ${file}`);
      console.log(`[structure] ${key} ${width}/${mode}: ${(smd.match(/DOM structure identical[^\n]*/) || ["?"])[0]} -> ${sfile}`);
    }
  }

  // 3) Interactive probe on three representative cells.
  const cells = [
    { width: 1100, mode: "dark" },
    { width: 560, mode: "dark" },
    { width: 1100, mode: "light" },
  ];
  try {
    const probe = await runCarProbe(browser, NORMAL.ref, NORMAL.build, cells);
    writeFileSync("/tmp/opencode/car-probe.md", probe);
    const bothPass = (probe.match(/BOTH PASS/g) || []).length;
    const bothFail = (probe.match(/BOTH FAIL/g) || []).length;
    const diverge = (probe.match(/^DIVERGE/gm) || []).length;
    console.log(`[probe] wrote /tmp/opencode/car-probe.md (${bothPass} both-pass, ${bothFail} both-fail, ${diverge} diverge)`);
  } catch (e) {
    console.error(`[probe] FAILED: ${String((e && e.message) || e)}`);
    writeFileSync("/tmp/opencode/car-probe-error.txt", String((e && e.stack) || e));
  }
} finally {
  await browser.close();
  console.log("[done] browser closed");
}
process.exit(0);
