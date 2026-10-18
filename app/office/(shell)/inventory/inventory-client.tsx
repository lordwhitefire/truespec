"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { formatNaira } from "@/lib/money";
import type { Section } from "@/lib/sections";
import type { StockCounts } from "@/lib/counts";
import { Dialog } from "@/components/office/Dialog";
import { deleteCar, undoDeleteCar } from "../../actions/car";

// Inventory client — reproduces the reference office-inventory.html behaviour
// exactly: state chips (zero-count hidden unless active), search + sort, the
// count line, the table (desktop) / cards (phone) pair, the dual empty block,
// and the body-level confirm modal + undo toast (portaled so the DOM shape
// matches the reference: shell → bnav → ovl → toast as body children).
//
// The owner's state labels come from the registry, passed in from the page
// (`states`); this component keeps no state vocabulary of its own. Only the
// presentational dot colour is derived, from the car's section — colour per
// state is named for TASK-003.

export type InventoryRow = {
  /** The car's key — what a write names it by (`car.id`), never a `TS-####`. */
  id: string;
  ref: string;
  name: string;
  year: number | null;
  /** The owner's private state label — office-only. */
  state: string;
  /** The one section identity, from `lib/sections.ts`. */
  section: Section;
  /** Sold is a flag, not a state (R-SLD). */
  sold: boolean;
  /** The cost figure's name, from `costLabelFor` (R-MON-7). */
  costLabel: string;
  mileage: string;
  price: number; // kobo
  cost: number | null; // kobo
  profit: number | null; // kobo
  soldOn?: string;
  note?: string;
};

export type InventoryState = { label: string; section: Section };

const ALL = "__all";
const SOLD = "__sold";

// Presentation only: the dot colour follows the car's section. Per-state colour
// is named for TASK-003, not built here.
const SECTION_CLASS: Record<Section, string> = {
  available: "av",
  "on order": "ow",
  landed: "ld",
  sold: "sd",
};

function stChip(c: InventoryRow) {
  return (
    <>
      <span className={`st ${c.sold ? "sd" : SECTION_CLASS[c.section]}`}>
        <i />
        {c.sold ? "Sold" : c.state}
      </span>
      {c.note ? (
        <div style={{ fontSize: "11.5px", color: "var(--mute)", marginTop: 4 }}>{c.note}</div>
      ) : null}
    </>
  );
}

function moneyCell(c: InventoryRow) {
  return c.cost == null ? (
    <a className="inc" href={`/office/car/${c.ref}`}>
      Costs incomplete
    </a>
  ) : (
    <span className="money">{formatNaira(c.cost)}</span>
  );
}

function profitCell(c: InventoryRow) {
  if (c.profit == null) {
    return (
      <a className="inc" href={`/office/car/${c.ref}`}>
        Costs incomplete
      </a>
    );
  }
  return (
    <span className={`money pf ${c.profit < 0 ? "loss" : "pok"}`}>
      <b>{formatNaira(c.profit)}</b>
      {c.profit < 0 ? <span className="loss"> loss</span> : null}
    </span>
  );
}

