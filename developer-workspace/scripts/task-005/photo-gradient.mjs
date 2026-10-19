// TASK-005 Task 27 drive — the empty photo box is a gradient from the car's ref (D7/E2).
//
// Read-only in the store. Legs:
//   A. TS-1029 (no photos) — the box: gradient behind the slot? decorative in the accessibility
//      tree? calm (no animation)? Read, then reloaded and read again → identical colours.
//   B. TS-1030 (no photos) — a different car → a different gradient.
//   C. TS-1001 (photographed) — the photo sits over its own car's box; slot geometry equals A's.
//   D. TS-1001 with the CDN blocked before the load — the failed photo lands in the same box.
// Screenshots of #gal for TS-1029 and TS-1001 land beside the readings (the checkpoint B sample).
//
// Run with OUT=developer-workspace/scripts/task-005/runs/task27/before.json (or after.json).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const OUT = process.env.OUT ?? new URL("./runs/task27/readings.json", import.meta.url).pathname;
const DIR = dirname(OUT);
mkdirSync(DIR, { recursive: true });
const tag = OUT.includes("before") ? "before" : "after";

const guard = guardCount();
const browser = await attach();
await assertOurs(browser);
const { b: page } = await twoTabs(browser);
page.setDefaultTimeout(180000);
const cdp = await page.context().newCDPSession(page);

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

// What the slot shows right now: the box behind it, the image, the frame.
const box = () =>
  page.evaluate(() => {
    const gal = document.getElementById("gal");
    const gi = document.getElementById("gi");
    const pb = document.querySelector(".pbox");
    const rect = (el) => {
      const r = el?.getBoundingClientRect();
      return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
    };
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const giSrc = gi?.getAttribute("src") ?? null;
    return {
      h1: document.querySelector("h1")?.textContent?.trim().slice(0, 60) ?? null,
      pbox: pb
        ? {
            bg: cs(pb).backgroundImage,
            anim: cs(pb).animationName,
            ariaHidden: pb.getAttribute("aria-hidden"),
            rect: rect(pb),
          }
        : null,
      gi: {
        srcAttr: giSrc,
        drawn: !!giSrc && giSrc.startsWith("data:image/svg"),
        greyPlaceholder: !!giSrc && giSrc.includes("%23eef0f2"),
        alt: gi?.getAttribute("alt") ?? null,
        sw: gi ? gi.classList.contains("sw") : null,
        nw: gi ? gi.naturalWidth : null,
        rect: rect(gi),
      },
      galBg: cs(gal)?.backgroundImage ?? null,
      galRect: rect(gal),
    };
  });

// Every CDP send gets a deadline: the attached browser answers in milliseconds normally, but a
// capture that stalls at the other end must not take the whole run down (measured: one 14-minute
// silent hang on Page.captureScreenshot, killed by hand).
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

// The accessibility entry for one element: does an AT pass stop on it?
const axOfRaw = async (selector) => {
  const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
  const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  if (!nodeId) return { found: false };
  const { node } = await cdp.send("DOM.describeNode", { nodeId });
  const { nodes } = await cdp.send("Accessibility.getPartialAXTree", {
    backendNodeId: node.backendNodeId,
    fetchRelatives: false,
  });
  const n = nodes[0];
  return n
    ? { found: true, role: n.role?.value ?? null, ignored: n.ignored ?? null, name: n.name?.value ?? null }
    : { found: true, role: null, ignored: null, name: null };
};
const axOf = (selector) =>
  withTimeout(axOfRaw(selector), 20000, "ax read timed out").catch((e) => ({
    found: null,
    error: e.message.slice(0, 80),
  }));

// The gallery frame for the checkpoint-B sample: a full-viewport capture with the gallery
// centred (CDP jpeg). Measured in the Task 27 drive: this attached browser never yields a
// PNG-from-clip frame, a clip-based frame lands offset from the requested region, and
// Playwright's stability wait never settles while the page's infinite shine/pulse animations
// run. The viewport frame is stable and it shows the box in its page context. A stalled capture
// retries once on a fresh CDP session — a queued command on the old session would hang the
// retry too.
const capture = async () => {
  for (let attempt = 0; attempt < 2; attempt++) {
    const session = attempt === 0 ? cdp : await page.context().newCDPSession(page);
    try {
      const { data } = await withTimeout(
        session.send("Page.captureScreenshot", { format: "jpeg", quality: 82 }),
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
  await page.evaluate(() => document.getElementById("gal")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  const data = await capture();
  if (data) writeFileSync(`${DIR}/${tag}-${name}.jpeg`, Buffer.from(data, "base64"));
  else console.log(`shot: ${name} skipped — capture never answered`);
};

const r = { when: new Date().toISOString(), base: BASE, ui: true, tag };
try {
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- A. a car with no photos, read twice -------------------------------
  await page.goto(BASE + "/car/TS-1029", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#gi");
  await settle();
  const a1 = await box();
  const a1bg = a1.pbox?.bg ?? null;
  await page.waitForTimeout(1300);
  const a1bg2 = (await box()).pbox?.bg ?? null;
  await shot("gal-TS-1029");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#gi");
  await settle();
  const a2 = await box();
  r.noPhotos = {
    ref: "TS-1029",
    read: a1,
    calm: { bgStableAfter1300ms: a1bg === a1bg2, firstBg: a1bg, laterBg: a1bg2 },
    reloaded: a2,
    sameColoursAfterReload: (a2.pbox?.bg ?? null) === a1bg,
    axGi: await axOf("#gi"),
    axPbox: await axOf(".pbox"),
  };

  // ---- B. a different car with no photos ---------------------------------
  await page.goto(BASE + "/car/TS-1030", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#gi");
  await settle();
  const b1 = await box();
  r.noPhotos2 = {
    ref: "TS-1030",
    read: b1,
    differentFromTS1029: (b1.pbox?.bg ?? null) !== a1bg && !!b1.pbox?.bg,
  };
  await shot("gal-TS-1030");

  // ---- C. a photographed car --------------------------------------------
  await page.goto(BASE + "/car/TS-1001", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#gi");
  await settle();
  const c1 = await box();
  r.photographed = { ref: "TS-1001", read: c1 };
  await shot("gal-TS-1001");

  // ---- D. the photographed car with the CDN blocked before the load ------
  await cdp.send("Network.enable");
  await cdp.send("Network.setBlockedURLs", { urls: ["*sanity.io*"] });
  await page.goto(BASE + "/car/TS-1001", { waitUntil: "domcontentloaded", timeout: 180000 });
  await hydrated("#gi");
  await settle(3500);
  const d1 = await box();
  r.brokenAtLoad = {
    ref: "TS-1001",
    blocked: "*sanity.io*",
    read: d1,
    boxColoursSameAsTheSameCarsPhotographedRead:
      (d1.pbox?.bg ?? null) === (c1.pbox?.bg ?? null) && !!d1.pbox?.bg,
    axGi: await axOf("#gi"),
    axPbox: await axOf(".pbox"),
  };
  await shot("gal-TS-1001-blocked");

  console.log(JSON.stringify(r, null, 2));
} finally {
  try {
    await withTimeout(cdp.send("Network.setBlockedURLs", { urls: [] }), 5000, "unblock timed out");
  } catch {
    /* session gone */
  }
  r.consoleErrors = consoleErrors;
  r.chromium = `${guard} -> ${chromiumCount()} (no launch by the drive)`;
  writeFileSync(OUT, JSON.stringify(r, null, 2) + "\n");
  await detach(browser);
}
