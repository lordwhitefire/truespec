// TASK-004 / plan Task 33b — read the office as the owner sees it.
//
// The office is behind the Clerk door, and the session cookie lives ONLY in the browser: a
// server-side `fetch` cannot present it, so `scripts/reconcile.ts` used to read the sign-in page and
// report every office figure as "?". This module reads the office the way the standing procedure
// (`developer-workspace/procedures/browser-check.md`) says: attach to the Chrome already on CDP
// :9222 — never launch one, never headless, ≤10 chromium — reuse the signed-in tab (or one more
// page in the same context, which shares the cookies), read the DOM, and detach. It takes no
// screenshots and never closes the owner's tabs.
//
// The host matters: cookies are host-scoped, so the pages are driven on the SAME host the owner
// signed in on (the harness default, http://127.0.0.1:3210). Driving `localhost` when the cookie
// belongs to `127.0.0.1` would land on the door again.
import { pathToFileURL } from "node:url";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount } from "./_lib.mjs";

// Same proof the flows witness uses: a real office shell (a sidebar and a topbar), not the door.
const SESSION_PROBE = () => {
  const hasSide = !!document.querySelector("aside.side");
  const topbar = !!document.querySelector("header.topbar");
  const door = !!document.querySelector("main.office-door");
  const signedAs = (document.querySelector(".sfoot b")?.innerText || "").trim();
  return { url: location.href, hasSide, topbar, door, signedAs, signedIn: hasSide && topbar && !door };
};

// Prefer a tab the owner already has open and signed in; otherwise open one more page in the same
// context (same cookies). Returns `{ page, opened }` — `opened` means we must close it on the way out.
// Exported for other witnesses (`tap-notice-check.mjs`) so the signed-in-tab rule lives in one place.
export async function signedInPage(browser, base) {
  for (const ctx of browser.contexts()) {
    for (const p of ctx.pages()) {
      try {
        if (/\/office/.test(p.url()) && (await p.evaluate(SESSION_PROBE)).signedIn) {
          return { page: p, opened: false };
        }
      } catch {}
    }
  }
  const ctx = browser.contexts()[0];
  if (!ctx) return { page: null, opened: false };
  const p = await ctx.newPage();
  try {
    await p.goto(`${base}/office`, { waitUntil: "domcontentloaded", timeout: 45000 });
    if ((await p.evaluate(SESSION_PROBE)).signedIn) return { page: p, opened: true };
    await p.close();
    return { page: null, opened: false };
  } catch (err) {
    try {
      await p.close();
    } catch {}
    return { page: null, opened: false, error: String(err) };
  }
}

/**
 * Read the given office paths from the signed-in browser, in order. Returns
 * `{ html: { [path]: string }, proof, signedAs }`. Throws (never guesses) if there is no
 * signed-in tab, if a path lands on the door, or if a Chrome was launched.
 */
export async function readOfficePages(paths, { base = BASE } = {}) {
  if (!Array.isArray(paths) || paths.length === 0) return { html: {}, proof: {}, signedAs: null };
  const before = guardCount();
  const browser = await attach();
  let page = null;
  let opened = false;
  try {
    await assertOurs(browser);
    const found = await signedInPage(browser, base);
    page = found.page;
    opened = found.opened;
    if (!page) {
      throw new Error(
        `no signed-in office tab in the Chrome on :9222 — sign in at ${base}/office in the browser ` +
          `first (the Clerk session cookie lives in the browser, so a server-side fetch cannot read ` +
          `the office)` +
          (found.error ? ` (last try: ${found.error})` : ""),
      );
    }
    const html = {};
    const proof = {};
    for (const path of paths) {
      await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      const s = await page.evaluate(SESSION_PROBE);
      if (!s.signedIn) {
        throw new Error(`${path} landed on the door, not the office (${s.url}) — the session is not valid`);
      }
      html[path] = await page.content();
      proof[path] = s;
    }
    const after = chromiumCount();
    if (after > before) throw new Error(`a Chrome was launched (${before} → ${after}) — the guard failed`);
    return { html, proof, signedAs: proof[paths[0]]?.signedAs ?? null };
  } finally {
    if (opened && page) {
      try {
        await page.close();
      } catch {}
    }
    await detach(browser);
  }
}

// `node _office-browser.mjs` — smoke check: prove a signed-in office tab is readable and print how
// many bytes each page gave.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { html, signedAs } = await readOfficePages(["/office", "/office/inventory"]);
  const who = (signedAs ?? "").replace(/^signed in as\s*/i, "");
  console.log(`office read through the browser on ${BASE} — signed in as ${who || "(unknown)"}`);
  for (const [path, body] of Object.entries(html)) console.log(`  ${path}: ${body.length} bytes`);
}
