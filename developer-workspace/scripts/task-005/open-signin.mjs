// Open the office door in the automation Chrome and LEAVE IT OPEN for the owner to sign in.
//
// The Clerk session cookie lives in the browser profile and was lost when the machine went down, so
// the door is the only place to start. This never signs in and never types anything: it puts the
// page in front of the owner and waits until the provider's form is really there (the office shows
// its own "setting things up" screen first when the store is waking, and a spinner is not a door).
//
// Re-running it reuses the tab it already opened instead of stacking up new ones.
import { BASE, attach, assertOurs, detach, chromiumCount } from "./_lib.mjs";

const before = chromiumCount();
const browser = await attach();
try {
  await assertOurs(browser);
  const ctx = browser.contexts()[0];
  if (!ctx) throw new Error("no browser context on :9222");

  let page = ctx.pages().find((p) => /\/office\/sign-in/.test(p.url()));
  if (!page) {
    page = await ctx.newPage();
    await page.goto(`${BASE}/office/sign-in`, { waitUntil: "domcontentloaded", timeout: 45000 });
  } else {
    console.log(`reusing the open tab: ${page.url()}`);
  }

  const read = () =>
    page.evaluate(() => ({
      url: location.href,
      title: document.title,
      inputs: document.querySelectorAll("input").length,
      form: !!document.querySelector("form"),
      signedIn: !!document.querySelector("aside.side") && !!document.querySelector("header.topbar"),
      snippet: document.body.innerText.replace(/\s+/g, " ").slice(0, 200),
    }));

  let state = await read();
  for (let i = 0; i < 45 && !state.form && !state.signedIn; i++) {
    await page.waitForTimeout(2000);
    state = await read();
    if (i % 5 === 0) console.log(`  …waiting for the form (${i * 2}s): ${state.snippet.slice(0, 90)}`);
  }

  console.log(JSON.stringify(state, null, 2));
  console.log(
    state.signedIn
      ? "\nthe office is already signed in — nothing for the owner to do"
      : state.form
        ? "\nthe door is ready: sign in in the Chrome window, then say continue"
        : "\nthe door did not finish loading — see the snippet above",
  );

  const after = chromiumCount();
  if (after > before) throw new Error(`a Chrome was launched (${before} → ${after})`);
} finally {
  await detach(browser);
}
