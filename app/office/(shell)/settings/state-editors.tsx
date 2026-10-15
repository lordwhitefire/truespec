"use client";

import { useState } from "react";
import { type EditorRow } from "./state-seeds";
import { inkFor } from "./colour";

/* The enquiry-state editor — the board's states and the colour each carries.

   Still UI-only: edits are live and in memory, reset on reload. The board it feeds
   is still the demonstration's own rows rather than the store's (truth 15 wants both
   editors on real rows; the car states got there first, this is the next one).

   The car editor had its own mode in here — a section per state, and a "show as a
   tab" switch. Both were the pre-D15 model, and the car states now read the store, so
   they are gone rather than left behind as a second answer to a settled question. */

let seq = 0;
const uid = () => `n${Date.now().toString(36)}${seq++}`;

export function StateEditor({
  seed,
  counts,
}: {
  seed: EditorRow[];
  counts: Record<string, number>;
}) {
  const [rows, setRows] = useState<EditorRow[]>(seed);

  const countOf = (label: string) => counts[label] ?? 0;

  function add() {
    setRows((r) => [...r, { id: uid(), label: "New state", colour: "" }]);
  }

  function rename(id: string, label: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, label } : x)));
  }

  function recolour(id: string, colour: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, colour } : x)));
  }

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function moveTo(fromId: string, toId: string) {
    setRows((r) => {
      const a = r.findIndex((x) => x.id === fromId);
      const b = r.findIndex((x) => x.id === toId);
      if (a < 0 || b < 0 || a === b) return r;
      const n = [...r];
      const [it] = n.splice(a, 1);
      n.splice(b, 0, it);
      return n;
    });
  }

  function moveBy(id: string, dir: -1 | 1) {
    setRows((r) => {
      const i = r.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= r.length) return r;
      const n = [...r];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  function remove(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="edwrap">
      <div className="edscroll">
        <div className="edtbl">
          <div className="edhrow" role="row">
            <span className="edh" aria-hidden="true" />
            <span className="edh">Name</span>
            <span className="edh">Colour</span>
            <span className="edh edh-num">Enquiries</span>
            <span className="edh" aria-hidden="true" />
          </div>

          {rows.map((row) => {
            const used = countOf(row.label);
            const blocked = used > 0;
            return (
              <div
                className={`edrow${dragId === row.id ? " dragging" : ""}${
                  overId === row.id ? " dragover" : ""
                }`}
                role="row"
                key={row.id}
                onDragOver={(e) => {
                  if (dragId && dragId !== row.id) {
                    e.preventDefault();
                    if (overId !== row.id) setOverId(row.id);
                  }
                }}
                onDragLeave={() => {
                  if (overId === row.id) setOverId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId) moveTo(dragId, row.id);
                  setDragId(null);
                  setOverId(null);
                }}
              >
                <span
                  className="edgrip"
                  role="button"
                  tabIndex={0}
                  aria-label={`Reorder ${row.label}`}
                  title="Drag to reorder — or focus and use ↑ / ↓"
                  draggable
                  onDragStart={(e) => {
                    setDragId(row.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      moveBy(row.id, -1);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      moveBy(row.id, 1);
                    }
                  }}
                >
                  <i className="fa-solid fa-grip-vertical" />
                </span>
                <input
                  className="edin"
                  type="text"
                  aria-label="State name"
                  value={row.label}
                  onChange={(e) => rename(row.id, e.target.value)}
                />
                <span className="edcolor">
                  <input
                    type="color"
                    className="edpick"
                    aria-label={`Colour for ${row.label}`}
                    value={row.colour || "#888888"}
                    onChange={(e) => recolour(row.id, e.target.value)}
                  />
                  <span
                    className={`edsample${row.colour ? "" : " neutral"}`}
                    style={
                      row.colour
                        ? { background: row.colour, color: inkFor(row.colour) }
                        : undefined
                    }
                  >
                    {row.label || "…"}
                  </span>
                </span>
                <span className="edcount">{used}</span>
                <span
                  className={`tt${blocked ? " tt-on" : ""}`}
                  tabIndex={blocked ? 0 : -1}
                  data-tip={
                    blocked
                      ? `${used} ${used === 1 ? "enquiry" : "enquiries"} still in this state — move ${
                          used === 1 ? "it" : "them"
                        } out first.`
                      : undefined
                  }
                >
                  <button
                    className="eddel"
                    type="button"
                    disabled={blocked}
                    aria-label={
                      blocked
                        ? `Cannot delete ${row.label} — in use`
                        : `Delete ${row.label}`
                    }
                    onClick={() => remove(row.id)}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <button className="btn edadd" type="button" onClick={add}>
        <i className="fa-solid fa-plus" />
        Add a state
      </button>

      <p className="ednote">
        <i className="fa-solid fa-circle-info" />
        Drag a row to set the order states appear in. A state an enquiry sits in cannot be deleted.
      </p>
    </div>
  );
}
