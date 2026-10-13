import type { Section } from "@/lib/sections";

// The built-in state lists, as seeds for the two Settings state editors
// (RECON-001 v1). UI-only: these are the states the office already ships, and
// the colours it already uses — nothing invented (owner ruling 2026-10-12,
// v1.md §8/§11/§12).
//
//  - Car states: Available --ok green; On the way / At port #3a7bd5 blue;
//    Cleared --gold; Landed --warn. All five "Show as a tab" ON (they are the
//    inventory filters the office shows). Special is NOT a row — it is the
//    ribbon, fixed gold.
//  - Customer states: the enquiry board's five dot colours.
//
// Section identity is NOT defined here. A car state maps to one of the three
// sections from `lib/sections.ts` — the one definition (R-SEC-1) — and this file
// only names which one each owner state maps to; the editor renders each with the
// one label (`sectionLabel`). There is no second section list.

export type EditorRow = {
  id: string;
  label: string;
  colour: string;
  /** car editor only — the section the state shows under (one of `Section`) */
  section?: Section;
  /** car editor only — an inventory filter, never a showroom tab */
  tab?: boolean;
};

export const CAR_STATES: EditorRow[] = [
  { id: "available", label: "Available", colour: "#0e7a3e", section: "available", tab: true },
  { id: "on-the-way", label: "On the way", colour: "#3a7bd5", section: "on order", tab: true },
  { id: "at-port", label: "At port", colour: "#3a7bd5", section: "on order", tab: true },
  { id: "cleared", label: "Cleared", colour: "#c8a24a", section: "on order", tab: true },
  { id: "landed", label: "Landed", colour: "#b9820b", section: "landed", tab: true },
];

export const CUSTOMER_STATES: EditorRow[] = [
  { id: "new", label: "New", colour: "#3a7bd5" },
  { id: "talking", label: "Talking", colour: "#b9820b" },
  { id: "nego", label: "Negotiating", colour: "#c8a24a" },
  { id: "sold", label: "Sold", colour: "#0e7a3e" },
  { id: "lost", label: "Lost", colour: "#8a9096" },
];

// The customer board's counts, from the same hardcoded demo seed the enquiries
// screen renders (enquiries-client.tsx SEED): 2 new, 1 talking, 1 negotiating,
// 1 sold, 1 lost.
export const CUSTOMER_COUNTS: Record<string, number> = {
  New: 2,
  Talking: 1,
  Negotiating: 1,
  Sold: 1,
  Lost: 1,
};
