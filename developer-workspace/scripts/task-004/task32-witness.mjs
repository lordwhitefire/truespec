// TASK-004 — Task 32: the store after the flows · the demo marker · the wipe's dry run · the export opened.
//
// Everything here is MEASURED, not referenced. The previous version of this witness asserted nothing
// live — it said the marker was "confirmed by inspection of code" and the wipe was "referenced".
// That is the same sin the Task 31 witness was withdrawn for. This one runs each thing and records
// what came back:
//
//   1. the store's own audit (_audit.cjs) — counts, and whether every row the demonstration created
//      carries the demo marker;
//   2. office ↔ showroom agreement (task-003's browser-check) — the two surfaces, same car;
//   3. the wipe's dry run (`npm run demo:wipe`, WITHOUT --yes) — what would go, and that nothing else
//      would be touched (the untouched counts must be identical, before and after);
//   4. the export, opened — a fresh ZIP taken through the office, listed and parsed.
//
// Attach-only CDP :9222 · no launch · no screenshots · detach on exit.

import { writeFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const RUNS = join(ROOT, "developer-workspace/scripts/task-004/runs/task32");
mkdirSync(RUNS, { recursive: true });

const OUT_JSON = join(RUNS, "task32.json");
const OUT_REPORT = join(RUNS, "task32-report.txt");
const AUDIT = join(ROOT, "developer-workspace/scripts/task-004/_audit.cjs");
const BROWSER_CHECK = join(ROOT, "developer-workspace/scripts/task-003/browser-check.mjs");

const S = (v) => {
  if (v === null || v === undefined) return "(null)";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 300 ? s.slice(0, 297) + "…" : s;
};

function run(cmd, args, opts = {}) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => res({ code, out, err }));
  });
}

const PROBE = () => {
  const hasSide = !!document.querySelector("aside.side");
  const topbar = !!document.querySelector("header.topbar");
  const door = !!document.querySelector("main.office-door");
  const signedAs = (document.querySelector(".sfoot b")?.innerText || "").trim();
  return { url: location.href, hasSide, topbar, door, signedAs, signedIn: hasSide && topbar && !door };
};

async function findSignedInPage(browser, base) {
  const officey = [];
  for (const ctx of browser.contexts()) for (const p of ctx.pages()) {
    try { if (/\/office/.test(p.url())) officey.push(p); } catch {}
  }
  for (const p of officey) {
    try { if ((await p.evaluate(PROBE)).signedIn) return { page: p, proof: await p.evaluate(PROBE) }; } catch {}
  }
  for (const p of officey) {
    try {
      await p.goto(`${base}/office`, { waitUntil: "domcontentloaded", timeout: 45000 });
      const s = await p.evaluate(PROBE);
      if (s.signedIn) return { page: p, proof: s };
    } catch {}
  }
  return { page: null, proof: null };
}

