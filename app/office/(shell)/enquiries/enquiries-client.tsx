"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { setEnquiryState } from "@/app/office/actions/enquiry";
import { CreateFromFile } from "@/components/office/CreateFromFile";
import type { EditResult } from "@/lib/edit-result";

/* Enquiries board — the store's rows, grouped by the store's states.

   Two things the reference did that this does not. It drew the board from a hardcoded seed; the
   board now reads `enquiry` and `enquiry_state` (truth 15). And it let a card be dragged between
   columns, which implied the columns were stages an enquiry moves through — they are not: the states
   are labels, and the board is where they are laid out (truth 13, D12). So there is no drag here and
   no card-move write, and no shape of request could move one.

   The one write an enquiry has is on the enquiry's own card: **give it any state, at any time**. That
   is the spec's own scenario — an enquiry that just arrived can be given Sold the same day, and the
   change is accepted — and it is an explicit act by the owner, not a step in a pipeline. Setting it
   changes nothing about any car; the two records are separate. */

/** A column, from the registry — the state's id, the name it carries and its colour. */
export type BoardState = { id: string; label: string; colour: string };

/** A card, from the store — and the two time strings the server formatted (UTC). */
export type BoardEnquiry = {
  id: string;
  name: string;
  number: string;
  /** What the customer asked for, in the words of the sheet. */
  askedFor: string;
  note: string | null;
  /** The state it carries, or `null` when it has none yet. */
  stateId: string | null;
  when: string;
  since: string;
  /** Whether it came from an imported sheet or was keyed in. */
  imported: boolean;
};

/** The trailing group for enquiries the store holds with no state — never a state, and never faked. */
const NO_STATE: BoardState = { id: "", label: "No state", colour: "#8a9096" };

const initials = (n: string) =>
  n
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

