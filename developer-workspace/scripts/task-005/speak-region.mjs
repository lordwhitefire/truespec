// TASK-005 Task 23 drive — the live region's presence, and the page's one live region.
//
// Read-only in the store. The region's *emptiness* is the state under test, and no page rests
// empty in this dev environment — the inventory announces on mount under StrictMode, the car
// page greets via CarBehaviors, the global 404 lands a theme line — so each surface gets the
// same labelled DOM probe: read it as it rests, clear the region's own innerHTML, read it and
// its accessibility node, then put the text back. Nothing leaves the page; a reload restores
// everything.
//
// The accessibility reading is *membership*: the element's own AX node is looked up in the full
// tree — `present: true` means a screen reader can see the region right now.
// Also reads `#ttl`'s role — the result's heading must not be a second live region.
// Run with OUT=… to name the readings file (default runs/task23/readings.json).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const OUT =
  process.env.OUT ?? new URL("./runs/task23/readings.json", import.meta.url).pathname;
mkdirSync(dirname(OUT), { recursive: true });

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);

const cdp = await page.context().newCDPSession(page);
await cdp.send("DOM.enable");
await cdp.send("Accessibility.enable");

const readSpeak = (selector) =>
  page.evaluate((sel) => {
    const sp = document.querySelector(sel);
    if (!sp) return "absent";
    const cs = getComputedStyle(sp);
    return {
      display: cs.display,
      height: sp.offsetHeight,
      width: sp.getBoundingClientRect().width,
      text: sp.textContent ?? "",
      role: sp.getAttribute("role"),
    };
  }, selector);

// the element's own AX node, checked for membership in the full tree
const axMember = async (selector) => {
  const { root } = await cdp.send("DOM.getDocument", {});
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  if (!nodeId) return { present: false, why: "element not in the DOM" };
  const part = await cdp.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
  const axId = part.nodes?.[0]?.nodeId ?? null;
  if (!axId) return { present: false, why: "no AX node for the element" };
  const full = await cdp.send("Accessibility.getFullAXTree", {});
  const hit = full.nodes.find((n) => n.nodeId === axId);
  return hit
    ? { present: true, ignored: !!hit.ignored, role: hit.role?.value ?? null }
    : {
        present: false,
        why: "its AX node is not in the full tree",
        partialRole: part.nodes[0]?.role?.value ?? null,
      };
};

// every unignored `status` node on the page — how many live regions the result can ring
const statusNodes = async () => {
  const { nodes } = await cdp.send("Accessibility.getFullAXTree", {});
  return nodes
    .filter((n) => (n.role?.value ?? "") === "status" && !n.ignored)
    .map((n) => ({ name: n.name?.value ?? "" }));
};

// the AX tree updates a frame after the DOM; the harness tab runs ~1 fps
const settle = () => page.waitForTimeout(2500);

const probe = async (selector) => {
  const emptied = await page.evaluate((sel) => {
    const sp = document.querySelector(sel);
    const saved = sp.innerHTML;
    window.__t005 = saved;
    sp.innerHTML = "";
    const cs = getComputedStyle(sp);
    return {
      wasText: (saved || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80),
      display: cs.display,
      height: sp.offsetHeight,
      width: sp.getBoundingClientRect().width,
      isEmpty: sp.matches(":empty"),
    };
  }, selector);
  await settle();
  const ax = await axMember(selector);
  await page.evaluate((sel) => {
    const sp = document.querySelector(sel);
    sp.innerHTML = window.__t005 ?? "";
    delete window.__t005;
  }, selector);
  return { ...emptied, ax };
};

const r = { when: new Date().toISOString(), base: BASE, ui: !/Headless/i.test(ua) };

try {
  // ---- 1. inventory: heading role, the region's rest state, its empty probe, a live result --
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("#speak", { state: "attached", timeout: 180000 });
  await settle();
  r.inventory = {
    ttlRole: await page.evaluate(() => document.getElementById("ttl")?.getAttribute("role")),
    ttlAx: await axMember("#ttl"),
    rest: await readSpeak("#speak"),
    restAx: await axMember("#speak"),
    statusNodesAtRest: await statusNodes(),
  };
  r.inventory.emptyProbe = await probe("#speak");
  r.inventory.afterRestore = await readSpeak("#speak");

  await page.fill("#pmin", "999999999");
  await page.waitForFunction(
    () => (document.getElementById("speak")?.innerText || "").includes("match"),
    null,
    { timeout: 60000 },
  );
  await settle();
  r.inventory.zero = {
    ttl: await page.evaluate(() => document.getElementById("ttl")?.innerText),
    speak: await readSpeak("#speak"),
    statusNodes: await statusNodes(),
  };

  // ---- 2. the car page: rest (greeted), then the same empty probe --------------------------
  await page.goto(BASE + "/car/TS-1001", { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("#speak", { state: "attached", timeout: 180000 });
  await settle();
  r.car = { rest: await readSpeak("#speak"), restAx: await axMember("#speak") };
  r.car.emptyProbe = await probe("#speak");
  r.car.afterRestore = await readSpeak("#speak");

  // ---- 3. the (site) /not-found route — the page not-found.css belongs to ------------------
  await page.goto(BASE + "/not-found", { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector(".wab", { state: "attached", timeout: 180000 });
  await settle();
  r.notFoundRoute = { speak: await readSpeak(".speak") };

  // ---- 4. the global 404 (reference.css; a theme line lands at rest) -----------------------
  await page.goto(BASE + "/no-such-page-xyz", { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector(".speak", { state: "attached", timeout: 180000 });
  await settle();
  r.notFoundGlobal = { speak: await readSpeak(".speak"), ax: await axMember(".speak") };

  console.log(JSON.stringify(r, null, 2));
  console.log(`\nTASK 23 drive done → ${OUT}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch by the drive)`;
  writeFileSync(OUT, JSON.stringify(r, null, 2) + "\n");
  await detach(browser);
}
