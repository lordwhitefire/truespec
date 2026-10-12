"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

// Inventory client — reproduces the reference office-inventory.html behaviour
// exactly: state chips (zero-count hidden unless active), search + sort, the
// count line, the table (desktop) / cards (phone) pair, the dual empty block,
// and the body-level confirm modal + undo toast (portaled so the DOM shape
// matches the reference: shell → bnav → ovl → toast as body children).

export type InventoryRow = {
  ref: string;
  name: string;
  year: number | null;
  state: "av" | "ow" | "pt" | "ld" | "sd";
  stLabel: string;
  mileage: string;
  price: number; // kobo
  landed: number | null; // kobo
  profit: number | null; // kobo
  soldOn?: string;
  note?: string;
};

const ORDER = ["all", "av", "ow", "pt", "ld", "sd"] as const;
type StateKey = (typeof ORDER)[number];

const LABEL: Record<StateKey, string> = {
  all: "All",
  av: "Available",
  ow: "On the way",
  pt: "At port",
  ld: "Landed",
  sd: "Sold",
};

const ST_CLS: Record<string, string> = { av: "av", ow: "ow", pt: "pt", ld: "ld", sd: "sd" };

const naira = (kobo: number) => "₦" + Math.trunc(kobo / 100).toLocaleString("en-US");

function stChip(c: InventoryRow) {
  return (
    <>
      <span className={`st ${ST_CLS[c.state]}`}>
        <i />
        {c.stLabel}
      </span>
      {c.note ? (
        <div style={{ fontSize: "11.5px", color: "var(--mute)", marginTop: 4 }}>{c.note}</div>
      ) : null}
    </>
  );
}

function moneyCell(v: number | null) {
  return v == null ? (
    <a className="inc" href="/office/car">
      Costs incomplete
    </a>
  ) : (
    <span className="money">{naira(v)}</span>
  );
}

function profitCell(c: InventoryRow) {
  if (c.profit == null) {
    return (
      <a className="inc" href="/office/car">
        Costs incomplete
      </a>
    );
  }
  return (
    <span className={`money pf ${c.profit < 0 ? "loss" : "pok"}`}>
      <b>{naira(c.profit)}</b>
      {c.profit < 0 ? <span className="loss"> loss</span> : null}
    </span>
  );
}

