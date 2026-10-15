/**
 * The tap badge, executable (truth 8: "a count badge … never a popup, an alert or a sound").
 *
 * The office's nav is behind the door — the developer has no office session, so the shell cannot be
 * loaded in a browser from here (the gap reported at Checkpoint B). What *can* be proved without a
 * session is the badge itself: what it draws at each count, and that it draws nothing at zero. This
 * renders the real component, not a copy of it.
 *
 * What is claimed:
 *
 *   1. at zero it renders nothing — an office with no taps is not nagged with a nought;
 *   2. a count is drawn as it is, and the figure is the figure;
 *   3. the badge is labelled for a screen reader rather than being a bare number;
 *   4. past 99 it draws `99+` but its label still states the true number.
 *
 *   node --import tsx developer-workspace/scripts/task-004/tap-badge-check.ts
 */
import { createElement } from "react";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TapBadge } from "../../../components/office/TapBadge";

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

ok("no taps — the badge draws nothing", draw(0) === "", JSON.stringify(draw(0)));
ok("a negative count is treated as nothing", draw(-3) === "", JSON.stringify(draw(-3)));

const one = draw(1);
ok("one tap draws one", text(one) === "1", text(one));
ok(
  "and says so for a screen reader, in the singular",
  one.includes('aria-label="1 WhatsApp tap recorded"') && one.includes('role="img"'),
  one.slice(0, 90),
);

const seven = draw(7);
ok("seven taps draw seven, not a dot", text(seven) === "7", text(seven));
ok("and say so in the plural", seven.includes('aria-label="7 WhatsApp taps recorded"'), seven.slice(0, 90));

const many = draw(248);
ok("past 99 it draws 99+ rather than growing the nav", text(many) === "99+", text(many));
ok("but its label still states the true number", many.includes('aria-label="248 WhatsApp taps recorded"'));

ok(
  "it follows the office's own theme rather than a colour of its own",
  many.includes("var(--gold)") && many.includes("var(--gt)"),
  many.slice(0, 90),
);

console.log(failures === 0 ? "TAP-BADGE CHECK PASSED" : `TAP-BADGE CHECK FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
