// TASK-005 research probe — R2.6f: does the office bottom bar cover the last content, and does the
// car page's mobile action bar appear only at phone/tablet width? Attach-only CDP :9222, read-only.
import { chromium } from "playwright-core";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222", { timeout: 15000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  // ---- A. bottom-bar overlap, measured at the very bottom of the page ----
  console.log("== A. office bottom bar vs the last content (scrolled to the bottom) ==");
  for (const path of ["/office", "/office/inventory", "/office/settings"]) {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("http://127.0.0.1:3210" + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(1800);
    const f = await page.evaluate(async () => {
      // scroll all the way down (twice, in case of late layout)
      for (let i = 0; i < 3; i++) {
        window.scrollTo(0, document.documentElement.scrollHeight);
        await new Promise((r) => setTimeout(r, 350));
      }
      const nav = document.querySelector(".bnav");
      const navTop = nav ? nav.getBoundingClientRect().top : null;
      // the lowest element that is actually painted (sample a column of points down the page)
      let lowest = null;
      const main = document.querySelector(".main") ?? document.body;
      for (const el of main.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.height < 8 || r.width < 30) continue;
        if (r.bottom <= window.innerHeight - 400) continue; // only the tail
        if (!lowest || r.bottom > lowest.bottom) lowest = { bottom: r.bottom, tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40), text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 40) };
      }
      return {
        scrollY: Math.round(window.scrollY),
        pageH: document.documentElement.scrollHeight,
        viewportH: window.innerHeight,
        navTop: navTop === null ? null : Math.round(navTop),
        lowest,
      };
    });
    const covered = f.lowest && f.navTop !== null ? f.lowest.bottom > f.navTop : null;
    console.log(`  ${path} @390  page=${f.pageH} scrolledTo=${f.scrollY}  bnav top=${f.navTop}`);
    console.log(`      lowest content: ${f.lowest ? `${f.lowest.tag}.${f.lowest.cls} bottom=${Math.round(f.lowest.bottom)} "${f.lowest.text}"` : "none"}`);
    console.log(`      → ${covered === null ? "n/a" : covered ? "COVERED by the bottom bar" : "clear of the bottom bar"}`);
  }

  // ---- B. car page mobile action bar ----
  console.log("\n== B. car page: mobile action bar (.mbar) by width ==");
  for (const W of [1440, 1024, 820, 390]) {
    await page.setViewportSize({ width: W, height: 900 });
    await page.goto("http://127.0.0.1:3210/car/TS-1001", { waitUntil: "domcontentloaded", timeout: 60000 });
    await sleep(1500);
    const f = await page.evaluate(() => {
      const mbar = document.querySelector(".mbar");
      const vis = mbar ? getComputedStyle(mbar).display !== "none" && mbar.getBoundingClientRect().height > 0 : false;
      return { mbar: vis, mbarText: mbar ? mbar.innerText.replace(/\s+/g, " ").trim().slice(0, 60) : null };
    });
    console.log(`  @${W}px  .mbar visible=${f.mbar}${f.mbar ? `  text="${f.mbarText}"` : ""}`);
  }

  console.log("\ndone — read-only");
} finally {
  browser.close().catch(() => {});
  console.log("detached");
}
