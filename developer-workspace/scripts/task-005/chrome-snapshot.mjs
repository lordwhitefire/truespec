// A before/after snapshot of the site chrome, for the waiting-line refactor (plan Task 8a).
// Reads #site-header / #site-footer / a.fab outerHTML at the given URL; writes them to the given
// file. Attach-only, read-only.
import { writeFileSync } from "node:fs";
import { BASE, attach, assertOurs, detach, twoTabs } from "./_lib.mjs";

const url = process.argv[2] || "/";
const out = process.argv[3];
if (!out) throw new Error("usage: chrome-snapshot.mjs <path> <outfile>");
const browser = await attach();
try {
  await assertOurs(browser);
  const { b: page } = await twoTabs(browser);
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForFunction(
    () => {
      const h = document.querySelector("#site-header");
      if (!h) return false;
      const owned = (el) => Object.keys(el).some((k) => k.startsWith("__reactProps"));
      return owned(h) || [...h.querySelectorAll("*")].some(owned);
    },
    { timeout: 45000 },
  );
  const snap = await page.evaluate(() => ({
    header: document.querySelector("#site-header")?.outerHTML ?? null,
    footer: document.querySelector("#site-footer")?.outerHTML ?? null,
    fab: document.querySelector("a.fab")?.outerHTML ?? null,
    number: document.querySelector("#top .inf b")?.textContent ?? null,
  }));
  writeFileSync(out, JSON.stringify(snap, null, 2));
  console.log(`${url} → ${out} (header ${snap.header?.length ?? 0} chars, footer ${snap.footer?.length ?? 0}, number ${snap.number})`);
} finally {
  await detach(browser);
}
