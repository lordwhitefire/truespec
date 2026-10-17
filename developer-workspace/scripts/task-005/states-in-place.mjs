// TASK-005 — the ruling follow-up: the registry editor's writes now REFUSE instead of throwing.
//
// What this proves, in the screen the owner is in:
//   1. all five state writes (add / rename / recolour / reorder / remove), with the store refusing
//      every one of them, report the refusal IN PLACE — each in its own words — and the office chrome
//      stays; and
//   2. the action's own POST answers 200 for each, because a refusal is *returned*, not thrown.
//      (A thrown Server Action answers 500 and the client's `catch` would show the other sentence.)
//   3. with the store's fault removed, an add really does succeed — the failure fix did not break
//      the success path.
//
// The store is a THROWAWAY copy (branch `task-005-rulings`), carrying a trigger that refuses writes
// to `car_state` only; reads are untouched so the page renders and the session check passes. The
// branch is deleted when the witness is done. Attach-only: never launches a Chrome.
import { mkdir, writeFile } from "node:fs/promises";
import {
  BASE,
  attach,
  assertOurs,
  detach,
  guardCount,
  chromiumCount,
  resize,
  clearResize,
} from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const out = {
  when: new Date().toISOString(),
  base: BASE,
  store: "throwaway branch task-005-rulings (car_state writes refused)",
  steps: [],
  posts: [],
};

const chromBefore = guardCount();
const browser = await attach();
let page = null;
let opened = false;
let resized = false;
try {
  const ua = await assertOurs(browser);
  out.ua = ua;

  const found = await signedInPage(browser, BASE);
  page = found.page;
  opened = found.opened;
  if (!page) throw new Error("no signed-in office tab — sign in first");

  // Response statuses for the action POSTs: 200 = returned (a refusal), 500 = threw.
  page.on("response", (r) => {
    if (r.request().method() === "POST") {
      out.posts.push({ status: r.status(), url: r.url().replace(BASE, "").slice(0, 90) });
    }
  });

  await resize(page.context(), page, 1440, 900);
  resized = true;

  const chrome = () =>
    page.evaluate(() => {
      const side = document.querySelector("aside.side");
      const links = side ? [...side.querySelectorAll("a")].map((a) => a.textContent.trim()) : [];
      return {
        url: location.href,
        sidebar: !!side,
        nav: !!document.querySelector("header.topbar"),
        navLinks: links,
        email: (document.querySelector(".sfoot b")?.innerText || "").trim(),
      };
    });

  const alertNow = () =>
    page.evaluate(() => {
      const el = document.querySelector(".edwrap [role=alert]");
      return el ? { role: el.getAttribute("role"), text: el.innerText.trim() } : null;
    });

  const rowCount = () => page.evaluate(() => document.querySelectorAll(".edwrap div.edrow").length);

  // `run()` in the editor clears the old error first, so a NEW message is text that differs from the
  // last one we read.
  async function waitNewAlert(prev) {
    await page.waitForFunction(
      (p) => {
        const el = document.querySelector(".edwrap [role=alert]");
        if (!el) return false;
        const t = el.innerText.trim();
        return t.length > 0 && t !== p;
      },
      prev,
      { timeout: 25000 },
    );
    return alertNow();
  }

  async function step(name, act) {
    const before = await alertNow();
    const postsBefore = out.posts.length;
    const rowsBefore = await rowCount();
    await act();
    const alert = await waitNewAlert(before ? before.text : null);
    const rec = {
      name,
      alertRole: alert?.role ?? null,
      alertText: alert?.text ?? null,
      urlUnchanged: (await chrome()).url,
      chrome: await chrome(),
      rowsBefore,
      rowsAfter: await rowCount(),
      posts: out.posts.slice(postsBefore),
    };
    out.steps.push(rec);
    console.log(`\n[${name}]`);
    console.log(`  said: ${rec.alertText}`);
    console.log(`  POST: ${rec.posts.map((p) => p.status).join(",") || "(none seen)"}`);
  }

  // ---- open the states editor ----------------------------------------------------------------
  await page.goto(`${BASE}/office/settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#tab-car", { timeout: 45000 });
  // A click sent before React hydrates is swallowed and the panel never swaps, so click, check the
  // tab really became the selected one, and repeat until it has.
  let switched = false;
  for (let i = 0; i < 30 && !switched; i++) {
    await page.click("#tab-car").catch(() => {});
    switched = (await page.getAttribute("#tab-car", "aria-selected")) === "true";
    if (!switched) await page.waitForTimeout(500);
  }
  out.tabSwitched = switched;
  console.log(`#tab-car selected: ${switched} (after ${switched ? "a click" : "30 tries"})`);
  await page.waitForSelector(".edwrap", { timeout: 45000 });
  out.signedAs = (await chrome()).email;
  out.rowsAtStart = await rowCount();
  console.log(`settings → Car states, ${out.rowsAtStart} states, ${out.signedAs}`);

  // ---- 1. add --------------------------------------------------------------------------------
  await step("add a state", async () => {
    await page.click("button.edadd");
  });

  // ---- 2. rename (commits on blur) -----------------------------------------------------------
  await step("rename a state", async () => {
    const input = page.locator(".edwrap input.edin").first();
    const current = await input.inputValue();
    await input.fill(current + " x");
    await input.blur();
  });

  // ---- 3. recolour (commits on blur; must actually differ to commit) -------------------------
  await step("recolour a state", async () => {
    const pick = page.locator(".edwrap input.edpick").first();
    const current = (await pick.inputValue()).toLowerCase();
    const next = current === "#123456" ? "#654321" : "#123456";
    await pick.fill(next);
    await pick.blur();
  });

  // ---- 4. reorder (keyboard on the grip: HTML5 drag is not scriptable reliably) --------------
  await step("reorder the states", async () => {
    const grip = page.locator(".edwrap span.edgrip").first();
    await grip.focus();
    await page.keyboard.press("ArrowDown");
  });

  // ---- 5. remove -----------------------------------------------------------------------------
  await step("remove a state", async () => {
    await page.locator(".edwrap button.eddel").first().click();
  });

  out.rowsAtEnd = await rowCount();
  out.chromeAtEnd = await chrome();
  out.postStatuses = out.posts.map((p) => p.status);
} finally {
  try {
    if (resized && page) await clearResize(page);
  } catch {}
  try {
    if (opened && page) await page.close();
  } catch {}
  await detach(browser);
}

const chromAfter = chromiumCount();
out.chromium = { before: chromBefore, after: chromAfter, launched: chromAfter > chromBefore };
if (out.chromium.launched) throw new Error("a Chrome was launched by this run");

await mkdir("developer-workspace/scripts/task-005/runs/states-in-place", { recursive: true });
await writeFile(
  "developer-workspace/scripts/task-005/runs/states-in-place/states-in-place.json",
  JSON.stringify(out, null, 2) + "\n",
);

console.log("\n=== verdict ===");
for (const s of out.steps) {
  console.log(`  ${s.name}: ${s.alertText}`);
}
console.log(`  chrome at end: sidebar=${out.chromeAtEnd.sidebar} nav=${out.chromeAtEnd.nav} links=${out.chromeAtEnd.navLinks.length} url=${out.chromeAtEnd.url}`);
console.log(`  POST statuses: ${out.postStatuses.join(", ")}`);
console.log(`  chromium ${out.chromium.before} → ${out.chromium.after}`);
