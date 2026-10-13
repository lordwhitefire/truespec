import type { Section } from "./sections";

// The one money module (specs/money, R-MON-1…12). Naira only — no currency, no
// exchange rate, nothing converted. Every amount is integer kobo; the only place
// money is combined is `totalCostKobo`; naira formatting happens only at the display
// edge (`nairaDigits` / `formatNaira`).
//
// Cost is an office-side figure (R-MON-12) and is tied to the car's state (R-MON-7).
// The selling price is the car's single doorstep price and belongs to no state
// (R-MON-11).

// R-MON-1 — exactly six cost kinds, each an amount in naira. No seventh exists.
export const SIX_COST_KINDS = [
  "purchase_price",
  "shipping",
  "clearing",
  "trucking_usa",
  "trucking_ng",
  "full_tank",
] as const;

export type CostKind = (typeof SIX_COST_KINDS)[number];

// A stored cost line, naira only. `amountMinor` is integer kobo; `null` means not
// entered (an entered `0` is a value — R-MON-2). There is no currency and no rate
// (R-MON-3).
export type CostLineInput = {
  kind: string;
  amountMinor: number | null;
};

// R-MON-4 / R-MON-5 — the exact sum of the lines, in integer kobo. This is the only
// place the six lines are summed; every read point calls it. A missing line adds
// nothing (but leaves the car incomplete — R-MON-2).
export function totalCostKobo(lines: readonly CostLineInput[]): number {
  let total = 0;
  for (const line of lines) {
    if (line.amountMinor === null) continue; // NULL = not entered; 0 is entered
    total += line.amountMinor;
  }
  return total;
}

// R-MON-2 — complete iff all six kinds have a value; an entered `0` counts as a value,
// a missing value (or `null`) leaves the car incomplete.
export function isCostComplete(lines: readonly CostLineInput[]): boolean {
  for (const kind of SIX_COST_KINDS) {
    const line = lines.find((l) => l.kind === kind);
    if (!line || line.amountMinor === null) return false;
  }
  return true;
}

// R-MON-6 — projected before sale (doorstep price − cost), real after (sale price −
// cost), none when the car has no price at all. A negative figure is returned exactly
// as it is — never clamped, warned about, or suppressed.
export type ProfitBasis = "projected" | "real" | "none";
export type Profit = { kobo: number | null; basis: ProfitBasis };

export function profitKobo(opts: {
  totalCostKobo: number;
  priceKobo: number | null;
  salePriceKobo: number | null;
}): Profit {
  if (opts.salePriceKobo !== null) {
    return { kobo: opts.salePriceKobo - opts.totalCostKobo, basis: "real" };
  }
  if (opts.priceKobo !== null) {
    return { kobo: opts.priceKobo - opts.totalCostKobo, basis: "projected" };
  }
  return { kobo: null, basis: "none" };
}

// R-MON-7 — the cost figure's name, by the car's state and whether it is sold. The
// model words this as the car's *state*; a state resolves to exactly one section
// (R-SEC-2), and that section is the stage — "on order" is not yet landed, "available"
// and "landed" have landed. The state's label is never used for the name. A car that
// has not landed never reads "Landed cost"; a sold car reads "Total cost". Cost is
// office-only (R-MON-12); the price is never named here (R-MON-11).
export function costLabelFor(state: Section, sold: boolean): string {
  if (sold) return "Total cost";
  if (state === "on order") return "Estimated total cost";
  return "Landed cost";
}

// R-MON-10 — the one validation predicate for a typed amount. Valid naira input (a
// bare number, with `,` grouping and an optional `₦`) returns integer kobo; anything
// else returns the message to show at the field. `0` is a valid amount.
export type ParsedAmount =
  | { ok: true; amountMinor: number }
  | { ok: false; error: string };

export function parseCostAmount(raw: string): ParsedAmount {
  if (typeof raw !== "string") return { ok: false, error: "Enter an amount" };
  const cleaned = raw.trim().replace(/^₦/, "").replace(/[,\s]/g, "");
  if (cleaned === "") return { ok: false, error: "Enter an amount" };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, error: "Enter a naira amount, e.g. 12500 or 12500.50" };
  }
  const [major, minor = ""] = cleaned.split(".");
  const amountMinor = Number(major) * 100 + Number(minor.padEnd(2, "0"));
  return { ok: true, amountMinor };
}

// R-MON-5 — formatting at the display edge only. `nairaDigits` shows whole naira with
// grouping; `formatNaira` prefixes the naira sign.
export function nairaDigits(kobo: number): string {
  return Math.trunc(kobo / 100).toLocaleString("en-NG");
}

export function formatNaira(kobo: number): string {
  return `₦${nairaDigits(kobo)}`;
}
