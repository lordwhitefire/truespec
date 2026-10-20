// TASK-004 — Task 34: the tap notice as the owner sees it, and the taps tab.
//
// The office is behind the Clerk door, and the session cookie lives only in the browser — so this is
// read the way the standing procedure says (`developer-workspace/procedures/browser-check.md`):
// attach to the Chrome already on CDP :9222, reuse the signed-in tab, drive it, detach. No launch,
// no headless, no screenshots, ≤10 chromium.
//
// What it proves, measured on the running app:
//
//   1. the notice is a **link** to the taps tab, in BOTH homes — the phone topbar (rightmost icon)
//      and the desktop sidebar footer (last in `.srow`); its glyph **persists**, and the figure (when
//      there is one) is named "N new WhatsApp taps" (owner ruling, 2026-10-16);
//   2. its picture is the **gold** circle on the WhatsApp glyph, whose fill and ring are the app's
//      own colours (ruling 1) — read from the live computed style, not from the source;
//   3. the dashboard panel's link reads **"All taps"** and opens the taps tab; there is **no manual
//      Refresh control** anywhere on the dashboard;
//   4. the dashboard refreshes on **focus** — a real `focus` event makes the router re-fetch the
//      route (an RSC request), and the page is **not reloaded** (its own JS state survives);
//   5. the Enquiries page's **Taps tab** lists the full tap record (all rows), the **Enquiries** tab
//      shows the board, and the selected tab carries `aria-current="page"`;
//   6. **viewing the Taps tab clears the badge** — the number goes and only the glyph remains,
//      because the office has now looked (owner ruling, 2026-10-16).
//
// The store is expected to be "unseen" (all taps new) for the clear to be observable; the operator
// empties `tap_seen` before the run (see `notes/TASK-004-badge-seen-state-research.md`'s task notes).
//
//   node developer-workspace/scripts/task-004/tap-notice-check.mjs
//
// If no signed-in office tab is found, it STOPS with a message — it never guesses and never launches
// a browser.

import { BASE, attach, assertOurs, detach, guardCount, chromiumCount } from "./_lib.mjs";
import { signedInPage } from "./_office-browser.mjs";

let failures = 0;
const ok = (label, pass, detail = "") => {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};
const S = (v) => {
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 240 ? s.slice(0, 237) + "…" : s;
};

