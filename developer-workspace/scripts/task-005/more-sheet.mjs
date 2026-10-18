// TASK-005 plan Task 20 — the narrow-width More cell reaches three destinations.
//
// Live, signed in, read-only. At 375 and 768 px: the More cell is a real control (button,
// expanded state, "more things" icon), it opens the sheet, the sheet's rows are the sidebar's
// three destinations in the sidebar's order and words, the matching row is marked current, and
// the sheet closes on Escape, on an outside tap and on a choice — keyboard-driven except for the
// outside tap, which is by definition a pointer gesture. The sidebar itself is read at 1280 as
// the source the order/wording is checked against.
//
// Attach-only; no store writes; the viewport is restored.
import { mkdirSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const RUNS = new URL("./runs/task20/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(120000);

const r = { when: new Date().toISOString(), base: BASE, ua, viewports: {}, paths: {}, sidebar: {} };

const hydrated = (sel, timeout = 120000) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
      );
    },
    sel,
    { timeout },
  );

async function goto(url, sel) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (!response || response.status() < 500) break;
    if (attempt === 2) throw new Error(`${url} answered ${response.status()}`);
    await page.waitForTimeout(5000);
  }
  await page.waitForSelector(sel, { state: "attached", timeout: 120000 });
  await hydrated(sel);
}

const readMoreCell = () =>
  page.evaluate(() => {
    const b = document.querySelector(".bnav button");
    if (!b) return { found: false };
    const cs = getComputedStyle(b);
    return {
      found: true,
      tag: b.tagName,
      text: (b.textContent || "").replace(/\s+/g, " ").trim(),
      icon: b.querySelector("i")?.className ?? null,
      className: b.className,
      expanded: b.getAttribute("aria-expanded"),
      haspopup: b.getAttribute("aria-haspopup"),
      controls: b.getAttribute("aria-controls"),
      color: cs.color,
      bg: cs.backgroundColor,
      displays: {
        bnav: getComputedStyle(document.querySelector(".bnav")).display,
        side: getComputedStyle(document.querySelector(".side")).display,
      },
    };
  });

const readSheet = () =>
  page.evaluate(() => {
    const d = document.querySelector("#more-sheet");
    if (!d) return { found: false };
    const active = document.activeElement;
    const rows = Array.from(d.querySelectorAll(".msheet nav a")).map((a) => ({
      text: (a.textContent || "").replace(/\s+/g, " ").trim(),
      href: a.getAttribute("href"),
      current: a.getAttribute("aria-current"),
      className: a.className,
      icon: a.querySelector("i")?.className ?? null,
    }));
    return {
      found: true,
      open: d.open,
      modal: d.matches(":modal"),
      tag: d.tagName,
      name: null, // filled by ariaSnapshot in the caller
      activeInside: !!active && !!active.closest && !!active.closest("#more-sheet"),
      activeText: active ? (active.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) : null,
      rows,
    };
  });

async function openSheet() {
  await page.evaluate(() => document.querySelector(".bnav button")?.focus());
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => !!document.querySelector("#more-sheet")?.open, null, {
    timeout: 30000,
  });
  const sheet = await readSheet();
  sheet.name = (await page.locator("#more-sheet").ariaSnapshot()).split("\n")[0];
  return sheet;
}

async function closeSheet() {
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#more-sheet")?.open, null, {
    timeout: 30000,
  });
}

