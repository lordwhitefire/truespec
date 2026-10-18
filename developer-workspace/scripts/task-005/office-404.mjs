// TASK-005 plan Task 9 — a mistyped office address lands in the office.
//
// The defect (task.md): "A missing car answers HTTP 200. An unknown `/office/…` falls into the
// showroom's 404." The office now answers in its own words, inside its own shell (design I28, the
// approved copy sheet's office not-found row), with a real status:
//   - `/office/nonsense` and `/office/car/nonsense-ref` — a **404** for the signed-in owner, the
//     office view and the office chrome around it (the catch-all route + the shell's boundary; the
//     office `loading.tsx` whose first flush would pin the status to 200 is gone — Task 9's move,
//     mirroring Task 8a).
//   - the site-wide not-found is **not merged** with it: the showroom's unknown paths keep the
//     chrome-less view with its three ways out.
//   - the neighbours still work: the dashboard, the inventory, the car list's own redirect, and a
//     real car editor.
//
// Attach-only (never launches a Chrome), reads only, no writes, no screenshots.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/office-404/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const r = { when: new Date().toISOString(), base: BASE };
try {
  await assertOurs(browser);
  const { b: page } = await twoTabs(browser);

  const read = async (path) => {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    // Wait for a React-owned office node — either the shell or the not-found view inside it — so the
    // reading is of a live page and not a half-executed one. The site-wide not-found (`.nfbox`) is a
    // target too: its own page is deliberately chrome-less. (The options object must be the third
    // argument — a dev server's first cold bundle can take longer than the 30 s default.)
    await page.waitForFunction(
      () => {
        const target =
          document.querySelector(".nfx") || document.querySelector(".shell") || document.querySelector(".nfbox");
        if (!target) return false;
        const owned = (el) => Object.keys(el).some((k) => k.startsWith("__reactProps"));
        return owned(target) || [...target.querySelectorAll("*")].some(owned);
      },
      null,
      { timeout: 90000 },
    );
    const view = await page.evaluate(() => {
      // `textContent`, not `innerText`: the office's Oswald headings are uppercased by CSS
      // (`text-transform`), and the check is against the words themselves, not the styling.
      const norm = (el) => el?.textContent?.replace(/\s+/g, " ").trim() ?? null;
      return {
        url: location.href,
        title: document.title,
        shell: !!document.querySelector(".shell"),
        side: !!document.querySelector(".side"),
        main: !!document.querySelector(".main"),
        signedInAs: document.querySelector(".sfoot b")?.innerText.trim() ?? null,
        nfx: document.querySelector(".nfx")
          ? {
              h1: norm(document.querySelector(".nfx h1")),
              body: norm(document.querySelector(".nfx p")),
              action: (() => {
                const a = document.querySelector(".nfx a");
                return a ? { text: norm(a), href: a.getAttribute("href") } : null;
              })(),
            }
          : null,
        nfbox: document.querySelector(".nfbox")
          ? {
              h1: norm(document.querySelector(".nfbox h1")),
              rowLinks: [...document.querySelectorAll(".nfbox .row a")].map((a) => ({
                text: a.innerText.replace(/\s+/g, " ").trim(),
                href: a.getAttribute("href"),
              })),
              homeLink: !!document.querySelector('.nfbox a[href="/"]'),
            }
          : null,
      };
    });
    return { status: response?.status() ?? null, ...view };
  };

  r.readings = {
    nonsense: await read("/office/nonsense"),
    nonsenseCarRef: await read("/office/car/nonsense-ref"),
    dashboard: await read("/office"),
    inventory: await read("/office/inventory"),
    carList: await read("/office/car"),
    carEditor: await read("/office/car/TS-1001"),
    siteNotFound: await read("/nonsense"),
  };

  const n = r.readings.nonsense;
  const c = r.readings.nonsenseCarRef;
  const officeView = (v) =>
    v.nfx?.h1 === "That page isn't in the office" &&
    v.nfx?.body === "No office screen matches that address. Nothing was lost." &&
    v.nfx?.action?.text === "Back to the dashboard" &&
    v.nfx?.action?.href === "/office";
  r.verdict = {
    theUnknownOfficeAddressAnswers404: n.status === 404,
    theOfficeWordsAreTheOfficesOwn: officeView(n) && n.nfbox === null,
    theOfficeChromeStayedAroundIt: n.shell && n.side && n.main && (n.signedInAs ?? "").startsWith("Signed in as "),
    theCarRefAlsoLandsInTheOffice: c.status === 404 && officeView(c) && c.url === `${BASE}/office/car/nonsense-ref`,
    theCarRefPageKeepsItsChrome: c.shell && c.side && c.main,
    theDashboardStillWorks: r.readings.dashboard.status === 200 && r.readings.dashboard.shell && !r.readings.dashboard.nfx,
    theInventoryStillWorks: r.readings.inventory.status === 200 && r.readings.inventory.shell && !r.readings.inventory.nfx,
    theCarListRedirectsToTheInventory: r.readings.carList.url === `${BASE}/office/inventory` && r.readings.carList.shell,
    theCarEditorStillWorks: r.readings.carEditor.status === 200 && r.readings.carEditor.shell && !r.readings.carEditor.nfx,
    theSiteNotFoundIsNotMerged:
      r.readings.siteNotFound.status === 404 &&
      r.readings.siteNotFound.nfbox !== null &&
      r.readings.siteNotFound.nfbox.rowLinks.length === 2 &&
      r.readings.siteNotFound.nfbox.homeLink &&
      !r.readings.siteNotFound.shell,
    theOfficeViewIsNotTheShowrooms:
      n.nfbox === null && r.readings.siteNotFound.nfx === null,
  };
  writeFileSync(`${RUNS}live.json`, JSON.stringify(r, null, 2));

  console.log(`/office/nonsense           ${n.status} · nfx “${n.nfx?.h1}” · side=${n.side} · “${n.signedInAs}”`);
  console.log(`/office/car/nonsense-ref   ${c.status} · nfx “${c.nfx?.h1}” · url ${c.url.replace(BASE, "")}`);
  console.log(`/office                    ${r.readings.dashboard.status} · shell=${r.readings.dashboard.shell}`);
  console.log(`/office/inventory          ${r.readings.inventory.status} · shell=${r.readings.inventory.shell}`);
  console.log(`/office/car                ${r.readings.carList.status} → landed on ${r.readings.carList.url.replace(BASE, "")}`);
  console.log(`/office/car/TS-1001        ${r.readings.carEditor.status} · shell=${r.readings.carEditor.shell}`);
  console.log(`/nonsense (site)           ${r.readings.siteNotFound.status} · nfbox “${r.readings.siteNotFound.nfbox?.h1}” · shell=${r.readings.siteNotFound.shell}`);
  console.log(`\nverdict: ${JSON.stringify(r.verdict, null, 1)}`);
  const bad = Object.entries(r.verdict).filter(([, v]) => !v);
  if (bad.length) throw new Error(`unmet: ${bad.map(([k]) => k).join(", ")}`);

  // Leave the tab where the office work left it.
  await page.goto(`${BASE}/office`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
} finally {
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after} (no Chrome launched by this run)`);
  await detach(browser);
}
