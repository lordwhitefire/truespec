// TASK-004 — the door surface, checked in a real browser per the project's standing
// procedure (`developer-workspace/procedures/browser-check.md`).
//
// Surfaces only. Attach-only Chrome on CDP :9222 — this never launches one. No
// screenshots. It puts the door in each cell of the office matrix (4 widths x 2 themes)
// and prints the SAME named facts for the reference's owner sign-in screen and the
// build's new door, side by side, then walks every office route on the build to record
// where it actually lands.
//
// The one fact that carries the requirement: `appOwnPasswordInputs` — password fields
// OUTSIDE the provider's component. The provider mounts its own sign-in into the light
// DOM, so ancestry (are you inside [data-clerk-component]?) is how runtime tells the
// provider's form from the application's. The build must have none of its own; the
// reference has three (it builds its own).
//
// What it deliberately does NOT do: sign in. That needs the owner's account, which is
// Checkpoint A's remaining item.
//
// Run:  node developer-workspace/scripts/task-004/door-probe.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  REF,
  BASE,
  attach,
  assertOurs,
  detach,
  guardCount,
  chromiumCount,
  twoTabs,
  resize,
} from "./_lib.mjs";

const WIDTHS = [1440, 820, 560, 390];
const THEMES = ["dark", "light"];

// The reference's office door. `/office/login.html` on the reference server is a 0-byte
// file; the populated owner sign-in screen is `/login.html` (title "Owner sign in |
// TrueSpec Automotive") — checked with curl before being used, not assumed.
const REF_DOOR = `${REF}/login.html`;
const BUILD_DOOR = `${BASE}/office/sign-in`;

const OFFICE_ROUTES = [
  "/office",
  "/office/inventory",
  "/office/activity",
  "/office/enquiries",
  "/office/settings",
  "/office/car",
  "/office/car/new",
];

const OUT = "developer-workspace/scripts/task-004/runs/door";

/**
 * The same named facts, gathered identically from either page. Surfaces only.
 *
 * `appOwnPasswordInputs` is the one that carries the requirement: password fields not
 * inside the provider's own component. The provider mounts into the light DOM, so
 * ancestry is the discriminator (see the header).
 */
const FACTS = () => {
  const text = (document.body && document.body.innerText) || "";
  const provider = document.querySelector("[data-clerk-component]");
  const inProvider = (el) => !!(provider && provider.contains(el));
  const pw = [...document.querySelectorAll('input[type="password"]')];
  const all = [...document.querySelectorAll("input")];
  return {
    urlAfterLoad: location.pathname + location.search,
    title: document.title,
    theme: document.documentElement.dataset.theme || "(none)",
    width: window.innerWidth,
    providerMounted: !!provider,
    providerComponents: [...document.querySelectorAll("[data-clerk-component]")].map((e) =>
      e.getAttribute("data-clerk-component"),
    ),
    appOwnPasswordInputs: pw.filter((e) => !inProvider(e)).length,
    providerPasswordInputs: pw.filter(inProvider).length,
    appOwnInputTypes: all.filter((e) => !inProvider(e)).map((i) => i.type),
    providerInputTypes: all.filter((e) => inProvider(e)).map((i) => i.type),
    accountLinks: [...document.querySelectorAll("a")]
      .filter((el) =>
        /sign\s*up|create (an )?account|register/i.test(
          (el.textContent || "") + " " + (el.getAttribute("href") || ""),
        ),
      )
      .map((el) => ({
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
        href: el.getAttribute("href") || "",
      })),
    mentionsSignUp: /sign\s*up|create (an )?account|register/i.test(text),
    mentionsInvite: /invit/i.test(text),
    hasOfficeChrome: !!document.querySelector(".shell, .side") || /Signed in as/i.test(text),
    bodyTextHead: text.replace(/\s+/g, " ").trim().slice(0, 220),
  };
};

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
}

/**
 * Navigate as the procedure says (`domcontentloaded`), then wait for the page's mount
 * point to settle — the provider's component *with content rendered* on the build, the
 * server-rendered form on the reference. A state condition, never a sleep.
 */
async function go(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page
    .waitForFunction(
      () => {
        const p = document.querySelector("[data-clerk-component]");
        if (p) return (p.innerText || "").trim().length > 0;
        return !!document.querySelector("form input, input");
      },
      null,
      { timeout: 20000 },
    )
    .catch(() => {});
}

function fmt(f) {
  return [
    `url                = ${f.urlAfterLoad}`,
    `title              = ${f.title}`,
    `theme / width      = ${f.theme} / ${f.width}`,
    `provider mounted   = ${f.providerMounted} ${JSON.stringify(f.providerComponents)}`,
    `APP OWN password   = ${f.appOwnPasswordInputs}   (outside the provider)`,
    `provider password  = ${f.providerPasswordInputs}`,
    `app own inputs     = ${f.appOwnInputTypes.join(", ") || "(none)"}`,
    `provider inputs    = ${f.providerInputTypes.join(", ") || "(none)"}`,
    `mentions signup    = ${f.mentionsSignUp}`,
    `mentions invite    = ${f.mentionsInvite}`,
    `account links      = ${f.accountLinks.length ? JSON.stringify(f.accountLinks) : "(none)"}`,
    `office chrome      = ${f.hasOfficeChrome}`,
    `body head          = ${f.bodyTextHead}`,
  ].join("\n");
}

