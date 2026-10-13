// The one definition of "sold" (R-SLD-1…3). Sold is a flag carried by a sale record —
// a price and a date — and never a state or a section a car can sit in. The record is
// the only source of sold-ness; un-marking reverses it cleanly, leaving no residue.

// The sale record — the only source of sold-ness (R-SLD-1). `null` means not sold.
export type SaleRecord = {
  salePriceKobo: number;
  soldAt: string; // ISO 8601
};
export type Sale = SaleRecord | null;

export type SaleAction =
  | { type: "mark"; salePriceKobo: number; soldAt: string }
  | { type: "unmark" };

// R-SLD-1 — sold-ness comes from the sale record, never from a state or a section.
export function isSold(sale: Sale): boolean {
  return sale !== null;
}

// R-SLD-2 — the sale price profit should use once the car is sold (null while unsold,
// so profit stays projected — R-MON-6).
export function salePriceOf(sale: Sale): number | null {
  return sale === null ? null : sale.salePriceKobo;
}

// R-SLD-3 — the one decision. Marking sets the record (price + date); un-marking
// reverses it to nothing. Un-marking a car that is not sold is a no-op, never a
// duplicate or a leftover — so mark-then-unmark returns exactly to the unsold state.
export function saleTransition(current: Sale, action: SaleAction): Sale {
  switch (action.type) {
    case "mark":
      return { salePriceKobo: action.salePriceKobo, soldAt: action.soldAt };
    case "unmark":
      return null;
  }
}
