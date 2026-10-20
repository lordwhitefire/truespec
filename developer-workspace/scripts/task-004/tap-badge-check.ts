/**
 * The tap notice's picture, executable (truth 8: "a count badge … never a popup, an alert or a
 * sound"). Owner ruling, 2026-10-16: the notice behaves like a **notification** — the glyph persists
 * and only the circle clears when there is nothing new, and the figure is the taps **since the office
 * last looked**, not an all-time total.
 *
 * The office shell is behind the door, so from here the whole notice cannot be loaded in a browser
 * (the gap reported at Checkpoint B). What can be proved without a session is the picture itself:
 * what it draws at each count. This renders the real component, not a copy of it. The link that
 * carries it — its accessible name and its two homes — is proved live, with a real session, in
 * `tap-notice-check.mjs`.
 *
 * Form (owner ruling, 2026-10-16): a **notification badge** — the WhatsApp glyph with the count on a
 * small circle at the glyph's top-right (the cart-icon pattern). It is the *picture* only: the whole
 * of it is decorative, and the accessible name lives on the link that wraps it (Designer ruling 4).
 *
 * What is claimed:
 *
 *   1. at zero the **glyph persists** and only the circle clears — no number, no circle;
 *   2. a count is drawn as it is, and the figure is the figure;
 *   3. it carries the WhatsApp glyph;
 *   4. it is a *notice*, not a bare number: the count sits on a circle at the glyph's top-right;
 *   5. the whole picture is decorative — no `role="img"`, no `aria-label`, `aria-hidden` on the root
 *      (the name is the link's, so the figure is never announced twice);
 *   6. past 99 it draws `99+` rather than growing without bound;
 *   7. the **link** that carries it (ruling 4) is named "N new WhatsApp taps" — singular at 1,
 *      "WhatsApp taps" at zero — opens `/office/enquiries?tab=taps`, keeps the true figure even when
 *      the circle is capped, and **persists at zero** (the glyph is the taps list's entry point).
 *
 *   node --import tsx developer-workspace/scripts/task-004/tap-badge-check.ts
 */
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TapBadge } from "../../../components/office/TapBadge";
import { TapNotice } from "../../../components/office/TapNotice";

// `components/**` is written for Next's automatic JSX runtime, and the project compiles JSX with
// `"jsx": "preserve"`; run under plain `tsx` the same file is transformed with the classic runtime,
// which reaches for a global `React`. Supplying it is what lets the **real** component be rendered
// here rather than a copy of it.
(globalThis as unknown as Record<string, unknown>).React = React;

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

const draw = (count: number) => renderToStaticMarkup(createElement(TapBadge, { count }));
const text = (html: string) => html.replace(/<[^>]*>/g, "").trim();

const zero = draw(0);
ok("zero taps — the glyph persists (only the circle clears)", zero.includes("fa-brands fa-whatsapp"), zero.slice(0, 140));
ok(
  "and the circle is gone at zero — no number, no circle",
  !zero.includes("position:absolute") && text(zero) === "",
  JSON.stringify(text(zero)),
);
ok("a negative count is treated as zero", draw(-3) === zero, JSON.stringify(draw(-3)));

const one = draw(1);
ok("one tap draws one", text(one) === "1", text(one));
ok(
  "it carries the WhatsApp glyph",
  one.includes("fa-brands fa-whatsapp"),
  one.slice(0, 120),
);
ok(
  "it is a notice, not a bare number — the count sits on a circle at the glyph's top-right",
  /position:absolute/.test(one) && /top:-?\d+px/.test(one) && /right:-?\d+px/.test(one),
  one.slice(0, 200),
);
ok(
  "the whole picture is decorative — the accessible name is the link's (ruling 4)",
  one.includes('aria-hidden="true"') && !one.includes('role="img"') && !one.includes("aria-label"),
  one.slice(0, 160),
);
ok(
  "the circle is the app's own gold, with the ring that keeps it a circle on a gold hover",
  one.includes("var(--gold)") && one.includes("var(--gt)") && one.includes("var(--dk)"),
  one.slice(0, 200),
);

const seven = draw(7);
ok("seven taps draw seven, not a dot", text(seven) === "7", text(seven));

const many = draw(248);
ok("past 99 it draws 99+ rather than growing without bound", text(many) === "99+", text(many));

// ---- the link that carries it (ruling 4): the accessible name lives here, not on the picture ------
const link = (count: number) => renderToStaticMarkup(createElement(TapNotice, { count }));

const zeroLink = link(0);
ok(
  "zero taps — the link and its glyph persist (the taps list keeps its entry point)",
  zeroLink.length > 0 && zeroLink.includes("fa-brands fa-whatsapp"),
  zeroLink.slice(0, 160),
);
ok(
  "and it is named just \"WhatsApp taps\", with no figure",
  zeroLink.includes('aria-label="WhatsApp taps"'),
  zeroLink.slice(0, 160),
);
ok(
  "it always opens the taps tab",
  zeroLink.includes('href="/office/enquiries?tab=taps"'),
  zeroLink.slice(0, 160),
);

const oneLink = link(1);
ok(
  "the link is named for a screen reader, in the singular, as \"new\"",
  oneLink.includes('aria-label="1 new WhatsApp tap"'),
  oneLink.slice(0, 120),
);
ok(
  "and it opens the taps tab",
  oneLink.includes('href="/office/enquiries?tab=taps"'),
  oneLink.slice(0, 120),
);
ok(
  "the picture inside it is decorative — the figure is announced once, not twice",
  (oneLink.match(/aria-label/g) || []).length === 1,
  oneLink.slice(0, 200),
);
ok(
  "the name states the true figure even when the circle is capped",
  link(248).includes('aria-label="248 new WhatsApp taps"') && link(248).includes(">99+<"),
  link(248).slice(0, 140),
);

console.log(failures === 0 ? "TAP-BADGE CHECK PASSED" : `TAP-BADGE CHECK FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
