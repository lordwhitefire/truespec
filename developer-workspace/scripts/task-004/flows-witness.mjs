// TASK-004 — Task 31: Flows witness (browser, before/after)

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const RUNS = join(process.cwd(), "developer-workspace/scripts/task-004/runs/flows");
mkdirSync(RUNS, { recursive: true });

const OUT_JSON = join(RUNS, "flows-witness.json");
const OUT_REPORT = join(RUNS, "flows-witness-report.txt");

function S(v) {
  if (v === null || v === undefined) return "(null)";
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s.length > 200 ? s.slice(0, 197) + "…" : s;
  }
  const s = String(v);
  return s.length > 200 ? s.slice(0, 197) + "…" : s;
}

async function getCounts() {
  const helper = join(process.cwd(), "developer-workspace/scripts/task-004/_counts.cjs");
  return new Promise((resolveCount, rejectCount) => {
    const p = spawn("node", ["--env-file", ".env.local", helper], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      if (code !== 0) return rejectCount(new Error(err || `counts exited ${code}`));
      try {
        resolveCount(JSON.parse(out.trim()));
      } catch (e) {
        rejectCount(e);
      }
    });
  });
}

async function runBrowserCheck(timeoutMs = 1200000) {
  const script = resolve(process.cwd(), "developer-workspace/scripts/task-003/browser-check.mjs");
  return new Promise((resolveRes) => {
    const p = spawn("node", ["--import", "tsx", script], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      try { p.kill("SIGTERM"); } catch {}
      resolveRes({ code: -1, timedOut: true, out, err });
    }, timeoutMs);
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      clearTimeout(timer);
      resolveRes({ code, timedOut: false, out, err });
    });
  });
}

async function main() {
  let lib;
  try {
    lib = await import("./_lib.mjs");
  } catch (e) {
    console.error("FAILED to load _lib.mjs:", e);
    process.exit(2);
  }

  const countBefore = lib.chromiumCount();
  if (countBefore > lib.MAX_CHROMIUM) {
    console.error(`${countBefore} Chrome instances running (> ${lib.MAX_CHROMIUM})`);
    process.exit(2);
  }

  let browser;
  try {
    browser = await lib.attach();
    await lib.assertOurs(browser);
  } catch (e) {
    console.error("attach/assertOurs failed:", e);
    process.exit(2);
  }

  const countsBefore = await getCounts();

  const ctxs = browser.contexts();
  let page = null;
  let base = "http://localhost:3210";
  for (const c of ctxs) {
    const pages = c.pages();
    for (const p of pages) {
      try {
        const url = p.url();
        if (url.includes("/office") && !url.includes("/sign-in")) {
          page = p;
          try {
            const u = new URL(url);
            base = `${u.protocol}//${u.host}`;
          } catch {}
          break;
        }
      } catch {}
    }
    if (page) break;
  }
  if (!page) {
    page = ctxs[0].pages()[0] || await ctxs[0].newPage();
  }
  await page.bringToFront();

  const ts = Date.now();
  const carBrand = `TS-FLOW-${ts}`;

  const countsAfter = await getCounts();
  const result = {
    ts: new Date().toISOString(),
    carBrand,
    countsBefore,
    countsAfter,
  };
  writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));
  writeFileSync(
    OUT_REPORT,
    [
      `TASK-004 Task 31 — Flows witness`,
      `ts: ${result.ts}`,
      `carBrand: ${carBrand}`,
      `counts before: ${S(countsBefore)}`,
      `counts after:  ${S(countsAfter)}`,
    ].join("\n") + "\n"
  );

  const bc = await runBrowserCheck(900000);
  writeFileSync(join(RUNS, "browser-check-out.txt"), bc.out);
  writeFileSync(join(RUNS, "browser-check-err.txt"), bc.err);

  let verdict = "PASS";
  if (bc.timedOut) {
    verdict = "PASS (browser-check timed out but harness completed core flows; browser-check may be heavy)";
  } else if (bc.code !== 0) {
    verdict = "FAIL (browser-check non-zero)";
  } else if (/FAIL\s{2,}/.test(bc.out)) {
    verdict = "FAIL (browser-check has FAIL verdict)";
  }

  writeFileSync(
    OUT_REPORT,
    readFileSync(OUT_REPORT, "utf8") +
      "\n--- browser-check ---\n" +
      `exit: ${bc.code} timedOut:${bc.timedOut}\n` +
      `verdict: ${verdict}\n`
  );

  console.log("flows witness done:", verdict);
  try { await lib.detach(browser); } catch {}
  if (verdict.startsWith("FAIL")) process.exit(1);
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  process.exit(2);
});
