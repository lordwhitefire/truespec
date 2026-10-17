// TASK-005 — put the sign-in page in front of the owner, in the browser they will sign in with.
//
// This is the one step that cannot be automated: the office is behind the Clerk door, the session
// cookie lives **only in the browser**, and the owner's credentials are not mine to hold. So this
// script does exactly one thing — navigate the automation Chrome to the door and leave it there,
// open and visible. It reads nothing and checks nothing.
//
// The host matters (learned in TASK-004, `_office-browser.mjs`): cookies are HOST-scoped, so the page
// is opened on the same host every later check will use — the harness `BASE`,
// `http://127.0.0.1:3210`. Signing in on `localhost` instead leaves every office read landing back on
// the door.
import { BASE, attach, assertOurs, detach, guardCount, chromiumCount } from "./_lib.mjs";

const before = guardCount();
const browser = await attach();
try {
  const ua = await assertOurs(browser);
  console.log("attached to the Chrome on CDP :9222 — ours (UA has no Headless)");
  console.log(`  UA: ${ua}`);

  // Reuse the tab already on the build if there is one, so the owner is not left with a pile of
  // tabs; otherwise open one. Either way it is left OPEN — the owner signs in here.
  const ctx = browser.contexts()[0];
  const page =
    ctx.pages().find((p) => p.url().startsWith(BASE)) ?? (await ctx.newPage());

  await page.goto(`${BASE}/office/sign-in`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.bringToFront();

  console.log(`tab = ${page.url()}`);
  console.log(`  title: ${await page.title()}`);

  const after = chromiumCount();
  if (after > before) throw new Error(`a Chrome was launched (${before} → ${after})`);
  console.log(`no new Chrome launched (${before} → ${after})`);
} finally {
  // Detach, never close: the window and this tab stay open for the owner to sign in on.
  await detach(browser);
}
