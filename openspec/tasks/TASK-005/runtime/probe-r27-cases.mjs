// TASK-005 research probe — R2.7c: the cost-incomplete car, the showroom zero-row, the drafts notes,
// and a LABELLED synthetic long-name test. Attach-only CDP :9222, GETs only, detach on exit.
// The only DOM change is one synthetic long name, restored by a reload immediately after; nothing is sent
// to the server and the store is untouched.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const BASE = "http://127.0.0.1:3210";
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- 1. the car whose costs are incomplete (TS-1029), office view ----
  await page.goto(BASE + "/office/car/TS-1029", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const inc = await page.evaluate(() => {
    const body = document.body.innerText.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
    const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
    const idx = lines.findIndex((l) => /cost/i.test(l));
    const money = lines.filter((l) => /₦|incomplete/i.test(l)).slice(0, 14);
    const thumbs = document.querySelectorAll(".aside img, .thumbs img, .ph img").length;
    return { money, aroundCost: lines.slice(Math.max(0, idx - 2), idx + 8), thumbs, hasIncomplete: /incomplete/i.test(body) };
  });
  console.log(`1. OFFICE CAR TS-1029 (the seeded incomplete-costs car)`);
  console.log(`   "incomplete" appears: ${inc.hasIncomplete}  · photo thumbnails: ${inc.thumbs}`);
  console.log(`   money lines: ${JSON.stringify(inc.money)}`);
  console.log(`   around the cost block: ${JSON.stringify(inc.aroundCost)}`);

  // ---- 2. the same car, showroom view ----
  await page.goto(BASE + "/car/TS-1029", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2000);
  const pub = await page.evaluate(() => {
    const body = document.body.innerText.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
    const money = body.split("\n").map((l) => l.trim()).filter((l) => /₦|incomplete|price/i.test(l)).slice(0, 10);
    const thumbs = document.querySelectorAll(".thumbs button, .thumbs img").length;
    return { money, thumbs, h1: document.querySelector("h1")?.innerText.trim() };
  });
  console.log(`\n2. SHOWROOM CAR TS-1029  h1="${pub.h1}"  gallery bits=${pub.thumbs}`);
  console.log(`   money lines: ${JSON.stringify(pub.money)}`);

  // ---- 3. showroom inventory: push the price filter to match nothing ----
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const minBox = await page.$('input[placeholder="Min"]');
  if (minBox) { await minBox.fill("999000000"); await sleep(1100); }
  const emptySite = await page.evaluate(() => {
    const cards = document.querySelectorAll("a.card").length;
    const body = document.body.innerText.replace(/\s+/g, " ");
    const m = body.match(/Nothing matches[^.]*\.|Nothing here[^.]*\./i);
    const clear = [...document.querySelectorAll("button, a")].map((e) => e.innerText.trim()).filter((t) => /clear/i.test(t));
    return { cards, msg: m ? m[0].trim() : null, clear };
  });
  console.log(`\n3. SHOWROOM INVENTORY, price filter matching nothing → cards=${emptySite.cards}`);
  console.log(`   wording: "${emptySite.msg}"`);
  console.log(`   clear controls offered: ${JSON.stringify(emptySite.clear)}`);

  // ---- 4. drafts: the four waiting enquiries, and whether any has no note ----
  await page.goto(BASE + "/office/drafts", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const drafts = await page.evaluate(() => {
    const body = document.body.innerText.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n");
    const parts = body.split(/NOTE/i);
    const notes = parts.slice(1).map((p) => p.split(/\n/)[0].trim().slice(0, 40));
    const waiting = (body.match(/(\d+)\s+enquir(?:y|ies)\s+waiting/i) || [])[1] ?? null;
    return { notes, waiting, count: parts.length - 1 };
  });
  console.log(`\n4. OFFICE DRAFTS → "${drafts.waiting} enquiries waiting" · NOTE fields found: ${drafts.count}`);
  console.log(`   notes in order: ${JSON.stringify(drafts.notes)}`);

  // ---- 5. SYNTHETIC long-name test (labelled; client-side only, reloaded straight after) ----
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2200);
  const long = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("a.card")];
    const first = cards[0];
    const h = first.querySelector("h3");
    if (!h) return { error: "no h3 in a card" };
    const original = h.innerText;
    const before = cards.slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().height));
    const beforeTop = cards.slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().top));
    // a genuinely long name — the kind a real listing can carry
    h.innerText = "Mercedes-Benz GLE 450 4MATIC AMG Line Premium Plus Night Package 7-Seat 2023 (Long-Wheelbase, Imported)";
    const after = cards.slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().height));
    const afterTop = cards.slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().top));
    const cs = getComputedStyle(h);
    return { original, before, after, beforeTop, afterTop, whiteSpace: cs.whiteSpace, overflow: cs.overflow, textOverflow: cs.textOverflow, lineHeight: cs.lineHeight, fontSize: cs.fontSize };
  });
  console.log(`\n5. SYNTHETIC long name on the first showroom card (client-side only; reload restores it)`);
  if (long.error) console.log(`   ${long.error}`);
  else {
    console.log(`   original name: "${long.original}"`);
    console.log(`   name style: white-space=${long.whiteSpace} overflow=${long.overflow} text-overflow=${long.textOverflow} font=${long.fontSize}/${long.lineHeight}`);
    console.log(`   card heights BEFORE: ${JSON.stringify(long.before)}`);
    console.log(`   card heights AFTER : ${JSON.stringify(long.after)}`);
    console.log(`   card tops    AFTER: ${JSON.stringify(long.afterTop)}`);
    console.log(`   → the name ${long.after[0] > long.before[0] ? "WRAPPED and grew the card" : "did NOT change the card height"}; same-row siblings ${long.after[1] === long.before[1] ? "unchanged (uneven row)" : "also grew (row stretches)"}`);
  }
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(600);

  console.log("\ndone — read-only (one synthetic name, reloaded away)");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
