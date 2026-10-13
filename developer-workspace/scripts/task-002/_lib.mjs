// TASK-002 browser-check harness (plan Task 7).
//
// The project's established method (runtime-divergence skill): ONE persistent, visible
// Chrome. This harness ATTACHES to the Chrome already listening on CDP :9222 and never
// launches one of its own — if nothing is there it stops with a clear message. It reuses
// the skill's primitives (twoTabs / resize / clearResize / detach).
//
// Two tabs we own: A = reference (:3211), B = build (:3210). We DETACH on exit; the window
// and its tabs stay open and reusable.
//
// Surfaces only — no screenshots (the owner checks the look by hand). This layer's
// authority is the model (models/TASK-002-model.md), not the browser.
import http from "node:http";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import {
  CDP_URL,
  CDP_PORT,
  twoTabs,
  resize,
  clearResize,
  detach,
} from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";

export const REF = process.env.REF_URL || "http://127.0.0.1:3211";
export const BASE = process.env.BUILD_URL || "http://127.0.0.1:3210";
// Note: :3000 is stale — never test it (plan §Verification method).
export const MAX_CHROMIUM = 10;

function cdpAlive() {
  return new Promise((resolve) => {
    const req = http.get(`${CDP_URL}/json/version`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Count running Chrome instances (browser processes, not --type= helpers). The harness
// must never make this go up: it attaches, it does not launch.
export function chromiumCount() {
  let out = "";
  try {
    out = execFileSync("ps", ["-eo", "args"], { encoding: "utf8" });
  } catch {
    return 0;
  }
  return out
    .split("\n")
    .filter((line) => /(google-chrome|chromium)/.test(line) && !/--type=/.test(line))
    .length;
}

export function guardCount() {
  const n = chromiumCount();
  if (n > MAX_CHROMIUM) {
    throw new Error(`${n} Chrome instances running — over the ${MAX_CHROMIUM} guard; stop one first`);
  }
  return n;
}

// Attach only. If no Chrome is on :9222 this throws — it never launches one.
export async function attach() {
  if (!(await cdpAlive())) {
    throw new Error(
      `no Chrome on CDP ${CDP_URL} — start the automation Chrome ` +
        `(profile ~/.config/google-chrome-automation, --remote-debugging-port=${CDP_PORT}); ` +
        `this harness never launches one`,
    );
  }
  return chromium.connectOverCDP(CDP_URL, { timeout: 10000 });
}

// Confirm the Chrome we attached to is ours (not a stray headless browser).
export async function assertOurs(browser) {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] || (await ctx.newPage());
  const ua = await page.evaluate(() => navigator.userAgent);
  if (/Headless/i.test(ua)) {
    throw new Error("the Chrome on :9222 is headless — that is not ours");
  }
  return ua;
}

export { twoTabs, resize, clearResize, detach, CDP_URL, CDP_PORT };

// `node _lib.mjs` — the Task 7 check: attach, prove it is ours, print the two tabs,
// confirm no new Chrome was launched, detach.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const before = guardCount();
  console.log(`chromium instances before: ${before} (guard ${MAX_CHROMIUM})`);
  const browser = await attach();
  try {
    const ua = await assertOurs(browser);
    console.log(`attached to ${CDP_URL} — ours (UA has no Headless)`);
    console.log(`  UA: ${ua}`);
    const { a, b } = await twoTabs(browser);
    console.log(`tab A (ref)   = ${a.url()}`);
    console.log(`tab B (build) = ${b.url()}`);
    const after = chromiumCount();
    if (after > before) throw new Error(`a Chrome was launched (${before} → ${after})`);
    console.log(`no new Chrome launched (${before} → ${after})`);
  } finally {
    await detach(browser);
  }
}
