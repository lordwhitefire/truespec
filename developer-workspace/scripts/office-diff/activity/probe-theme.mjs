// probe-theme.mjs — why does the toggle-theme state diverge? Click #thm on both
// sides and read back the theme + body background, and the icon class. One
// geometry/state read, not the compare pipeline.
import { connect, twoTabs, detach } from "/home/lordwhitefire/.agents/skills/runtime-divergence/scripts/browser.mjs";

const browser = await connect();
const { a } = await twoTabs(browser);

async function probe(label, url) {
  await a.setViewportSize({ width: 1440, height: 900 });
  await a.goto(url, { waitUntil: "load" });
  await a.evaluate(() => localStorage.setItem("ts-theme", "dark"));
  await a.reload({ waitUntil: "load" });
  await a.waitForTimeout(400);
  const before = await a.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    body: getComputedStyle(document.body).backgroundColor,
    icon: document.querySelector("#thm i")?.className,
  }));
  await a.click("#thm");
  await a.waitForTimeout(250);
  const after250 = await a.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    body: getComputedStyle(document.body).backgroundColor,
    icon: document.querySelector("#thm i")?.className,
  }));
  await a.waitForTimeout(1200);
  const afterSettle = await a.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    body: getComputedStyle(document.body).backgroundColor,
    icon: document.querySelector("#thm i")?.className,
  }));
  console.log(label.padEnd(6), "before", JSON.stringify(before));
  console.log(label.padEnd(6), " 250ms", JSON.stringify(after250));
  console.log(label.padEnd(6), "settle", JSON.stringify(afterSettle));
}

await probe("ref", "http://localhost:3211/office-activity.html");
await probe("build", "http://localhost:3210/office/activity");
await detach(browser);
