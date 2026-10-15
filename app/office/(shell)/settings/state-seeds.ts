// The enquiry board's states, as seeds for the Settings customer-state editor
// (RECON-001 v1): the five dot colours the board already uses — nothing invented
// (owner ruling 2026-10-12, v1.md §8/§11/§12).
//
// The car states used to be seeded here too. They no longer are: a car's states are
// the store's — the four fixed primaries plus the secondaries the owner creates
// (`car_state`, edited at /office/settings) — so a seed beside them could only be a
// second, staler answer to the same question (truth 15).

export type EditorRow = {
  id: string;
  label: string;
  colour: string;
};

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
