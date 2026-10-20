/**
 * The office inventory's paging rule.
 *
 * The owner chose 25 rows by default, with 10 / 25 / 50 / 100 offered. The rule is pure so the
 * table, the phone cards and the tests all use the same arithmetic — and so a page can never be
 * sliced past the end of the list.
 */
export const INVENTORY_PAGE_SIZES = [10, 25, 50, 100] as const;
export const INVENTORY_DEFAULT_PAGE_SIZE = 25;

export type InventoryPageSize = (typeof INVENTORY_PAGE_SIZES)[number];

export function isInventoryPageSize(n: number): n is InventoryPageSize {
  return (INVENTORY_PAGE_SIZES as readonly number[]).includes(n);
}

/** At least one page, even when there are no rows — an empty list still has a page 1. */
export function pageCountFor(total: number, pageSize: InventoryPageSize): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Keep a page number inside the list's real range. */
export function clampPage(page: number, pageCount: number): number {
  return Math.min(Math.max(page, 1), Math.max(1, pageCount));
}

/**
 * The one slice both views render. A caller asking for page 99 gets the last real page, not an
 * empty table; a caller asking for page 0 gets page 1.
 */
export function pageSlice<T>(
  rows: readonly T[],
  page: number,
  pageSize: InventoryPageSize,
): { page: number; pageCount: number; rows: T[] } {
  const pageCount = pageCountFor(rows.length, pageSize);
  const current = clampPage(page, pageCount);
  return {
    page: current,
    pageCount,
    rows: rows.slice((current - 1) * pageSize, current * pageSize),
  };
}
