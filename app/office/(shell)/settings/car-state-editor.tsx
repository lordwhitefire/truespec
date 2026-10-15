"use client";

import { useState, useTransition } from "react";
import {
  addCarState,
  recolourCarState,
  removeCarState,
  renameCarState,
  reorderCarStates,
  type StateEditResult,
} from "@/app/office/actions/state";
import type { RegistryState } from "@/lib/car-state";
import { inkFor } from "./colour";

/* The car-state editor — the registry, edited for real (truth 10, D15).

   Two kinds of row, and the difference is the point. The **four fixed primary
   states** sit at the top as locked rows: they are what the showroom groups by, so
   there is no control here that could rename, recolour, reorder or delete one — and
   the statements would take no notice if there were. Everything below them is the
   owner's: he adds, renames, recolours, reorders and removes his **secondary**
   states, and a secondary state carries no section and no new-arrival flag because
   those belong to a primary state alone.

   Nothing here decides for the store. A delete is always offered and always
   attempted: whether a state is deletable is the store's own answer (the foreign
   keys are ON DELETE RESTRICT), so the store's reason is what the owner is shown.
   A name that another state already carries is the store's own unique constraint,
   reported the same way.

   Every edit is written when it is finished — a name when the field loses focus, a
   colour when the picker does, an order when a row is dropped or moved. That is
   what the store-backed screen can promise: there is no unsaved state, and the
   counts beside each state are the office's own rows. */

const DEFAULT_COLOUR = "#8a9096";

export function CarStateEditor({ states }: { states: RegistryState[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /** Colours being picked, so the swatch follows the picker rather than the last save. */
  const [live, setLive] = useState<Record<string, string>>({});
  /** A refused edit bumps the row's key, which puts the field back to what the store holds. */
  const [refused, setRefused] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const primaries = states.filter((row) => row.kind === "primary");
  const secondaries = states.filter((row) => row.kind === "secondary");

  function clearLive(id: string) {
    setLive((current) => {
      if (!(id in current)) return current;
      const { [id]: _dropped, ...rest } = current;
      return rest;
    });
  }

  function run(work: () => Promise<StateEditResult>, opts?: { rowId?: string; onOk?: () => void }) {
    setError(null);
    start(async () => {
      let result: StateEditResult;
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

  function commitName(row: RegistryState, value: string) {
    const label = value.replace(/\s+/g, " ").trim();
    if (label === row.label) return;
    const form = new FormData();
    form.set("id", row.id);
    form.set("label", label);
    run(() => renameCarState(form), { rowId: row.id });
  }

  function commitColour(row: RegistryState, colour: string) {
    if (colour.toLowerCase() === row.colour.toLowerCase()) return;
    const form = new FormData();
    form.set("id", row.id);
    form.set("colour", colour);
    run(() => recolourCarState(form), { rowId: row.id });
  }

  function order(ids: string[]) {
    run(() => reorderCarStates(ids));
  }

  function moveBy(id: string, dir: -1 | 1) {
    const ids = secondaries.map((row) => row.id);
    const from = ids.indexOf(id);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    order(ids);
  }

  function moveTo(fromId: string, toId: string) {
    const ids = secondaries.map((row) => row.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    order(ids);
  }

  function add() {
    // The store holds one row per state, so a new row starts with a name nothing else
    // carries and the owner renames it. Names are the store's own unique constraint,
    // across both kinds, so the placeholder steps aside rather than colliding.
    const taken = new Set(states.map((row) => row.label));
    let label = "New state";
    for (let n = 2; taken.has(label); n += 1) label = `New state ${n}`;

    const form = new FormData();
    form.set("label", label);
    form.set("colour", DEFAULT_COLOUR);
    run(() => addCarState(form), { onOk: () => setJustAdded(true) });
  }

  const lastSecondary = secondaries[secondaries.length - 1]?.id;

  return (
    <div className="edwrap" aria-busy={pending}>
      <div className="edscroll">
        <div className="edtbl">
          <div className="edhrow" role="row">
            <span className="edh" aria-hidden="true" />
            <span className="edh">Name</span>
            <span className="edh">Colour</span>
            <span className="edh edh-num">Cars</span>
            <span className="edh" aria-hidden="true" />
          </div>

          {primaries.map((row) => (
            <div className="edrow" role="row" key={row.id}>
              <span aria-hidden="true" />
              <span className="edro" title="A fixed state — it is what the showroom groups by">
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
              <span className="edcount">{row.cars}</span>
              <span aria-hidden="true" />
            </div>
          ))}

          {secondaries.map((row) => {
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
                  autoFocus={justAdded && row.id === lastSecondary}
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
                <span className="edcount">{row.cars}</span>
                <span className="tt">
                  <button
                    className="eddel"
                    type="button"
                    disabled={pending}
                    aria-label={`Delete ${row.label}`}
                    onClick={() => run(() => removeCarState(row.id))}
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
        The four at the top are fixed — the showroom groups by them, and it shows the first three,
        never Sold. The states below are yours: give a new one a name, drag a row to set the order,
        and pick its colour. A state a car sits in cannot be deleted.
      </p>
    </div>
  );
}
