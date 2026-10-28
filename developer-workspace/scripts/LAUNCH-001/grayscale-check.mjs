// C6 (inventory part) — state, error and success messages without colour.
// Attach-only; reuses the existing build tab; grayscale is a CSS filter, not a screenshot.
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

const gray = () =>
  page.evaluate(() => {
    document.documentElement.style.filter = "grayscale(1)";
  });

let result;
try {
  await assertOurs(browser);
  page = findTab(browser, BASE);
  const tabsBefore = tabUrls(browser).length;
  const before = chromiumCount();
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  };
  const onPageError = (e) => pageErrors.push(e.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  await resize(page, 1440, 900);
  widthSet = true;
  await page.goto(`${BASE}/inventory`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(800);
  await gray();

  // State: view/pager/filter controls keep a shape or text cue after colour is removed.
  const state = await page.evaluate(() => {
    const view = document.querySelector('.sv .vb[aria-pressed="true"]');
    const viewCs = view ? getComputedStyle(view) : null;
    const pager = document.querySelector('nav.pg button[aria-current="page"]');
    const pagerCs = pager ? getComputedStyle(pager) : null;
    const firstBox = document.querySelector("#sb input[type=checkbox]");
    return {
      viewId: view?.id,
      viewPressed: view?.getAttribute("aria-pressed"),
      viewShadow: viewCs?.boxShadow,
      pagerCurrent: pager?.getAttribute("aria-current"),
      pagerUnderline: pagerCs?.textDecorationLine,
      nativeCheckbox: firstBox?.type === "checkbox",
      chips: [...document.querySelectorAll("#out .chip")]
        .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 4),
    };
  });
  check("view pressed state has a non-colour cue", state.viewPressed === "true" && state.viewShadow !== "none", state);
  check("current page has aria-current and underline", state.pagerCurrent === "page" && state.pagerUnderline.includes("underline"), state);
  check("filter control is a native checkbox", state.nativeCheckbox, state);
  check("car state labels are text", state.chips.length > 0 && state.chips.every((t) => t.length > 0), state.chips);

  // Error: a price floor that matches nothing leaves a text empty state and a text live region.
  // The price inputs live in the last closed <details>; open it with the keyboard first.
  const priceGroup = page.locator("#sb details").filter({ hasText: "Price" }).first();
  await priceGroup.locator("summary").focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  await page.locator("#pmin").fill("999999999");
  await page.waitForTimeout(700);
  const empty = await page.evaluate(() => {
    const el = document.querySelector(".empty");
    const speak = document.getElementById("speak");
    return {
      visible: Boolean(el),
      text: (el?.textContent || "").replace(/\s+/g, " ").trim(),
      speak: (speak?.textContent || "").replace(/\s+/g, " ").trim(),
    };
  });
  check("empty state is text", empty.visible && /No cars match/i.test(empty.text), empty);
  check("empty live region is text", /No cars match/i.test(empty.speak), empty);

  // Clear, switch to list, and trigger the success toast.
  await page.locator("#clr").click();
  await page.waitForTimeout(300);
  await page.locator("#vl").click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  const share = page.locator("#out .lc .sh").first();
  await share.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const toast = await page.evaluate(() => {
    const el = document.getElementById("toast");
    return el
      ? {
          visible: true,
          text: (document.getElementById("toasttxt")?.textContent || "").replace(/\s+/g, " ").trim(),
          role: el.getAttribute("role"),
        }
      : { visible: false };
  });
  check("success message is text", toast.visible && toast.role === "status" && toast.text.length > 0, toast);

  // The car state is a text label on the detail page too.
  await page.goto(`${BASE}/car/TS-1001`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(700);
  await gray();
  const car = await page.evaluate(() => ({
    h1: (document.querySelector("h1")?.textContent || "").replace(/\s+/g, " ").trim(),
    mainText: (document.body.innerText || "").replace(/\s+/g, " ").trim(),
  }));
  check("car detail state is text", /Available|Special|On order|Landed/i.test(car.mainText), car);
  check("car detail has one h1", Boolean(car.h1), car);

  check("grayscale console clean", consoleErrors.length === 0, consoleErrors);
  check("grayscale page errors clean", pageErrors.length === 0, pageErrors);

  const tabsAfter = tabUrls(browser).length;
  const after = chromiumCount();
  check("tabs unchanged", tabsBefore === tabsAfter, { before: tabsBefore, after: tabsAfter });
  check("Chromium unchanged", before === after, { before, after });

  result = {
    checks,
    failures: checks.filter((c) => !c.ok),
    consoleErrors,
    pageErrors,
    tabs: [tabsBefore, tabsAfter],
    chromium: [before, after],
  };
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) throw new Error(`${result.failures.length} grayscale check(s) failed`);
} finally {
  page?.off("console", () => {});
  page?.off("pageerror", () => {});
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
