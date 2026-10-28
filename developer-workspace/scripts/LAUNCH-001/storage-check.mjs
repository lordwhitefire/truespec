// E5 — browser storage/tracker inventory on the existing build tab.
// Attach-only; reuses the build tab; no new tab, no launch, no screenshot.
import {
  BASE,
  attach,
  assertOurs,
  chromiumCount,
  detach,
  findTab,
  tabUrls,
} from "./_lib.mjs";

const TRACKERS = [
  "_ga",
  "_gid",
  "_gat",
  "_fbp",
  "_fbc",
  "fbq",
  "hj",
  "hotjar",
  "mp_",
  "mixpanel",
  "ajs_",
  "segment",
  "amplitude",
  "posthog",
  "clarity",
  "_clck",
  "_clsk",
  "intercom",
  "drift",
];

const before = chromiumCount();
const browser = await attach();
let page;
try {
  await assertOurs(browser);
  page = findTab(browser, BASE);
  const tabsBefore = tabUrls(browser).length;

  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(900);

  const cookies = await page.context().cookies([BASE]);
  const storage = await page.evaluate(() => {
    const dump = (s) =>
      Object.keys(s)
        .sort()
        .map((k) => ({ key: k, bytes: (s.getItem(k) || "").length }));
    return {
      localStorage: dump(localStorage),
      sessionStorage: dump(sessionStorage),
      theme: localStorage.getItem("ts-theme"),
    };
  });

  // Anonymous office door: it must send the visitor to sign-in and render no office data.
  await page.goto(`${BASE}/office`, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(700);
  const office = {
    finalUrl: page.url(),
    signIn: page.url().includes("/office/sign-in"),
    hasOfficeHeading: await page.locator("#inv-h").count(),
    bodyStart: (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().slice(0, 120),
  };

  const names = [...cookies.map((c) => c.name), ...storage.localStorage.map((s) => s.key), ...storage.sessionStorage.map((s) => s.key)];
  const hits = names.filter((n) => TRACKERS.some((t) => n.toLowerCase().includes(t.toLowerCase())));
  const out = {
    cookies: cookies.map((c) => ({ name: c.name, httpOnly: c.httpOnly, secure: c.secure, sameSite: c.sameSite })),
    storage,
    trackerHits: hits,
    office,
    tabs: [tabsBefore, tabUrls(browser).length],
    chromium: [before, chromiumCount()],
  };
  console.log(JSON.stringify(out, null, 2));
  if (out.tabs[1] > out.tabs[0]) throw new Error(`a tab was opened (${out.tabs[0]} -> ${out.tabs[1]})`);
  if (out.chromium[1] > out.chromium[0]) throw new Error(`a Chrome was launched`);
} finally {
  if (page) {
    try {
      await page.goto(`${BASE}/inventory`, { waitUntil: "load", timeout: 30000 });
    } catch {
      /* best-effort restore */
    }
  }
  await detach(browser);
}
