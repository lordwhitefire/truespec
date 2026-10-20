// TASK-005 research probe — R2.7b: the zero-row states and the specific extremes (READ-ONLY).
// Zero rows: office inventory search, office activity search, office drafts, the enquiries board.
// Extremes: a car with incomplete costs (TS-1029), a car with no photos, the showroom card sections.
// Attach-only CDP :9222, GETs only (a search is a client-side filter, writes nothing), detach on exit.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const out = [];
const log = (s) => { out.push(s); console.log(s); };

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const BASE = "http://127.0.0.1:3210";
  await page.setViewportSize({ width: 1440, height: 900 });

  // ---- 1. office inventory: search to zero ----
  await page.goto(BASE + "/office/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1800);
  const box = await page.$("input[type=search], input[type=text], .srch input");
  if (box) {
    await box.fill("zzzz-nothing-matches-zzzz");
    await sleep(900);
  }
  const emptyInv = await page.evaluate(() => {
    const body = document.body.innerText.replace(/\s+/g, " ");
    const rows = document.querySelectorAll(".tbl tbody tr").length;
    const cards = [...document.querySelectorAll(".cards > *")].filter((e) => e.offsetHeight > 0).length;
    const m = body.match(/[^.]*match[^.]*\.|[^.]*Nothing[^.]*\./i);
    return { rows, cards, msg: m ? m[0].trim() : null };
  });
  log(`1. OFFICE INVENTORY, search that matches nothing → table rows=${emptyInv.rows} visible cards=${emptyInv.cards}`);
  log(`   empty-state wording: "${emptyInv.msg}"`);

  // ---- 2. office activity: search to zero ----
  await page.goto(BASE + "/office/activity", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1800);
  const entries = await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").length);
  const box2 = await page.$("input[type=search], input[type=text], .srch input");
  if (box2) { await box2.fill("zzzz-nothing-matches-zzzz"); await sleep(900); }
  const emptyAct = await page.evaluate(() => {
    const body = document.body.innerText.replace(/\s+/g, " ");
    const m = body.match(/[^.]*matches[^.]*\.|[^.]*Nothing[^.]*\./i);
    return { textLen: body.length, msg: m ? m[0].trim() : null };
  });
  log(`\n2. OFFICE ACTIVITY, search that matches nothing → text length ${emptyAct.textLen}`);
  log(`   empty-state wording: "${emptyAct.msg}"`);

  // ---- 3. office drafts: the list as it stands ----
  await page.goto(BASE + "/office/drafts", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1800);
  const drafts = await page.evaluate(() => {
    const body = document.body.innerText.replace(/\s+/g, " ");
    const items = document.querySelectorAll(".draft-i, .draft, .list > li").length;
    const m = body.match(/No drafts[^.]*\.|[^.]*waiting[^.]*\./i);
    return { items, msg: m ? m[0].trim() : null, head: body.slice(0, 260) };
  });
  log(`\n3. OFFICE DRAFTS → list items ${drafts.items}`);
  log(`   wording: "${drafts.msg}"`);
  log(`   head: ${drafts.head}`);

  // ---- 4. enquiries board: what it actually renders with no enquiries ----
  await page.goto(BASE + "/office/enquiries", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(1800);
  const enq = await page.evaluate(() => {
    const cols = [...document.querySelectorAll(".col, .board > *")].map((c) => ({ head: c.innerText.split("\n")[0]?.trim().slice(0, 28), n: c.querySelectorAll(".card, article, li").length }));
    const body = document.body.innerText.replace(/\s+/g, " ");
    const m = body.match(/Nothing here[^.]*\./i);
    return { cols: cols.slice(0, 8), msg: m ? m[0].trim() : null, len: body.length, head: body.slice(120, 420) };
  });
  log(`\n4. OFFICE ENQUIRIES → columns: ${JSON.stringify(enq.cols)}`);
  log(`   "Nothing here right now." present: ${enq.msg ? "YES" : "no"} · page text length ${enq.len}`);
  log(`   what the board says: ${enq.head}`);

  // ---- 5. showroom inventory: sections, photo state, search to zero ----
  await page.goto(BASE + "/inventory", { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(2000);
  const sec = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("a.card")];
    const imgs = cards.map((c) => {
      const im = c.querySelector("img");
      return im ? (im.getAttribute("src") || "").length : -1; // -1 = no img element at all
    });
    const noImg = imgs.filter((n) => n === -1).length;
    const emptySrc = imgs.filter((n) => n === 0).length;
    const withSrc = imgs.filter((n) => n > 0).length;
    const heads = [...document.querySelectorAll("h2, .sec-h, .stitle")].map((h) => h.innerText.replace(/\s+/g, " ").trim().slice(0, 40)).filter(Boolean);
    return { total: cards.length, noImg, emptySrc, withSrc, heads: heads.slice(0, 8) };
  });
  log(`\n5. SHOWROOM INVENTORY → ${sec.total} cards · with a photo src ${sec.withSrc} · empty src ${sec.emptySrc} · no <img> at all ${sec.noImg}`);
  log(`   section headings: ${JSON.stringify(sec.heads)}`);

  const box3 = await page.$("input[type=search], input[type=text], .srch input, input[placeholder]");
  if (box3) { await box3.fill("zzzz-nothing-matches-zzzz"); await sleep(1000); }
  const emptySite = await page.evaluate(() => {
    const body = document.body.innerText.replace(/\s+/g, " ");
    const cards = document.querySelectorAll("a.card").length;
    const m = body.match(/Nothing matches[^.]*\.|Nothing here[^.]*\./i);
    return { cards, msg: m ? m[0].trim() : null };
  });
  log(`   search that matches nothing → cards=${emptySite.cards}`);
  log(`   empty-state wording: "${emptySite.msg}"`);

  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
