// TASK-005 plan Task 30 — live witness: with no number saved, every chat control stays on the
// screen and is visibly switched off (greyed, not a link, not in the tab order, carrying its
// reason); with the number restored, every one is live again.
//
// Phone (375) and desktop (1440), home / inventory (incl. the empty result and the farewell
// dialog's own chat control) / car page. Attach-only; the store is cleared/restored around the
// legs by `wa-number.mjs` with the `task30` run label. Read-only in the browser.
//
// usage: node wa-off-drive.mjs cleared|saved
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const mode = process.argv[2];
if (mode !== "cleared" && mode !== "saved") {
  console.error("usage: node wa-off-drive.mjs cleared|saved");
  process.exit(2);
}

const RUNS = new URL("./runs/task30/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });
const saved = existsSync(`${RUNS}saved-number.json`)
  ? JSON.parse(readFileSync(`${RUNS}saved-number.json`, "utf8"))
  : null;
const digits = saved?.value.replace(/\D/g, "") ?? null;
const REASON = "No WhatsApp number is saved yet.";
const OFF_TEXT = "No number saved";

const WIDTHS = [375, 1440];
const PAGES = ["/", "/inventory", "/inventory?min=999999999", "/car/TS-1029"];
const CAR = "/car/TS-1029";

// Every chat affordance the site renders. The modal button is inserted by the inventory page's
// farewell (the same generated/live control path as the page's own).
const CONTROLS = {
  headerChat: "#site-header .nav .wab",
  footerIcon: "#site-footer .sq a[aria-label^=\"WhatsApp\"]",
  footerButton: "#site-footer .wab.big",
  fab: "a.fab",
  homeChat: ".why .more a.btn",
  carWa: "#wa",
  carOffer: "#of",
  carView: "#vw",
  carMbar: "#mw",
  emptyChat: ".empty a.btn",
  modalChat: "#ovl[open] .wab",
};

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);
const cdp = await page.context().newCDPSession(page);

const consoleErrors = [];
const httpErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 240));
});
page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 240)));
page.on("response", (res) => {
  if (res.status() >= 400) httpErrors.push({ url: res.url().replace(BASE, ""), status: res.status() });
});

const withTimeout = (p, ms, msg) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });

// The attached browser's element screenshots never settle under the page's infinite animations;
// the full-viewport CDP JPEG is the frame that works (Task 27's measured lesson). One retry on a
// fresh session — a queued command on the stalled one would hang the retry too.
const capture = async () => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const session = attempt === 0 ? cdp : await page.context().newCDPSession(page);
    try {
      const { data } = await withTimeout(
        session.send("Page.captureScreenshot", { format: "jpeg", quality: 78 }),
        15000,
        "capture timed out",
      );
      return data;
    } catch (e) {
      console.log(`shot: capture attempt ${attempt + 1} — ${e.message}`);
    }
  }
  return null;
};

const shot = async (name) => {
  const data = await capture();
  if (data) writeFileSync(`${RUNS}${name}.jpeg`, Buffer.from(data, "base64"));
  else console.log(`shot: ${name} skipped — capture never answered`);
};

async function goto(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 180000 });
    if (!response || response.status() < 500) break;
    if (attempt === 2) throw new Error(`${url} answered ${response.status()}`);
    await page.waitForTimeout(5000);
  }
  await page.waitForSelector("#site-header", { timeout: 180000 }).catch(() => {});
  await page
    .waitForFunction(
      ({ want, number }) => {
        const infs = [...document.querySelectorAll("#site-header .inf")];
        const block = infs.find((el) => el.querySelector("small")?.textContent.trim() === "WhatsApp");
        const b = block?.querySelector("b");
        if (!b) return false;
        const t = b.textContent.replace(/\u00a0/g, "").trim();
        return want === "cleared" ? t === "No number saved" : t === number;
      },
      { want: mode, number: saved?.value ?? "" },
      { timeout: 30000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1500);
}

