// The one money module (specs/money, design D5). Integer minor units only —
// kobo for naira, cents for dollars. The single division in totalCostKobo is
// the single rounding point; formatting happens only at the display edge.

export const SIX_COST_KINDS = [
  "purchase_price",
  "shipping",
  "clearing",
  "trucking_usa",
  "trucking_ng",
  "full_tank",
] as const;

export type CostKind = (typeof SIX_COST_KINDS)[number];
export type Currency = "USD" | "NGN";

export const USD_COST_KINDS: readonly CostKind[] = [
  "purchase_price",
  "shipping",
  "clearing",
  "trucking_usa",
];
export const NGN_COST_KINDS: readonly CostKind[] = ["trucking_ng", "full_tank"];

export type CostLineInput = {
  kind: string;
  currency: Currency;
  amountMinor: number | null;
  rateMinor: number | null;
};

export function totalCostKobo(lines: readonly CostLineInput[]): number {
  let ngnMinor = 0;
  let usdProduct = 0; // sum of (amount_minor * rate_minor) — no rounding yet
  for (const line of lines) {
    if (line.amountMinor === null) continue; // NULL = not entered (0 is entered)
    if (line.currency === "USD") {
      if (line.rateMinor === null) continue; // a USD line without a rate is invalid data
      usdProduct += line.amountMinor * line.rateMinor;
    } else {
      ngnMinor += line.amountMinor;
    }
  }
  return ngnMinor + Math.trunc(usdProduct / 100); // the single rounding point
}

export function isCostComplete(lines: readonly CostLineInput[]): boolean {
  for (const kind of SIX_COST_KINDS) {
    const line = lines.find((l) => l.kind === kind);
    if (!line || line.amountMinor === null) return false;
    if (line.currency === "USD" && line.rateMinor === null) return false;
  }
  return true;
}

export function profitKobo(opts: {
  priceKobo: number | null;
  salePriceKobo: number | null;
  lines: readonly CostLineInput[];
}): number | null {
  const total = totalCostKobo(opts.lines);
  if (opts.salePriceKobo !== null) return opts.salePriceKobo - total;
  if (opts.priceKobo !== null) return opts.priceKobo - total;
  return null;
}

export function nairaDigits(kobo: number): string {
  return Math.trunc(kobo / 100).toLocaleString("en-NG");
}

export function formatNaira(kobo: number): string {
  return `₦${nairaDigits(kobo)}`;
}