/**
 * The compare report (procedure section 6). Ref and build are compared WITHIN each cell
 * — that is what "the same state" means — so theme and width are expected to match in
 * every cell, not to differ. A fact is SAME if ref equals build in every cell; DIFF if it
 * differs in any cell, naming the cells.
 */
function compare(cells, keys) {
  const lines = ["# door — ref vs build, per named fact (same state within each cell)", ""];
  for (const key of keys) {
    const diffs = [];
    for (const c of cells) {
      const rv = JSON.stringify(c.ref[key]);
      const bv = JSON.stringify(c.build[key]);
      if (rv !== bv) diffs.push({ cell: c.cell, ref: rv, build: bv });
    }
    if (diffs.length === 0) {
      const vals = [...new Set(cells.map((c) => JSON.stringify(c.ref[key])))];
      lines.push(`== SAME  ${key}   (ref equals build in all ${cells.length} cells)`);
      lines.push(
        vals.length === 1
          ? `   both  : ${vals[0].slice(0, 200)}`
          : `   per-cell value differs by design; ref==build in each: ${vals.join(" | ").slice(0, 200)}`,
      );
    } else {
      lines.push(`!= DIFF  ${key}   (${diffs.length}/8 cells)`);
      const uniq = (side) => [...new Set(diffs.map((d) => d[side]))];
      lines.push(`   ref   : ${uniq("ref").join(" | ").slice(0, 200)}`);
      lines.push(`   build : ${uniq("build").join(" | ").slice(0, 200)}`);
      lines.push(`   cells : ${diffs.map((d) => d.cell).join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main() {
  const before = guardCount();
  const log = [];
  const p = (s = "") => {
    console.log(s);
    log.push(s);
  };

  p(`# TASK-004 browser check — the door (surfaces only)`);
  p(`ref   = ${REF_DOOR}`);
  p(`build = ${BUILD_DOOR}`);
  p(`chromium instances before: ${before} (guard 10)`);
  p();

  const browser = await attach();
  try {
    const ua = await assertOurs(browser);
    if (/Headless/i.test(ua)) throw new Error("headless chrome is not ours");
    p(`attached to CDP — ours (UA has no Headless)`);
    const { ctx, a, b } = await twoTabs(browser);
    p(`tab A (reference) = ${a.url()}`);
    p(`tab B (build)     = ${b.url()}`);
    p();

    const cells = [];
    for (const width of WIDTHS) {
      for (const theme of THEMES) {
        const name = `${width}x${theme}`;
        await resize(ctx, a, width, 900);
        await resize(ctx, b, width, 900);
        await go(a, REF_DOOR);
        await go(b, BUILD_DOOR);
        await setTheme(a, theme);
        await setTheme(b, theme);
        const ref = await a.evaluate(FACTS);
        const build = await b.evaluate(FACTS);
        cells.push({ cell: name, ref, build });

        p(`--- cell ${name} ---`);
        p(`[ref ] ${fmt(ref)}`);
        p(`[build] ${fmt(build)}`);
        p();
      }
    }

    // The refusal surface: where every office route actually lands, in the browser.
    p(`# office routes, in the browser, with no session`);
    const refusals = [];
    await resize(ctx, b, 1440, 900);
    for (const route of OFFICE_ROUTES) {
      await go(b, `${BASE}${route}`);
      const f = await b.evaluate(FACTS);
      const landed = f.urlAfterLoad;
      const refused = landed === "/office/sign-in";
      const leakedOffice = f.hasOfficeChrome;
      refusals.push({ route, landed, refused, leakedOffice, bodyTextHead: f.bodyTextHead });
      p(
        `${refused ? "PASS" : "FAIL"}  ${route} -> ${landed}` +
          `${leakedOffice ? "  !! office chrome present" : ""}`,
      );
    }
    p();

    const after = chromiumCount();
    p(`chromium instances after: ${after} (before ${before}) — ${after <= before ? "no Chrome launched" : "A CHROME WAS LAUNCHED"}`);
    if (after > before) throw new Error(`a Chrome was launched (${before} -> ${after})`);

    // Leave the tabs where the human expects them, then write everything.
    await go(a, REF_DOOR);
    await go(b, BUILD_DOOR);

    mkdirSync(OUT, { recursive: true });
    const keys = Object.keys(cells[0].ref);
    writeFileSync(
      `${OUT}/surface-probe.json`,
      JSON.stringify({ ua, refDoor: REF_DOOR, buildDoor: BUILD_DOOR, cells, refusals, guard: { before, after } }, null, 2),
    );
    writeFileSync(`${OUT}/surface-probe.txt`, log.join("\n"));
    writeFileSync(`${OUT}/compare-report.txt`, compare(cells, keys));
    p(`artefacts: ${OUT}/surface-probe.{txt,json}, ${OUT}/compare-report.txt`);
  } finally {
    await detach(browser);
    p(`detached — the Chrome window and its tabs stay open`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
