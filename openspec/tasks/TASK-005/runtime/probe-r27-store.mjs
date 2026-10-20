// TASK-005 research probe — R2.7: what extremes the real store actually holds (READ-ONLY).
// Answers: is there a very long car name? a car with no photos? an enquiry with no note? how long is a list?
// Attach-only CDP :9222, GETs only, no screenshots, detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const BASE = "http://127.0.0.1:3210";

  // ---- A. Office inventory: how many rows, how long is the longest name, how many photos each ----
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2000);
  const inv = await page.evaluate(() => {
    const headers = [...document.querySelectorAll(".tbl thead th")].map((th) => th.innerText.trim());
    const rows = [...document.querySelectorAll(".tbl tbody tr")];
    const data = rows.map((tr) => {
      const cells = [...tr.querySelectorAll("td")].map((td) => td.innerText.replace(/\s+/g, " ").trim());
      const imgs = tr.querySelectorAll("img").length;
      return { cells, imgs, text: tr.innerText.replace(/\s+/g, " ").trim().slice(0, 90) };
    });
    const paging = [...document.querySelectorAll("button, a")]
      .map((e) => e.innerText.replace(/\s+/g, " ").trim().toLowerCase())
      .filter((t) => /load more|show more|next|prev|page \d|older/.test(t));
    return { headers, count: rows.length, data, paging, docH: document.documentElement.scrollHeight, viewH: window.innerHeight };
  });
  console.log(`OFFICE INVENTORY — ${inv.count} rows · page height ${inv.docH}px vs viewport ${inv.viewH}px`);
  console.log(`  headers: ${inv.headers.join(" | ")}`);
  console.log(`  paging/load-more controls: ${inv.paging.length ? JSON.stringify(inv.paging) : "NONE"}`);
  const withLen = inv.data.map((d) => ({ ...d, len: Math.max(...d.cells.map((c) => c.length)) }));
  withLen.sort((a, b) => b.len - a.len);
  console.log("  longest rows by longest cell:");
  for (const d of withLen.slice(0, 5)) console.log(`    len=${d.len} imgs=${d.imgs}  "${d.text}"`);
  const noImg = inv.data.filter((d) => d.imgs === 0);
  console.log(`  rows with no <img>: ${noImg.length}${noImg.length ? " → " + JSON.stringify(noImg.slice(0, 3).map((d) => d.text)) : ""}`);

  // ---- B. Office enquiries: how many, and which have no note ----
  await page.goto(BASE + "/office/enquiries", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2000);
  const enq = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".card, .ecard, [class*=enq]")].filter((e) => e.querySelector("a[href^='/office/enquiries/'], h3, h4"));
    const body = document.body.innerText;
    const noNote = (body.match(/Nothing noted yet/gi) || []).length;
    return { cards: cards.length, noNote, hasSnippet: body.slice(0, 400).replace(/\s+/g, " ") };
  });
  console.log(`\nOFFICE ENQUIRIES — candidate cards ${enq.cards} · "Nothing noted yet" occurrences ${enq.noNote}`);
  console.log(`  page text head: ${enq.hasSnippet.slice(0, 240)}`);

  // ---- C. Showroom inventory: how many cards, longest name ----
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2000);
  const site = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("a.card")];
    const names = cards.map((c) => c.innerText.replace(/\s+/g, " ").trim().slice(0, 80));
    const nameEl = document.querySelector("a.card h3, a.card h4, a.card b, a.card strong");
    let nameStyle = null;
    if (nameEl) {
      const cs = getComputedStyle(nameEl);
      nameStyle = { sel: nameEl.tagName.toLowerCase() + "." + nameEl.className, whiteSpace: cs.whiteSpace, overflowWrap: cs.overflowWrap, wordBreak: cs.wordBreak, lineClamp: cs.webkitLineClamp };
    }
    const longest = names.reduce((a, b) => (b.length > (a?.length ?? 0) ? b : a), null);
    return { count: cards.length, longest, nameStyle, paging: [...document.querySelectorAll("button, a")].map((e) => e.innerText.trim().toLowerCase()).filter((t) => /load more|show more|older/.test(t)) };
  });
  console.log(`\nSHOWROOM INVENTORY — ${site.count} cards`);
  console.log(`  longest card text: "${site.longest}"`);
  console.log(`  paging controls: ${site.paging.length ? JSON.stringify(site.paging) : "NONE"}`);
  console.log(`  name element style: ${JSON.stringify(site.nameStyle)}`);

  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