async function main() {
  const before = guardCount();
  const browser = await attach();
  let page = null;
  let opened = false;
  try {
    await assertOurs(browser);
    const found = await signedInPage(browser, BASE);
    page = found.page;
    opened = found.opened;
    if (!page) {
      throw new Error(
        `no signed-in office tab in the Chrome on :9222 — sign in at ${BASE}/office first ` +
          `(the session cookie lives in the browser, so a server-side fetch cannot read the office)`,
      );
    }

    // ---- 1 & 2. the dashboard: the notice in both homes, the panel link, no manual refresh -------
    await page.goto(`${BASE}/office`, { waitUntil: "domcontentloaded", timeout: 45000 });
    const dash = await page.evaluate(() => {
      const notice = (root) => {
        const a = [...root.querySelectorAll("a[aria-label]")].find((x) =>
          /^(WhatsApp taps|\d+ new WhatsApp taps?)$/.test(x.getAttribute("aria-label") || ""),
        );
        if (!a) return null;
        const label = a.getAttribute("aria-label") || "";
        const m = label.match(/^(\d+) new WhatsApp tap/);
        const circle = a.querySelector("span[aria-hidden='true'] > span");
        const cs = circle ? getComputedStyle(circle) : null;
        return {
          href: a.getAttribute("href"),
          label,
          count: m ? Number(m[1]) : null,
          glyph: !!a.querySelector("i.fa-brands.fa-whatsapp"),
          circleText: circle ? circle.textContent.trim() : null,
          circleBg: cs ? cs.backgroundColor : null,
          circleColour: cs ? cs.color : null,
          circleRing: cs ? cs.borderTopColor : null,
          node: a,
        };
      };
      const topbar = document.querySelector("header.topbar");
      const srow = document.querySelector(".sfoot .srow");
      const txt = (e) => (e?.innerText || "").trim();
      const t = topbar ? notice(topbar) : null;
      const f = srow ? notice(srow) : null;
      return {
        signedIn: !!document.querySelector("aside.side") && !!topbar && !document.querySelector("main.office-door"),
        topbarNotice: t && { ...t, node: undefined },
        footerNotice: f && { ...f, node: undefined },
        topbarNoticeIsLast: topbar && t ? topbar.lastElementChild === t.node : null,
        footerNoticeIsLast: srow && f ? srow.lastElementChild === f.node : null,
        panelLinks: [...document.querySelectorAll(".ph2 a")].map((a) => ({ text: txt(a), href: a.getAttribute("href") })),
        refreshControls: [...document.querySelectorAll("button, a")].filter((e) => /^\s*refresh\s*$/i.test(txt(e))).length,
      };
    });

    ok("signed in — a real office shell, not the door", dash.signedIn);
    ok(
      "the notice (its glyph) is in the phone topbar — always present",
      !!dash.topbarNotice && dash.topbarNotice.glyph === true,
      S(dash.topbarNotice),
    );
    ok(
      "named for new taps when there are any, else just \"WhatsApp taps\"",
      !!dash.topbarNotice && /^(WhatsApp taps|\d+ new WhatsApp taps?)$/.test(dash.topbarNotice.label),
      S(dash.topbarNotice?.label),
    );
    ok(
      "and in the desktop sidebar footer (its second home)",
      !!dash.footerNotice && dash.footerNotice.label === dash.topbarNotice?.label,
      S(dash.footerNotice),
    );
    ok("it is the last icon in the topbar (top-right corner)", dash.topbarNoticeIsLast === true, S(dash.topbarNoticeIsLast));
    ok("and the last thing in the account row (grouped with the account)", dash.footerNoticeIsLast === true, S(dash.footerNoticeIsLast));
    ok(
      "it opens the taps tab",
      (dash.topbarNotice?.href || "").endsWith("/office/enquiries?tab=taps") &&
        (dash.footerNotice?.href || "").endsWith("/office/enquiries?tab=taps"),
      S([dash.topbarNotice?.href, dash.footerNotice?.href]),
    );
    ok("it carries the WhatsApp glyph, not a bell", dash.topbarNotice?.glyph === true, S(dash.topbarNotice?.glyph));
    ok(
      "the circle is the app's gold (fill rgb(200, 162, 74)), with the --dk ring",
      dash.topbarNotice?.circleBg === "rgb(200, 162, 74)" && dash.topbarNotice?.circleRing === "rgb(33, 37, 41)",
      S([dash.topbarNotice?.circleBg, dash.topbarNotice?.circleRing]),
    );
    ok(
      "the circle appears only when there is a new count, and shows it (or its 99+ cap)",
      (dash.topbarNotice?.count ?? 0) > 0
        ? /^(\d+|99\+)$/.test(dash.topbarNotice?.circleText || "")
        : dash.topbarNotice?.circleText === null,
      S({ count: dash.topbarNotice?.count, circle: dash.topbarNotice?.circleText }),
    );
    const tapsPanelLink = (dash.panelLinks || []).find((l) => /taps?/i.test(l.text));
    ok(
      "the dashboard panel's link reads \"All taps\" and opens the taps tab",
      !!tapsPanelLink && tapsPanelLink.text === "All taps" && (tapsPanelLink.href || "").endsWith("/office/enquiries?tab=taps"),
      S(dash.panelLinks),
    );
    ok("no manual Refresh control on the dashboard", dash.refreshControls === 0, S(dash.refreshControls));

    // ---- 4. the dashboard refreshes on focus, without a full reload -------------------------------
    await page.evaluate(() => {
      window.__focusMarker = "kept";
    });
    const visibleWhenFired = await page.evaluate(() => document.visibilityState);
    let refreshed = false;
    for (let i = 0; i < 5 && !refreshed; i++) {
      const hit = page
        .waitForRequest((r) => (r.headers()["rsc"] || "") === "1" || /[?&]_rsc=/.test(r.url()), { timeout: 3000 })
        .catch(() => null);
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      refreshed = !!(await hit);
    }
    const markerAfter = await page.evaluate(() => window.__focusMarker ?? null);
    ok("focusing the dashboard re-fetches the route (an RSC request)", refreshed, S(refreshed));
    ok("and it is a refresh, not a reload — the page's own state survived", markerAfter === "kept", S(markerAfter));
    ok("the tab was visible when the refresh fired (the visibility gate)", visibleWhenFired === "visible", S(visibleWhenFired));

    // ---- 5a. the Taps tab: viewing it CLEARS the badge, and the full record is listed -------------
    await page.goto(`${BASE}/office/enquiries?tab=taps`, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Viewing the Taps tab writes the seen-watermark (a POST Server Action fired by a client
    // component on mount), then revalidates the shell, so the number clears. Wait for it — never a
    // fixed sleep.
    const cleared = await page
      .waitForFunction(
        () => {
          const a = [...document.querySelectorAll("a[aria-label]")].find((x) =>
            /WhatsApp taps$|new WhatsApp taps?$/.test(x.getAttribute("aria-label") || ""),
          );
          return !!a && a.getAttribute("aria-label") === "WhatsApp taps";
        },
        { timeout: 20000 },
      )
      .then(() => true)
      .catch(() => false);

    const tapsTab = await page.evaluate(() => {
      const nav = document.querySelector("nav.etabs");
      const links = nav ? [...nav.querySelectorAll("a")].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), current: a.getAttribute("aria-current") })) : [];
      const rows = [...document.querySelectorAll(".taplist .wt")].map((r) => r.textContent.replace(/\s+/g, " ").trim());
      const a = [...document.querySelectorAll("a[aria-label]")].find((x) => /WhatsApp taps$|new WhatsApp taps?$/.test(x.getAttribute("aria-label") || ""));
      const circle = a ? a.querySelector("span[aria-hidden='true'] > span") : null;
      return {
        links,
        rows,
        board: !!document.querySelector(".board"),
        h1: document.querySelector("h1")?.textContent.trim() || null,
        noticeLabel: a ? a.getAttribute("aria-label") : null,
        noticeCircle: circle ? circle.textContent.trim() : null,
      };
    });
    const tabsText = (tapsTab.links || []).map((l) => l.text);
    ok("the Enquiries page carries a tab row: Enquiries, Taps", tabsText.join(" | ") === "Enquiries | Taps", S(tabsText));
    ok(
      "with Taps selected (aria-current) and Enquiries plain",
      tapsTab.links?.[1]?.current === "page" && tapsTab.links?.[0]?.current == null,
      S(tapsTab.links),
    );
    ok("one h1, \"Enquiries\", for the page", tapsTab.h1 === "Enquiries", S(tapsTab.h1));
    ok("the board is not drawn on the Taps tab", tapsTab.board === false, S(tapsTab.board));
    ok(
      "the Taps tab lists the tap record",
      tapsTab.rows.length > 0 && tapsTab.rows.every((r) => /^Tap on |^General tap/.test(r)),
      S(tapsTab.rows.slice(0, 3)),
    );
    ok(
      "viewing the Taps tab clears the badge — the number goes, only the glyph remains",
      cleared && tapsTab.noticeLabel === "WhatsApp taps" && tapsTab.noticeCircle === null,
      S({ cleared, label: tapsTab.noticeLabel, circle: tapsTab.noticeCircle }),
    );

    // ---- 5b. the Enquiries tab: the board, Enquiries selected -------------------------------------
    await page.goto(`${BASE}/office/enquiries`, { waitUntil: "domcontentloaded", timeout: 45000 });
    const board = await page.evaluate(() => {
      const nav = document.querySelector("nav.etabs");
      const links = nav ? [...nav.querySelectorAll("a")].map((a) => ({ text: a.textContent.trim(), current: a.getAttribute("aria-current") })) : [];
      return { links, board: !!document.querySelector(".board"), taplist: !!document.querySelector(".taplist") };
    });
    ok("the default Enquiries tab shows the board", board.board === true && board.taplist === false, S(board));
    ok("with Enquiries selected (aria-current)", board.links?.[0]?.current === "page" && board.links?.[1]?.current == null, S(board.links));

    const after = chromiumCount();
    if (after > before) throw new Error(`a Chrome was launched (${before} → ${after}) — the guard failed`);
    ok(`no Chrome was launched (${before} → ${after})`, after <= before);
  } finally {
    if (opened && page) {
      try {
        await page.close();
      } catch {}
    }
    await detach(browser);
  }

  console.log(failures === 0 ? "TAP-NOTICE CHECK PASSED" : `TAP-NOTICE CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

await main();
