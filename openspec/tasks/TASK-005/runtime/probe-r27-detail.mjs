// TASK-005 research probe — R2.7d: the exact wording of the incomplete-costs state, the dashboard's
// treatment of it, and the waiting drafts read cleanly. Attach-only CDP :9222, GETs only, detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const BASE = "http://127.0.0.1:3210";
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- 1. the exact COST / PROFIT cells in the office inventory table ----
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const cells = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".tbl tbody tr")];
    const out = [];
    for (const tr of rows) {
      const tds = [...tr.querySelectorAll("td")].map((td) => td.innerText.replace(/\s+/g, " ").trim());
      if (tds.some((t) => /incomplete/i.test(t))) out.push(tds);
    }
    return out;
  });
  console.log(`1. office inventory rows whose cells mention "incomplete": ${cells.length}`);
  for (const c of cells.slice(0, 4)) console.log(`   ${JSON.stringify(c)}`);

  // ---- 2. the dashboard's line about the incomplete car ----
  await page.goto(BASE + "/office", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const dash = await page.evaluate(() => {
    const body = document.body.innerText.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
    const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.filter((l) => /incomplete|still building|excluded|profit/i.test(l)).slice(0, 12);
  });
  console.log(`\n2. dashboard lines about incomplete costs:`);
  for (const l of dash) console.log(`   ${l}`);

  // ---- 3. the waiting drafts, split properly ----
  await page.goto(BASE + "/office/drafts", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const drafts = await page.evaluate(() => {
    const body = document.body.innerText.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
    const blocks = body.split(/WAITING ENQUIRY FROM FILE/i).slice(1);
    return blocks.map((b) => {
      const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
      const noteIdx = lines.findIndex((l) => /^NOTE$/i.test(l));
      const nameIdx = lines.findIndex((l) => /^NAME$/i.test(l));
      return {
        name: nameIdx >= 0 ? lines[nameIdx + 1] : null,
        asking: (() => { const i = lines.findIndex((l) => /^ASKED FOR$/i.test(l)); return i >= 0 ? lines[i + 1] : null; })(),
        note: noteIdx >= 0 ? lines[noteIdx + 1] : null,
        notePresent: noteIdx >= 0 ? !/^NOTE$/i.test(lines[noteIdx + 1] ?? "") : false,
      };
    });
  });
  console.log(`\n3. waiting drafts (${drafts.length}):`);
  for (const d of drafts) console.log(`   name=${JSON.stringify(d.name)} · asked for ${JSON.stringify(d.asking)} · note=${JSON.stringify(d.note)}`);

  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
