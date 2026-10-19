// TASK-005 Gate G — live with the number cleared and restored: no invented number anywhere, every
// chat control visibly off with its reason and no dead recipient, and the same controls live again
// when the owner's number is back.
//
// The Task 30 drive proved the core four surfaces (home / inventory / empty / car) at phone and
// desktop; this gate adds the four remaining documents — missing car, site 404, root 404, privacy —
// and re-reads the lot for the number/link rules. Attach-only; store cleared/restored by
// `wa-number.mjs` with the `gate-g` run label.
//
// usage: node gate-g.mjs cleared|saved
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, twoTabs } from "./_lib.mjs";

const mode = process.argv[2];
if (mode !== "cleared" && mode !== "saved") {
  console.error("usage: node gate-g.mjs cleared|saved");
  process.exit(2);
}

const RUNS = new URL("./runs/gate-g/", import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });
const saved = existsSync(`${RUNS}saved-number.json`)
  ? JSON.parse(readFileSync(`${RUNS}saved-number.json`, "utf8"))
  : null;
const digits = saved?.value.replace(/\D/g, "") ?? null;
const REASON = "No WhatsApp number is saved yet.";
const OFF_TEXT = "No number saved";
const INVENTED = ["2348000000000", "+234 800 000 0000"];

const CONTROLS = {
  headerChat: "#site-header .nav .wab",
  footerIcon: "#site-footer .sq a[aria-label^=\"WhatsApp\"]",
  footerButton: "#site-footer .wab.big",
  fab: "a.fab",
  homeChat: ".why .more a.btn",
  emptyChat: ".empty a.btn",
  carWa: "#wa",
  carOffer: "#of",
  carView: "#vw",
  carMbar: "#mw",
  nfChat: ".nfbox .wab.big",
  rootChat: "a.wab.big",
};

// `nfChat` first, then `rootChat`: on the root 404 both match the same anchor; it is counted once.
const PAGES = [
  { url: "/", name: "home", header: true, controls: ["headerChat", "footerIcon", "footerButton", "fab", "homeChat"] },
  { url: "/inventory", name: "inventory", header: true, controls: ["headerChat", "footerIcon", "footerButton", "fab"] },
  { url: "/inventory?min=999999999", name: "empty", header: true, controls: ["headerChat", "footerIcon", "footerButton", "fab", "emptyChat"] },
  { url: "/car/TS-1029", name: "car", header: true, controls: ["headerChat", "footerIcon", "footerButton", "carWa", "carOffer", "carView", "carMbar"] },
  { url: "/car/TS-999999", name: "missing-car", header: true, controls: ["headerChat", "footerIcon", "footerButton", "nfChat"] },
  { url: "/not-found", name: "site-404", header: true, controls: ["headerChat", "footerIcon", "footerButton", "nfChat"] },
  { url: "/gate-g-no-such-page", name: "root-404", header: false, controls: ["rootChat"] },
  { url: "/privacy", name: "privacy", header: true, controls: ["headerChat", "footerIcon", "footerButton"] },
];

const WIDTHS = [375, 1440];
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
  await page.waitForSelector("body", { timeout: 180000 }).catch(() => {});
  await page
    .waitForFunction(
      ({ want, number }) => {
        const infs = [...document.querySelectorAll("#site-header .inf")];
        const block = infs.find((el) => el.querySelector("small")?.textContent.trim() === "WhatsApp");
        const b = block?.querySelector("b");
        if (!b) return true; // root 404: no site header; the control check covers it
        const t = b.textContent.replace(/\u00a0/g, "").trim();
        return want === "cleared" ? t === "No number saved" : t === number;
      },
      { want: mode, number: saved?.value ?? "" },
      { timeout: 30000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1500);
}