const readPage = () =>
  page.evaluate((selectors) => {
    const anchors = [...document.querySelectorAll("a")];
    const waAnchors = anchors
      .filter((a) => (a.getAttribute("href") ?? "").includes("wa.me"))
      .map((a) => a.getAttribute("href"));

    const controls = {};
    for (const [key, selector] of Object.entries(selectors)) {
      const el = document.querySelector(selector);
      if (!el) {
        controls[key] = { present: false };
        continue;
      }
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      controls[key] = {
        present: true,
        visible:
          cs.display !== "none" &&
          cs.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0 &&
          Number(cs.opacity) > 0,
        tag: el.tagName,
        text: el.textContent.replace(/\s+/g, " ").trim().slice(0, 60),
        href: el.getAttribute("href"),
        hasHref: el.hasAttribute("href"),
        className: el.className,
        role: el.getAttribute("role"),
        ariaDisabled: el.getAttribute("aria-disabled"),
        tabIndex: el.tabIndex,
        title: el.getAttribute("title"),
        ariaLabel: el.getAttribute("aria-label"),
        opacity: cs.opacity,
        filter: cs.filter,
        display: cs.display,
      };
    }

    const infs = [...document.querySelectorAll("#site-header .inf")];
    const block = infs.find((el) => el.querySelector("small")?.textContent.trim() === "WhatsApp");
    const numEl = block?.querySelector("b");
    return {
      path: location.pathname + location.search,
      headerNumber: numEl?.textContent.replace(/\u00a0/g, " ").trim() ?? null,
      headerTitle: numEl?.getAttribute("title") ?? null,
      waCount: waAnchors.length,
      waHrefs: waAnchors,
      controls,
    };
  }, CONTROLS);

const r = {
  when: new Date().toISOString(),
  mode,
  base: BASE,
  ua,
  savedValue: saved?.value ?? null,
  digits,
  readings: {},
};
const problems = [];

function checkVisibleControls(label, read) {
  for (const [key, c] of Object.entries(read.controls)) {
    if (!c.present || !c.visible) continue;
    const at = `${label} · ${key}`;
    if (mode === "cleared") {
      if (!String(c.className).split(/\s+/).includes("wa-off"))
        problems.push(`${at}: not marked wa-off (class "${c.className}")`);
      if (c.hasHref) problems.push(`${at}: still has href ${c.href}`);
      if (c.role !== "link") problems.push(`${at}: role is ${c.role}`);
      if (c.ariaDisabled !== "true") problems.push(`${at}: aria-disabled is ${c.ariaDisabled}`);
      if (c.tabIndex !== -1) problems.push(`${at}: tabIndex is ${c.tabIndex}`);
      if (c.title !== REASON) problems.push(`${at}: title is ${JSON.stringify(c.title)}`);
      if (!c.filter.includes("grayscale")) problems.push(`${at}: filter is ${c.filter}`);
      if (Number(c.opacity) >= 0.75) problems.push(`${at}: opacity is ${c.opacity}`);
    } else {
      if (!c.hasHref) problems.push(`${at}: no href`);
      if (!(c.href ?? "").startsWith(`https://wa.me/${digits}`))
        problems.push(`${at}: href is ${c.href}`);
      if (String(c.className).includes("wa-off")) problems.push(`${at}: still wa-off`);
      if (c.ariaDisabled !== null) problems.push(`${at}: aria-disabled is ${c.ariaDisabled}`);
      if (c.tabIndex !== 0) problems.push(`${at}: tabIndex is ${c.tabIndex}`);
      if (c.title !== null) problems.push(`${at}: title is ${JSON.stringify(c.title)}`);
      if (c.filter !== "none") problems.push(`${at}: filter is ${c.filter}`);
    }
  }
}