try {
  await page.setViewportSize({ width: 375, height: 812 });
  await goto("/office", ".bnav button");

  // ---- the cell ------------------------------------------------------------------------------
  const cellOff = await readMoreCell();
  const open1 = await openSheet();
  const cellOpen = await readMoreCell();
  const tabStops = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("Tab");
    tabStops.push(
      await page.evaluate(() => {
        const a = document.activeElement;
        return {
          text: (a?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30),
          insideSheet: !!a?.closest?.("#more-sheet"),
          isBody: a === document.body,
        };
      }),
    );
  }
  await closeSheet();
  const cellAfterEscape = await readMoreCell();
  const focusAfterEscape = await page.evaluate(() => {
    const a = document.activeElement;
    return {
      isMoreCell: a?.tagName === "BUTTON" && !!a?.closest?.(".bnav"),
      text: (a?.textContent || "").replace(/\s+/g, " ").trim(),
    };
  });

  // Outside tap — the one pointer gesture this rule is about.
  await openSheet();
  await page.mouse.click(6, 6);
  const tapClosed = await page
    .waitForFunction(() => !document.querySelector("#more-sheet")?.open, null, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  const focusAfterTap = await page.evaluate(() => ({
    isMoreCell:
      document.activeElement?.tagName === "BUTTON" && !!document.activeElement?.closest?.(".bnav"),
  }));

  // A choice: Tab to the second row ("Activity log") and press Enter.
  await openSheet();
  await page.keyboard.press("Tab");
  const secondRow = await page.evaluate(() => {
    const a = document.activeElement;
    return (a?.textContent || "").replace(/\s+/g, " ").trim();
  });
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.pathname === "/office/activity", null, {
    timeout: 60000,
  });
  await hydrated(".bnav button");
  const afterChoice = {
    url: await page.evaluate(() => location.pathname),
    sheetOpen: await page.evaluate(() => !!document.querySelector("#more-sheet")?.open),
    cell: await readMoreCell(),
  };
  const openOnActivity = await openSheet();
  await closeSheet();

  r.viewports["375"] = {
    cellOff,
    open: open1,
    cellOpen,
    tabStops,
    cellAfterEscape,
    focusAfterEscape,
    tapClosed,
    focusAfterTap,
    secondRow,
    afterChoice,
  };
  r.viewports["375"].pass =
    cellOff.tag === "BUTTON" &&
    cellOff.text === "More" &&
    /fa-ellipsis/.test(cellOff.icon) &&
    !/fa-gear/.test(cellOff.icon) &&
    cellOff.expanded === "false" &&
    cellOff.haspopup === "dialog" &&
    cellOff.controls === "more-sheet" &&
    open1.open === true &&
    open1.modal === true &&
    /^\- dialog "More"/.test(open1.name) &&
    open1.activeInside === true &&
    open1.rows.map((x) => x.text).join("|") === "Drafts|Activity log|Settings" &&
    open1.rows.map((x) => x.href).join("|") ===
      "/office/drafts|/office/activity|/office/settings" &&
    open1.rows.every((x) => x.current === null) &&
    cellOpen.expanded === "true" &&
    cellOpen.className.includes("on") &&
    tabStops.every((x) => x.insideSheet || x.isBody) &&
    sheetClosed(cellAfterEscape, focusAfterEscape) &&
    tapClosed === true &&
    focusAfterTap.isMoreCell === true &&
    secondRow === "Activity log" &&
    afterChoice.url === "/office/activity" &&
    afterChoice.sheetOpen === false &&
    afterChoice.cell.className.includes("on") &&
    afterChoice.cell.expanded === "false" &&
    openOnActivity.rows.find((x) => x.current === "page")?.text === "Activity log";

  // ---- current marking on the other two paths, at 375 ----------------------------------------
  for (const [name, url, label] of [
    ["drafts", "/office/drafts", "Drafts"],
    ["settings", "/office/settings", "Settings"],
  ]) {
    await goto(url, ".bnav button");
    const cell = await readMoreCell();
    const sheet = await openSheet();
    const current = sheet.rows.find((x) => x.current === "page");
    await closeSheet();
    r.paths[name] = {
      cellOn: cell.className.includes("on"),
      cellIcon: cell.icon,
      current: current ? current.text : null,
      pass: cell.className.includes("on") && current?.text === label && current?.className.includes("on"),
    };
  }

  // ---- 768: the same sheet on a tablet -------------------------------------------------------
  await page.setViewportSize({ width: 768, height: 1024 });
  await goto("/office", ".bnav button");
  const cell768 = await readMoreCell();
  const open768 = await openSheet();
  await closeSheet();
  r.viewports["768"] = {
    cell: { tag: cell768.tag, displays: cell768.displays, expanded: cell768.expanded },
    open: { open: open768.open, modal: open768.modal, rows: open768.rows.map((x) => x.text) },
    pass:
      cell768.displays.bnav === "grid" &&
      open768.open === true &&
      open768.modal === true &&
      open768.rows.map((x) => x.text).join("|") === "Drafts|Activity log|Settings",
  };

  // ---- 1280: the sidebar the order/wording is checked against; the bottom bar is gone -------
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto("/office", ".sn");
  r.sidebar = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll(".sn a")).map((a) => ({
      text: (a.textContent || "").replace(/\s+/g, " ").trim(),
      href: a.getAttribute("href"),
    }));
    return {
      links,
      bnav: getComputedStyle(document.querySelector(".bnav")).display,
      three: links
        .filter((x) => ["/office/drafts", "/office/activity", "/office/settings"].includes(x.href))
        .map((x) => x.text)
        .join("|"),
    };
  });
  r.sidebar.pass =
    r.sidebar.bnav === "none" && r.sidebar.three === "Drafts|Activity log|Settings";

  r.pass =
    r.viewports["375"].pass &&
    r.viewports["768"].pass &&
    r.paths.drafts.pass &&
    r.paths.settings.pass &&
    r.sidebar.pass;

  console.log(
    `375 cell: ${cellOff.tag} "${cellOff.text}" icon=${cellOff.icon} expanded=${cellOff.expanded} controls=${cellOff.controls} → open: modal=${open1.modal} name="${open1.name}" entered="${open1.activeText}" rows=[${open1.rows.map((x) => x.text).join(", ")}] → tabs ${tabStops.map((x) => (x.isBody ? "BODY" : x.text)).join(" → ")} → Esc return=${focusAfterEscape.isMoreCell} → tap closes=${tapClosed} return=${focusAfterTap.isMoreCell} → choice "${secondRow}" → ${afterChoice.url} cellOn=${afterChoice.cell.className.includes("on")} current="${openOnActivity.rows.find((x) => x.current === "page")?.text}" → ${r.viewports["375"].pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `paths: drafts cellOn=${r.paths.drafts.cellOn} current="${r.paths.drafts.current}" · settings cellOn=${r.paths.settings.cellOn} current="${r.paths.settings.current}"`,
  );
  console.log(
    `768: bnav=${r.viewports["768"].cell.displays.bnav} modal=${open768.modal} rows=[${open768.rows.map((x) => x.text).join(", ")}] → ${r.viewports["768"].pass ? "PASS" : "FAIL"}`,
  );
  console.log(
    `sidebar: bnav=${r.sidebar.bnav} three=[${r.sidebar.three}] order/wording → ${r.sidebar.pass ? "PASS" : "FAIL"}`,
  );
  console.log(`TASK 20: ${r.pass ? "PASS" : "FAIL"}`);
} finally {
  await page.setViewportSize({ width: 1440, height: 900 });
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}readings.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await detach(browser);
}

function sheetClosed(cellAfterEscape, focusAfterEscape) {
  return cellAfterEscape.expanded === "false" && focusAfterEscape.isMoreCell === true;
}
