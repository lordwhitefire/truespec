"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* Enquiries board — a faithful port of office-enquiries.html's board.
   The reference draws the board in JS from a hardcoded seed, and enquiries have
   no data layer (plan §1 — data model out of scope). So the demo seed and every
   behaviour live here: the five columns, the six cards, drag-and-drop between
   columns, the enquiry detail modal with its state pills, the three-step PDF
   import (drop → reading → preview), and the toast.

   The only intended divergences from the reference are the shared-shell theme
   toggle (approved, §10 Q3) and the product route URLs; this screen has no
   `.demo` switcher to delete. */

const COLS = [
  { k: "new", label: "New", dot: "#3a7bd5" },
  { k: "talking", label: "Talking", dot: "#b9820b" },
  { k: "nego", label: "Negotiating", dot: "#c8a24a" },
  { k: "sold", label: "Sold", dot: "#0e7a3e" },
  { k: "lost", label: "Lost", dot: "#8a9096" },
];

type Enq = {
  id: string;
  name: string;
  phone: string;
  car: string;
  col: string;
  when: string;
  since: string;
  src: string;
  note: string;
};

const SEED: Enq[] = [
  { id: "e1", name: "Chinedu O.", phone: "0803 555 0192", car: "2019 Lexus RX 350", col: "new", when: "18 min", since: "4 Oct 2026", src: "Tap on the RX 350's page", note: "Asked if duty is included in the price. Told him it's one doorstep price." },
  { id: "e2", name: "Mrs. Adebayo", phone: "0812 555 7734", car: "2021 Camry SE", col: "new", when: "1 hr", since: "4 Oct 2026", src: "Tap on the Camry SE's page", note: "Family car for her husband. Wants something low mileage." },
  { id: "e3", name: "Emeka U.", phone: "0706 555 4410", car: "2019 Hilux SRV", col: "talking", when: "Yesterday", since: "1 Oct 2026", src: "Tap on the Hilux's page", note: "Wants diesel, asked about the mileage. High but mechanically sound — send the video." },
  { id: "e4", name: "Kelechi N.", phone: "0810 555 3388", car: "2020 Sienna LE", col: "nego", when: "2 days", since: "28 Sep 2026", src: "Tap on the Sienna's page", note: "Offered ₦32.5M. Thin margin already — hold at ₦33.5M and throw in the tank." },
  { id: "e5", name: "Tunde A.", phone: "0805 555 9012", car: "2018 Camry XLE", col: "sold", when: "29 Sep", since: "22 Sep 2026", src: "Tap on the Camry XLE's page", note: "Paid full asking. Car delivered 30 Sep. Customer happy." },
  { id: "e6", name: "Ibrahim S.", phone: "0703 555 2214", car: "2015 Corolla", col: "lost", when: "26 Sep", since: "19 Sep 2026", src: "General tap — home page", note: "Budget ₦8M for a 2015 Corolla. We don't stock that year — wished him well." },
];