try {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
    await page.waitForTimeout(600);

    for (const url of PAGES) {
      const label = `${mode} ${width} ${url}`;
      // The inventory farewell shares a session-wide overlay budget with the home page; clear it
      // before the inventory mount so the modal this check needs is not suppressed by an earlier
      // page in the same run.
      if (url === "/inventory") {
        await page.evaluate(() => sessionStorage.removeItem("ts-covering"));
      }
      await goto(url);
      const read = await readPage();
      read.width = width;
      read.mode = mode;
      r.readings[`${width}|${url}`] = read;

      // The header line is the visible reason (it is not a control).
      if (mode === "cleared") {
        if (read.headerNumber !== OFF_TEXT)
          problems.push(`${label}: header is ${JSON.stringify(read.headerNumber)}`);
        if (read.headerTitle !== REASON)
          problems.push(`${label}: header title is ${JSON.stringify(read.headerTitle)}`);
      } else {
        if (read.headerNumber !== saved?.value)
          problems.push(`${label}: header is ${JSON.stringify(read.headerNumber)}, want ${saved?.value}`);
        if (read.headerTitle !== null)
          problems.push(`${label}: header title is ${JSON.stringify(read.headerTitle)}`);
      }
      if (read.waCount !== 0 && mode === "cleared")
        problems.push(`${label}: ${read.waCount} wa.me links still built`);

      checkVisibleControls(label, read);

      await shot(
        `${mode}-${width}-${
          url === "/" ? "home" : url === CAR ? "car" : url === "/inventory" ? "inventory" : "empty"
        }`,
      );

      // The inventory farewell dialog's own chat control (after its 7s dwell, on exit intent).
      if (url === "/inventory") {
        // The component's own 7s clock starts at mount, after the navigation; wait past it.
        await page.waitForTimeout(8200);
        await page.evaluate(() => {
          document.dispatchEvent(
            new MouseEvent("mouseout", { bubbles: true, clientY: -1, relatedTarget: null }),
          );
        });
        await page.waitForSelector("#ovl[open]", { timeout: 12000 }).catch(() => {});
        await page.waitForTimeout(350);
        const dialog = await readPage();
        read.dialog = dialog.controls.modalChat;
        if (dialog.controls.modalChat?.visible) {
          const fake = { controls: { modalChat: dialog.controls.modalChat } };
          checkVisibleControls(`${label} · dialog`, fake);
        } else {
          problems.push(`${label}: the farewell dialog's chat control did not appear`);
        }
        await shot(`${mode}-${width}-inventory-dialog`);
        await page
          .locator("#ovl[open] .sk")
          .first()
          .click({ timeout: 4000 })
          .catch(() => page.evaluate(() => document.querySelector("#ovl[open]")?.close()));
        await page.waitForTimeout(250);
      }

    }
  }

  // Visibility must not change between the legs: the off controls are greyed, never hidden.
  if (mode === "saved" && existsSync(`${RUNS}cleared.json`)) {
    const cleared = JSON.parse(readFileSync(`${RUNS}cleared.json`, "utf8"));
    for (const [where, read] of Object.entries(r.readings)) {
      const old = cleared.readings[where];
      if (!old) continue;
      for (const key of Object.keys(read.controls)) {
        const a = old.controls[key]?.visible ?? false;
        const b = read.controls[key]?.visible ?? false;
        if (a !== b) problems.push(`${where} · ${key}: visibility ${a} → ${b}`);
      }
    }
  }

  r.problems = problems;
  r.consoleErrorTexts = consoleErrors;
  r.httpErrors = httpErrors;
  r.verdict = {
    problems: problems.length,
    // The two deliberate 404s are not part of this task's pages; any console error is an app error.
    console: consoleErrors.length === 0,
    http: httpErrors.length === 0,
  };
  r.pass = problems.length === 0 && consoleErrors.length === 0 && httpErrors.length === 0;

  console.log(`${mode.toUpperCase()}: ${r.pass ? "PASS" : "FAIL"} · ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 25)) console.log(`  FAIL ${p}`);
  for (const [where, read] of Object.entries(r.readings)) {
    const visible = Object.entries(read.controls)
      .filter(([, c]) => c.visible)
      .map(([k]) => k);
    console.log(`  ${where}: header=${JSON.stringify(read.headerNumber)} wa=${read.waCount} visible=${visible.join(",")}`);
  }
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}${mode}.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await detach(browser);
}
