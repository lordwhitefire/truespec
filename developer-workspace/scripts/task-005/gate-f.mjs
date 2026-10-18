// TASK-005 Gate F — the empty result once, one announcement carrying the bare result, the
// honest count, the unflattened refusals. One fresh pass, live, signed in, read-only.
//
//  A. the region before the result changes (Task 23's lens): at rest, the emptied `#speak` is
//     checked for membership in the full accessibility tree, then restored via a labelled probe.
//  B. the showroom driven to zero: the promise is printed once on the screen, the announcement
//     carries the bare result and nothing else, the heading and band read the honest count, and
//     one unignored `status` node carries the result.
//  C. the from-file refusals: a filled blank with every page refused (build-refused-pdf.ts) —
//     the refusal list quotes each field's own words (422; nothing stored, no asset held).
//  D. the car form's refusals: a refused save read from the form's error block.
//
// Run with OUT=… to name the readings file (default runs/gate-f/readings.json).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const OUT = process.env.OUT ?? new URL("./runs/gate-f/readings.json", import.meta.url).pathname;
const FIXTURE = process.env.FIXTURE ?? "/tmp/opencode/refused-template.pdf";
mkdirSync(dirname(OUT), { recursive: true });

const before = guardCount();
const browser = await attach();
const ua = await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);

const cdp = await page.context().newCDPSession(page);
await cdp.send("DOM.enable");
await cdp.send("Accessibility.enable");

const hydrated = (sel) =>
  page.waitForFunction(
    (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      return Object.keys(el).some(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
      );
    },
    sel,
    { timeout: 180000 },
  );

const settle = () => page.waitForTimeout(2500);

// the element's own AX node, checked for membership in the full tree (Task 23's method)
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
    : { present: false, why: "its AX node is not in the full tree" };
};

const statusNodes = async () => {
  const { nodes } = await cdp.send("Accessibility.getFullAXTree", {});
  return nodes.filter((n) => (n.role?.value ?? "") === "status" && !n.ignored).length;
};

const r = { when: new Date().toISOString(), base: BASE, ui: !/Headless/i.test(ua) };

try {
  // ---- A + B. the showroom ------------------------------------------------------------------
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#pmin");
  await settle();

  // A. the region while untouched — emptied by a labelled probe, read, restored
  const atRest = await page.evaluate(() => {
    const sp = document.getElementById("speak");
    window.__gf = sp.innerHTML;
    const text = sp.textContent;
    sp.innerHTML = "";
    return text;
  });
  await settle();
  r.regionWhileUntouched = {
    atRest,
    ax: await axMember("#speak"),
    statusNodes: await statusNodes(),
  };
  await page.evaluate(() => {
    const sp = document.getElementById("speak");
    sp.innerHTML = window.__gf ?? "";
    delete window.__gf;
  });

  // B. driven to zero
  await page.fill("#pmin", "999999999");
  await page.waitForFunction(
    () => (document.getElementById("ttl")?.innerText || "").includes("0 "),
    null,
    { timeout: 60000 },
  );
  await settle();
  r.zero = await page.evaluate(() => {
    const body = document.body.innerText;
    const occurrences = (re) => (body.match(re) || []).length;
    const sp = document.getElementById("speak");
    return {
      ttl: document.getElementById("ttl")?.innerText ?? null,
      cnt: document.getElementById("cnt")?.innerText ?? null,
      speak: {
        text: sp?.innerText ?? null,
        html: sp?.innerHTML ?? null,
        hasLink: !!sp?.querySelector("a"),
      },
      promiseCount: occurrences(/source it in the USA/g),
      tellCount: occurrences(/tell me what you're after/gi),
      statusNodes: null,
      clears: Array.from(document.querySelectorAll("button, a"))
        .filter((el) => /clear/i.test(el.textContent || ""))
        .map((el) => ({
          id: el.id,
          text: (el.textContent || "").replace(/\s+/g, " ").trim(),
          where: el.closest(".empty") ? "empty-block" : el.closest(".sb") ? "filter-panel" : "other",
        })),
    };
  });
  r.zero.statusNodes = await statusNodes();

  // ---- C. the from-file refusals ------------------------------------------------------------
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 180000 });
  const inputSel = 'input[aria-label="Create drafts from a file"]';
  // the control is server-rendered — wait for React to hydrate it, or the chosen file's change
  // event lands on a page that is not listening yet and the upload never starts
  const readyToImport = async () => {
    await page.waitForSelector(inputSel, { state: "attached", timeout: 180000 });
    await page.waitForFunction(
      (s) => {
        const el = document.querySelector(s);
        return (
          !!el &&
          Object.keys(el).some(
            (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactProps$"),
          )
        );
      },
      inputSel,
      { timeout: 180000 },
    );
  };
  await readyToImport();

  // the upload leg, retried a few times if the store stalls (the known intermittent Neon):
  // a refusals box ends the loop; any other answer or a silent request is retried on a fresh load
  let attempts = 0;
  let outcome = null;
  while (attempts < 4 && outcome !== "refusals") {
    attempts += 1;
    await page.setInputFiles(inputSel, FIXTURE);
    try {
      outcome = await page
        .waitForFunction(
          () => {
            const boxes = Array.from(document.querySelectorAll('div[role="alert"]'));
            if (
              boxes.some((el) =>
                (el.textContent ?? "").includes("No car could be read from that file."),
              )
            )
              return "refusals";
            const other = boxes[0];
            if (other)
              return (
                "answered: " + (other.innerText || "").replace(/\s+/g, " ").trim().slice(0, 120)
              );
            return null;
          },
          null,
          { timeout: 45000 },
        )
        .then((handle) => handle.jsonValue());
    } catch {
      outcome = "no answer within 45s";
    }
    if (outcome !== "refusals" && attempts < 4) {
      await page.waitForTimeout(8000);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await readyToImport();
    }
  }
  r.fromFile = { attempts, outcome };
  await page.waitForTimeout(600);
  const boxRead = await page.evaluate(() => {
    const box = Array.from(document.querySelectorAll('div[role="alert"]')).find((el) =>
      (el.textContent ?? "").includes("No car could be read from that file."),
    );
    if (!box) return null;
    return {
      reason: box.innerText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)[0] ?? "",
      refusals: Array.from(box.querySelectorAll("li")).map((li) =>
        (li.textContent ?? "").replace(/\s+/g, " ").trim(),
      ),
    };
  });
  if (boxRead) Object.assign(r.fromFile, boxRead);

  // ---- D. the car form's refusals -----------------------------------------------------------
  await page.goto(BASE + "/office/car/new", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#f-mileage");
  await page.fill("#f-mileage", "not a number");
  await page.fill("#f-year", "1500");
  await page.click("#save");
  await page.waitForSelector("#formErr", { timeout: 180000 });
  await page.waitForTimeout(500);
  r.carForm = await page.evaluate(() => {
    const err = document.getElementById("formErr");
    return {
      messages: err ? Array.from(err.querySelectorAll("li")).map((li) => li.textContent.trim()) : null,
    };
  });

  console.log(JSON.stringify(r, null, 2));
  console.log(`\nGate F pass done → ${OUT}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch by the drive)`;
  writeFileSync(OUT, JSON.stringify(r, null, 2) + "\n");
  await detach(browser);
}
