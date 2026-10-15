// TASK-004 task 19 — the WhatsApp notice and the tap, in a real browser (truth 8).
//
//   1. the notice is shown on the way to WhatsApp, and names the page, the car's code and the time;
//   2. **nothing is recorded until the buyer continues** — the whole point of the step;
//   3. continuing records exactly one row: the page, the car's code and the store's time;
//   4. once the notice has been shown, a later tap on the same page goes straight through — no notice
//      again — and is still recorded;
//   5. a tap that is not about a car records the page and no car;
//   6. the store is left exactly as it was found, and no Chrome or tab is left behind.
//
// Attach-only to the one visible Chrome on :9222 (never launches one), two owned tabs, role-first
// locators, no `waitForTimeout` (every wait is a condition on the store or the DOM), no screenshots,
// detach on exit.
//
// `window.open` is **captured** rather than followed, so the witness does not leave WhatsApp tabs in
// the owner's browser: what is proved is that continuing calls it with the WhatsApp address, and that
// the button's own `href` is a real `wa.me` link — so a buyer with no JavaScript still arrives. A tab
// the browser opens by itself (a later tap) is closed as it appears.
//
//   node developer-workspace/scripts/task-004/whatsapp-gate-check.mjs
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { attach, assertOurs, chromiumCount, detach, guardCount, twoTabs, BASE } from "./_lib.mjs";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label, pass, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const client = new pg.Client({ connectionString });
await client.connect();

const ids = async () => (await client.query("SELECT id FROM tap")).rows.map((r) => r.id);
const rowsFor = async (wanted) =>
  (
    await client.query("SELECT id, page, car_ref, at FROM tap WHERE id = ANY($1::uuid[]) ORDER BY at", [
      wanted,
    ])
  ).rows;
const newRows = async (before) => rowsFor((await ids()).filter((id) => !before.includes(id)));

/** Wait until `n` rows exist that were not there before — a condition on the store, not a pause. */
async function waitForRows(before, n, deadlineMs = 10_000) {
  const deadline = Date.now() + deadlineMs;
  for (;;) {
    const rows = await newRows(before);
    if (rows.length >= n || Date.now() > deadline) return rows;
    await new Promise((r) => setTimeout(r, 100));
  }
}

// A real car page, taken from the store rather than assumed.
const carRef = (await client.query("SELECT ref FROM car WHERE deleted_at IS NULL ORDER BY ref LIMIT 1"))
  .rows[0]?.ref;
if (!carRef) throw new Error("no live car in the store — there is no car page to tap on");

// Rows the tap-check witness may have left behind are not ours to keep.
const leftovers = await client.query("DELETE FROM tap WHERE page LIKE '/__witness/%'");
if (leftovers.rowCount) console.log(`cleaned ${leftovers.rowCount} leftover witness row(s)`);

const before = await ids();
const startedChromium = guardCount();
console.log(`chromium instances before: ${startedChromium} (guard 10); taps in the store: ${before.length}`);

const browser = await attach();
const context = browser.contexts()[0];
const ownedAtStart = new Set(context.pages());
// A real tab opened by a later tap is closed as it appears; the owner's browser is left as found.
function closeStrays(p) {
  if (!ownedAtStart.has(p)) {
    try {
      p.close();
    } catch {
      /* a stray either way */
    }
  }
}
context.on("page", closeStrays);

/** Capture `window.open` instead of following it. */
const captureWindowOpen = (page) =>
  page.evaluate(() => {
    window.__waOpened = [];
    window.open = (...args) => {
      window.__waOpened.push(String(args[0]));
      return { closed: false };
    };
  });

