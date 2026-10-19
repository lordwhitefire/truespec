// TASK-005 plan Task 29 — live witness: no invented number, no link to a recipient that does not
// exist, and the five places show the saved number again once it is restored.
//
// Attach-only; read-only in the browser. The store is cleared/restored by `wa-number.mjs` around the
// two legs. Run: `node wa-number-drive.mjs cleared` then `node wa-number-drive.mjs saved`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const mode = process.argv[2];
if (mode !== "cleared" && mode !== "saved") {
  console.error("usage: node wa-number-drive.mjs cleared|saved");
  process.exit(2);
}

const RUNS = new URL("./runs/task29/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });
const BACKUP = `${RUNS}saved-number.json`;
const saved = existsSync(BACKUP) ? JSON.parse(readFileSync(BACKUP, "utf8")) : null;
const digits = saved?.value.replace(/\D/g, "") ?? null;

const CAR = "/car/TS-1029";
const MISSING_CAR = "/car/TS-999999";
const SITE_404 = "/not-found";
const GLOBAL_404 = "/task-29-no-such-page";
const EMPTY_INVENTORY = "/inventory?min=999999999";

const PAGES = ["/", "/inventory", EMPTY_INVENTORY, CAR, MISSING_CAR, SITE_404, GLOBAL_404, "/privacy"];

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(120000);

const consoleErrors = [];
const httpErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 240));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 240)));
page.on("response", (res) => {
  if (res.status() >= 400) {
    httpErrors.push({ url: res.url().replace(BASE, ""), status: res.status() });
  }
});

async function goto(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (!response || response.status() < 500) break;
    if (attempt === 2) throw new Error(`${url} answered ${response.status()}`);
    await page.waitForTimeout(5000);
  }
  await page
    .waitForSelector(url === GLOBAL_404 ? ".nfbox" : "#site-header", { timeout: 120000 })
    .catch(() => {});
  if (url !== GLOBAL_404) {
    await page
      .waitForFunction(
        (want) => {
          const infs = [...document.querySelectorAll("#site-header .inf")];
          const block = infs.find((el) => el.querySelector("small")?.textContent.trim() === "WhatsApp");
          const b = block?.querySelector("b");
          if (!b) return false;
          const t = b.textContent.replace(/\u00a0/g, "").trim();
          return want === "cleared" ? t === "" : t.startsWith("+");
        },
        mode,
        { timeout: 20000 },
      )
      .catch(() => {});
  }
  await page.waitForTimeout(1500);
}

const read = () =>
  page.evaluate(() => {
    const text = document.body.innerText;
    const anchors = [...document.querySelectorAll("a")];
    const waAnchors = anchors
      .filter((a) => (a.getAttribute("href") ?? "").includes("wa.me"))
      .map((a) => ({
        text: a.textContent.replace(/\s+/g, " ").trim().slice(0, 60),
        href: a.getAttribute("href"),
      }));

    const infs = [...document.querySelectorAll("#site-header .inf")];
    const block = infs.find((el) => el.querySelector("small")?.textContent.trim() === "WhatsApp");
    const numEl = block?.querySelector("b");
    const numberText = numEl ? numEl.textContent.replace(/\u00a0/g, " ").trim() : null;

    const el = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return { present: false, text: null, href: null, hasHref: false };
      return {
        present: true,
        tag: node.tagName,
        text: node.textContent.replace(/\s+/g, " ").trim().slice(0, 60),
        href: node.getAttribute("href"),
        hasHref: node.hasAttribute("href"),
      };
    };

    const wp = document.querySelector("#whatsapp p");
    const cp = document.querySelector("#contact p");
    return {
      path: location.pathname + location.search,
      title: document.querySelector("h1")?.textContent ?? null,
      headerNumber: numberText,
      headerNumberBlank: numberText === null ? null : numberText === "",
      waAnchors,
      waCount: waAnchors.length,
      inventedNumberInText: /2348000000000|800[\s\u00a0]*000[\s\u00a0]*0000/.test(text),
      controls: {
        headerChat: el("#site-header .nav .wab"),
        footerIcon: el("#site-footer .sq a[aria-label='WhatsApp']"),
        footerButton: el("#site-footer .wab.big"),
        fab: el("a.fab"),
        homeChat: el(".why .more a.btn"),
        carWa: el("#wa"),
        carOffer: el("#of"),
        carView: el("#vw"),
        carMbar: el("#mw"),
        nfboxChat: el(".nfbox .wab"),
        emptyChat: el(".empty a.btn"),
      },
      privacy: {
        whatsappText: wp?.innerText.replace(/\s+/g, " ").trim() ?? null,
        contactText: cp?.innerText.replace(/\s+/g, " ").trim() ?? null,
        contactWaHref: cp?.querySelector("a[href*='wa.me']")?.getAttribute("href") ?? null,
        contactHasAnchor: !!cp?.querySelector("a"),
      },
    };
  });

