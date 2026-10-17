// Diagnostic for the car form's hydration: is the page merely late, or is hydration failing?
//
// A click sent before React hydrates falls through to the browser's own form submission — a GET that
// rewrites the url with every field in it (that is what the first drive's readings show). This probe
// separates the two causes: it records the console and page errors while the car page loads, then
// watches for a client-only signal, then tries the save and reports whether the click was handled.
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const REF = "TS-1001";
const before = guardCount();
const browser = await attach();
let page = null;
let opened = false;
let resized = false;
try {
  await assertOurs(browser);
  const found = await signedInPage(browser, BASE);
  page = found.page;
  opened = found.opened;
  if (!page) throw new Error("no signed-in office tab");
  await resize(page.context(), page, 1440, 900);
  resized = true;

  const console_ = [];
  const errors = [];
  page.on("console", (m) => console_.push(`${m.type()}: ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 400)));

  const t0 = Date.now();
  await page.goto(`${BASE}/office/car/${REF}`, { waitUntil: "domcontentloaded", timeout: 45000 });

  const signals = [];
  for (let i = 0; i < 40; i++) {
    const s = await page.evaluate(() => ({
      ready: document.readyState,
      portal: document.querySelectorAll("nextjs-portal").length,
      next: typeof window.next,
      scripts: document.querySelectorAll("script[src]").length,
      save: !!document.querySelector("#save"),
    }));
    signals.push({ ms: Date.now() - t0, ...s });
    if (s.portal > 0 || s.next !== "undefined") break;
    await page.waitForTimeout(250);
  }

  const urlBefore = page.url();
  const posts = [];
  page.on("response", (r) => {
    if (r.request().method() === "POST") posts.push(r.status());
  });
  await page.locator("#save").click();
  await page.waitForTimeout(2500);
  const urlAfter = page.url();
  const state = await page.evaluate(() => {
    const form = document.querySelector("#save")?.closest("form");
    const el = form?.querySelector('div[role="status"]');
    return {
      panel: el ? el.innerText.trim() : null,
      toast: (document.querySelector("#tmsg")?.innerText || "").trim(),
      alert: document.querySelector('main.main div[role="alert"]')?.innerText.trim().slice(0, 160) ?? null,
    };
  });

  console.log(
    JSON.stringify(
      {
        signals,
        hydratedBy: signals.find((s) => s.portal > 0 || s.next !== "undefined")?.ms ?? null,
        clickHandled: urlAfter === urlBefore,
        urlBefore,
        urlAfter: urlAfter.slice(0, 120),
        posts,
        state,
        console: console_.slice(-12),
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  if (resized && page) await clearResize(page).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after}`);
  await detach(browser);
}
