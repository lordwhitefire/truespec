"use client";

import {
  addEnquiryState,
  recolourEnquiryState,
  removeEnquiryState,
  renameEnquiryState,
  reorderEnquiryStates,
} from "@/app/office/actions/enquiry";
import type { EnquiryRegistryState } from "@/lib/enquiry-state";
import { RegistryEditor } from "./registry-editor";

/* The enquiry-state editor, bound to its registry and its five writes (truth 10, truth 15).

   No row here is locked, and that is the registry's whole difference from the car states: an
   enquiry's states are all the owner's — the five the store ships with (New, Talking, Negotiating,
   Sold, Lost) are his to rename, recolour, reorder and remove, and so is every one he adds.

   The states are labels, not stages (truth 13). Their order decides what the board **lays out** in,
   which is exactly what this list is for; it asserts nothing about one state coming before another,
   and any enquiry can be given any state at any time. */

export function EnquiryStateEditor({ states }: { states: EnquiryRegistryState[] }) {
  return (
    <RegistryEditor
      noun="Enquiries"
      rows={states.map((row) => ({
        id: row.id,
        label: row.label,
        colour: row.colour,
        count: row.enquiries,
      }))}
      actions={{
        add: addEnquiryState,
        rename: renameEnquiryState,
        recolour: recolourEnquiryState,
        reorder: reorderEnquiryStates,
        remove: removeEnquiryState,
      }}
      note={
        <>
          These are the states an enquiry can be given, and all of them are yours — add one, rename
          it, drag a row to set the order the board lays out in, and pick its colour. A state an
          enquiry sits in cannot be deleted. Any enquiry can be given any state at any time.
        </>
      }
    />
  );
}
