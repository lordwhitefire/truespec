// One-route runtime probe for the launch checklist. Attach-only; reuses the existing build tab.
// Usage: node developer-workspace/scripts/LAUNCH-001/verify.mjs /inventory
import {
  BASE,
  attach,
  assertOurs,
  chromiumCount,
  clearResize,
  detach,
  findTab,
  resize,
  setTheme,
  tabUrls,
} from "./_lib.mjs";

const args = process.argv.slice(2);
const path = args.find((arg) => !arg.startsWith("--")) || "/";
const widthArg = args.find((arg) => arg.startsWith("--width="));
const themeArg = args.find((arg) => arg.startsWith("--theme="));
const width = widthArg ? Number(widthArg.split("=")[1]) : null;
const theme = themeArg ? themeArg.split("=")[1] : null;
const before = chromiumCount();
const browser = await attach();
let page;

try {
  await assertOurs(browser);
  page = findTab(browser, BASE);
  if (width) await resize(page, width, 900);
  if (theme) await setTheme(page, theme);
  const tabsBefore = tabUrls(browser).length;
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  const onPageError = (err) => pageErrors.push(err.message);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  const response = await page.goto(`${BASE}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );

  const facts = await page.evaluate(() => {
    const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content ?? null;
    const prop = (property) => document.querySelector(`meta[property="${property}"]`)?.content ?? null;
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((el) => ({
      level: Number(el.tagName[1]),
      text: (el.textContent || "").trim().slice(0, 70),
    }));
    const h1s = [...document.querySelectorAll("h1")];
    return {
      title: document.title,
      description: meta("description"),
      canonical: document.querySelector("link[rel='canonical']")?.href ?? null,
      ogTitle: prop("og:title"),
      ogDescription: prop("og:description"),
      ogImage: prop("og:image"),
      twitterCard: meta("twitter:card"),
      h1Count: h1s.length,
      h1Text: h1s.map((el) => (el.textContent || "").trim()),
      headings,
      bodyLength: document.body.innerText.length,
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
      finalUrl: location.href,
    };
  });

  page.off("console", onConsole);
  page.off("pageerror", onPageError);

  const skips = facts.headings.filter(
    (heading, index) => index > 0 && heading.level - facts.headings[index - 1].level > 1,
  );
  const tabsAfter = tabUrls(browser).length;
  const after = chromiumCount();

  console.log(
    JSON.stringify(
      {
        path,
        width,
        theme,
        status: response ? response.status() : null,
        ...facts,
        consoleErrors,
        pageErrors,
        headingSkips: skips,
        tabsBefore,
        tabsAfter,
        chromiumBefore: before,
        chromiumAfter: after,
      },
      null,
      2,
    ),
  );

  if (tabsAfter !== tabsBefore) throw new Error(`a tab was opened (${tabsBefore} -> ${tabsAfter})`);
  if (after > before) throw new Error(`a Chrome was launched (${before} -> ${after})`);
} finally {
  if (page && width) await clearResize(page);
  await detach(browser);
}
