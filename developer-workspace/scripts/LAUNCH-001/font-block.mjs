// G4 — the page stays readable when the font files cannot load.
// Attach-only; uses the existing build tab, then restores it. No new tab, no screenshot.
import { BASE, attach, assertOurs, chromiumCount, detach, findTab, tabUrls } from "./_lib.mjs";

const before = chromiumCount();
const browser = await attach();
let page;
let client;

try {
  await assertOurs(browser);
  page = findTab(browser, BASE);
  const tabsBefore = tabUrls(browser).length;
  client = await page.context().newCDPSession(page);
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await page.route("**/*.woff2", (route) => route.abort());

  const response = await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(1200);
  const facts = await page.evaluate(() => {
    const firstFamily = (el) =>
      el
        ? getComputedStyle(el)
            .fontFamily.split(",")[0]
            .trim()
            .replace(/^["']|["']$/g, "")
        : null;
    const bodyFamily = firstFamily(document.body);
    const headFamily = firstFamily(document.querySelector("h1"));
    const icon = document.querySelector("i.fa-solid");
    const visible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
    };
    return {
      readyState: document.readyState,
      textLength: document.body.innerText.length,
      hasTrueSpec: document.body.innerText.includes("TrueSpec"),
      heading: document.querySelector("h1")?.textContent?.trim() ?? null,
      headingVisible: visible(document.querySelector("h1")),
      bodyFamily,
      headFamily,
      bodyLoaded: bodyFamily ? document.fonts.check(`16px "${bodyFamily}"`) : null,
      headLoaded: headFamily ? document.fonts.check(`600 16px "${headFamily}"`) : null,
      iconBefore: icon ? getComputedStyle(icon, "::before").content : null,
    };
  });

  console.log(
    JSON.stringify(
      {
        status: response ? response.status() : null,
        tabsBefore,
        tabsAfter: tabUrls(browser).length,
        chromiumBefore: before,
        chromiumAfter: chromiumCount(),
        ...facts,
      },
      null,
      2,
    ),
  );
} finally {
  if (page) {
    try {
      await page.unroute("**/*.woff2");
      await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 30000 });
    } catch {
      /* restore is best-effort; the next check reloads */
    }
  }
  if (client) {
    try {
      await client.send("Network.setCacheDisabled", { cacheDisabled: false });
    } catch {
      /* detached */
    }
  }
  await detach(browser);
}