/** The international digits of a Nigerian number, however it was typed (the product's own rule). */
function intl(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

export function Enquiries({
  states,
  enquiries,
}: {
  states: BoardState[];
  enquiries: BoardEnquiry[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<null | "detail">(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The toast holds for 4s, exactly as the reference.
  useEffect(() => {
    if (msg == null) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // Escape closes the card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cur = enquiries.find((x) => x.id === openId) ?? null;
  const unstated = enquiries.filter((e) => e.stateId === null);
  const columns = unstated.length ? [...states, NO_STATE] : states;

  const tel = (p: string) => `tel:+${intl(p)}`;
  const wa = (e: BoardEnquiry) =>
    `https://wa.me/${intl(e.number)}?text=` +
    encodeURIComponent(`Hello ${e.name}, this is TrueSpec about the ${e.askedFor}.`);

  function openDetail(id: string) {
    setOpenId(id);
    setError(null);
    setOverlay("detail");
  }

  function give(enquiry: BoardEnquiry, state: BoardState) {
    const form = new FormData();
    form.set("id", enquiry.id);
    form.set("stateId", state.id);
    setError(null);
    start(async () => {
      let result: EditResult;
      try {
        result = await setEnquiryState(form);
      } catch {
        setError("The store could not be reached — try that again");
        return;
      }
      if (result.ok) {
        setMsg(
          `Gave ${enquiry.name} the state ${state.label}. The cars are untouched.`,
        );
        return;
      }
      setError(result.errors[0]?.message ?? "The store refused that change");
    });
  }

  return (
    <>
      <div className="hrow">
        <div>
          <h1>Enquiries</h1>
          <p className="sub2">
            The site only records that a WhatsApp tap happened, and on which car. You
            bring the names and numbers back here by importing the enquiry sheet.
          </p>
        </div>
        {/* Where the sheet comes in (task.md §Q2). Its rows become **drafts**, not enquiries —
            nothing lands on this board until the owner saves them at Drafts. */}
        <div className="hbtns">
          <CreateFromFile hint="Import the sales desk's enquiry sheet — its rows become drafts." />
        </div>
      </div>

      {states.length === 0 ? (
        <p className="note">
          <i className="fa-solid fa-circle-info" />
          No enquiry state has been set up, so there is nothing to lay the board out in. Add one in{" "}
          <b>Settings → Customer states</b>.
        </p>
      ) : null}

      <div className="board" id="board">
        {columns.map((col) => {
          const cards = enquiries.filter((e) => (e.stateId ?? "") === col.id);
          return (
            <section
              key={col.id || "none"}
              className="col"
              data-col={col.id || "none"}
              aria-label={col.label}
            >
              <div className="ch">
                <i style={{ background: col.colour }} />
                {col.label}
                <span className="n">{cards.length}</span>
              </div>
              <div className="cstack">
                {cards.length ? (
                  cards.map((e) => (
                    <article
                      key={e.id}
                      className="card"
                      data-id={e.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open enquiry: ${e.name}`}
                      onClick={() => openDetail(e.id)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") openDetail(e.id);
                      }}
                    >
                      <div className="ctop">
                        <span className="avx">{initials(e.name)}</span>
                        <b>{e.name}</b>
                        <time>{e.when}</time>
                      </div>
                      <p className="cphone">
                        <i className="fa-solid fa-phone" />
                        {e.number}
                      </p>
                      <span className="ccar">
                        <i className="fa-solid fa-car-side" />
                        {e.askedFor}
                      </span>
                      {e.note ? (
                        <p className="cnote">
                          <i className="fa-regular fa-note-sticky" />
                          {e.note}
                        </p>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="cempty">Nothing here right now.</p>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <p className="note">
        <i className="fa-solid fa-arrows-left-right" />
        Two tracks, never forced together: <b>enquiry state</b> follows the
        customer conversation; <b>car state</b> follows the vehicle. Giving a
        customer the state Sold does not move the car — that is a separate decision
        on the car&apos;s own page.
      </p>

      {mounted
        ? createPortal(
            <>
              <div className="ovl" id="ovlD" hidden={overlay !== "detail"}>
                <div
                  className="mdl"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="dtitle"
                >
                  <button
                    className="mx"
                    type="button"
                    data-close
                    aria-label="Close"
                    onClick={() => setOverlay(null)}
                  >
                    ×
                  </button>
                  <h2 id="dtitle">Enquiry</h2>
                  <p className="ms">
                    The site never saw the conversation — it only recorded the tap.
                    What is here was brought in by you.
                  </p>
                  <div className="dgrid">
                    <div className="dr">
                      <span>Phone</span>
                      <a
                        id="dPhone"
                        href={cur ? tel(cur.number) : "#"}
                        style={{
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                        }}
                      >
                        {cur ? cur.number : ""}
                      </a>
                    </div>
                    <div className="dr">
                      <span>Asked for</span>
                      <b id="dCar">{cur ? cur.askedFor : ""}</b>
                    </div>
                    <div className="dr">
                      <span>Came from</span>
                      <span
                        id="dSrc"
                        style={{
                          textTransform: "none",
                          letterSpacing: "0",
                          fontWeight: 400,
                          fontSize: "13.5px",
                          color: "var(--ink)",
                        }}
                      >
                        {cur ? (cur.imported ? "The imported sheet" : "Keyed in by hand") : ""}
                      </span>
                    </div>
                    <div className="dr">
                      <span>First contact</span>
                      <span
                        id="dSince"
                        style={{
                          textTransform: "none",
                          letterSpacing: "0",
                          fontWeight: 400,
                          fontSize: "13.5px",
                          color: "var(--ink)",
                        }}
                      >
                        {cur ? cur.since : ""}
                      </span>
                    </div>
                  </div>
                  <div className="dgrid">
                    <div className="dr" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "8px" }}>
                        Enquiry state
                      </span>
                      <div className="stpills" id="dPills" aria-busy={pending}>
                        {cur
                          ? states.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className={"stb" + (cur.stateId === s.id ? " on" : "")}
                                data-mv={s.id}
                                disabled={pending}
                                onClick={() => give(cur, s)}
                              >
                                {s.label}
                              </button>
                            ))
                          : null}
                        {cur && states.length === 0 ? (
                          <span className="ms">
                            No states yet — add one in Settings → Customer states.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="dgrid">
                    <div className="dr" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "8px" }}>
                        Notes
                      </span>
                      <p className="ms" id="dNotes" style={{ margin: 0 }}>
                        {cur?.note ? cur.note : "Nothing noted yet."}
                      </p>
                    </div>
                  </div>
                  {error ? (
                    <p className="err on" role="alert">
                      <i className="fa-solid fa-circle-exclamation" />
                      {error}
                    </p>
                  ) : null}
                  <div className="mrow">
                    <a
                      className="wab"
                      id="dWa"
                      href={cur ? wa(cur) : "#"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="fa-brands fa-whatsapp" />
                      WhatsApp them
                    </a>
                    <a className="call" id="dCall" href={cur ? tel(cur.number) : "#"}>
                      <i className="fa-solid fa-phone" />
                      Call
                    </a>
                  </div>
                </div>
              </div>

              <div className="toast" id="toast" role="status">
                <span id="tmsg">{msg ?? ""}</span>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
