"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { EditResult } from "@/lib/edit-result";
import { inkFor } from "./colour";

/* One registry editor, used twice: a car's states and an enquiry's states.

   The two registries are the same kind of thing and the difference between them is one
   flag, so they share a component rather than a component each (truth 10). A car's four
   **primary** states arrive `locked` — they are what the showroom groups by, so they are
   drawn but never edited, and the statements behind them would take no notice if they
   were. Every enquiry state arrives unlocked, because all of them are the owner's. What
   is shared is everything else: the rows, the name that commits when the field loses
   focus, the colour that commits when the picker does, the drag and the arrow keys that
   write the whole order, and the delete that is always offered.

   Nothing here decides for the store. A delete is always attempted: whether a state is
   deletable is the store's own answer (the foreign keys are ON DELETE RESTRICT), so the
   store's reason — carrying the store's own count — is what the owner is shown. A name
   another state already carries is the store's own unique constraint, reported the same
   way. The counts beside each state are the office's own rows.

   Every edit is written when it is finished, so there is no unsaved state to lose: a
   refused edit puts the field back to what the store holds (the row's key is bumped). */

const DEFAULT_COLOUR = "#8a9096";

/** One row, as an editor draws it. `locked` rows are drawn and nothing more. */
export type EditorRow = {
  id: string;
  label: string;
  colour: string;
  /** How many records carry this state — the store's own count. */
  count: number;
  /** A fixed state (a car's four primaries): drawn, never renamed, moved or deleted. */
  locked?: boolean;
};

/** The five writes a registry accepts. Each answers the same way, so one editor serves both. */
export type RegistryEditorActions = {
  add: (form: FormData) => Promise<EditResult>;
  rename: (form: FormData) => Promise<EditResult>;
  recolour: (form: FormData) => Promise<EditResult>;
  reorder: (ids: string[]) => Promise<EditResult>;
  remove: (id: string) => Promise<EditResult>;
};

export function RegistryEditor({
  rows,
  noun,
  lockedNote,
  note,
  actions,
}: {
  rows: EditorRow[];
  /** What the counted column counts — "Cars" or "Enquiries". */
  noun: string;
  /** Why a locked row is locked, shown on the first locked row's name. */
  lockedNote?: string;
  /** The footer note, which says what is fixed and what is the owner's. */
  note: ReactNode;
  actions: RegistryEditorActions;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /** Colours being picked, so the swatch follows the picker rather than the last save. */
  const [live, setLive] = useState<Record<string, string>>({});
  /** A refused edit bumps the row's key, which puts the field back to what the store holds. */
  const [refused, setRefused] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const locked = rows.filter((row) => row.locked);
  const editable = rows.filter((row) => !row.locked);

  function clearLive(id: string) {
    setLive((current) => {
      if (!(id in current)) return current;
      const { [id]: _dropped, ...rest } = current;
      return rest;
    });
  }

  function run(work: () => Promise<EditResult>, opts?: { rowId?: string; onOk?: () => void }) {
    setError(null);
    start(async () => {
      let result: EditResult;
      try {
        result = await work();
      } catch {
        setError("The store could not be reached — try that again");
        return;
      }
      if (result.ok) {
        opts?.onOk?.();
        return;
      }
      setError(result.errors[0]?.message ?? "The store refused that change");
      if (opts?.rowId) {
        const id = opts.rowId;
        clearLive(id);
        setRefused((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
      }
    });
  }

  function commitName(row: EditorRow, value: string) {
    const label = value.replace(/\s+/g, " ").trim();
    if (label === row.label) return;
    const form = new FormData();
    form.set("id", row.id);
    form.set("label", label);
    run(() => actions.rename(form), { rowId: row.id });
  }

  function commitColour(row: EditorRow, colour: string) {
    if (colour.toLowerCase() === row.colour.toLowerCase()) return;
    const form = new FormData();
    form.set("id", row.id);
    form.set("colour", colour);
    run(() => actions.recolour(form), { rowId: row.id });
  }

  function order(ids: string[]) {
    run(() => actions.reorder(ids));
  }

  function moveBy(id: string, dir: -1 | 1) {
    const ids = editable.map((row) => row.id);
    const from = ids.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    order(ids);
  }

  function moveTo(fromId: string, toId: string) {
    const ids = editable.map((row) => row.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    order(ids);
  }

  function add() {
    // The store holds one row per state, so a new row starts with a name nothing else
    // carries and the owner renames it. Names are the store's own unique constraint, so
    // the placeholder steps aside rather than colliding.
    const taken = new Set(rows.map((row) => row.label));
    let label = "New state";
    for (let n = 2; taken.has(label); n += 1) label = `New state ${n}`;

    const form = new FormData();
    form.set("label", label);
    form.set("colour", DEFAULT_COLOUR);
    run(() => actions.add(form), { onOk: () => setJustAdded(true) });
  }

  const lastEditable = editable[editable.length - 1]?.id;

  return (
    <div className="edwrap" aria-busy={pending}>
      <div className="edscroll">
        <div className="edtbl">
          <div className="edhrow" role="row">
            <span className="edh" aria-hidden="true" />
            <span className="edh">Name</span>
            <span className="edh">Colour</span>
            <span className="edh edh-num">{noun}</span>
            <span className="edh" aria-hidden="true" />
          </div>

          {locked.map((row, index) => (
            <div className="edrow" role="row" key={row.id}>
              <span aria-hidden="true" />
              <span className="edro" title={index === 0 ? lockedNote : undefined}>
                <i className="fa-solid fa-lock" aria-hidden="true" />
                {row.label}
              </span>
              <span className="edcolor">
                <span
                  className="edsample"
                  style={{ background: row.colour, color: inkFor(row.colour) }}
                >
                  {row.label}
                </span>
              </span>
              <span className="edcount">{row.count}</span>
              <span aria-hidden="true" />
            </div>
          ))}

          {editable.map((row) => {
            const colour = live[row.id] ?? row.colour;
            return (
              <div
                className={`edrow${dragId === row.id ? " dragging" : ""}${
                  overId === row.id ? " dragover" : ""
                }`}
                role="row"
                key={`${row.id}:${row.label}:${refused[row.id] ?? 0}`}
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
                  aria-label={`Name of ${row.label}`}
                  defaultValue={row.label}
                  autoFocus={justAdded && row.id === lastEditable}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  onBlur={(e) => {
                    setJustAdded(false);
                    commitName(row, e.currentTarget.value);
                  }}
                />
                <span className="edcolor">
                  <input
                    type="color"
                    className="edpick"
                    aria-label={`Colour for ${row.label}`}
                    value={colour}
                    onChange={(e) => {
                      const next = e.currentTarget.value;
                      setLive((current) => ({ ...current, [row.id]: next }));
                    }}
                    onBlur={(e) => commitColour(row, e.currentTarget.value)}
                  />
                  <span
                    className="edsample"
                    style={{ background: colour, color: inkFor(colour) }}
                  >
                    {row.label}
                  </span>
                </span>
                <span className="edcount">{row.count}</span>
                <span className="tt">
                  <button
                    className="eddel"
                    type="button"
                    disabled={pending}
                    aria-label={`Delete ${row.label}`}
                    onClick={() => run(() => actions.remove(row.id))}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="err on" role="alert">
          <i className="fa-solid fa-circle-exclamation" />
          {error}
        </p>
      )}

      <button className="btn edadd" type="button" onClick={add} disabled={pending}>
        <i className="fa-solid fa-plus" />
        Add a state
      </button>

      <p className="ednote">
        <i className="fa-solid fa-circle-info" />
        {note}
      </p>
    </div>
  );
}
