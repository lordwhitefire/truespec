// TASK-006 browser-check harness — attaches to the one visible Chrome on CDP :9222.
// It never launches a Chrome and never takes a screenshot. Surfaces only.
import http from "node:http";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

export const REF = process.env.REF_URL || "http://127.0.0.1:3211";
export const BASE = process.env.BUILD_URL || "http://127.0.0.1:3210";
export const MAX_CHROMIUM = 10;

function cdpAlive() {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:9222/json/version", (res) => {
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
        /--remote-debugging-port=9222/.test(line),
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
  return chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 10000 });
}

export async function assertOurs(browser) {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0];
  if (!page) throw new Error("no tab open on the automation Chrome — open the office yourself");
  const ua = await page.evaluate(() => navigator.userAgent);
  if (/Headless/i.test(ua)) throw new Error("the Chrome on :9222 is headless — that is not ours");
  return ua;
}

export async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("ts-theme", t);
    document.documentElement.dataset.theme = t;
  }, theme);
}

export async function resize(page, width, height = 900) {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 600,
  });
  return session;
}

export async function detach(browser) {
  try {
    await browser.close();
  } catch {
    /* detached already */
  }
}
