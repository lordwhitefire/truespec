"use client";

import { Fragment, useState } from "react";

/* Activity log — the store's own record, filtered on the screen.

   The reference drew the chips, the match line and the log from a hardcoded timeline; the log now
   reads `activity_event` (truth 15, D20). One row is a `kind` and a `subject` and nothing else, so
   the wording is composed **here** from the kind — and where a kind is one this screen does not yet
   name, the row is shown plainly as its kind and subject rather than guessed at.

   Nothing is written by this screen. Entries cannot be edited or removed by any path, which is what
   makes the log worth trusting. */

/** One row of the log, as the page read it. The day and time arrive preformatted in UTC. */
export type ActivityEntry = {
  id: string;
  kind: string;
  /** The `TS-####` a car event names, or whatever subject the event carries. */
  subject: string;
  /** The UTC day, as `2026-10-04` — the group key. */
  day: string;
  /** `Today`, `Yesterday`, or the weekday and the date once it is older than that. */
  dayTitle: string;
  /** The weekday and the date, always — shown beside Today and Yesterday. */
  dayFull: string;
  /** The UTC time, as `08:42`. */
  clock: string;
  /** The operator's email, or `null` when their account has gone. */
  actor: string | null;
};

/** What each kind says, and which chip it belongs to. One word per kind, used by both. */
const ACTIONS: Record<string, { word: string; category: string }> = {
  "car.created": { word: "Added a car", category: "add" },
  "car.updated": { word: "Edited a car", category: "edit" },
  "car.sold": { word: "Marked a car as Sold", category: "sold" },
  "car.unsold": { word: "Took a car out of Sold", category: "state" },
  "car.deleted": { word: "Deleted a car", category: "del" },
  "car.restored": { word: "Restored a car", category: "del" },
  "car.removed": { word: "Removed a car for good", category: "del" },
};

const CATEGORIES = [
  { k: "all", label: "All" },
  { k: "add", label: "Added" },
  { k: "edit", label: "Edited" },
  { k: "state", label: "State" },
  { k: "sold", label: "Sold" },
  { k: "del", label: "Deleted" },
  { k: "imp", label: "Imports" },
  { k: "set", label: "Settings" },
] as const;

/** The chip a kind belongs to, or `""` for a kind this screen does not yet name. */
const categoryOf = (kind: string) => ACTIONS[kind]?.category ?? "";

/** A kind this screen names reads as its own word; anything else reads as itself. */
const wordOf = (kind: string) => ACTIONS[kind]?.word ?? kind;

/** The card's avatar — the operator's own initial, and their email on hover. */
function operator(actor: string | null): { initial: string; title: string } {
  if (!actor) return { initial: "?", title: "An operator whose account has since been removed" };
  return { initial: actor.slice(0, 1).toUpperCase(), title: actor };
}

export function Activity({ entries }: { entries: ActivityEntry[] }) {
  const [fType, setFType] = useState<string>("all");
  const [q, setQ] = useState("");

  const show = entries.filter(
    (e) =>
      (fType === "all" || categoryOf(e.kind) === fType) &&
      (!q ||
        `${e.kind} ${wordOf(e.kind)} ${e.subject} ${(e.actor ?? "").toLowerCase()}`.includes(q)),
  );
  const countType = (k: string) =>
    entries.filter((e) => k === "all" || categoryOf(e.kind) === k).length;

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
            <em>{countType(tp.k)}</em>
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
                          {CATEGORIES.find((t) => t.k === categoryOf(e.kind))?.label ?? "Other"}
                        </span>
                        <time>{e.clock}</time>
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
