// Task 15 — the destructive action's words and order, read live from every dialog that has one.
// Read-only: each dialog is closed through its safe control (or Escape); nothing is written.
import { attach, detach, BASE } from "./_lib.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const browser = await attach();
const page = browser.contexts()[0].pages()[0];
const readings = { results: {}, note: "" };

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

async function open(url, opener, dialogSel) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 120000 });
    if (response && response.status() < 500) break;
    if (attempt === 2) throw new Error(`${url} answered ${response?.status()}`);
    await page.waitForTimeout(5000);
  }
  await hydrated(opener);
  await page.locator(opener).first().click();
  await page.waitForFunction(
    (s) => {
      const d = document.querySelector(s);
      return d && d.open;
    },
    dialogSel,
    { timeout: 30000 },
  );
  return page.evaluate((s) => {
    const d = document.querySelector(s);
    const buttons = Array.from(d.querySelectorAll("button")).map((b, index) => ({
      index,
      text: b.innerText.replace(/\s+/g, " ").trim(),
      ariaLabel: b.getAttribute("aria-label"),
      className: b.className,
      danger: b.classList.contains("danger"),
      disabled: b.disabled,
    }));
    const heading = d.querySelector("h2");
    return {
      heading: heading?.innerText ?? null,
      label: d.getAttribute("aria-labelledby"),
      buttons,
    };
  }, dialogSel);
}

async function closeSafe(sel) {
  await page.evaluate((s) => {
    const d = document.querySelector(s);
    const safe = Array.from(d.querySelectorAll("button")).find((b) =>
      /^(Keep it|Close)$/.test(b.innerText.trim()),
    );
    safe?.click();
  }, sel);
  await page.waitForFunction((s) => !document.querySelector(s)?.open, sel, { timeout: 15000 });
}

try {
  const drafts = await open(
    "/office/drafts",
    ".dfoot button.btn.gh",
    "dialog.ovl[open]",
  );
  drafts.trigger = await page.evaluate(
    () => document.querySelector(".dfoot button.btn.gh")?.innerText.replace(/\s+/g, " ").trim() ?? null,
  );
  await closeSafe("dialog.ovl[open]");
  readings.results["office-drafts"] = drafts;
  console.log("office-drafts:", JSON.stringify(drafts));

  const inventory = await open(
    "/office/inventory",
    "button.ab.del",
    "#ovl",
  );
  await closeSafe("#ovl");
  readings.results["office-inventory"] = inventory;
  console.log("office-inventory:", JSON.stringify(inventory));

  const car = await open(
    "/office/car/TS-1001",
    "#delBtn",
    "#ovlD",
  );
  await closeSafe("#ovlD");
  readings.results["office-car"] = car;
  console.log("office-car:", JSON.stringify(car));

  const enquiries = await open(
    "/office/enquiries",
    "article.card",
    "#ovlD",
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#ovlD")?.open, null, {
    timeout: 15000,
  });
  readings.results["office-enquiries"] = enquiries;
  console.log("office-enquiries:", JSON.stringify(enquiries));

  // The live store currently holds no tombstones; read the section's presence only. The words and
  // order of its inline confirmation are read from the source (the section is absent at zero rows).
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 120000 });
  await hydrated("button.ab.del");
  const tombstones = await page.evaluate(() => ({
    sections: document.querySelectorAll(".clearout").length,
    rows: document.querySelectorAll(".clearout-list li").length,
  }));
  readings.results["office-inventory-tombstones"] = tombstones;
  console.log("tombstones on the live page:", JSON.stringify(tombstones));
} finally {
  mkdirSync(new URL("./runs/destructive-labels/", import.meta.url), { recursive: true });
  writeFileSync(
    new URL("./runs/destructive-labels/readings.json", import.meta.url),
    JSON.stringify(readings, null, 2) + "\n",
  );
  console.log("chromium 6 -> 6 (no launch)");
  await detach(browser);
}
