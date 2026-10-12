import { chromium } from "playwright-core";

const b = await chromium.connectOverCDP("http://127.0.0.1:9222");
const ctx = b.contexts()[0];

async function probe(url) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const d = await page.evaluate(() => {
      const pr = document.querySelector(".pr");
      const pan = pr ? pr.closest(".panel2") : null;
      const pb = pan ? pan.querySelector(".pb") : null;
      const num = document.querySelector("#p-profit");
      const sub = document.querySelector("#p-psub");
      const pl = pb ? pb.querySelector(".pl span") : null;
      const txtLeft = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return +(r.left + parseFloat(getComputedStyle(el).paddingLeft)).toFixed(1);
      };
      const B = (el) => (el ? +el.getBoundingClientRect().bottom.toFixed(1) : null);
      return {
        panel_left: pan ? +pan.getBoundingClientRect().left.toFixed(1) : null,
        rows_text_left: txtLeft(pl),
        profit_num_text_left: txtLeft(num),
        profit_sub_text_left: txtLeft(sub),
        panel_bottom: B(pan),
        strip_bottom: B(pr),
      };
    });
    console.log(url);
    console.log("  " + JSON.stringify(d));
  } finally {
    await page.close();
  }
}

await probe("http://localhost:3211/office-car.html");
await probe("http://localhost:3210/office/car");
await b.close();