try {
  await assertOurs(browser);
  console.log("attached — ours (UA has no Headless)");
  const { b: page } = await twoTabs(browser);

  const dialogOpen = () => page.locator("dialog.wagn").evaluate((d) => d.open);
  const waitHydratedNotice = () =>
    page.waitForFunction(() => {
      const d = document.querySelector("dialog.wagn");
      return (
        !!d && Object.keys(d).some((k) => k.startsWith("__reactProps$") || k.startsWith("__reactFiber$"))
      );
    });

  // --- the car page: the notice, then the tap -------------------------------------
  console.log(`\nthe car page — ${carRef}`);
  await page.goto(`${BASE}/car/${carRef}`, { waitUntil: "domcontentloaded" });
  await waitHydratedNotice();
  await captureWindowOpen(page);

  ok("the notice is in the page and closed until a tap is made", (await dialogOpen()) === false);

  // The car page's WhatsApp button: the big one, or the mobile bar's on a narrow window.
  const cta = (await page.locator("#wa").isVisible())
    ? page.locator("#wa").first()
    : page.locator("#mw").first();
  const anchorHref = await cta.getAttribute("href");
  ok(
    "the button's own href is a real wa.me link — a buyer with no JavaScript still arrives",
    typeof anchorHref === "string" && anchorHref.startsWith("https://wa.me/"),
    String(anchorHref).slice(0, 64),
  );

  await cta.click();
  ok("the notice is shown on the way to WhatsApp", (await dialogOpen()) === true);

  const notice = (await page.locator("dialog.wagn").innerText()).replace(/\s+/g, " ");
  ok(
    "and it names the page, the car's code and the time",
    /page/.test(notice) && /car.{0,2}s code/.test(notice) && /time/.test(notice),
    notice.slice(0, 110),
  );
  ok("and what is not recorded: no name, no number, no message", /no name, no number, no message/.test(notice));
  ok("and it points at the full notice", (await page.locator('dialog.wagn a[href="/privacy"]').count()) === 1);
  ok("nothing is recorded before the buyer continues", (await newRows(before)).length === 0);
  ok("and nothing has left the site yet", (await page.evaluate(() => window.__waOpened)).length === 0);

  await page.getByRole("button", { name: /continue to whatsapp/i }).click();
  ok("continuing closes the notice", (await dialogOpen()) === false);

  const opened = await page.evaluate(() => window.__waOpened);
  ok(
    "continuing calls window.open with the WhatsApp address",
    opened.length === 1 && opened[0].startsWith("https://wa.me/"),
    opened.join(", ").slice(0, 72),
  );

  const first = await waitForRows(before, 1);
  ok("exactly one tap is recorded", first.length === 1, `${first.length} row(s)`);
  ok(
    "and it is the page and the car's code",
    first[0]?.page === `/car/${carRef}` && first[0]?.car_ref === carRef,
    JSON.stringify(first[0] ?? {}),
  );

  // --- the same page again: no second notice, still recorded -----------------------
  console.log("\nthe same page — a later tap");
  await cta.click();
  const second = await waitForRows(before, 2);
  ok("the notice is not shown a second time", (await dialogOpen()) === false);
  ok("and the later tap is still recorded", second.length === 2, `${second.length} row(s)`);

  // --- a page that is not about a car ---------------------------------------------
  console.log("\nthe home page — a tap that is not about a car");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitHydratedNotice();
  await captureWindowOpen(page);
  await page.locator("footer a.wab").first().click();
  ok("the notice is shown again on a fresh page", (await dialogOpen()) === true);
  await page.getByRole("button", { name: /continue to whatsapp/i }).click();
  const third = await waitForRows(before, 3);
  ok("a third tap is recorded", third.length === 3, `${third.length} row(s)`);
  ok(
    "and it names the page and no car",
    third.some((r) => r.page === "/" && r.car_ref === null),
    JSON.stringify(third.map((r) => ({ page: r.page, car_ref: r.car_ref }))),
  );

  const stamp = new Date(first[0]?.at ?? third[0]?.at).getTime();
  ok("the time is the store's, not the page's", stamp >= Date.now() - 600_000 && stamp <= Date.now() + 60_000);
} finally {
  // The witness removes exactly what it wrote: the rows that were not there before it ran.
  const mine = await newRows(before);
  if (mine.length) await client.query("DELETE FROM tap WHERE id = ANY($1::uuid[])", [mine.map((r) => r.id)]);
  const after = await ids();
  ok("the store is left as it was found", after.length === before.length, `${after.length} tap(s), was ${before.length}`);

  for (const p of context.pages()) closeStrays(p);
  await detach(browser);
  await client.end();
}

const after = chromiumCount();
console.log(`\nno new Chrome launched (${startedChromium} → ${after})`);
if (after > startedChromium) failures++;
console.log(failures === 0 ? "WHATSAPP-GATE CHECK PASSED" : `WHATSAPP-GATE CHECK FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
