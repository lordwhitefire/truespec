import type { FieldError } from './car-input';

/**
 * What an office write answers: it landed, or it names what was wrong.
 *
 * One shape for every write the office makes from a form or a control — the registry edits, a car's
 * save, and setting an enquiry's state — so a screen can hold one result type and say the failed
 * part the same way wherever it came from. A failure always names **one** field and one plain
 * sentence; the wording is the screen's to show as it likes.
 */
export type EditResult = { ok: true } | { ok: false; errors: FieldError[] };
