"use client";

import { useState } from "react";
import { SECTIONS, type CarSection, type EditorRow } from "./state-seeds";
import { inkFor } from "./colour";

/* The two state editors (RECON-001 v1, ui-plan Q59). One shared table; the
   car-only controls (group dropdown, "Show as a tab") are gated on `car`.

   UI-only: edits are live and in memory, reset on reload — no save button, no
   storage (owner ruling 2026-10-12, v1.md §5). */

let seq = 0;
const uid = () => `n${Date.now().toString(36)}${seq++}`;

export function StateEditor({
  car,
  seed,
  counts,
}: {
  car: boolean;
  seed: EditorRow[];
  counts: Record<string, number>;
}) {
  const [rows, setRows] = useState<EditorRow[]>(seed);

  const countOf = (label: string) => counts[label] ?? 0;

  function add() {
    setRows((r) => [
      ...r,
      car
        ? { id: uid(), label: "New state", colour: "", section: "Available", tab: true }
        : { id: uid(), label: "New state", colour: "" },
    ]);
  }

  function rename(id: string, label: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, label } : x)));
  }

  function recolour(id: string, colour: string) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, colour } : x)));
  }

  function setSection(id: string, section: CarSection) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, section } : x)));
  }

  function setTabFlag(id: string, tab: boolean) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, tab } : x)));
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
        <div className={`edtbl${car ? " edtbl-car" : ""}`}>
          <div className="edhrow" role="row">
            <span className="edh edh-grip" aria-hidden="true" />
            <span className="edh">Name</span>
            <span className="edh">Colour</span>
            {car && <span className="edh">Section</span>}
            {car && <span className="edh edh-tab">Show as a tab</span>}
            <span className="edh edh-num">{car ? "Cars" : "Enquiries"}</span>
            <span className="edh edh-del" aria-hidden="true" />
          </div>

          {rows.map((row) => {
            const used = countOf(row.label);
            const blocked = used > 0;
            const noun = car
              ? used === 1
                ? "car"
                : "cars"
              : used === 1
                ? "enquiry"
                : "enquiries";
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
                {car && (
                  <select
                    className="edsection"
                    aria-label={`Section for ${row.label}`}
                    value={row.section}
                    onChange={(e) => setSection(row.id, e.target.value as CarSection)}
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
                {car && (
                  <label className="edswitch">
                    <input
                      type="checkbox"
                      checked={!!row.tab}
                      aria-label={`Show ${row.label} as a tab`}
                      onChange={(e) => setTabFlag(row.id, e.target.checked)}
                    />
                    <span className="edtrack">
                      <span className="edknob" />
                    </span>
                  </label>
                )}
                <span className="edcount">{used}</span>
                <span
                  className={`tt${blocked ? " tt-on" : ""}`}
                  tabIndex={blocked ? 0 : -1}
                  data-tip={
                    blocked
                      ? `${used} ${noun} still in this state — move ${used === 1 ? "it" : "them"} out first.`
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
        {car
          ? "Drag a row to set the order states appear in. A state a car sits in cannot be deleted."
          : "Drag a row to set the order states appear in. A state an enquiry sits in cannot be deleted."}
      </p>
    </div>
  );
}
