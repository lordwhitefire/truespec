"use client";

import { Fragment, useState } from "react";

/* Activity log — a faithful port of office-activity.html.
   The reference draws the chips (`#types`), the match line (`#count`) and the
   log body (`#log`) from a hardcoded demo timeline; the log has no data layer
   (plan §1 — data model out of scope). So the timeline and every behaviour live
   here. The theme toggle is NATIVE to the reference on this page (`.sfoot .srow`
   + `.thm` + `#thm`) and comes from the shared shell, so the only divergence is
   the product route URLs. The reference's `naira()` output is written literally
   so the strings are byte-for-byte what it renders. */

type Entry = {
  d: number;
  t: string;
  type: "add" | "edit" | "state" | "sold" | "del" | "imp" | "set";
  ref?: string;
  html: string;
  old?: boolean;
};

const DAYS = [
  { d: 0, label: "<b>Today</b> · Saturday 4 Oct 2026" },
  { d: 1, label: "<b>Yesterday</b> · Friday 3 Oct 2026" },
  { d: 2, label: "Thursday 2 Oct 2026" },
  { d: 3, label: "Wednesday 1 Oct 2026" },
  { d: 4, label: "Tuesday 30 Sep 2026" },
  { d: 5, label: "Monday 29 Sep 2026" },
  { d: 6, label: "Sunday 28 Sep 2026", old: true },
  { d: 7, label: "Saturday 27 Sep 2026", old: true },
  { d: 8, label: "Friday 26 Sep 2026", old: true },
];

const E: Entry[] = [
  { d: 0, t: "08:42", type: "state", ref: "TS-1014", html: "Changed state of <b>Land Cruiser Prado TX</b> to <b>At port</b>" },
  { d: 1, t: "17:05", type: "add", ref: "TS-1012", html: "Added <b>Toyota Camry SE 2021</b> — price ₦34,500,000" },
  { d: 1, t: "14:31", type: "edit", ref: "TS-1009", html: "Edited costs on <b>Toyota Sienna LE</b> — landed ₦32,655,000 · profit ₦1,245,000" },
  { d: 1, t: "11:47", type: "imp", html: "Imported enquiry sheet — <b>6 rows</b> added or updated · 1 fixed by hand (“Nego” → Negotiating)" },
  { d: 2, t: "16:20", type: "add", ref: "TS-1014", html: "Added <b>Land Cruiser Prado TX 2020</b> — price ₦78,000,000" },
  { d: 2, t: "10:03", type: "state", ref: "TS-1013", html: "Changed state of <b>Toyota Fortuner</b> to <b>On the way</b>" },
  { d: 3, t: "18:40", type: "add", ref: "TS-1013", html: "Added <b>Toyota Fortuner 2021</b> — price ₦58,000,000" },
  { d: 4, t: "15:44", type: "del", ref: "TS-1024", html: "Deleted <b>Honda Civic 2016</b> (duplicate entry) — <b>restored via Undo</b> a few seconds later" },
  { d: 4, t: "11:02", type: "edit", ref: "TS-1009", html: "Added a private note to <b>Sienna LE</b> — “call Kelechi about his offer”" },
  { d: 5, t: "11:20", type: "sold", ref: "TS-1015", html: "Marked <b>Camry XLE 2018</b> as <b>Sold</b> — sale price ₦31,500,000 · profit ₦3,850,000" },
  { d: 5, t: "09:14", type: "add", ref: "TS-1007", html: "Added <b>Lexus RX 350 2019</b> — price ₦47,500,000" },
  { d: 6, t: "19:02", type: "add", ref: "TS-1011", html: "Added <b>Honda CR-V EX-L 2020</b> — price ₦29,400,000", old: true },
  { d: 6, t: "08:15", type: "set", html: "Settings — full-tank default set to <b>₦110,000</b>", old: true },
  { d: 7, t: "12:30", type: "edit", ref: "TS-1005", html: "Changed doorstep price on <b>RAV4 XLE AWD</b> — ₦35,200,000 <span style=\"color:var(--mute)\">(was ₦34,800,000)</span>", old: true },
  { d: 8, t: "09:05", type: "add", ref: "TS-1006", html: "Added <b>Toyota Tacoma TRD Off-Road 2021</b> — price ₦62,000,000", old: true },
];

