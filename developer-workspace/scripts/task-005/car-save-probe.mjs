// What the car form's save actually leaves on the screen — the surfaces, listed.
//
// The first drive clicked before hydration and the browser submitted the form itself; the hydration
// probe showed hydration lands ~5s after `domcontentloaded` in dev (the page is 1779 modules compiled
// on demand) and that a hydrated click really does POST. This lists every `role="status"` and
// `role="alert"` element with its words after a no-op save, so the drive can target the right one.
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const REF = "TS-1001";
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

  await page.goto(`${BASE}/office/car/${REF}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  // Hydration, as a signal rather than a wait: Next injects its dev portal into the DOM only once the
  // client bundle has run.
  await page.waitForFunction(() => document.querySelectorAll("nextjs-portal").length > 0, { timeout: 60000 });

  const posts = [];
  page.on("response", (r) => {
    if (r.request().method() === "POST") posts.push(r.status());
  });

  const urlBefore = page.url();
  await page.locator("#save").click();
  await page.waitForFunction(() => {
    const b = document.querySelector("#save");
    return !!b && !b.disabled;
  }, { timeout: 45000 });
  await page.waitForTimeout(1200);

  const tree = await page.evaluate(() => {
    const describe = (el) => {
      const path = [];
      for (let n = el; n && n !== document.body; n = n.parentElement) {
        path.unshift(`${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}${n.className ? "." + String(n.className).split(" ").join(".") : ""}`);
      }
      return { path: path.slice(-4).join(" > "), text: (el.innerText || "").replace(/\s+/g, " ").trim().slice(0, 160) };
    };
    return {
      statuses: [...document.querySelectorAll('[role="status"]')].map(describe),
      alerts: [...document.querySelectorAll('[role="alert"]')].map(describe),
      saveInsideForm: !!document.querySelector("#save")?.closest("form"),
      formCount: document.querySelectorAll("form").length,
      panelByClosestForm: (() => {
        const el = document.querySelector("#save")?.closest("form")?.querySelector('div[role="status"]');
        return el ? el.innerText.trim().slice(0, 160) : null;
      })(),
      toastShown: document.querySelector("#toast")?.className.includes("show") ?? null,
      toastText: (document.querySelector("#tmsg")?.innerText || "").trim().slice(0, 160),
    };
  });

  console.log(JSON.stringify({ urlBefore, urlAfter: page.url(), posts, ...tree }, null, 2));
} finally {
  if (resized && page) await clearResize(page).catch(() => {});
  if (opened && page) await page.close().catch(() => {});
  const after = chromiumCount();
  console.log(`\nchromium ${before} → ${after}`);
  await detach(browser);
}
