// TASK-005 — the other half of the ruling follow-up: with the store's fault REMOVED, the registry
// editor's writes still succeed.
//
// The refusal fix must not have broken the happy path: an add really adds (a row appears, no
// refusal), and a remove really removes (the row goes, no refusal). Run against the throwaway copy
// with the refusing trigger dropped; the copy is deleted afterwards.
import { mkdir, writeFile } from "node:fs/promises";
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount, resize, clearResize } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const out = { when: new Date().toISOString(), base: BASE, store: "throwaway copy, refusing trigger dropped", steps: [] };
const chromBefore = guardCount();
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

  const posts = [];
  page.on("response", (r) => {
    if (r.request().method() === "POST") posts.push(r.status());
  });

  await resize(page.context(), page, 1440, 900);
  resized = true;

  const rows = () => page.evaluate(() => document.querySelectorAll(".edwrap div.edrow").length);
  const alertNow = () =>
    page.evaluate(() => {
      const el = document.querySelector(".edwrap [role=alert]");
      return el ? el.innerText.trim() : null;
    });
  const labels = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".edwrap .edrow")].map((r) => r.querySelector("input.edin")?.value ?? null),
    );

  await page.goto(`${BASE}/office/settings`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#tab-car", { timeout: 45000 });
  let switched = false;
  for (let i = 0; i < 30 && !switched; i++) {
    await page.click("#tab-car").catch(() => {});
    switched = (await page.getAttribute("#tab-car", "aria-selected")) === "true";
    if (!switched) await page.waitForTimeout(500);
  }
  await page.waitForSelector(".edwrap", { timeout: 45000 });

  const before = { rows: await rows(), labels: await labels() };
  out.before = before;
  console.log(`before: ${before.rows} rows — ${before.labels.filter(Boolean).join(", ")}`);

  // ---- add really adds ------------------------------------------------------------------------
  await page.click("button.edadd");
  await page.waitForFunction((n) => document.querySelectorAll(".edwrap div.edrow").length === n + 1, before.rows, {
    timeout: 25000,
  });
  const added = { rows: await rows(), labels: await labels(), alert: await alertNow(), posts: posts.slice() };
  out.steps.push({ name: "add succeeds", ...added });
  console.log(`after add: ${added.rows} rows — alert=${added.alert} — POST ${added.posts.join(",")}`);

  const newLabel = added.labels.find((l) => l && !before.labels.includes(l));
  out.newLabel = newLabel ?? null;
  if (!newLabel) throw new Error("could not tell which label was added");

  // ---- remove really removes ------------------------------------------------------------------
  await page.click(`.edwrap button.eddel[aria-label="Delete ${newLabel}"]`);
  await page.waitForFunction((n) => document.querySelectorAll(".edwrap div.edrow").length === n - 1, added.rows, {
    timeout: 25000,
  });
  const removed = { rows: await rows(), alert: await alertNow(), posts: posts.slice() };
  out.steps.push({ name: "remove succeeds", ...removed, labelRemoved: newLabel });
  console.log(`after remove: ${removed.rows} rows — alert=${removed.alert} — POST ${removed.posts.join(",")}`);

  out.after = { rows: removed.rows, labels: await labels() };
  out.netZero = removed.rows === before.rows;
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
  "developer-workspace/scripts/task-005/runs/states-in-place/states-success.json",
  JSON.stringify(out, null, 2) + "\n",
);

console.log(`\nnet-zero on the copy: ${out.netZero} (${out.before.rows} → ${out.after.rows})`);
