// LAUNCH-001 runtime harness — attaches to the one visible Chrome on CDP :9222.
// It never launches a Chrome, never opens a tab and never takes a screenshot.
// Surfaces only. The standing procedure is developer-workspace/procedures/browser-check.md.
//
// Deviation from the procedure's generic `twoTabs`: this harness finds the build and
// reference tabs by origin (`findTab`). The owner keeps unrelated tabs open; taking the
// first two pages would navigate the wrong ones. It still reuses exactly two existing tabs.
import http from "node:http";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import {
  CDP_PORT,
  CDP_URL,
  clearResize,
  detach as skillDetach,
  resize as skillResize,
} from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";

export { clearResize };
export const REF = process.env.REF_URL || "http://127.0.0.1:3211";
export const BASE = process.env.BUILD_URL || "http://127.0.0.1:3210";
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

export function chromiumCount() {
  let out = "";
  try {
    out = execFileSync("ps", ["-eo", "args"], { encoding: "utf8" });
  } catch {
    return 0;
  }
  return out
    .split("\n")
    .filter(
      (line) =>
        /(google-chrome|chromium)/.test(line) &&
        !/--type=/.test(line) &&
        new RegExp(`--remote-debugging-port=${CDP_PORT}`).test(line),
    )
    .length;
}

export function guardCount() {
  const n = chromiumCount();
  if (n > MAX_CHROMIUM) {
    throw new Error(`${n} Chrome instances running — over the ${MAX_CHROMIUM} guard; stop one first`);
  }
  return n;
}

export async function attach() {
  if (!(await cdpAlive())) {
    throw new Error(
      "no Chrome on CDP :9222 — start the automation Chrome " +
        "(profile ~/.config/google-chrome-automation, --remote-debugging-port=9222); this harness never launches one",
    );
  }
  return chromium.connectOverCDP(CDP_URL, { timeout: 10000 });
}

export async function assertOurs(browser) {
  // Use the browser's own CDP session. Some targets (blank/prerender pages) never
  // answer page.evaluate, and the UA we need is the browser's, not a tab's.
  const session = await browser.newBrowserCDPSession();
  try {
    const { userAgent } = await session.send("Browser.getVersion");
    if (/Headless/i.test(userAgent)) {
      throw new Error("the Chrome on :9222 is headless — that is not ours");
    }
    return userAgent;
  } finally {
    await session.detach();
  }
}

/** Find an existing tab by origin. Never creates one. */
export function findTab(browser, origin) {
  const pages = browser.contexts().flatMap((ctx) => ctx.pages());
  const page = pages.find((p) => {
    try {
      return new URL(p.url()).origin === origin;
    } catch {
      return false;
    }
  });
  if (!page) {
    throw new Error(
      `no existing tab for ${origin} — open it yourself; this harness never opens a tab`,
    );
  }
  return page;
}

export function tabUrls(browser) {
  return browser.contexts().flatMap((ctx) => ctx.pages()).map((p) => p.url());
}

export async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("ts-theme", t);
    document.documentElement.dataset.theme = t;
  }, theme);
}

export async function resize(page, width, height = 900) {
  return skillResize(page.context(), page, width, height);
}

export async function detach(browser) {
  return skillDetach(browser);
}

// Smoke check: node _lib.mjs — attach, prove ours, list tabs, guard unchanged, detach.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const before = guardCount();
  const browser = await attach();
  try {
    const ua = await assertOurs(browser);
    const pages = tabUrls(browser);
    console.log(`attached ${CDP_URL} — ours; UA has no Headless`);
    console.log(`UA: ${ua}`);
    console.log(`tabs (${pages.length}):`);
    for (const url of pages) console.log(`  ${url}`);
    const build = pages.find((u) => u.startsWith(BASE));
    const ref = pages.find((u) => u.startsWith(REF));
    console.log(`build tab: ${build ?? "MISSING"}`);
    console.log(`ref tab:   ${ref ?? "MISSING"}`);
    console.log(`chromium before: ${before}; after: ${chromiumCount()}`);
    if (!build || !ref) throw new Error("the build or reference tab is missing — open it yourself");
    if (chromiumCount() > before) throw new Error("a Chrome was launched during the smoke check");
  } finally {
    await detach(browser);
  }
}
