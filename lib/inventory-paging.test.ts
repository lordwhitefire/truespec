/**
 * The office inventory's paging rule, executable.
 *
 * The owner's choice is 25 by default, with 10 / 25 / 50 / 100 offered. These cases pin the
 * arithmetic the table and the phone cards share — including the clamps that keep a page from
 * disappearing after a delete or a smaller page size.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  INVENTORY_DEFAULT_PAGE_SIZE,
  INVENTORY_PAGE_SIZES,
  clampPage,
  isInventoryPageSize,
  pageCountFor,
  pageSlice,
} from "./inventory-paging";

const rows = Array.from({ length: 101 }, (_, i) => i);

test("the office default is 25, with 10/25/50/100 offered", () => {
  assert.equal(INVENTORY_DEFAULT_PAGE_SIZE, 25);
  assert.deepEqual(INVENTORY_PAGE_SIZES, [10, 25, 50, 100]);
  assert.equal(isInventoryPageSize(10), true);
  assert.equal(isInventoryPageSize(25), true);
  assert.equal(isInventoryPageSize(50), true);
  assert.equal(isInventoryPageSize(100), true);
  assert.equal(isInventoryPageSize(0), false);
  assert.equal(isInventoryPageSize(26), false);
});

test("page one holds the first 25 of 101", () => {
  const p = pageSlice(rows, 1, 25);
  assert.equal(p.page, 1);
  assert.equal(p.pageCount, 5);
  assert.equal(p.rows.length, 25);
  assert.equal(p.rows[0], 0);
  assert.equal(p.rows[24], 24);
});

test("the last page keeps only the remainder", () => {
  const p = pageSlice(rows, 5, 25);
  assert.equal(p.page, 5);
  assert.equal(p.pageCount, 5);
  assert.equal(p.rows.length, 1);
  assert.equal(p.rows[0], 100);
});

test("a page beyond the end clamps to the last page", () => {
  const p = pageSlice(rows, 99, 25);
  assert.equal(p.page, 5);
  assert.equal(p.pageCount, 5);
  assert.equal(p.rows.length, 1);
  assert.equal(p.rows[0], 100);
});

test("an empty list is still one empty page", () => {
  assert.deepEqual(pageSlice([], 3, 10), { page: 1, pageCount: 1, rows: [] });
});

test("the size choice changes the slice and the page count", () => {
  assert.equal(pageCountFor(101, 10), 11);
  assert.equal(pageCountFor(101, 100), 2);
  assert.equal(pageSlice(rows, 2, 10).rows[0], 10);
  assert.equal(pageSlice(rows, 2, 10).rows.length, 10);
});

test("the page slices partition the list — no row lost, none repeated", () => {
  const pages = pageSlice(rows, 1, 10).pageCount;
  const seen = Array.from({ length: pages }, (_, i) => pageSlice(rows, i + 1, 10).rows).flat();
  assert.deepEqual(seen, rows);
});

test("clampPage never goes below one or past the last", () => {
  assert.equal(clampPage(0, 3), 1);
  assert.equal(clampPage(2, 3), 2);
  assert.equal(clampPage(9, 3), 3);
  assert.equal(clampPage(1, 0), 1);
});
