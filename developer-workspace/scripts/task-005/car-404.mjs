// TASK-005 plan Task 8 — a missing car answers a real 404, its view unchanged.
//
// The defect (task.md; findings `05-runtime-observations.md:467-479`): `/car/TS-9999` answered
// **200** while showing the car page's own "We could not find that car" view — so a dead car link
// looked healthy to a search engine, a link checker or a monitor, and the person was shown a "not
// found" page *served as a success*. The page now throws `notFound()` before the response streams
// (the mechanism Task 2's notes settled, §5) and the co-located boundary renders the same view.
//
// This reads, in a real browser: the status the browser itself received; the view's own words and
// structure; the chrome above and below it; the title; and that the URL still carries the ref the
// person typed. Then two neighbours, so the change is known not to have broken them: a car that is
// there, and the sold car (whose view shares the same shells the boundary now renders).
//
// Attach-only (never launches a Chrome), reads only, no writes, no screenshots.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, CDP_URL, twoTabs } from "./_lib.mjs";

const DEAD = "TS-9999";
const LIVE = "TS-1001";
const SOLD = "TS-1025";
const RUNS = new URL("./runs/car-404/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const r = { when: new Date().toISOString(), base: BASE, dead: DEAD, live: LIVE, sold: SOLD };
try {
  await assertOurs(browser);
  const { b: page } = await twoTabs(browser);

  const read = async (path) => {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    // The chrome is server-rendered; wait until React owns a node inside it, so the reading is of a
    // live page and not a half-executed one.
    await page.waitForFunction(
      () => {
        const h = document.querySelector("#site-header");
        if (!h) return false;
        const owned = (el) => Object.keys(el).some((k) => k.startsWith("__reactProps"));
        return owned(h) || [...h.querySelectorAll("*")].some(owned);
      },
      { timeout: 45000 },
    );
    const view = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      header: !!document.querySelector("#site-header"),
      footer: !!document.querySelector("#site-footer"),
      footerContact: !!document.querySelector("footer#contact"),
      crumbs: document.querySelector("#crumb")?.innerText.replace(/\s+/g, " ").trim() ?? null,
      h1: document.querySelector("#main h1")?.innerText.trim() ?? null,
      nfboxText: document.querySelector(".nfbox")?.innerText.replace(/\s+/g, " ").trim() ?? null,
      waysForward: [...document.querySelectorAll(".nfbox .row a")].map((a) => ({
        text: a.innerText.replace(/\s+/g, " ").trim(),
        href: a.getAttribute("href"),
      })),
      relatedHeading: document.querySelector("#rt")?.innerText.trim() ?? null,
      shells: {
        related: !!document.querySelector("section.rel"),
        mbar: !!document.querySelector("#mbar"),
        lightbox: !!document.querySelector("#lb"),
        overlay: !!document.querySelector("#ovl"),
        ptoast: !!document.querySelector("#ptoast"),
        stoast: !!document.querySelector("#stoast"),
      },
      bodyTextStartsWith: document.body.innerText.replace(/\s+/g, " ").trim().slice(0, 120),
    }));
    return { status: response?.status() ?? null, ...view };
  };

  r.readings = {
    live: await read(`/car/${LIVE}`),
    dead: await read(`/car/${DEAD}`),
    sold: await read(`/car/${SOLD}`),
  };

  const d = r.readings.dead;
  const l = r.readings.live;
  const s = r.readings.sold;
  r.verdict = {
    theDeadRefWasServed404: d.status === 404,
    theLiveCarStillServed200: l.status === 200,
    theSoldCarStillServed200: s.status === 200,
    theViewIsTheCarsOwn:
      d.h1 === "We could not find that car" &&
      d.crumbs === "Home Not found" &&
      (d.nfboxText ?? "").includes("That car may have sold, or the link is old."),
    theWaysForwardAreThere:
      d.waysForward.some((a) => a.text.includes("Message Umar") && String(a.href).startsWith("https://wa.me/")) &&
      d.waysForward.some((a) => a.text.includes("See all cars") && a.href === "/#cars"),
    theChromeStayed: d.header && d.footer && d.footerContact,
    theShellsStayed:
      d.shells.related && d.shells.mbar && d.shells.lightbox && d.shells.overlay && d.shells.ptoast && d.shells.stoast &&
      d.relatedHeading === "More cars",
    theUrlKeepsTheRef: d.url === `${BASE}/car/${DEAD}`,
    theTitleNamesIt: d.title === "Car not found | TrueSpec Automotive",
    theSoldViewUnchanged: s.h1 === "That one found a new owner" && s.shells.related && s.shells.mbar,
  };
  writeFileSync(`${RUNS}live.json`, JSON.stringify(r, null, 2));

  console.log(`live car:  ${l.status} · “${l.title}”`);
  console.log(`dead ref:  ${d.status} · “${d.title}”`);
  console.log(`  crumbs: ${d.crumbs}`);
  console.log(`  h1:     ${d.h1}`);
  console.log(`  ways:   ${d.waysForward.map((a) => `${a.text} → ${a.href}`).join(" · ")}`);
  console.log(`  chrome: header=${d.header} footer=${d.footer} · shells related=${d.shells.related} mbar=${d.shells.mbar} lb=${d.shells.lightbox} · “${d.relatedHeading}”`);
  console.log(`  url:    ${d.url}`);
  console.log(`sold car:  ${s.status} · “${s.h1}”`);
  console.log(`\nverdict: ${JSON.stringify(r.verdict, null, 1)}`);
  const bad = Object.entries(r.verdict).filter(([, v]) => !v);
  if (bad.length) throw new Error(`unmet: ${bad.map(([k]) => k).join(", ")}`);

  // Leave the tab where the photo check left it (the build's own car page).
  await page.goto(`${BASE}/car/${LIVE}`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
} finally {
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