const readPage = (keys) =>
  page.evaluate(
    ({ selectors, keys, invented }) => {
      const seen = new Set();
      const anchors = [...document.querySelectorAll("a")];
      const waHrefs = [];
      for (const a of anchors) {
        const href = a.getAttribute("href") ?? "";
        if (!href.includes("wa.me")) continue;
        if (!seen.has(a)) {
          seen.add(a);
          waHrefs.push({ href, text: a.textContent.replace(/\s+/g, " ").trim().slice(0, 50) });
        }
      }

      const controls = {};
      for (const key of keys) {
        const el = document.querySelector(selectors[key]);
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
      const text = document.body.innerText;
      const contact = document.querySelector("section#contact a");
      return {
        path: location.pathname + location.search,
        header: !!document.querySelector("#site-header"),
        headerNumber: numEl?.textContent.replace(/\u00a0/g, " ").trim() ?? null,
        headerTitle: numEl?.getAttribute("title") ?? null,
        waCount: waHrefs.length,
        waHrefs,
        invented: invented.map((literal) => ({
          literal,
          inText: text.includes(literal),
          inHref: anchors.some((a) => (a.getAttribute("href") ?? "").includes(literal)),
        })),
        privacyContact: contact
          ? { present: true, href: contact.getAttribute("href"), text: contact.textContent.trim() }
          : { present: false },
        controls,
      };
    },
    { selectors: CONTROLS, keys, invented: INVENTED },
  );

const r = { when: new Date().toISOString(), mode, base: BASE, ua, savedValue: saved?.value ?? null, digits, readings: {} };
const problems = [];

function checkControls(label, read) {
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
      if (!(c.href ?? "").startsWith(`https://wa.me/${digits}`)) problems.push(`${at}: href is ${c.href}`);
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

    for (const p of PAGES) {
      const label = `${mode} ${width} ${p.name}`;
      await goto(p.url);
      const read = await readPage(p.controls);
      read.width = width;
      read.mode = mode;
      read.name = p.name;
      r.readings[`${width}|${p.name}`] = read;

      if (p.header) {
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
      }

      for (const check of read.invented) {
        if (check.inText || check.inHref) problems.push(`${label}: invented ${check.literal} present`);
      }

      if (mode === "cleared") {
        if (read.waCount !== 0) problems.push(`${label}: ${read.waCount} wa.me link(s) still built`);
        if (p.name === "privacy" && read.privacyContact.present)
          problems.push(`${label}: privacy contact is still an anchor`);
      } else {
        if (read.waCount === 0) problems.push(`${label}: no live wa.me link`);
        for (const a of read.waHrefs) {
          if (!a.href.startsWith(`https://wa.me/${digits}`))
            problems.push(`${label}: link ${a.href}`);
          if (a.href.startsWith("https://wa.me/?") || a.href === "https://wa.me")
            problems.push(`${label}: dead recipient ${a.href}`);
        }
        if (p.name === "privacy") {
          if (!read.privacyContact.present)
            problems.push(`${label}: privacy contact has no anchor`);
          else if (read.privacyContact.href !== `https://wa.me/${digits}`)
            problems.push(`${label}: privacy contact href is ${read.privacyContact.href}`);
        }
      }

      checkControls(label, read);

      if (["missing-car", "site-404", "root-404", "privacy"].includes(p.name)) {
        if (mode === "cleared" || width === 1440) await shot(`${mode}-${width}-${p.name}`);
      }
    }
  }

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

  const expected404 = httpErrors.filter((e) => e.status === 404);
  const unexpectedHttp = httpErrors.filter((e) => e.status !== 404);
  const known404 = (e) =>
    ["/car/TS-999999", "/not-found", "/gate-g-no-such-page"].some((u) => e.url.endsWith(u));
  const unexpected404 = expected404.filter((e) => !known404(e));
  r.problems = problems;
  r.consoleErrorTexts = consoleErrors;
  r.httpErrors = httpErrors;
  r.verdict = {
    problems: problems.length,
    // The intentionally-missing documents are the only 4xx expected here.
    http404: expected404.length,
    unexpected404: unexpected404.length,
    unexpectedHttp: unexpectedHttp.length,
    console: consoleErrors.length,
  };
  r.pass = problems.length === 0 && unexpectedHttp.length === 0 && unexpected404.length === 0;

  console.log(`${mode.toUpperCase()}: ${r.pass ? "PASS" : "FAIL"} · ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 30)) console.log(`  FAIL ${p}`);
  for (const [where, read] of Object.entries(r.readings)) {
    const visible = Object.entries(read.controls)
      .filter(([, c]) => c.visible)
      .map(([k]) => k);
    console.log(
      `  ${where}: header=${JSON.stringify(read.headerNumber)} wa=${read.waCount} privacy=${read.privacyContact.present} visible=${visible.join(",")}`,
    );
  }
  console.log(`  http404=${expected404.length} unexpectedHttp=${unexpectedHttp.length} console=${consoleErrors.length}`);
} finally {
  r.chromium = `${before} -> ${chromiumCount()} (no launch)`;
  writeFileSync(`${RUNS}${mode}.json`, JSON.stringify(r, null, 2) + "\n");
  console.log(r.chromium);
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => {});
  await detach(browser);
}
