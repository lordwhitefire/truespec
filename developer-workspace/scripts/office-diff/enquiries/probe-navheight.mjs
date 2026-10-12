// probe-navheight.mjs — measure the shared sidebar footer/nav height on both
// sides, to confirm the footer row pin restored parity. Not the compare pipeline
// (the owner asked for no re-compare); a single geometry read.
import { connect, twoTabs, detach } from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";

const browser = await connect();
const { a } = await twoTabs(browser);

async function measure(label, url) {
  await a.setViewportSize({ width: 1440, height: 900 });
  await a.goto(url, { waitUntil: "load" });
  await a.waitForTimeout(500);
  const r = await a.evaluate(() => {
    const g = (el, p) => (el ? getComputedStyle(el)[p] : null);
    return {
      nav: g(document.querySelector(".sn"), "height"),
      sfoot: g(document.querySelector(".sfoot"), "height"),
      sfootA: g(document.querySelector(".sfoot a"), "height"),
      srow: g(document.querySelector(".sfoot .srow"), "height"),
    };
  });
  console.log(label.padEnd(6), JSON.stringify(r));
}

await measure("ref", "http://localhost:3211/office-enquiries.html");
await measure("build", "http://localhost:3210/office/enquiries");
await detach(browser);
