// The autofill answer — one filled car file, turned into the manual form's own strings.
//
// Pure: a reader's answer and a matched state in, the answer the route returns (and the form
// applies) out. No store, no session, no clock. The route owns the bytes, the door and the state
// lookup; this owns *what one car means*, and it reuses `carFormFromDraft` — the same mapping the
// draft save uses — so a file filled in by hand and a draft saved from a file cannot land in the
// form differently.
//
// The rules are the owner's (ruling 2026-10-20, #2):
//   * exactly one car — zero is a refusal, and more than one is a refusal that names the count and
//     points at Inventory's "Create from file"; there is no silent "first car";
//   * the state's label is matched by the caller; if it is gone, the form's state is left alone and
//     the answer says so — never guessed;
//   * refusals the reader found beside the one car still travel back, so a partly readable file is
//     reported rather than quietly narrowed.

import type { CarFormInput } from './car-input';
import type { CarFileRead, Refusal } from './draft-read';
import { carFormFromDraft } from './draft-save';

/** The state the caller found for the file's label, if it found one. */
export type MatchedCarState = { id: string; label: string };

export type AutofillAnswer =
  | {
      ok: true;
      /** The car form's own strings: the fourteen editable fields, and nothing else. */
      fields: CarFormInput;
      /** The matched state's id, or `""` when the file named none or its label is gone. */
      stateId: string;
      /** The state's name as the file wrote it, or `null` when it wrote none. */
      stateLabel: string | null;
      /** Whether the label named a current state; true when the file named no state at all. */
      stateFound: boolean;
      /** Refusals from other pages of the same file, if any. */
      refusals: Refusal[];
    }
  | {
      ok: false;
      reason: string;
      refusals?: Refusal[];
    };

/**
 * What one car file means for the form.
 *
 * `matched` is the caller's case-insensitive lookup for `read.cars[0].stateLabel` (or `null` when
 * the file named none). It is ignored for the zero/multi answers: there is no one car to ask about.
 */
export function autofillAnswer(read: CarFileRead, matched: MatchedCarState | null): AutofillAnswer {
  if (!read.ok) return { ok: false, reason: read.reason };

  const count = read.cars.length;
  if (count === 0) {
    return {
      ok: false,
      reason: 'No car could be read from that file.',
      refusals: read.refusals,
    };
  }

  if (count > 1) {
    return {
      ok: false,
      reason:
        `That file carries ${count} cars. Autofill takes one car; ` +
        'use Create from file on Inventory for a batch.',
    };
  }

  const car = read.cars[0];
  const fields = carFormFromDraft(car.values, matched?.id ?? '');
  return {
    ok: true,
    fields,
    stateId: matched?.id ?? '',
    stateLabel: car.stateLabel,
    stateFound: car.stateLabel === null ? true : matched !== null,
    refusals: read.refusals,
  };
}
