"use client";

import { Fragment, useState } from "react";
import {
  CATEGORIES,
  categoryLabel,
  categoryOf,
  countOf,
  operator,
  wordOf,
  type ActivityEntry,
} from "@/lib/activity-feed";

/* Activity log — the store's own record, filtered on the screen.

   The reference drew the chips, the match line and the log from a hardcoded timeline; the log now
   reads `activity_event` (truth 15, D20). One row is a `kind` and a `subject` and nothing else, so
   the wording is composed from the kind — by the one rule in `lib/activity-feed.ts`, which the
   dashboard's recent-activity panel reads too, so the two screens cannot word a row two ways.

   Nothing is written by this screen. Entries cannot be edited or removed by any path, which is what
   makes the log worth trusting. */

export function Activity({ entries }: { entries: ActivityEntry[] }) {
  const [fType, setFType] = useState<string>("all");
  const [q, setQ] = useState("");

  const show = entries.filter(
    (e) =>
      (fType === "all" || categoryOf(e.kind) === fType) &&
      (!q ||
        `${e.kind} ${wordOf(e.kind)} ${e.subject} ${(e.actor ?? "").toLowerCase()}`.includes(q)),
  );

  // The days, newest first, in the order the store gave them — no table of days to drift from it.
  const days = [...new Set(show.map((e) => e.day))];

  return (
    <>
      <div className="hrow">
        <h1>Activity log</h1>
        <p className="sub2">
          Every change made to a car, newest first. Entries can&apos;t be edited or
          removed — that&apos;s what makes the log worth trusting.
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
        {CATEGORIES.map((tp) => (
          <button
            key={tp.k}
            type="button"
            className={fType === tp.k ? "on" : undefined}
            data-tp={tp.k}
            onClick={() => setFType(tp.k)}
          >
            {tp.label}
            <em>{countOf(entries, tp.k)}</em>
          </button>
        ))}
      </div>

      <p className="ecount" id="count">
        {show.length === entries.length ? (
          <>
            <b>{entries.length} entries</b> — newest first
          </>
        ) : (
          <>
            <b>{show.length}</b> of {entries.length} entries match
          </>
        )}
      </p>

      <div className="panel" id="log">
        {show.length === 0 ? (
          <div className="empty2">
            <i className="fa-solid fa-list-check" />
            {entries.length === 0 ? (
              <p>
                Nothing has been done to a car yet. Add one, or change one, and it will
                appear here.
              </p>
            ) : (
              <p>Nothing matches. Clear the search or pick another type.</p>
            )}
            {entries.length > 0 ? (
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
            ) : null}
          </div>
        ) : (
          days.map((day) => {
            const rows = show.filter((e) => e.day === day);
            const first = rows[0];
            // The reference writes `.dayh` and `.entry` straight into #log as siblings (no per-day
            // wrapper). A keyed Fragment keeps that exact structure.
            return (
              <Fragment key={day}>
                <div className="dayh">
                  {first.dayTitle === first.dayFull ? (
                    first.dayFull
                  ) : (
                    <>
                      <b>{first.dayTitle}</b> · {first.dayFull}
                    </>
                  )}
                </div>
                {rows.map((e) => {
                  const who = operator(e.actor);
                  return (
                    <div className="entry" key={e.id}>
                      <span className="avx" title={who.title}>
                        {who.initial}
                      </span>
                      <p>
                        {wordOf(e.kind)}{" "}
                        {e.kind.startsWith("car.") ? (
                          <a
                            className="ref"
                            href={`/office/car/${e.subject}`}
                            title={`Open ${e.subject}`}
                          >
                            {e.subject}
                          </a>
                        ) : (
                          e.subject
                        )}
                        <span className={`tag ${categoryOf(e.kind) || "other"}`}>
                          {categoryLabel(e.kind)}
                        </span>
                        <time>{e.clock}</time>
                        {who.label ? <span className="who">{who.label}</span> : null}
                      </p>
                    </div>
                  );
                })}
              </Fragment>
            );
          })
        )}
      </div>

      <p className="note">
        <i className="fa-solid fa-lock" />
        WhatsApp taps are <b>visitor</b> events and live in Enquiries and on the
        Dashboard — this log records what <b>you</b> did in the office. Both
        together are the full story.
      </p>
    </>
  );
}
