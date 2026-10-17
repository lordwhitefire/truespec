// Diagnostic: what the settings save does to the screen, and why a toast is hard to catch.
//
// The drive's own recorder watched `#toast` closely and saw nothing, while the store proved the save
// ran and wrote nothing (the no-op arm). Two explanations fit: the client component is remounted by
// the action's revalidation (the node the observer watched is replaced), or the page reloads. This
// records from `document.body` instead — so a replaced node cannot hide the toast — and plants a
// marker to tell a reload from a re-render.
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const before = guardCount();
const browser = await attach();
let page = null;
let opened = false;
let resized = false;
try {
  await assertOurs(browser);
  const found = await signedInPage(browser, BASE);
  page = found.page;
  opened = found.opened;
  if (!page) throw new Error("no signed-in office tab");
  await resize(page.context(), page, 1440, 900);
  resized = true;

  const posts = [];
  page.on("response", (res) => {
    if (res.request().method() === "POST") posts.push({ status: res.status(), url: res.url().slice(0, 80) });
  });
  const console_ = [];
  page.on("console", (m) => console_.push(`${m.type()}: ${m.text().slice(0, 200)}`));

  await page.goto(`${BASE}/office/settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#waSave", { timeout: 45000 });
  await page.waitForFunction(() => document.querySelectorAll("nextjs-portal").length > 0, { timeout: 60000 });

  // Arm a body-level recorder + a reload marker.
  await page.evaluate(() => {
    window.__marker = "armed-" + Date.now();
    window.__log = [];
    window.__rec = () => {
      const toast = document.querySelector("#toast");
      const msg = (document.querySelector("#tmsg")?.innerText || "").trim();
      const shown = !!toast && toast.className.includes("show");
      window.__log.push({ ms: Date.now(), shown, msg, toastPresent: !!toast, msgPresent: !!document.querySelector("#tmsg") });
    };
    window.__obs = new MutationObserver(window.__rec);
    window.__obs.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  });

  const stored = await page.locator("#wa").inputValue();
  const typed = `0${stored.slice(4)}`.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3");
  await page.locator("#wa").fill(typed);
  const dirtyBefore = await page.locator("#waDirty").isVisible();

  await page.locator("#waSave").click();
  await page.waitForFunction(() => document.querySelector("#waSave")?.disabled === true, { timeout: 45000 });
  await page.waitForTimeout(2500);

  const after = await page.evaluate(() => ({
    markerStillThere: window.__marker,
    log: (window.__log ?? []).filter((x) => x.shown || x.msg).slice(-40),
    logCount: (window.__log ?? []).length,
    toastClass: document.querySelector("#toast")?.className ?? null,
    msgText: (document.querySelector("#tmsg")?.innerText || "").trim(),
    waValue: document.querySelector("#wa")?.value ?? null,
    dirtyVisible: !document.querySelector("#waDirty")?.hidden,
    audits: [...document.querySelectorAll("p.audit")].map((el) => el.innerText.replace(/\s+/g, " ").trim()),
    url: location.href,
  }));

  console.log(JSON.stringify({ stored, typed, dirtyBefore, posts, after, console: console_.slice(-6) }, null, 2));
} finally {
  if (resized && page) await clearResize(page).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const a = chromiumCount();
  console.log(`\nchromium ${before} → ${a}`);
  await detach(browser);
}