const r = {
  when: new Date().toISOString(),
  mode,
  base: BASE,
  ua,
  savedValue: saved?.value ?? null,
  digits,
  pages: {},
};

try {
  for (const url of PAGES) {
    await goto(url);
    r.pages[url] = await read();
  }

  const pageList = Object.entries(r.pages);
  const noInvented = pageList.every(([, p]) => p.inventedNumberInText === false);
  const noDeadLinks = pageList.every(([, p]) => p.waCount === 0 || mode === "saved");
  const sitePages = pageList.filter(([url]) => url !== GLOBAL_404);
  const headerBlank = sitePages.every(([, p]) => p.headerNumberBlank === true);
  const headerShowsNumber = sitePages.every(
    ([, p]) => p.headerNumber !== null && p.headerNumber.includes(saved?.value ?? "\u0000"),
  );
  const allHrefsSaved =
    mode === "saved" &&
    pageList.every(([, p]) =>
      p.waAnchors.every((a) => (a.href ?? "").startsWith(`https://wa.me/${digits}`)),
    );

  // The controls named by the task: present in both legs, a link only in the saved leg.
  const siteOnly = pageList.filter(([url]) => url !== GLOBAL_404);
  const controlChecks = [
    ["nav chat", "headerChat", siteOnly],
    ["footer button", "footerButton", siteOnly],
    ["floating control", "fab", [["/", r.pages["/"]], ["/inventory", r.pages["/inventory"]]]],
    ["home chat", "homeChat", [["/", r.pages["/"]]]],
    ["car main chat", "carWa", [[CAR, r.pages[CAR]]]],
    ["car offer", "carOffer", [[CAR, r.pages[CAR]]]],
    ["car viewing", "carView", [[CAR, r.pages[CAR]]]],
    ["car bar", "carMbar", [[CAR, r.pages[CAR]]]],
    [
      "404 Message Umar",
      "nfboxChat",
      [
        [MISSING_CAR, r.pages[MISSING_CAR]],
        [SITE_404, r.pages[SITE_404]],
        [GLOBAL_404, r.pages[GLOBAL_404]],
      ],
    ],
    ["inventory empty Message me", "emptyChat", [[EMPTY_INVENTORY, r.pages[EMPTY_INVENTORY]]]],
  ];

  const checks = [];
  for (const [label, key, entries] of controlChecks) {
    const present = entries.every(([, p]) => p.controls[key]?.present);
    const live = entries.every(
      ([, p]) =>
        p.controls[key]?.hasHref &&
        (p.controls[key]?.href ?? "").startsWith(`https://wa.me/${digits}`),
    );
    const off = entries.every(([, p]) => p.controls[key]?.present && !p.controls[key]?.hasHref);
    checks.push({
      label,
      pass: mode === "cleared" ? present && off : present && live,
      present,
      hrefs: entries.map(([, p]) => p.controls[key]?.href ?? null),
    });
  }

  r.checks = checks;
  r.verdict = {
    noInvented,
    noDeadLinks,
    header: mode === "cleared" ? headerBlank : headerShowsNumber,
    allHrefsSaved: mode === "saved" ? allHrefsSaved : null,
    controls: checks.every((c) => c.pass),
    privacy:
      mode === "cleared"
        ? r.pages["/privacy"].privacy.whatsappText?.includes("our WhatsApp directly") &&
          r.pages["/privacy"].privacy.contactHasAnchor === false
        : r.pages["/privacy"].privacy.whatsappText?.includes(saved?.value ?? "\u0000") &&
          r.pages["/privacy"].privacy.contactWaHref?.startsWith(`https://wa.me/${digits}`),
    // The two deliberately-404 documents each log one "Failed to load resource: … 404"; those are
    // the pages under test answering as designed, not app errors. Every console error must have a
    // matching 404 response behind it.
    console: consoleErrors.length === httpErrors.length && httpErrors.every((e) => e.status === 404),
  };
  r.consoleErrorTexts = consoleErrors;
  r.httpErrors = httpErrors;
  r.pass = Object.values(r.verdict).every((v) => v === true || v === 0 || v === null);

  console.log(`${mode.toUpperCase()}: ${r.pass ? "PASS" : "FAIL"} ${JSON.stringify(r.verdict)}`);
  for (const [url, p] of pageList) {
    console.log(
      `  ${url}: header=${JSON.stringify(p.headerNumber)} waLinks=${p.waCount} invented=${p.inventedNumberInText}`,
    );
  }
  for (const c of checks) console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.label} — ${JSON.stringify(c.hrefs)}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}${mode}.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await detach(browser);
}
