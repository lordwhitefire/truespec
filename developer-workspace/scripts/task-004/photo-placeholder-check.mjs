// TASK-004 task 18 — the photos, in a real browser, at both ends of truth 7.
//
//   1. a car page's photos really load: the address the server derived from a stored reference is a
//      real image, not a plausible-looking string;
//   2. when a photo's address cannot be fetched — a missing asset, or an unreachable store — the
//      surface shows the placeholder instead of a broken image, and the placeholder itself draws.
//
// Attach-only to the one visible Chrome on :9222 (never launches one), two tabs, role-first locators,
// no waitForTimeout (every wait is a condition), no screenshots, detach on exit.
//
//   node developer-workspace/scripts/task-004/photo-placeholder-check.mjs
import { attach, assertOurs, chromiumCount, detach, guardCount, twoTabs, CDP_URL, BASE } from "./_lib.mjs";

let failures = 0;
function ok(label, pass, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

const PROBE = "https://cdn.sanity.io/images/c2lc8g8n/production/this-asset-does-not-exist-1x1.jpg";

/** Force an image to fail exactly as a missing asset does: point it at bytes that are not there. */
async function breakAndWaitForPlaceholder(page, selector, label) {
  // Wait for the surface to be live first. A server-rendered <img> shows the broken-image icon on
  // its own; the swap is the *client* component reacting, so the node must be React's own before the
  // stimulus means anything. React marks the nodes it owns with a `__reactProps$…` key, and that is
  // the one signal that hydration has happened (the image being `complete` is not — it is already
  // true from the server's HTML).
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    },
    selector,
    { timeout: 20000 },
  );

  const before = await page.locator(selector).first().getAttribute("src");
  await page.locator(selector).first().evaluate((el, bad) => {
    el.src = bad;
  }, PROBE);

  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && el.getAttribute("src").startsWith("data:image/svg+xml");
    },
    selector,
    { timeout: 15000 },
  );
  // The data: address is only a stand-in — it has to actually decode and draw.
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && el.complete && el.naturalWidth > 0;
    },
    selector,
    { timeout: 15000 },
  );
  const after = await page.locator(selector).first().getAttribute("src");
  ok(
    `${label}: a photo that cannot be fetched becomes the drawn placeholder`,
    after.startsWith("data:image/svg+xml"),
    `${String(before).slice(0, 60)}… → ${String(after).slice(0, 34)}…`,
  );
}

const before = guardCount();
console.log(`chromium instances before: ${before} (guard 10)`);

const browser = await attach();
try {
  const ua = await assertOurs(browser);
  console.log(`attached to ${CDP_URL} — ours (UA has no Headless)`);
  const { b: page } = await twoTabs(browser);

  // --- the public car page ---------------------------------------------------------
  console.log("\nthe car page — the gallery's main photo");
  await page.goto(`${BASE}/car/TS-1001`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("img#gi", { state: "attached" });
  await page.waitForFunction(() => {
    const el = document.querySelector("img#gi");
    return !!el && el.complete && el.naturalWidth > 0;
  });

  const gallery = await page.locator("img#gi").first().evaluate((el) => ({
    src: el.getAttribute("src"),
    w: el.naturalWidth,
    h: el.naturalHeight,
  }));
  ok(
    "the car's photo loads from the address derived from its stored reference",
    gallery.src.startsWith("https://cdn.sanity.io/images/") && gallery.w > 0,
    `${gallery.w}×${gallery.h} · ${gallery.src.slice(0, 72)}…`,
  );
  ok("the column's raw reference is never what the browser fetches", !gallery.src.includes("image-"));
  await breakAndWaitForPlaceholder(page, "img#gi", "the car page");

  // --- the inventory card ----------------------------------------------------------
  console.log("\nthe inventory page — the first card's photo");
  await page.goto(`${BASE}/inventory`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".card .ph img", { state: "attached" });
  await page.waitForFunction(() => {
    const el = document.querySelector(".card .ph img");
    return !!el && el.complete && el.naturalWidth > 0;
  });
  const cards = await page.locator(".card .ph img").count();
  ok("the inventory's card photos load", cards > 0, `${cards} card photo(s) on the page`);
  await breakAndWaitForPlaceholder(page, ".card .ph img", "the inventory card");

  // Leave both tabs as they were (the forced failure is a stimulus, not a state to keep).
  await page.goto(`${BASE}/car/TS-1001`, { waitUntil: "domcontentloaded" });
} finally {
  await detach(browser);
}

const after = chromiumCount();
console.log(`\nno new Chrome launched (${before} → ${after})`);
if (after > before) failures++;
console.log(failures === 0 ? "PHOTO-PLACEHOLDER CHECK PASSED" : `PHOTO-PLACEHOLDER CHECK FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
