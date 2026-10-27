'use client';

import {
  addCarState,
  recolourCarState,
  removeCarState,
  renameCarState,
  reorderCarStates,
} from '@/app/office/actions/state';
import type { RegistryState } from '@/lib/car-state';
import { RegistryEditor } from './registry-editor';

/* The car-state editor, bound to its registry and its five writes (truth 10, D15).

   The rows are the same rows the shared editor draws; the `locked` flag is the whole of this
   registry's difference. A car's **four fixed primary states** are locked — they are what the
   showroom groups by — and every **secondary** state below them is the owner's. A secondary
   carries no section and no new-arrival flag, because those belong to a primary state alone. */

export function CarStateEditor({ states }: { states: RegistryState[] }) {
  return (
    <RegistryEditor
      noun="Cars"
      lockedNote="A fixed state — it is what the showroom groups by"
      rows={states.map((row) => ({
        id: row.id,
        label: row.label,
        colour: row.colour,
        count: row.cars,
        locked: row.kind === 'primary',
      }))}
      actions={{
        add: addCarState,
        rename: renameCarState,
        recolour: recolourCarState,
        reorder: reorderCarStates,
        remove: removeCarState,
      }}
      note={
        <>
          The four at the top are fixed — the showroom groups by them, and it shows the first three,
          never Sold. The states below are yours: give a new one a name, drag a row to set the
          order, and pick its colour. A state a car sits in cannot be deleted.
        </>
      }
    />
  );
}