export function InventoryClient({ rows: initial }: { rows: InventoryRow[] }) {
  const [rows, setRows] = useState(initial);
  const [fState, setFState] = useState<StateKey>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [del, setDel] = useState<InventoryRow | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const qRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<InventoryRow | null>(null);
  const tmrRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (tmrRef.current) window.clearTimeout(tmrRef.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDel(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const list = useMemo(() => {
    let l = rows.filter(
      (c) =>
        (fState === "all" || c.state === fState) &&
        (!q || (c.name + " " + c.ref).toLowerCase().includes(q)),
    );
    if (sort === "ph") l = [...l].sort((a, b) => b.price - a.price);
    else if (sort === "pl") l = [...l].sort((a, b) => a.price - b.price);
    else if (sort === "pf") l = [...l].sort((a, b) => (b.profit ?? -1) - (a.profit ?? -1));
    return l;
  }, [rows, fState, q, sort]);

  const chipCounts = (k: StateKey) =>
    k === "all" ? rows.length : rows.filter((c) => c.state === k).length;

  const stock = rows.filter((c) => c.state !== "sd").length;

  function clearFilters() {
    setFState("all");
    setQ("");
    if (qRef.current) qRef.current.value = "";
  }

  function openDelete(c: InventoryRow) {
    setDel(c);
  }

  function confirmDelete() {
    if (!del) return;
    undoRef.current = del;
    setRows((r) => r.filter((x) => x.ref !== del.ref));
    setDel(null);
    setToastMsg(`${del.name} ${del.year} deleted.`);
    if (tmrRef.current) window.clearTimeout(tmrRef.current);
    tmrRef.current = window.setTimeout(() => setToastMsg(null), 6000);
  }

  function undo() {
    // The reference keeps the toast visible (message stays, the 6 s timer set by
    // confirmDelete keeps running) — only the row is restored and re-sorted by ref.
    const car = undoRef.current;
    if (car) {
      setRows((r) => [...r, car].sort((a, b) => a.ref.localeCompare(b.ref)));
      undoRef.current = null;
    }
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
        {ORDER.map((k) => {
          const n = chipCounts(k);
          if (k !== "all" && !n && fState !== k) return null;
          return (
            <button
              key={k}
              type="button"
              className={fState === k ? "on" : undefined}
              onClick={() => setFState(k)}
            >
              {LABEL[k]}
              {n ? <em>{n}</em> : null}
            </button>
          );
        })}
      </div>

      <p className="ecount" id="count">
        {list.length === rows.length ? (
          <>
            <b>{rows.length} cars</b>{" — "}
            {stock} in stock, {rows.length - stock} sold
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
                <th className="r">Landed cost</th>
                <th className="r">Profit</th>
                <th className="r">Actions</th>
              </tr>
            </thead>
            <tbody id="rows">
              {list.map((c) => (
                <tr key={c.ref} className={c.state === "sd" ? "soldrow" : undefined}>
                  <td className="carx">
                    <b>
                      {c.name} {c.year}
                    </b>
                    <small>
                      {c.ref} · {c.mileage}
                      {c.state === "sd" ? ` · sold ${c.soldOn}` : ""}
                    </small>
                  </td>
                  <td>{stChip(c)}</td>
                  <td className="r money">{naira(c.price)}</td>
                  <td className="r">{moneyCell(c.landed)}</td>
                  <td className="r">{profitCell(c)}</td>
                  <td className="r">
                    <div className="acts">
                      <a
                        className="ab"
                        href="/office/car"
                        aria-label={`Edit ${c.name}`}
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen" />
                      </a>
                      <button
                        className="ab del"
                        type="button"
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
            className={`ccard${c.state === "sd" ? " soldrow" : ""}`}
            style={c.state === "sd" ? { opacity: 0.75 } : undefined}
          >
            <div className="chead">
              <h3>
                {c.name} {c.year}
                <small>
                  {c.ref} · {c.mileage}
                  {c.state === "sd" ? ` · sold ${c.soldOn}` : ""}
                </small>
              </h3>
              {stChip(c)}
            </div>
            <div className="cmoney">
              <div>
                <small>Price{c.state === "sd" ? " (sold for)" : ""}</small>
                <b>{naira(c.price)}</b>
              </div>
              <div>
                <small>Profit</small>
                {c.profit == null ? (
                  <a className="inc" href="/office/car">
                    Costs incomplete
                  </a>
                ) : (
                  <b
                    className={c.profit < 0 ? undefined : "pok"}
                    style={c.profit < 0 ? { color: "var(--bad)" } : undefined}
                  >
                    {naira(c.profit)}
                  </b>
                )}
              </div>
              <div>
                <small>Landed cost</small>
                {c.landed == null ? (
                  <span style={{ color: "var(--mute)" }}>—</span>
                ) : (
                  <b>{naira(c.landed)}</b>
                )}
              </div>
              <div>
                <small>State</small>
                <b style={{ fontSize: 13 }}>{c.stLabel}</b>
              </div>
            </div>
            <div className="cfoot">
              <a className="ab" href="/office/car">
                <i className="fa-solid fa-pen" />
                <span>Edit</span>
              </a>
              <button
                className="ab del"
                type="button"
                style={{ flex: "0 0 46px" }}
                onClick={() => openDelete(c)}
              >
                <i className="fa-solid fa-trash-can" />
              </button>
            </div>
          </article>
        ))}
      </div>
      <div id="emptyC">{list.length === 0 ? empty : null}</div>

      {mounted
        ? createPortal(
            <>
              {/* delete confirmation — portaled to body so the DOM order matches the reference */}
              <div
                className="ovl"
                id="ovl"
                hidden={!del}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setDel(null);
                }}
              >
                <div className="mdl" role="dialog" aria-modal="true" aria-labelledby="dlt">
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
              </div>

              {/* undo toast */}
              <div className={`toast${toastMsg ? " show" : ""}`} id="toast" role="status">
                <span id="tmsg">{toastMsg ?? ""}</span>
                <button type="button" id="undo" onClick={undo}>
                  Undo
                </button>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}