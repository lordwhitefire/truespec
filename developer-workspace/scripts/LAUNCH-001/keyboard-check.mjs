// C4/C6/C7 — keyboard, focus and live-region walk.
// Attach-only; reuses the existing build tab; leaves it on /inventory.
import {
  BASE,
  attach,
  assertOurs,
  chromiumCount,
  clearResize,
  detach,
  findTab,
  resize,
  tabUrls,
} from "./_lib.mjs";

const browser = await attach();
let page;
let widthSet = false;
const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail });
}

const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

async function active() {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      id: el.id,
      tag: el.tagName,
      text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
      focusVisible: el.matches(":focus-visible"),
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      boxShadow: cs.boxShadow,
      textDecoration: cs.textDecorationLine,
      ariaPressed: el.getAttribute("aria-pressed"),
      ariaCurrent: el.getAttribute("aria-current"),
      ariaExpanded: el.getAttribute("aria-expanded"),
    };
  });
}

async function speakText() {
  return page.evaluate(() => {
    const el = document.getElementById("speak");
    return el ? { text: (el.textContent || "").replace(/\s+/g, " ").trim(), role: el.getAttribute("role"), live: el.getAttribute("aria-live") } : null;
  });
}

async function openFirstFilterGroup() {
  const details = page.locator("#sb details").first();
  const summary = details.locator("summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  return { open: await details.evaluate((el) => el.open), summary: await active() };
}

async function publicDesktop() {
  await resize(page, 1440, 900);
  widthSet = true;
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  };
  const onPageError = (e) => pageErrors.push(e.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    await page.goto(`${BASE}/inventory`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(900);

    // 1. A filter group opens from its native summary, then a checkbox is keyboard-operable.
    const group = await openFirstFilterGroup();
    check("filter group keyboard-operable", group.open, group);
    const firstFilter = page.locator("#sb input[type=checkbox]").first();
    await firstFilter.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
    const afterFilter = await active();
    const filterSpeak = await speakText();
    const filterChecked = await firstFilter.isChecked();
    check("filter checkbox keyboard-operable", filterChecked, { checked: filterChecked });
    check("filter keeps focus", afterFilter?.tag === "INPUT", afterFilter);
    check("filter focus ring", afterFilter?.focusVisible && afterFilter?.outlineStyle !== "none", afterFilter);
    check("filter count announced", /car(s)? match/i.test(filterSpeak?.text || ""), filterSpeak);
    check("no price pitch in live region", !/doorstep|door-to-door/i.test(filterSpeak?.text || ""), filterSpeak);
    check("live region is polite status", filterSpeak?.role === "status" && filterSpeak?.live === "polite", filterSpeak);

    // 2. Clear all: focus stays on the stable button; the count is announced by the effect.
    await page.locator("#clr").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    const afterClear = await active();
    const clearSpeak = await speakText();
    check("clear all keeps focus", afterClear?.id === "clr", afterClear);
    check("clear all announces count", /car(s)? match/i.test(clearSpeak?.text || ""), clearSpeak);

    // 3. The native sort select changes value from the keyboard and has a name and a ring.
    const sortBefore = await page.locator("#sort").inputValue();
    await page.locator("#sort").focus();
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    const sortAfter = await page.locator("#sort").inputValue();
    const afterSort = await active();
    const sortName = await page.locator("#sort").evaluate((el) => {
      const select = el;
      return select.labels?.[0]?.textContent?.trim() || select.getAttribute("aria-label");
    });
    check("sort keyboard-operable", sortAfter !== sortBefore && afterSort?.id === "sort", { sortBefore, sortAfter, afterSort });
    check("sort focus ring", afterSort?.focusVisible && afterSort?.outlineStyle !== "none", afterSort);
    check("sort has an accessible name", sortName === "Sort by", { sortName });

    // 4. View button: aria-pressed and a non-colour pressed cue.
    await page.locator("#vl").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const afterView = await active();
    const viewState = await page.evaluate(() => {
      const el = document.getElementById("vl");
      const cs = getComputedStyle(el);
      return {
        pressed: el?.getAttribute("aria-pressed"),
        boxShadow: cs.boxShadow,
        textDecoration: cs.textDecorationLine,
        listRows: document.querySelectorAll("#out .lc").length,
        imageLink: document.querySelector("#out .lc .lph")?.getAttribute("tabindex"),
        imageHidden: document.querySelector("#out .lc .lph")?.getAttribute("aria-hidden"),
        titleLink: document.querySelector("#out .lc .lt h3 a")?.getAttribute("tabindex"),
        share: document.querySelector("#out .lc .sh")?.getAttribute("aria-label"),
      };
    });
    check("list view keyboard-operable", afterView?.id === "vl" && viewState.pressed === "true", { afterView, viewState });
    check("list view has non-colour pressed cue", viewState.boxShadow !== "none" || viewState.textDecoration.includes("underline"), viewState);
    check("list view shows rows", viewState.listRows > 0, viewState);
    check("duplicate image link removed from tab order", viewState.imageLink === "-1" && viewState.imageHidden === "true", viewState);
    check("list title link remains keyboard reachable", viewState.titleLink === null || viewState.titleLink === "0", viewState);
    check("share button names its car", Boolean(viewState.share && viewState.share.length > "Share".length), viewState);

    // 4. Paging: focus moves to the result heading and that heading has a visible ring.
    const next = page.locator('nav.pg button[aria-label="Next page"]').first();
    if (await next.isEnabled()) {
      await next.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(600);
      const afterPage = await active();
      const pageSpeak = await speakText();
      const pagerState = await page.evaluate(() => {
        const cur = document.querySelector('nav.pg button[aria-current="page"]');
        const cs = cur ? getComputedStyle(cur) : null;
        return {
          current: cur?.getAttribute("aria-current"),
          currentText: cur?.textContent?.trim(),
          underline: cs?.textDecorationLine,
        };
      });
      check("paging moves focus to result heading", afterPage?.id === "ttl", afterPage);
      check("result heading has visible focus ring", afterPage?.focusVisible && afterPage?.outlineStyle !== "none" && afterPage?.boxShadow !== "none", afterPage);
      check("page change announced", /Page\s+\d+\s+of\s+\d+/i.test(pageSpeak?.text || ""), pageSpeak);
      check("current page has aria-current and underline", pagerState.current === "page" && pagerState.underline.includes("underline"), pagerState);
    } else {
      check("paging available", false, { reason: "Next page was disabled" });
    }

    // 5. Open a car from the keyboard and return with the browser's Back.
    const titleLink = page.locator("#out .lc .lt h3 a").first();
    await titleLink.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/car\//, { timeout: 6000 }).catch(() => {
      /* the URL check below records the actual result */
    });
    await page.waitForTimeout(300);
    const carUrl = page.url();
    check("car opens from keyboard", carUrl.includes("/car/"), { carUrl });
    await page.goBack({ waitUntil: "commit", timeout: 30000 }).catch(() => {
      /* the App Router handles the history entry; the full-load event can be aborted */
    });
    await page.waitForTimeout(800);
    check("browser returns to inventory", page.url().includes("/inventory"), { url: page.url() });

    // 6. A native dialog moves focus in, Escape closes it, and focus returns to the trigger.
    const wa = page.locator('a[href^="https://wa.me/"]:not([aria-disabled="true"])').first();
    if ((await wa.count()) > 0) {
      await wa.focus();
      const trigger = await active();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(350);
      const opened = await page.evaluate(() => {
        const d = document.querySelector("dialog.wagn");
        return {
          open: Boolean(d?.open),
          inside: Boolean(document.activeElement?.closest("dialog.wagn")),
        };
      });
      check("WhatsApp dialog opens and moves focus", opened.open && opened.inside, opened);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(250);
      const closed = await page.evaluate(() => !document.querySelector("dialog.wagn")?.open);
      const returned = await active();
      check("Escape closes dialog and returns focus", closed && returned?.tag === "A", { closed, returned, trigger });
    } else {
      check("WhatsApp dialog trigger available", false, { reason: "no enabled wa.me link on the inventory page" });
    }

    check("public desktop console clean", consoleErrors.length === 0, consoleErrors);
    check("public desktop page errors clean", pageErrors.length === 0, pageErrors);
    return { consoleErrors, pageErrors };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function publicMobile() {
  await resize(page, 390, 823);
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  };
  const onPageError = (e) => pageErrors.push(e.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    await page.goto(`${BASE}/inventory`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(900);
    await page.locator("#sbt").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const toggle = await active();
    const panel = await page.evaluate(() => {
      const el = document.getElementById("sb");
      const cs = el ? getComputedStyle(el) : null;
      return { expanded: document.getElementById("sbt")?.getAttribute("aria-expanded"), display: cs?.display };
    });
    check("mobile filter toggle keyboard-operable", toggle?.id === "sbt" && panel.expanded === "true", { toggle, panel });
    check("mobile filter panel opens", panel.display !== "none", panel);

    const group = await openFirstFilterGroup();
    check("mobile filter group keyboard-operable", group.open, group);
    const firstFilter = page.locator("#sb input[type=checkbox]").first();
    await firstFilter.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(600);
    const afterFilter = await active();
    const mobileSpeak = await speakText();
    check("mobile filter checkbox keyboard-operable", await firstFilter.isChecked(), { checked: await firstFilter.isChecked() });
    check("mobile filter keeps focus and ring", afterFilter?.tag === "INPUT" && afterFilter?.focusVisible && afterFilter?.outlineStyle !== "none", afterFilter);
    check("mobile filter count announced", /car(s)? match/i.test(mobileSpeak?.text || ""), mobileSpeak);
    check("public mobile console clean", consoleErrors.length === 0, consoleErrors);
    check("public mobile page errors clean", pageErrors.length === 0, pageErrors);
    return { consoleErrors, pageErrors };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function office() {
  await resize(page, 1440, 900);
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  };
  const onPageError = (e) => pageErrors.push(e.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    await page.goto(`${BASE}/office/inventory`, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(1500);
    const url = page.url();
    const hasHeading = await page.locator("#inv-h").count();
    if (url.includes("/office/sign-in") || !hasHeading) {
      return { state: "NOT RUN", reason: "signed out; the owner/testing session does the office sign-in pass", url };
    }

    const nav = await page.evaluate(() => {
      const a = document.querySelector('.sn a[href="/office/inventory"]');
      return a ? { ariaCurrent: a.getAttribute("aria-current"), ariaLabel: a.getAttribute("aria-label") } : null;
    });
    check("office nav current page", nav?.ariaCurrent === "page", nav);

    const status = await page.evaluate(() => {
      const el = document.querySelector(".pgstatus");
      return el ? { text: (el.textContent || "").replace(/\s+/g, " ").trim(), role: el.getAttribute("role"), live: el.getAttribute("aria-live") } : null;
    });
    check("office count is live", Boolean(status && status.role === "status" && status.live === "polite" && /cars\. Page/i.test(status.text)), status);

    const chips = await page.evaluate(() => {
      return [...document.querySelectorAll(".chipf button")].slice(0, 3).map((b) => ({
        text: (b.textContent || "").replace(/\s+/g, " ").trim(),
        pressed: b.getAttribute("aria-pressed"),
      }));
    });
    check("office filter chips expose pressed state", chips.some((c) => c.pressed === "true"), chips);

    await page.locator("#q").focus();
    await page.keyboard.type("zzzz-no-match");
    await page.waitForTimeout(500);
    const emptyVisible = await page.locator("#clearf").isVisible();
    if (emptyVisible) {
      await page.locator("#clearf").focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
      const afterClear = await active();
      check("office clear filters keeps focus", afterClear?.id === "q", afterClear);
    } else {
      check("office clear filters reachable", false, { reason: "empty state did not render" });
    }

    const inputFocus = await page.evaluate(() => {
      const el = document.getElementById("q");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { focusVisible: el.matches(":focus-visible"), outline: cs.outlineStyle, width: cs.outlineWidth, shadow: cs.boxShadow };
    });
    check("office search has visible keyboard focus", inputFocus?.focusVisible && inputFocus?.outline !== "none", inputFocus);

    check("office console clean", consoleErrors.length === 0, consoleErrors);
    check("office page errors clean", pageErrors.length === 0, pageErrors);
    return { state: "RUN", url, consoleErrors, pageErrors };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

let result;
try {
  await assertOurs(browser);
  page = findTab(browser, BASE);
  const tabsBefore = tabUrls(browser).length;
  const before = chromiumCount();
  const desktop = await publicDesktop();
  const mobile = await publicMobile();
  const officeResult = await office();
  const tabsAfter = tabUrls(browser).length;
  const after = chromiumCount();
  check("tabs unchanged", tabsBefore === tabsAfter, { before: tabsBefore, after: tabsAfter });
  check("Chromium unchanged", before === after, { before, after });
  result = {
    checks,
    failures: checks.filter((c) => !c.ok),
    desktop,
    mobile,
    office: officeResult,
    tabs: [tabsBefore, tabsAfter],
    chromium: [before, after],
  };
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) {
    throw new Error(`${result.failures.length} keyboard check(s) failed`);
  }
} finally {
  if (page) {
    try {
      await page.goto(`${BASE}/inventory`, { waitUntil: "load", timeout: 30000 });
    } catch {
      /* best-effort restore */
    }
  }
  if (widthSet) await clearResize(page);
  await detach(browser);
}
