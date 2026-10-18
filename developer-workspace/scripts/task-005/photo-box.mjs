// TASK-005 Task 26 drive — a car with no photos, and a photo that failed.
//
// Read-only in the store. Legs:
//   A. no photos (TS-1029) — the drawn box alone: no counter, no arrows, no thumbnails, no
//      machine text anywhere; clicking it must not write machine text into the lightbox.
//   B. one photo (TS-1033) — counter "1 / 1", no arrows.
//   C. a photo that failed at load (TS-1001 with every CDN image blocked *before* the load) —
//      the case Phase 2 found never swapped: the finished-without-pixels image must land in the
//      same drawn box A used.
//   D. the showroom cards with the same block (truth 7 on the card path).
//
// Machine-text scan: the page text plus every img's src and alt for `undefined` / `NaN` /
// `1 / 0` / `No photo`. The CDN block is lifted in the finally, so the shared browser is left
// as it was found.
//
// Run with OUT=developer-workspace/scripts/task-005/runs/task26/before.json (or after.json).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const OUT = process.env.OUT ?? new URL("./runs/task26/readings.json", import.meta.url).pathname;
mkdirSync(dirname(OUT), { recursive: true });

const guard = guardCount();
const browser = await attach();
await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);
const net = await page.context().newCDPSession(page);

const settle = (ms = 2500) => page.waitForTimeout(ms);
const hydrated = (sel) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      return (
        !!el &&
        Object.keys(el).some(
          (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
        )
      );
    },
    sel,
    { timeout: 180000 },
  );

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160));
});

const box = () =>
  page.evaluate(() => {
    const gi = document.getElementById("gi");
    const gal = document.getElementById("gal");
    const rect = (el) => {
      const r = el?.getBoundingClientRect();
      return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
    };
    const src = gi?.getAttribute("src") ?? null;
    return {
      h1: document.querySelector("h1")?.textContent?.trim().slice(0, 80) ?? null,
      giSrc: src ? src.slice(0, 42) : null,
      giIsDrawn: !!src && src.startsWith("data:image/svg"),
      giAlt: gi?.getAttribute("alt") ?? null,
      giComplete: gi ? gi.complete : null,
      giNaturalWidth: gi ? gi.naturalWidth : null,
      giSw: gi ? gi.classList.contains("sw") : null,
      counter: document.getElementById("cn")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      counterPresent: !!document.getElementById("cn"),
      arrows: document.querySelectorAll("#gal .gb").length,
      thumbsPresent: !!document.getElementById("thumbs"),
      thumbsButtons: document.querySelectorAll("#thumbs button").length,
      galRect: rect(gal),
      giRect: rect(gi),
    };
  });

const machine = () =>
  page.evaluate(() => {
    const strings = ["undefined", "NaN", "1 / 0", "No photo"];
    const text = document.body.innerText;
    const inText = strings.filter((s) => text.includes(s));
    const badSrc = [];
    const badAlt = [];
    document.querySelectorAll("img").forEach((im) => {
      const s = im.getAttribute("src") ?? "";
      const a = im.getAttribute("alt") ?? "";
      if (s.includes("undefined") || s.includes("NaN"))
        badSrc.push(`${im.id || "(no id)"}: ${s.slice(0, 50)}`);
      if (/undefined|NaN/.test(a)) badAlt.push(`${im.id || "(no id)"}: ${a.slice(0, 80)}`);
    });
    return { inText, badSrc, badAlt };
  });

const r = { when: new Date().toISOString(), base: BASE, ui: true };
try {
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- A. no photos ------------------------------------------------------
  await page.goto(BASE + "/car/TS-1029", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#gi");
  await settle();
  r.noPhotos = { ref: "TS-1029", ...(await box()), machine: await machine() };
  await page.click("#gal", { position: { x: 30, y: 30 } });
  await page.waitForTimeout(600);
  r.noPhotos.click = await page.evaluate(() => ({
    lbOpen: !!document.getElementById("lb")?.classList.contains("open"),
    liSrc: (document.getElementById("li")?.getAttribute("src") ?? "").slice(0, 42),
  }));
  await page.evaluate(() => {
    const lb = document.getElementById("lb");
    if (lb?.classList.contains("open")) {
      lb.classList.remove("open");
      document.body.style.overflow = "";
    }
  });

  // ---- B. one photo ------------------------------------------------------
  await page.goto(BASE + "/car/TS-1033", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#gi");
  await settle();
  r.onePhoto = { ref: "TS-1033", ...(await box()) };

  // ---- C. a photo that failed at load ------------------------------------
  await net.send("Network.enable");
  await net.send("Network.setBlockedURLs", { urls: ["*sanity.io*"] });
  await page.goto(BASE + "/car/TS-1001", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#gi");
  await settle(3500);
  r.brokenAtLoad = {
    ref: "TS-1001",
    blocked: "*sanity.io*",
    ...(await box()),
    machine: await machine(),
    thumbsImgs: await page.evaluate(() =>
      Array.from(document.querySelectorAll("#thumbs img")).map((im) => ({
        src: (im.getAttribute("src") ?? "").slice(0, 34),
        drawn: (im.getAttribute("src") ?? "").startsWith("data:image/svg"),
        nw: im.naturalWidth,
      })),
    ),
  };

  // ---- D. the showroom cards with the same block -------------------------
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#pmin");
  await settle(3500);
  r.cardsBlocked = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const drawn = imgs.filter((im) =>
      (im.getAttribute("src") ?? "").startsWith("data:image/svg"),
    );
    const brokenNow = imgs.filter((im) => im.complete && im.naturalWidth === 0);
    return { total: imgs.length, drawn: drawn.length, brokenNow: brokenNow.length };
  });

  console.log(JSON.stringify(r, null, 2));
} finally {
  try {
    await net.send("Network.setBlockedURLs", { urls: [] });
  } catch {
    /* session gone */
  }
  r.consoleErrors = consoleErrors;
  r.chromium = `${guard} -> ${chromiumCount()} (no launch by the drive)`;
  writeFileSync(OUT, JSON.stringify(r, null, 2) + "\n");
  await detach(browser);
}