async function main() {
  const result = { ranAt: new Date().toISOString(), steps: {} };
  const report = [];
  report.push("TASK-004 Task 32 — store state · demo marker · wipe dry run · export opened");
  report.push(`ts: ${result.ranAt}`);

  // ---- 1. the store's state after the flows -------------------------------------------------------
  const auditRun = await run("node", ["--env-file", ".env.local", AUDIT]);
  if (auditRun.code !== 0) throw new Error(`audit failed: ${auditRun.err || auditRun.out}`);
  const store = JSON.parse(auditRun.out);
  result.steps.storeState = store;
  report.push("");
  report.push("--- 1. the store after the flows ---");
  report.push(`counts: ${S(store.counts)}`);
  for (const t of store.markerTables) report.push(`  ${t.t.padEnd(8)} ${t.marked}/${t.total} carry the demo marker`);
  report.push(`demonstration created: ${store.demonstration.cars} car(s), ${store.demonstration.drafts} draft(s)`);
  report.push(`  car refs: ${store.demonstration.carRefs.join(", ")}`);
  report.push(`  draft files: ${store.demonstration.draftsByFile.map((d) => `${d.source_filename}×${d.n}`).join(", ")}`);
  report.push(`every car the demonstration created is marked: ${store.markerCheck.everyCarTheDemonstrationCreatedIsMarked}`);
  report.push(`every draft the demonstration created is marked: ${store.markerCheck.everyDraftTheDemonstrationCreatedIsMarked}`);
  report.push(`child rows off a non-demo car (must be 0/0/0): ${S(store.childRowsOffNonDemoCars)}`);

  // ---- 2. office ↔ showroom agreement -------------------------------------------------------------
  report.push("");
  report.push("--- 2. office ↔ showroom agreement (browser-check) ---");
  const bc = await run("node", ["--import", "tsx", BROWSER_CHECK], { env: { ...process.env, BUILD_URL: "http://127.0.0.1:3210" } });
  let bcJson = null;
  try {
    bcJson = JSON.parse(readFileSync(join(ROOT, "developer-workspace/scripts/task-003/runs/browser-check/surface-probe.json"), "utf8"));
  } catch {}
  const bcVerdicts = bcJson?.verdicts ?? [];
  result.steps.agreement = { exitCode: bc.code, verdicts: bcVerdicts, stdout: bc.out.slice(-2000) };
  for (const v of bcVerdicts) report.push(`  ${v.ok ? "PASS" : "FAIL"}  ${v.name}${v.detail ? ` — ${v.detail}` : ""}`);
  report.push(`  browser-check exit: ${bc.code} (0 = every surface verdict passed)`);

  // ---- 3. the wipe's dry run ----------------------------------------------------------------------
  report.push("");
  report.push("--- 3. the wipe, dry run (changes nothing) ---");
  const wipe = await run("node", ["--import", "tsx", "--conditions=react-server", "scripts/demo-wipe.ts", "--json"]);
  let wipeJson = null;
  try {
    wipeJson = JSON.parse(wipe.out);
  } catch {
    report.push(`  wipe did not return JSON (exit ${wipe.code}): ${S(wipe.err || wipe.out)}`);
  }
  result.steps.wipeDryRun = wipeJson
    ? {
        exitCode: wipe.code,
        dryRun: wipeJson.dryRun,
        demoWouldGo: wipeJson.demo,
        untouchedBefore: wipeJson.untouched?.before,
        untouchedAfter: wipeJson.untouched?.after,
        untouchedMissing: wipeJson.untouched?.missing,
      }
    : { exitCode: wipe.code, stdout: wipe.out.slice(-2000), stderr: wipe.err.slice(-2000) };
  if (wipeJson) {
    report.push(`  dryRun (nothing changed): ${wipeJson.dryRun}`);
    report.push(`  would remove: ${S(wipeJson.demo)}`);
    report.push(`  untouched before: ${S(wipeJson.untouched?.before)}`);
    report.push(`  untouched after:  ${S(wipeJson.untouched?.after)}`);
    report.push(`  ids lost that were not the demo's: ${wipeJson.untouched?.missing?.length === 0 ? "none" : S(wipeJson.untouched?.missing)}`);
  }

  // ---- 4. the export, opened ----------------------------------------------------------------------
  report.push("");
  report.push("--- 4. the export, opened ---");
  const lib = await import("./_lib.mjs");
  const n = lib.chromiumCount();
  if (n > lib.MAX_CHROMIUM) throw new Error(`${n} Chrome instances running (> ${lib.MAX_CHROMIUM})`);
  const browser = await lib.attach();
  await lib.assertOurs(browser);
  try {
    const base = "http://127.0.0.1:3210";
    const gate = await findSignedInPage(browser, base);
    if (!gate.page) throw new Error("no signed-in office tab");
    const page = gate.page;
    await page.bringToFront();
    await page.goto(`${base}/office/settings`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("#tab-account", { state: "attached", timeout: 60000 });
    await page.waitForFunction(() => {
      const el = document.querySelector("#tab-account");
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"));
    }, null, { timeout: 60000 });
    await page.locator("#tab-account").click();
    await page.waitForSelector("#exportBtn", { state: "visible", timeout: 30000 });
    const zip = join(RUNS, "export.zip");
    rmSync(zip, { force: true });
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 90000 }),
      page.locator("#exportBtn").click(),
    ]);
    await download.saveAs(zip);
    const list = await run("unzip", ["-l", zip]);
    const names = list.out
      .split("\n")
      .map((l) => l.trim().split(/\s+/).pop())
      .filter((x) => x && /\.(txt|json|csv)$/.test(x));
    const dir = join(RUNS, "export");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    await run("unzip", ["-o", zip, "-d", dir]);
    const master = JSON.parse(readFileSync(join(dir, "master.json"), "utf8"));
    const expected = ["README.txt", "master.json", "cars.csv", "costs.csv", "photos.csv", "enquiries.csv", "taps.csv", "activity.csv", "settings.csv"];
    const missing = expected.filter((e) => !names.includes(e));
    result.steps.export = {
      file: zip,
      filename: download.suggestedFilename(),
      bytes: readFileSync(zip).length,
      entries: names,
      missing,
      masterTopLevelKeys: Object.keys(master),
      // Costs and photos are nested per car (that is the point of master.json — it keeps the shape).
      countsAtExport: {
        cars: master.cars?.length,
        costs: (master.cars ?? []).reduce((a, c) => a + (c.cost_lines?.length ?? 0), 0),
        photos: (master.cars ?? []).reduce((a, c) => a + (c.photos?.length ?? 0), 0),
        enquiries: master.enquiries?.length,
        taps: master.taps?.length,
        activity: master.activity?.length,
        settings: master.settings?.length,
      },
    };
    report.push(`  file: ${zip} · ${result.steps.export.bytes} bytes · ${download.suggestedFilename()}`);
    report.push(`  holds every subject: ${missing.length === 0 ? "yes" : `NO — missing ${missing.join(", ")}`}`);
    report.push(`  entries: ${names.join(", ")}`);
    report.push(`  master.json top-level: ${S(Object.keys(master))}`);
    report.push(`  master.json counts: ${S(result.steps.export.countsAtExport)}`);
  } finally {
    await lib.detach(browser);
  }

  writeFileSync(OUT_JSON, JSON.stringify(result, null, 2));
  writeFileSync(OUT_REPORT, report.join("\n") + "\n");
  console.log(report.join("\n"));
}

main().catch((e) => {
  console.error(e);
  writeFileSync(OUT_REPORT, `TASK-004 Task 32 witness — FAILED\n${e?.stack || e}\n`);
  process.exit(2);
});
