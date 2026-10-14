// TASK-004 resilience probe — the browser half of the store-wait witness.
//
// Follows `developer-workspace/procedures/browser-check.md` as written: ATTACH to the automation
// Chrome on CDP :9222 (never launch), prove it is ours, keep real browser processes from going up,
// role-first locators, no `waitForTimeout`, `waitUntil: "domcontentloaded"`, no screenshots, detach
// on exit.
//
// The state under test is a store that cannot answer. There is no reference to compare against — the
// static reference site has no database — so this is the build-vs-build case section 7 allows:
//   tab B = the build on an unreachable store (:3213)
//   tab A = the same build on the live store   (:3210, started after the B checks)
// and the facts compared are: did the wait appear, did a retryable state follow, did the warm build
// stay unaffected.
import { writeFileSync, mkdirSync } from "node:fs";
import { attach, assertOurs, guardCount, chromiumCount, detach } from "./_lib.mjs";

const COLD = process.env.COLD_URL || "http://127.0.0.1:3213";
const WARM = process.env.WARM_URL || "http://127.0.0.1:3210";
// The two dev servers cannot share `.next`, so they are never up at once; run `cold` and `warm`
// separately and the artefacts are written side by side.
const MODE = process.argv[2] || "both";

const RUN_DIR = new URL("./runs/store-wait/", import.meta.url);

/** One state, on one base, read by role. No sleeping: every wait is an element assertion. */
async function probe(page, base, path, what) {
  const facts = {
    what,
    url: `${base}${path}`,
    waitShown: false,
    waitAtMs: null,
    retryShown: false,
    retryAtMs: null,
    retryText: null,
    tryAgainButton: false,
    waitCleared: false,
    alertCount: null,
    finalUrl: null,
    navError: null,
  };
  const started = Date.now();

  const nav = page
    .goto(facts.url, { waitUntil: "domcontentloaded", timeout: 90_000 })
    .catch((err) => {
      facts.navError = String(err).split("\n")[0].slice(0, 160);
      return null;
    });

  // 1. The wait must be visible WHILE the server is still rendering — i.e. long before the response
  //    finishes. This is the fact the earlier (broken) witness could not establish.
  //    Located by its own text: `getByRole` alone is not strict-mode safe here, because Next's dev
  //    overlay also carries a role.
  try {
    await page.getByText("Just a moment", { exact: false }).waitFor({ state: "visible", timeout: 30_000 });
    facts.waitShown = true;
    facts.waitAtMs = Date.now() - started;
  } catch {
    facts.waitShown = false;
  }

  await nav;

  // 2. Every attempt fails, so a retryable state must follow — with the action that recovers it.
  try {
    await page
      .getByText(/We couldn.t load this/)
      .waitFor({ state: "visible", timeout: 60_000 });
    facts.retryShown = true;
    facts.retryAtMs = Date.now() - started;
    facts.retryText = (await page.getByText(/We couldn.t load this/).first().innerText())
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);
  } catch {
    facts.retryShown = false;
  }

  facts.alertCount = await page.getByRole("alert").count();
  facts.tryAgainButton = (await page.getByRole("button", { name: "Try again" }).count()) > 0;
  // The wait must have given way to the outcome, not sat there forever.
  facts.waitCleared = !(await page.getByText("Just a moment", { exact: false }).isVisible().catch(() => false));
  facts.finalUrl = page.url();
  return facts;
}

/** The warm build: the ordinary path, which must be untouched by any of this. */
async function probeWarm(page, base, path) {
  const facts = { what: "warm (live store)", url: `${base}${path}`, waitShown: false, retryShown: false, finalUrl: null, bodyLength: 0, carCards: 0 };
  const started = Date.now();
  await page.goto(facts.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  facts.waitShown = (await page.getByRole("status").count()) > 0;
  facts.retryShown = (await page.getByRole("alert").count()) > 0;
  facts.finalUrl = page.url();
  facts.bodyLength = (await page.locator("body").innerText()).length;
  // Real car cards, so "it loaded" means real content and not an empty shell. Counted by the card
  // link's href — the ref is in the URL, not in the card's visible text (an earlier version of this
  // probe looked for the ref as text and reported a false negative).
  facts.carCards = await page.locator('a.card[href^="/car/"]').count();
  facts.atMs = Date.now() - started;
  return facts;
}

const browser = await attach();
const before = guardCount();
try {
  const ua = await assertOurs(browser);
  console.log(`attached to :9222 — ours (UA has no Headless): ${/Headless/i.test(ua) ? "HEADLESS!" : "ok"}`);
  console.log(`chromium before: ${before} (guard 10)\n`);

  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const a = pages[0] || (await ctx.newPage());
  const b = pages[1] || (await ctx.newPage());

  const results = [];

  // --- tab B: the unreachable store -------------------------------------
  if (MODE === "cold" || MODE === "both" || MODE === "coldoffice") {
    if (MODE !== "coldoffice") {
      const coldPublic = await probe(b, COLD, "/", "cold public");
      results.push(coldPublic);
    }
    // The office is only reachable with a session, and the session cookie is scoped to the host it
    // was signed in on. COLD_OFFICE_URL lets the same cold build be probed on that host.
    const officeUrl = process.env.COLD_OFFICE_URL || `${COLD}/office`;
    const coldOffice = await probe(b, "", officeUrl, "cold office");
    results.push(coldOffice);
  }

  // --- tab A: the live store (started separately) -----------------------
  if (MODE === "warm" || MODE === "both") {
    try {
      const warm = await probeWarm(a, WARM, "/");
      results.push(warm);
    } catch (err) {
      results.push({
        what: "warm (live store)",
        url: `${WARM}/`,
        error: String(err).split("\n")[0].slice(0, 160),
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));

  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(new URL(`surface-probe.${MODE}.json`, RUN_DIR), JSON.stringify(results, null, 2) + "\n");
  writeFileSync(
    new URL(`surface-probe.${MODE}.txt`, RUN_DIR),
    results
      .map((r) =>
        Object.entries(r)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n"),
      )
      .join("\n\n") + "\n",
  );
  console.log(`\nartefacts written under runs/store-wait/ (mode ${MODE})`);

  const after = chromiumCount();
  if (after > before) throw new Error(`a Chrome was launched (${before} → ${after})`);
  console.log(`no new Chrome launched (${before} → ${after})`);
} finally {
  await detach(browser);
  console.log("detached — tabs left open");
}