const initials = (n: string) =>
  n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function Enquiries() {
  const [enq, setEnq] = useState<Enq[]>(SEED);
  const [openId, setOpenId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<null | "detail" | "import">(null);
  const [pdf, setPdf] = useState<1 | 2 | 3>(1);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // The toast holds for 4s, exactly as the reference.
  useEffect(() => {
    if (msg == null) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  // Escape closes every overlay (the reference plumbs this globally).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOverlay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cur = enq.find((x) => x.id === openId) ?? null;

  function moveTo(id: string, k: string) {
    const e = enq.find((x) => x.id === id);
    if (!e || e.col === k) return;
    const lbl = COLS.find((c) => c.k === k)!.label;
    setEnq((prev) =>
      prev.map((x) => (x.id === id ? { ...x, col: k, when: "just now" } : x)),
    );
    setMsg(`Moved ${e.name} to ${lbl}. The car itself is untouched.`);
  }

  function openDetail(id: string) {
    const e = enq.find((x) => x.id === id);
    if (!e) return;
    setOpenId(id);
    setNote(e.note);
    setOverlay("detail");
  }

  function startParse() {
    setPdf(2);
    const reduced =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => setPdf(3), reduced ? 0 : 1100);
  }

  const tel = (p: string) => "tel:" + p.replace(/\s/g, "");
  const wa = (e: Enq) =>
    `https://wa.me/234${e.phone.replace(/\D/g, "").slice(-10)}?text=` +
    encodeURIComponent(
      `Hello ${e.name}, Umar from TrueSpec here — about the ${e.car}.`,
    );

  return (
    <>
      <div className="hrow">
        <div>
          <h1>Enquiries</h1>
          <p className="sub2">
            The site only records that a WhatsApp tap happened, and on which car.
            You bring the names and numbers back here by importing the enquiry
            sheet.
          </p>
        </div>
        <div className="hbtns">
          <button
            className="btn"
            id="importBtn"
            type="button"
            onClick={() => {
              setPdf(1);
              setOverlay("import");
            }}
          >
            <i className="fa-solid fa-file-import" /> Import enquiry sheet
          </button>
        </div>
      </div>

      <p className="taps">
        <i className="fa-brands fa-whatsapp" />
        <b>4 taps today</b> — 3 on car pages, 1 general. They appear as cards once
        imported.
      </p>

      <div className="board" id="board">
        {COLS.map((col) => {
          const cards = enq.filter((e) => e.col === col.k);
          return (
            <section
              key={col.k}
              className={"col" + (overCol === col.k ? " dragover" : "")}
              data-col={col.k}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.k);
              }}
              onDragLeave={() => setOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverCol(null);
                if (dragId) moveTo(dragId, col.k);
              }}
            >
              <div className="ch">
                <i style={{ background: col.dot }} />
                {col.label}
                <span className="n">{cards.length}</span>
              </div>
              <div className="cstack">
                {cards.length ? (
                  cards.map((e) => (
                    <article
                      key={e.id}
                      className={"card" + (dragId === e.id ? " dragging" : "")}
                      draggable="true"
                      data-id={e.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open enquiry: ${e.name}`}
                      onDragStart={() => setDragId(e.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverCol(null);
                      }}
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
                        {e.phone}
                      </p>
                      <span className="ccar">
                        <i className="fa-solid fa-car-side" />
                        {e.car}
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
        customer conversation; <b>car state</b> follows the vehicle. Marking a
        customer Sold does not move the car — that is a separate decision on the
        car&apos;s own page.
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
                    Everything here was typed in by you — the site never saw the
                    conversation.
                  </p>
                  <div className="dgrid">
                    <div className="dr">
                      <span>Phone</span>
                      <a
                        id="dPhone"
                        href={cur ? tel(cur.phone) : "#"}
                        style={{
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                        }}
                      >
                        {cur ? cur.phone : ""}
                      </a>
                    </div>
                    <div className="dr">
                      <span>Car</span>
                      <b id="dCar">{cur ? cur.car : ""}</b>
                    </div>
                    <div className="dr">
                      <span>Source</span>
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
                        {cur ? cur.src : ""}
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
                      <div className="stpills" id="dPills">
                        {cur
                          ? COLS.map((c) => (
                              <button
                                key={c.k}
                                type="button"
                                className={"stb" + (cur.col === c.k ? " on" : "")}
                                data-mv={c.k}
                                onClick={() => moveTo(cur.id, c.k)}
                              >
                                {c.label}
                              </button>
                            ))
                          : null}
                      </div>
                    </div>
                  </div>
                  <div className="dgrid">
                    <div className="dr" style={{ display: "block" }}>
                      <span style={{ display: "block", marginBottom: "8px" }}>
                        Notes
                      </span>
                      <textarea
                        className="in"
                        id="dNotes"
                        placeholder="What was agreed, what he asked for, when to follow up…"
                        value={note}
                        onChange={(ev) => setNote(ev.target.value)}
                      />
                    </div>
                  </div>
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
                    <a className="call" id="dCall" href={cur ? tel(cur.phone) : "#"}>
                      <i className="fa-solid fa-phone" />
                      Call
                    </a>
                  </div>
                </div>
              </div>

              <div className="ovl" id="ovlP" hidden={overlay !== "import"}>
                <div
                  className="mdl"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="ptitle"
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

                  <div id="pdf1" hidden={pdf !== 1}>
                    <h2 id="ptitle">Import enquiry sheet</h2>
                    <p className="ms">
                      Prepared from the fixed template, outside this software.
                      Nothing is saved until you confirm the preview.
                    </p>
                    <div
                      className="drop"
                      id="pdrop"
                      role="button"
                      tabIndex={0}
                      aria-label="Choose PDF"
                      onClick={startParse}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          startParse();
                        }
                      }}
                    >
                      <i className="fa-solid fa-file-pdf" />
                      Drop the PDF here, or click to browse
                    </div>
                    <p className="hintf">
                      The file is read, shown to you as a table, and nothing is
                      written until you press Confirm.
                    </p>
                  </div>

                  <div id="pdf2" hidden={pdf !== 2}>
                    <h2 id="ptitle2">Reading the sheet…</h2>
                    <p className="ms">
                      Checking names, numbers and states against your lists.
                    </p>
                    <div className="reading">
                      <div className="sp" />
                      Almost there
                    </div>
                  </div>

                  <div id="pdf3" hidden={pdf !== 3}>
                    <h2 id="ptitle3">Check before saving</h2>
                    <p className="ms">
                      7 rows found. Fix anything that looks wrong — nothing is
                      saved until you confirm.
                    </p>
                    <div className="twrap">
                      <table className="t">
                        <thead>
                          <tr>
                            <th />
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Car</th>
                            <th>State</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>
                              <input
                                type="checkbox"
                                defaultChecked
                                aria-label="Include row"
                              />
                            </td>
                            <td>Chinedu O.</td>
                            <td>0803 555 0192</td>
                            <td>Lexus RX 350</td>
                            <td>New</td>
                          </tr>
                          <tr>
                            <td>
                              <input
                                type="checkbox"
                                defaultChecked
                                aria-label="Include row"
                              />
                            </td>
                            <td>Mrs. Adebayo</td>
                            <td>0812 555 7734</td>
                            <td>Camry SE 2021</td>
                            <td>New</td>
                          </tr>
                          <tr>
                            <td>
                              <input
                                type="checkbox"
                                defaultChecked
                                aria-label="Include row"
                              />
                            </td>
                            <td>Emeka U.</td>
                            <td>0706 555 4410</td>
                            <td>Hilux SRV</td>
                            <td>Talking</td>
                          </tr>
                          <tr className="flag">
                            <td>
                              <input
                                type="checkbox"
                                defaultChecked
                                aria-label="Include row"
                              />
                            </td>
                            <td>Fatima B.</td>
                            <td>0902 555 6621</td>
                            <td>Prado TX</td>
                            <td>
                              <span className="flagchip">
                                <i className="fa-solid fa-triangle-exclamation" />
                                Check
                              </span>
                              <div className="flagnote">
                                “Nego” isn&apos;t one of your states.
                              </div>
                              <select aria-label="Pick a state" defaultValue="New">
                                <option>Pick…</option>
                                <option>New</option>
                                <option>Talking</option>
                                <option>Negotiating</option>
                                <option>Sold</option>
                                <option>Lost</option>
                              </select>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <input
                                type="checkbox"
                                defaultChecked
                                aria-label="Include row"
                              />
                            </td>
                            <td>Kelechi N.</td>
                            <td>0810 555 3388</td>
                            <td>Sienna LE</td>
                            <td>Negotiating</td>
                          </tr>
                          <tr>
                            <td>
                              <input
                                type="checkbox"
                                defaultChecked
                                aria-label="Include row"
                              />
                            </td>
                            <td>Tunde A.</td>
                            <td>0805 555 9012</td>
                            <td>Camry XLE 2018</td>
                            <td>Sold</td>
                          </tr>
                          <tr>
                            <td>
                              <input type="checkbox" aria-label="Include row" />
                            </td>
                            <td>Ibrahim S.</td>
                            <td>0703 555 2214</td>
                            <td>Corolla 2015</td>
                            <td>Lost</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="psum">
                      <b>6 rows</b> will be added or updated.{" "}
                      <span className="w">1 needs a look</span> — the state isn&apos;t
                      in your list. 1 row is unticked and will be skipped.
                    </p>
                    <div className="mrow">
                      <button
                        className="call"
                        type="button"
                        data-back
                        onClick={() => setPdf(1)}
                      >
                        Back
                      </button>
                      <button
                        className="btn"
                        id="pconfirm"
                        type="button"
                        style={{ height: "42px" }}
                        onClick={() => {
                          setOverlay(null);
                          setMsg(
                            "Import confirmed (demo). 6 enquiries added or updated — nothing was really saved.",
                          );
                        }}
                      >
                        <i className="fa-solid fa-check" /> Confirm import
                      </button>
                    </div>
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
