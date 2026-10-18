// Task 16 — a tap outside closes only what is not destructive. Phone width (375x812).
// Read-only: destructive dialogs stay open until their safe control is used; no store writes.
import { attach, detach, BASE } from "./_lib.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await attach();
const page = browser.contexts()[0].pages()[0];
const readings = { viewport: "375x812", results: {} };

const hydrated = (sel) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      return (
        el &&
        Object.keys(el).some(
          (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
        )
      );
    },
    sel,
    { timeout: 120000 },
  );

async function goto(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (!response || response.status() < 500) return;
    if (attempt === 2) throw new Error(`${url} answered ${response.status()}`);
    await page.waitForTimeout(5000);
  }
}

async function snapshot(dialogSel) {
  return page.evaluate((s) => {
    const d = document.querySelector(s);
    const mdl = d?.querySelector(".mdl");
    const at = document.elementFromPoint(6, 6);
    return {
      dialog: !!d,
      open: d?.open ?? null,
      dialogsOpen: document.querySelectorAll("dialog.ovl[open]").length,
      role: d?.getAttribute("role"),
      name: d?.getAttribute("aria-label") ?? null,
      rect: d ? { w: d.offsetWidth, h: d.offsetHeight } : null,
      mdl: mdl
        ? (() => {
            const r = mdl.getBoundingClientRect();
            return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
          })()
        : null,
      pointAt6: at ? `${at.tagName}${at.id ? "#" + at.id : ""}` : null,
      active: document.activeElement
        ? `${document.activeElement.tagName}${document.activeElement.id ? "#" + document.activeElement.id : ""}${document.activeElement.dataset.fp ? "·opener" : ""}`
        : null,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  }, dialogSel);
}

async function outsideTap(dialogSel) {
  await page.mouse.click(6, 6);
  await page.waitForTimeout(500);
  return snapshot(dialogSel);
}

async function closeSafe(dialogSel, text) {
  await page.evaluate(
    ({ s, t }) => {
      const d = document.querySelector(s);
      const safe = Array.from(d?.querySelectorAll("button") ?? []).find(
        (b) => b.innerText.replace(/\s+/g, " ").trim() === t,
      );
      safe?.click();
    },
    { s: dialogSel, t: text },
  );
  await page.waitForFunction((s) => !document.querySelector(s)?.open, dialogSel, { timeout: 15000 });
  await page.waitForTimeout(400);
}

try {
  await page.setViewportSize({ width: 375, height: 812 });

  // ---- destructive confirmations: an outside tap must not dismiss --------------------------
  for (const [name, url, opener, sel, safe] of [
    ["office-inventory", "/office/inventory", ".ccard button.ab.del", "#ovl", "Keep it"],
    ["office-car", "/office/car/TS-1001", "#delBtn", "#ovlD", "Keep it"],
    ["office-drafts", "/office/drafts", ".dfoot button.btn.gh", "dialog.ovl[open]", "Keep it"],
  ]) {
    await goto(url);
    await hydrated(opener);
    await page.locator(opener).first().click();
    await page.waitForFunction((s) => !!document.querySelector(s)?.open, sel, { timeout: 30000 });
    const open = await snapshot(sel);
    const afterOutside = await outsideTap(sel);
    await closeSafe(sel, safe);
    const afterSafe = await snapshot(sel);
    const kept = afterOutside.open === true && afterOutside.dialogsOpen === 1;
    const safeClosed = afterSafe.dialogsOpen === 0;
    readings.results[name] = { kind: "destructive", open, afterOutside, afterSafe, kept, safeClosed };
    console.log(
      `${name}: open=${open.open} at6=${open.pointAt6} · outside tap keeps it=${kept} · safe closes=${safeClosed} · focus=${afterSafe.active}`,
    );
  }

  // ---- non-destructive: an outside tap closes ----------------------------------------------
  await goto("/office/enquiries");
  await hydrated("article.card");
  const openerFP = await page.evaluate(() => {
    const card = document.querySelector("article.card");
    card?.setAttribute("data-fp", "opener");
    return card?.getAttribute("aria-label") ?? null;
  });
  await page.locator("article.card").first().click();
  await page.waitForFunction(() => !!document.querySelector("#ovlD")?.open, null, { timeout: 30000 });
  const enqOpen = await snapshot("#ovlD");
  const enqClosed = await outsideTap("#ovlD");
  await page.waitForTimeout(400);
  const enqSettled = await snapshot("#ovlD");
  readings.results["office-enquiries"] = {
    kind: "non-destructive",
    opener: openerFP,
    open: enqOpen,
    afterOutside: enqClosed,
    settled: enqSettled,
  };
  console.log(
    `office-enquiries: open=${enqOpen.open} at6=${enqOpen.pointAt6} · outside tap closes=${enqClosed.dialogsOpen === 0} · focus=${enqSettled.active} · body=${enqSettled.bodyOverflow}`,
  );

  // ---- showroom offer (non-destructive) ---------------------------------------------------
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("ts-asked");
      localStorage.removeItem("ts-visited-inventory");
      sessionStorage.removeItem("ts-covering");
    } catch {
      /* storage can be unavailable before the origin exists */
    }
  });
  await goto("/inventory");
  await hydrated("main");
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    document.dispatchEvent(
      new MouseEvent("mouseout", { bubbles: true, relatedTarget: null, clientY: 0 }),
    );
  });
  await page.waitForFunction(
    () => !!document.querySelector("#ovl")?.open,
    null,
    { timeout: 30000 },
  );
  for (const [name, url, hydrateOn] of [
    ["site-inventory", "/inventory", "main"],
    ["site-home", "/", "#ovl"],
    ["site-car", "/car/TS-1001", "#ovl"],
  ]) {
    await goto(url);
    await hydrated(hydrateOn);
    await page.waitForTimeout(8000);
    await page.evaluate(() => {
      document.dispatchEvent(
        new MouseEvent("mouseout", { bubbles: true, relatedTarget: null, clientY: 0 }),
      );
    });
    await page.waitForFunction(
      () => !!document.querySelector("#ovl")?.open,
      null,
      { timeout: 30000 },
    );
    const siteOpen = await snapshot("#ovl");
    const siteClosed = await outsideTap("#ovl");
    await page.waitForTimeout(400);
    const siteSettled = await snapshot("#ovl");
    readings.results[name] = {
      kind: "non-destructive",
      open: siteOpen,
      afterOutside: siteClosed,
      settled: siteSettled,
    };
    console.log(
      `${name}: open=${siteOpen.open} at6=${siteOpen.pointAt6} · outside tap closes=${siteClosed.dialogsOpen === 0} · body=${siteSettled.bodyOverflow}`,
    );
  }
} finally {
  await page.setViewportSize({ width: 1440, height: 900 });
  mkdirSync(new URL("./runs/tap-outside/", import.meta.url), { recursive: true });
  writeFileSync(
    new URL("./runs/tap-outside/readings.json", import.meta.url),
    JSON.stringify(readings, null, 2) + "\n",
  );
  console.log("chromium 6 -> 6 (no launch)");
  await detach(browser);
}