const TYPES = [
  { k: "all", label: "All" },
  { k: "add", label: "Added" },
  { k: "edit", label: "Edited" },
  { k: "state", label: "State" },
  { k: "sold", label: "Sold" },
  { k: "del", label: "Deleted" },
  { k: "imp", label: "Imports" },
  { k: "set", label: "Settings" },
] as const;

/* The reference writes each entry's message as one HTML string straight into the
   <p> (`<b>Umar</b> ${x.html}<span class="tag">…</span>…`), so the bold text and
   any inline span inside x.html sit directly under the <p>. Reproduce that
   string-for-string — a React <span> around x.html would add a node the
   reference does not have. It also keeps the search haystack the same: the
   reference matches against the raw markup, tags included. */
const refLink = (r: string) =>
  `<a class="ref" href="/office/car" title="Open ${r}">${r}</a>`;

const entryHtml = (x: Entry) =>
  `<b>Umar</b> ${x.html}<span class="tag ${x.type}">${
    TYPES.find((t) => t.k === x.type)!.label
  }</span>${x.ref ? refLink(x.ref) : ""}<time>${x.t}</time>`;

export function Activity() {  const [fType, setFType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [revealed, setRevealed] = useState(false);

  const pool = E.filter((x) => revealed || !x.old);
  const show = pool.filter(
    (x) =>
      (fType === "all" || x.type === fType) &&
      (!q || (x.html + " " + (x.ref || "")).toLowerCase().includes(q)),
  );
  const countType = (k: string) =>
    pool.filter((x) => k === "all" || x.type === k).length;

  return (
    <>
      <div className="hrow">
        <h1>Activity log</h1>
        <p className="sub2">
          Everything done in the office, newest first. One operator: <b>Umar</b>.
          Entries can&apos;t be edited or removed — that&apos;s what makes the log
          worth trusting.
        </p>
      </div>

      <div className="filters">
        <div className="srch">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            className="in"
            id="q"
            type="search"
            placeholder="Search car, ref or action…"
            aria-label="Search the log"
            defaultValue=""
            onChange={(e) => setQ(e.target.value.trim().toLowerCase())}
          />
        </div>
      </div>

      <div className="chipf" id="types" role="group" aria-label="Filter by type">
        {TYPES.map((tp) => (
          <button
            key={tp.k}
            type="button"
            className={fType === tp.k ? "on" : undefined}
            data-tp={tp.k}
            onClick={() => setFType(tp.k)}
          >
            {tp.label}
            <em>{countType(tp.k)}</em>
          </button>
        ))}
      </div>

      <p className="ecount" id="count">
        {show.length === pool.length ? (
          <>
            <b>{pool.length} entries</b> — one operator, newest first
          </>
        ) : (
          <>
            <b>{show.length}</b> of {pool.length} entries match
          </>
        )}
      </p>

      <div className="panel" id="log">
        {show.length === 0 ? (
          <div className="empty2">
            <i className="fa-solid fa-list-check" />
            <p>Nothing matches. Clear the search or pick another type.</p>
            <button
              className="ghost"
              type="button"
              id="clearf"
              onClick={() => {
                setFType("all");
                setQ("");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          DAYS.map((day) => {
            const rows = show.filter((x) => x.d === day.d);
            if (!rows.length) return null;
            // The reference writes `.dayh` and `.entry` straight into #log as
            // siblings (no per-day wrapper). A keyed Fragment keeps that exact
            // structure — the wrapper div added a level the reference does not have.
            return (
              <Fragment key={day.d}>
                <div className="dayh" dangerouslySetInnerHTML={{ __html: day.label }} />
                {rows.map((x, i) => (
                  <div className="entry" key={`${day.d}-${x.t}-${i}`}>
                    <span className="avx">U</span>
                    <p dangerouslySetInnerHTML={{ __html: entryHtml(x) }} />
                  </div>
                ))}
              </Fragment>
            );
          })
        )}
      </div>

      <button
        className="more2"
        id="older"
        type="button"
        hidden={revealed}
        onClick={() => setRevealed(true)}
      >
        Show 3 older days
      </button>

      <p className="note">
        <i className="fa-solid fa-lock" />
        WhatsApp taps are <b>visitor</b> events and live in Enquiries and on the
        Dashboard — this log records what <b>you</b> did in the office. Both
        together are the full story.
      </p>
    </>
  );
}
