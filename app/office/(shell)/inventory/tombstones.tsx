'use client';

import { useState, useTransition } from 'react';
import { removeCarForever } from '../../actions/car';

// The cars waiting to be cleared — the office's own view of its tombstones (truth 6,
// specs/inventory: "the tombstone is hidden from all reads and stays listed as waiting
// to be cleared, and the owner removes it for good whenever he chooses").
//
// This list is the one place a deleted car is still named. Removing one for good is the
// owner's action and his alone — nothing here is on a timer: the button waits as long as
// he does. Removal takes the car's photos, cost lines and sale row with it and clears its
// stored images; any image that would not clear is reported, never swallowed.
//
// It is deliberately separate from the inventory table above: the table lists live stock,
// this lists what the owner has already deleted and may now clear out.

export type TombstoneRow = {
  id: string;
  ref: string;
  name: string;
  /** "29 Sep 2026" — when it was deleted. */
  deletedOn: string;
};

export function Tombstones({ rows: initial }: { rows: TombstoneRow[] }) {
  const [rows, setRows] = useState(initial);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startWrite] = useTransition();

  function remove(id: string) {
    const car = rows.find((x) => x.id === id);
    setConfirmId(null);
    startWrite(async () => {
      const res = await removeCarForever(id);
      if (!res.ok) {
        setMsg(res.errors[0]?.message ?? 'That car could not be removed.');
        return;
      }
      setRows((r) => r.filter((x) => x.id !== id));
      const name = car?.name ?? 'The car';
      setMsg(
        res.assetsFailed > 0
          ? `${name} was removed. ${res.assetsFailed} of its image${res.assetsFailed === 1 ? '' : 's'} could not be cleared, and the daily job will clear it.`
          : `${name} was removed for good, with its images.`
      );
    });
  }

  if (rows.length === 0) return null;

  return (
    <section className="panel clearout" aria-labelledby="clearout-h">
      <h2 id="clearout-h">
        <i className="fa-solid fa-broom" aria-hidden="true" /> Waiting to be cleared
      </h2>
      <p className="sub2">
        Deleted cars. Nothing removes them on its own — you remove one for good whenever you choose.
      </p>
      <ul className="clearout-list">
        {rows.map((r) => (
          <li key={r.id}>
            <span className="clearout-name">
              <b>{r.name}</b> <small>{r.ref}</small>
            </span>
            <span className="sub2">deleted {r.deletedOn}</span>
            <span className="clearout-acts">
              {confirmId === r.id ? (
                <>
                  <button className="btn2" type="button" onClick={() => setConfirmId(null)}>
                    Keep it
                  </button>
                  <button className="btn2 danger" type="button" onClick={() => remove(r.id)}>
                    <i className="fa-solid fa-trash-can" aria-hidden="true" /> Remove for good
                  </button>
                </>
              ) : (
                <button className="btn2 danger" type="button" onClick={() => setConfirmId(r.id)}>
                  Remove for good
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {msg ? (
        <p className="note" role="status" aria-live="polite">
          {msg}
        </p>
      ) : null}
    </section>
  );
}
