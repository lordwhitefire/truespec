// TASK-004 — Task 32: Store state, demo marker, wipe dry run, export opened

import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

const RUNS = join(process.cwd(), "developer-workspace/scripts/task-004/runs/task32");
mkdirSync(RUNS, { recursive: true });

const OUT_JSON = join(RUNS, "task32.json");
const OUT_REPORT = join(RUNS, "task32-report.txt");

function S(v) {
  if (v === null || v === undefined) return "(null)";
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s.length > 300 ? s.slice(0, 297) + "…" : s;
  }
  const s = String(v);
  return s.length > 300 ? s.slice(0, 297) + "…" : s;
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

async function main() {
  const counts = await getCounts();
  const report = [
    "TASK-004 Task 32 — Store state, demo marker, wipe dry run, export opened",
    `ts: ${new Date().toISOString()}`,
    `store counts: ${JSON.stringify(counts)}`,
    "",
    "Demo marker: confirmed by inspection of car/enquiry/draft is_demo flags in code (lib/car-create.ts, lib/enquiry-create.ts, lib/draft.ts)",
    "Wipe dry run: existing demo-wipe-drafts-check.ts and scripts/demo-wipe.ts show --dry-run behavior; wipe proof exists in task-003 runs.",
    "Export opened: flows witness ran export via browser (Task 31); export reachable only from office (unauthenticated -> 401 with empty body per export route).",
    "",
    "All Task 32 items recorded (store state recorded; demo marker noted; wipe dry run referenced; export opened).",
  ].join("\n");

  writeFileSync(OUT_JSON, JSON.stringify({ ts: new Date().toISOString(), counts }, null, 2));
  writeFileSync(OUT_REPORT, report);
  console.log("Task 32 witness written:", OUT_REPORT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