export function InventoryClient({
  rows: initial,
  states,
  counts,
}: {
  rows: InventoryRow[];
  states: InventoryState[];
  counts: StockCounts;
}) {
  const [rows, setRows] = useState(initial);
  const [fState, setFState] = useState<string>(ALL);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [del, setDel] = useState<InventoryRow | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastErr, setToastErr] = useState(false);
  const [undoOn, setUndoOn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, startWrite] = useTransition();

  const qRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<InventoryRow | null>(null);
  const tmrRef = useRef<number | null>(null);
  // Where focus goes after a deletion: the next visible row's delete control, or the heading
  // when the deleted row was the last one (Task 17). Set before the row leaves, read after.
  const pendingFocusRef = useRef<string | "heading" | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (tmrRef.current) window.clearTimeout(tmrRef.current);
    };
  }, []);

  // Motion preference, read in the browser: under reduced motion the bar does not run — the
  // same measure stays on screen as a static "8 s" label (Task 11).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const list = useMemo(() => {
    let l = rows.filter(
      (c) =>
        (fState === ALL || (fState === SOLD ? c.sold : !c.sold && c.state === fState)) &&
        (!q || (c.name + " " + c.ref).toLowerCase().includes(q)),
    );
    if (sort === "ph") l = [...l].sort((a, b) => b.price - a.price);
    else if (sort === "pl") l = [...l].sort((a, b) => a.price - b.price);
    else if (sort === "pf") l = [...l].sort((a, b) => (b.profit ?? -1) - (a.profit ?? -1));
    return l;
  }, [rows, fState, q, sort]);

  // The caret after a row leaves (Task 17). The confirmation's native close puts focus back on
  // the opener — the delete control of the row that has just gone — so the browser has nowhere
  // to put it. One task later (after that close has run) focus the equivalent control of the
  // next visible row, or the list's heading when there is no next row.
  useEffect(() => {
    const target = pendingFocusRef.current;
    if (target === null) return;
    pendingFocusRef.current = null;
    const t = window.setTimeout(() => {
      if (target === "heading") {
        document.getElementById("inv-h")?.focus();
        return;
      }
      // Both the table and the phone cards render this car; only one shape is on screen.
      const next = Array.from(
        document.querySelectorAll<HTMLElement>(`button.ab.del[data-car-id="${target}"]`),
      ).find((el) => el.getClientRects().length > 0);
      (next ?? document.getElementById("inv-h"))?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [rows]);

  // The chips come from the owner's registry; only the counts are view facet
  // counts, except Sold, which is the counting rule's own sold figure.
  const chips: { key: string; label: string }[] = [
    { key: ALL, label: "All" },
    ...states.map((s) => ({ key: s.label, label: s.label })),
    { key: SOLD, label: "Sold" },
  ];

  const chipCounts = (k: string) =>
    k === ALL
      ? rows.length
      : k === SOLD
        ? counts.sold
        : rows.filter((c) => !c.sold && c.state === k).length;

  const stock = rows.length - counts.sold;

  function clearFilters() {
    setFState(ALL);
    setQ("");
    if (qRef.current) qRef.current.value = "";
  }

  function openDelete(c: InventoryRow) {
    setDel(c);
  }

  // One close for the offer and the toast it lives in: the bar's own end and the failsafe
  // timeout both land here (Task 10).
  function closeOffer() {
    if (tmrRef.current) window.clearTimeout(tmrRef.current);
    tmrRef.current = null;
    setToastMsg(null);
    setUndoOn(false);
    undoRef.current = null;
  }

  function showToast(message: string, isError: boolean, ms: number) {
    if (tmrRef.current) window.clearTimeout(tmrRef.current);
    setToastErr(isError);
    setToastMsg(message);
    tmrRef.current = window.setTimeout(closeOffer, ms);
  }

  // Delete is a real write now (truth 6): the car is tombstoned on the server, so it
  // leaves every office read at once while its photos, costs, state and sale stay
  // whole. The row leaves the screen at once too — optimistically — and comes straight
  // back if the store refuses.
  function confirmDelete() {
    const car = del;
    if (!car) return;
    const at = list.findIndex((x) => x.id === car.id);
    pendingFocusRef.current =
      at >= 0 && at < list.length - 1 ? list[at + 1].id : "heading";
    setDel(null);
    setRows((r) => r.filter((x) => x.id !== car.id));
    startWrite(async () => {
      const res = await deleteCar(car.id);
      if (!res.ok) {
        setRows((r) => [...r, car].sort((a, b) => a.ref.localeCompare(b.ref)));
        showToast(res.errors[0]?.message ?? "That car could not be deleted.", true, 6000);
        return;
      }
      undoRef.current = car;
      setUndoOn(true);
      // The undo offer lasts exactly the spec's 8-second window; when it closes the car
      // is a tombstone, and it is listed as waiting to be cleared. The window's clock is
      // the bar's own animation (Task 10) — its end closes the offer — and this timeout
      // is only the failsafe, deliberately longer than the window so it can never be the
      // thing that closes the offer first. It carries a wide margin (4 s) because the
      // animation's clock waits for a rendering frame, and a stalled frame must not hand
      // the close to the failsafe (measured: a 1 fps tab ate 2.1 s of the old 2 s margin;
      // Task 12). Under reduced motion there is no bar to run: the static "8 s" label is
      // the measure, and this timer is the clock (Task 11).
      showToast(`${car.name} ${car.year} deleted.`, false, reduced ? 8000 : 12_000);
    });
  }

  // Undo within the window clears the tombstone — the one column the delete set — so
  // the car comes back exactly as it was.
  function undo() {
    const car = undoRef.current;
    if (!car) return;
    setUndoOn(false);
    setRows((r) => [...r, car].sort((a, b) => a.ref.localeCompare(b.ref)));
    showToast(`${car.name} ${car.year} restored.`, false, 4000);
    startWrite(async () => {
      const res = await undoDeleteCar(car.id);
      if (!res.ok) {
        setRows((r) => r.filter((x) => x.id !== car.id));
        showToast(res.errors[0]?.message ?? "That car could not be restored.", true, 6000);
      }
    });
  }

  const empty = (
    <div className="empty2">
      <i className="fa-solid fa-car-side" />
      <p>No cars match. Clear the search or pick another state.</p>
      <button className="ghost" type="button" id="clearf" onClick={clearFilters}>
        Clear filters
      </button>
    </div>
  );

  return (
    <>
      <div className="toolbar">
        <div className="srch">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            className="in"
            id="q"
            type="search"
            ref={qRef}
            placeholder="Search name or ref…"
            aria-label="Search inventory"
            onChange={(e) => setQ(e.target.value.trim().toLowerCase())}
          />
        </div>
        <select
          className="in"
          id="sort"
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="new">Newest first</option>
          <option value="ph">Price: high to low</option>
          <option value="pl">Price: low to high</option>
          <option value="pf">Profit: high to low</option>
        </select>
      </div>

      <div className="chipf" id="states" role="group" aria-label="Filter by state">
        {chips.map(({ key, label }) => {
          const n = chipCounts(key);
          if (key !== ALL && !n && fState !== key) return null;
          return (
            <button
              key={key}
              type="button"
              className={fState === key ? "on" : undefined}
              onClick={() => setFState(key)}
            >
              {label}
              {n ? <em>{n}</em> : null}
            </button>
          );
        })}
      </div>

      <p className="ecount" id="count">
        {list.length === rows.length ? (
          <>
            <b>{rows.length} cars</b>{" — "}
            {stock} in stock, {counts.sold} sold
          </>
        ) : (
          <>
            <b>{list.length}</b> of {rows.length} cars match
          </>
        )}
      </p>

      <div className="panel tbl">
        <div className="twrap">
          <table className="t">
            <thead>
              <tr>
                <th>Car</th>
                <th>State</th>
                <th className="r">Price</th>
                <th className="r">Cost</th>
                <th className="r">Profit</th>
                <th className="r">Actions</th>
              </tr>
            </thead>
            <tbody id="rows">
              {list.map((c) => (
                <tr key={c.ref} className={c.sold ? "soldrow" : undefined}>
                  <td className="carx">
                    <b>
                      {c.name} {c.year}
                    </b>
                    <small>
                      {c.ref} · {c.mileage}
                      {c.sold ? ` · sold ${c.soldOn}` : ""}
                    </small>
                  </td>
                  <td>{stChip(c)}</td>
                  <td className="r money">{formatNaira(c.price)}</td>
                  <td className="r">{moneyCell(c)}</td>
                  <td className="r">{profitCell(c)}</td>
                  <td className="r">
                    <div className="acts">
                      <a
                        className="ab"
                        href={`/office/car/${c.ref}`}
                        aria-label={`Edit ${c.name}`}
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen" />
                      </a>
                      <button
                        className="ab del"
                        type="button"
                        data-car-id={c.id}
                        aria-label={`Delete ${c.name}`}
                        title="Delete"
                        onClick={() => openDelete(c)}
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div id="emptyT">{list.length === 0 ? empty : null}</div>
        </div>
      </div>

      <div className="cards" id="cards">
        {list.map((c) => (
          <article
            key={c.ref}
            className={`ccard${c.sold ? " soldrow" : ""}`}
            style={c.sold ? { opacity: 0.75 } : undefined}
          >
            <div className="chead">
              <h3>
                {c.name} {c.year}
                <small>
                  {c.ref} · {c.mileage}
                  {c.sold ? ` · sold ${c.soldOn}` : ""}
                </small>
              </h3>
              {stChip(c)}
            </div>
            <div className="cmoney">
              <div>
                <small>Price{c.sold ? " (sold for)" : ""}</small>
                <b>{formatNaira(c.price)}</b>
              </div>
              <div>
                <small>Profit</small>
                {c.profit == null ? (
                  <a className="inc" href={`/office/car/${c.ref}`}>
                    Costs incomplete
                  </a>
                ) : (
                  <b
                    className={c.profit < 0 ? undefined : "pok"}
                    style={c.profit < 0 ? { color: "var(--bad)" } : undefined}
                  >
                    {formatNaira(c.profit)}
                  </b>
                )}
              </div>
              <div>
                <small>{c.costLabel}</small>
                {c.cost == null ? (
                  <span style={{ color: "var(--mute)" }}>—</span>
                ) : (
                  <b>{formatNaira(c.cost)}</b>
                )}
              </div>
              <div>
                <small>State</small>
                <b style={{ fontSize: 13 }}>{c.sold ? "Sold" : c.state}</b>
              </div>
            </div>
            <div className="cfoot">
              <a className="ab" href={`/office/car/${c.ref}`}>
                <i className="fa-solid fa-pen" />
                <span>Edit</span>
              </a>
              <button
                className="ab del"
                type="button"
                data-car-id={c.id}
                style={{ flex: "0 0 46px" }}
                onClick={() => openDelete(c)}
              >
                <i className="fa-solid fa-trash-can" />
              </button>
            </div>
          </article>
        ))}
        {/* The cards view's empty state lives inside `.cards` so it hides and shows with the
            cards — its table sibling does the same inside `.panel.tbl`; rendered outside, the
            empty block (and its Clear filters) printed twice on one screen at desktop. */}
        <div id="emptyC">{list.length === 0 ? empty : null}</div>
      </div>

      {mounted
        ? createPortal(
            <>
              {/* delete confirmation — portaled to body so the DOM order matches the reference */}
              <Dialog
                open={del !== null}
                onClose={() => setDel(null)}
                id="ovl"
                labelledBy="dlt"
              >
                <div className="mdl">
                  <h2 id="dlt">Delete this car?</h2>
                  <p id="dltw">
                    {del
                      ? `“${del.name} ${del.year}” (${del.ref}) will be removed. You can undo for a few seconds.`
                      : ""}
                  </p>
                  <div className="mrow">
                    <button className="btn2" type="button" id="no" onClick={() => setDel(null)}>
                      Keep it
                    </button>
                    <button className="btn2 danger" type="button" id="yes" onClick={confirmDelete}>
                      <i className="fa-solid fa-trash-can" /> Delete
                    </button>
                  </div>
                </div>
              </Dialog>

              {/* undo toast — the Undo button is offered only while the delete's 8-second
                  window is open (`undoOn`); once it closes the car is a tombstone and is
                  dealt with from the "waiting to be cleared" list below the table. */}
              <div
                className={`toast${toastMsg ? " show" : ""}`}
                id="toast"
                role={toastErr ? "alert" : "status"}
              >
                <span id="tmsg">{toastMsg ?? ""}</span>
                <button type="button" id="undo" onClick={undo} hidden={!undoOn}>
                  Undo
                </button>
                {/* The offer's clock: a bar that starts full and drains for exactly the 8000 ms
                    window; its own end closes the offer (Task 10). aria-hidden — the offer's
                    words carry the meaning; the bar is the measure. It mounts with the offer,
                    so every offer gets a fresh bar. Under reduced motion the motion is replaced
                    by the same measure in words — a static "8 s" — and the timer above is the
                    clock (Task 11). */}
                {undoOn ? (
                  reduced ? (
                    <span className="usec" aria-hidden="true">
                      8 s
                    </span>
                  ) : (
                    <span className="utick" aria-hidden="true">
                      <span
                        className="ubar"
                        onAnimationEnd={(e) => {
                          if (e.animationName === "undodrain") closeOffer();
                        }}
                      />
                    </span>
                  )
                ) : null}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
