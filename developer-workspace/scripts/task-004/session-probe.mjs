// TASK-004 Task 31 — session probe: which attached tab is genuinely signed in?
// Proof, not assumption: reports each page's URL *and* what its DOM actually is.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const RUNS = join(process.cwd(), "developer-workspace/scripts/task-004/runs/flows");
mkdirSync(RUNS, { recursive: true });

async function main() {
  const lib = await import("./_lib.mjs");
  const before = lib.chromiumCount();
  const browser = await lib.attach();
  await lib.assertOurs(browser);

  const out = [];
  const ctxs = browser.contexts();
  for (let ci = 0; ci < ctxs.length; ci++) {
    const pages = ctxs[ci].pages();
    for (let pi = 0; pi < pages.length; pi++) {
      const p = pages[pi];
      let url = "(unreadable)";
      try {
        url = p.url();
      } catch {}
      let dom = null;
      try {
        dom = await p.evaluate(() => {
          const txt = (document.body?.innerText || "").slice(0, 400);
          return {
            title: document.title || "",
            h1: document.querySelector("h1")?.innerText || "",
            hasShellAside: !!document.querySelector("aside"),
            hasOfficeChrome: !!document.querySelector("aside") && !!document.querySelector(".topbar"),
            hasSignOut: !!Array.from(document.querySelectorAll("button")).find((b) => /sign out/i.test(b.innerText || "")),
            hasCarForm: !!document.querySelector('form input[name="brand"]'),
            bodyHead: txt.replace(/\s+/g, " ").slice(0, 160),
          };
        });
      } catch (e) {
        dom = { error: String(e.message || e).slice(0, 120) };
      }
      out.push({ ctx: ci, page: pi, url, ...dom });
    }
  }

  const report = ["TASK-004 Task 31 — session probe (attached Chrome tabs)", `ts: ${new Date().toISOString()}`, ""]
    .concat(
      out.map((o) =>
        [
          `ctx ${o.ctx} page ${o.page}: ${o.url}`,
          `   title="${o.title}" h1="${o.h1}"`,
          `   shellAside=${o.hasShellAside} officeChrome=${o.hasOfficeChrome} signOutBtn=${o.hasSignOut} carForm=${o.hasCarForm}`,
          o.error ? `   ERROR ${o.error}` : `   head="${o.bodyHead}"`,
        ].join("\n")
      )
    )
    .join("\n");

  writeFileSync(join(RUNS, "session-probe.txt"), report + "\n");
  writeFileSync(join(RUNS, "session-probe.json"), JSON.stringify(out, null, 2));
  console.log(report);

  const after = lib.chromiumCount();
  console.log(`\n[guard] chromium ${before} → ${after} ${after === before ? "(no launch)" : "(A CHROME WAS LAUNCHED)"}`);
  await lib.detach(browser);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
