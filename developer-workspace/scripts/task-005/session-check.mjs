// TASK-005 — the session, at runtime.
//
// "It signed in" is a claim about runtime, so it is checked at runtime, with the project's own rule
// rather than a new one: `signedInPage` (TASK-004's `_office-browser.mjs`) is the single
// implementation of "a real office shell — a sidebar and a topbar — and not the door", and it prefers
// a tab the owner already has open, so nothing of theirs is disturbed. Nothing is closed; we detach.
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount } from "./_lib.mjs";
import { signedInPage } from "../task-004/_office-browser.mjs";

const before = guardCount();
const browser = await attach();
try {
  const ua = await assertOurs(browser);
  const found = await signedInPage(browser, BASE);
  const page = found.page;
  const tabs = browser.contexts()[0].pages().map((p) => p.url());

  if (!page) {
    console.log(
      JSON.stringify(
        { signedIn: false, openedByUs: found.opened, note: "no signed-in office tab; /office still answers with the door", tabs },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } else {
    const seen = await page.evaluate(() => ({
      url: location.href,
      hasSide: !!document.querySelector("aside.side"),
      topbar: !!document.querySelector("header.topbar"),
      door: !!document.querySelector("main.office-door"),
      signedAs: (document.querySelector(".sfoot b")?.innerText || "").trim(),
      title: document.title,
    }));
    console.log(JSON.stringify({ signedIn: true, openedByUs: found.opened, ...seen, tabs, ua }, null, 2));
  }

  const after = chromiumCount();
  if (after > before) throw new Error(`a Chrome was launched (${before} → ${after})`);
} finally {
  await detach(browser);
}
