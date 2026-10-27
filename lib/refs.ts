// The one definition of a car's reference code (R-REF-1…4). A car's code is a `TS-`
// sequence number: assigned once from `ts_ref_seq` (the write path, TASK-004), never
// edited, never typed by hand, never reused after deletion. This module owns the
// code's *shape* only — it never assigns, sets or reuses a code.

export const REF_PREFIX = 'TS-';

// R-REF-1 — the one formatter. A non-negative integer sequence becomes `TS-####`,
// zero-padded to four digits (`formatRef(42)` → `TS-0042`); a larger sequence simply
// runs on (`formatRef(12345)` → `TS-12345`).
export function formatRef(seq: number): string {
  if (!Number.isInteger(seq) || seq < 0) {
    throw new Error(`formatRef: the sequence must be a non-negative integer (got ${seq})`);
  }
  return `${REF_PREFIX}${String(seq).padStart(4, '0')}`;
}

// R-REF-1 — the one validity predicate. It accepts exactly what `formatRef` produces:
// four or more digits, with no leading zero beyond the padding.
const REF_SHAPE = /^TS-(?:0\d{3}|[1-9]\d{3,})$/;

export function isValidRef(ref: string): boolean {
  return typeof ref === 'string' && REF_SHAPE.test(ref);
}
