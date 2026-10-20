"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOfficeSession } from "@/lib/session";
import { storeQuery, storeQueryRefusing, storeRefusal } from "@/lib/store-guard";
import type { EditResult } from "@/lib/edit-result";
import { CHANGE_CHECK_VERSION, enquiryChangeCheck } from "@/lib/change-check";
import {
  enquiryStateAddStatement,
  enquiryStateHoldersStatement,
  enquiryStateRecolourStatement,
  enquiryStateRemoveStatement,
  enquiryStateRenameStatement,
  enquiryStateReorderStatement,
} from "@/lib/enquiry-state";
import { enquiryEditableStatement, enquirySetStateStatement } from "@/lib/enquiry-set-state";
import { enquiryUpdateStatement } from "@/lib/enquiry-update";
import { enquiryValuesFromForm } from "@/lib/enquiry-form";
import { readEnquirySeed } from "@/lib/draft-save";
import { enquiryStateExists } from "@/lib/draft-store";

/**
 * The enquiry writes — the registry of states, and the one change the owner makes to an enquiry.
 *
 * A Server Action is a public endpoint, so each one does everything itself: it checks the session,
 * reads what it was sent, and refuses what it must *before* the store is asked.
 *
 * Two refusals come from the store itself and are reported as it means them, never swallowed: a name
 * another state already carries (the store's own `UNIQUE (label)` on `enquiry_state`), and deleting a
 * state an enquiry still sits in (the foreign key is `ON DELETE RESTRICT`). The second is the one
 * truth 10 names: refused by the store, with the reason shown — so the reason carries the store's own
 * count, asked only after it has refused. Nothing is moved out of a state on the owner's behalf.
 *
 * Every write is retry-safe (D18), the same way the car registry's are: the add's key is minted here
 * once, the rename and recolour set a value to a target, the reorder writes the whole list, and the
 * state set is gated on the state actually changing.
 *
 * **The log names the `ENQ-####`, never the customer** (owner ruling 2026-10-20 #4). Creating an
 * enquiry, editing its details and changing its state each writes one `activity_event` whose
 * subject is the code the store minted. Names, numbers and notes stay in the `enquiry` row —
 * identifiers in the log, personal details in the record.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^#[0-9a-fA-F]{6}$/;
/** Enough for a name an owner reads on a chip; short enough to stay one on the smallest screen. */
const NAME_MAX = 40;
/** A registry this long is a mistake, not a registry — the cap keeps a stray payload off the store. */
const ORDER_MAX = 200;

type Refusal = Extract<EditResult, { ok: false }>;

const fail = (field: string, message: string): Refusal => ({
  ok: false,
  errors: [{ field, message }],
});

/** A state's name: collapsed to single spaces, non-empty, within the cap. */
function readLabel(raw: FormDataEntryValue | null): { ok: true; label: string } | Refusal {
  const value = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (value === "") return fail("label", "Give the state a name");
  if (value.length > NAME_MAX) return fail("label", `Keep the name to ${NAME_MAX} characters`);
  return { ok: true, label: value };
}

/** A state's colour: the six-digit hex the store's own `enquiry_state_colour_hex` check accepts. */
function readColour(raw: FormDataEntryValue | null): { ok: true; colour: string } | Refusal {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!HEX.test(value)) return fail("colour", "Pick a colour for the state");
  return { ok: true, colour: value };
}

function readUuid(raw: FormDataEntryValue | null, field: string, message: string): { ok: true; id: string } | Refusal {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!UUID.test(value)) return fail(field, message);
  return { ok: true, id: value };
}

/** The SQLSTATE and constraint of a store refusal, if the failure carries them. */
function refusal(error: unknown): { code?: string; constraint?: string } {
  const e = error as { code?: unknown; constraint?: unknown } | null;
  return {
    code: typeof e?.code === "string" ? e.code : undefined,
    constraint: typeof e?.constraint === "string" ? e.constraint : undefined,
  };
}

const DUPLICATE_NAME = "Another enquiry state already has that name";

/** The office pages an enquiry write changes. Public pages never read the owner's states. */
function revalidateEnquiryPaths(): void {
  revalidatePath("/office/enquiries");
  revalidatePath("/office/settings");
  revalidatePath("/office");
}

export async function addEnquiryState(form: FormData): Promise<EditResult> {
  await requireOfficeSession();

  const label = readLabel(form.get("label"));
  if (!label.ok) return label;
  const colour = readColour(form.get("colour"));
  if (!colour.ok) return colour;

  const { text, params } = enquiryStateAddStatement({
    id: randomUUID(),
    label: label.label,
    colour: colour.colour,
  });

  try {
    await storeQuery(text, params);
  } catch (error) {
    if (refusal(error).code === "23505") return fail("label", DUPLICATE_NAME);
    // Anything else the store raised is a failed write, not a reason to lose the screen (D32).
    return storeRefusal("label", "That state could not be added", error);
  }

  revalidateEnquiryPaths();
  return { ok: true };
}

export async function renameEnquiryState(form: FormData): Promise<EditResult> {
  await requireOfficeSession();

  const id = readUuid(form.get("id"), "id", "That state could not be identified");
  if (!id.ok) return id;
  const label = readLabel(form.get("label"));
  if (!label.ok) return label;

  const { text, params } = enquiryStateRenameStatement({ id: id.id, label: label.label });

  try {
    await storeQuery(text, params);
  } catch (error) {
    if (refusal(error).code === "23505") return fail("label", DUPLICATE_NAME);
    return storeRefusal("label", "That state could not be renamed", error);
  }

  revalidateEnquiryPaths();
  return { ok: true };
}

export async function recolourEnquiryState(form: FormData): Promise<EditResult> {
  await requireOfficeSession();

  const id = readUuid(form.get("id"), "id", "That state could not be identified");
  if (!id.ok) return id;
  const colour = readColour(form.get("colour"));
  if (!colour.ok) return colour;

  const { text, params } = enquiryStateRecolourStatement({ id: id.id, colour: colour.colour });
  const attempt = await storeQueryRefusing(text, params, {
    field: "colour",
    action: "That colour could not be saved",
  });
  if (!attempt.ok) return attempt;

  revalidateEnquiryPaths();
  return { ok: true };
}

export async function reorderEnquiryStates(ids: string[]): Promise<EditResult> {
  await requireOfficeSession();

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > ORDER_MAX || !ids.every((id) => UUID.test(id))) {
    return fail("order", "That order could not be read");
  }

  const { text, params } = enquiryStateReorderStatement({ ids });
  const attempt = await storeQueryRefusing(text, params, {
    field: "order",
    action: "That order could not be saved",
  });
  if (!attempt.ok) return attempt;

  revalidateEnquiryPaths();
  return { ok: true };
}

export async function removeEnquiryState(id: string): Promise<EditResult> {
  await requireOfficeSession();

  if (typeof id !== "string" || !UUID.test(id)) {
    return fail("id", "That state could not be identified");
  }

  try {
    const { text, params } = enquiryStateRemoveStatement({ id });
    const rows = await storeQuery<{ label: string }[]>(text, params);
    // A state that is not there is not a change: the delete has already happened, so a repeat
    // reports the same thing it would the first time (D18).
    if (!rows[0]) return fail("id", "That state is no longer in the office");
  } catch (error) {
    const { code } = refusal(error);
    // The store's own refusal (truth 10). Postgres reports an `ON DELETE RESTRICT` foreign key as
    // 23001 (restrict_violation) and a `NO ACTION` one as 23503 (foreign_key_violation); both are
    // the same refusal and both are caught here.
    if (code === "23001" || code === "23503") {
      const { text, params } = enquiryStateHoldersStatement({ id });
      const held = await storeQuery<{ holders: string | number }[]>(text, params);
      const holders = Number(held[0]?.holders ?? 0);
      return fail(
        "id",
        holders > 0
          ? `${holders} ${holders === 1 ? "enquiry is" : "enquiries are"} still in this state — move ${
              holders === 1 ? "it" : "them"
            } out first`
          : "An enquiry is still in this state, so the store won't delete it",
      );
    }
    // Anything else the store raised is a failed write, not a reason to lose the screen (D32).
    return storeRefusal("id", "That state could not be removed", error);
  }

  revalidateEnquiryPaths();
  return { ok: true };
}

/**
 * Give an enquiry a state (truth 10, truth 13).
 *
 * The hash is recomputed here, from the row's **stored** editable values with the new state in place
 * (truth 14: a hash arriving from a browser is never trusted). The state itself is read from the
 * store's registry by the screen, and written here by id — the store refuses an id it does not hold.
 */
export async function setEnquiryState(form: FormData): Promise<EditResult> {
  const session = await requireOfficeSession();

  const id = readUuid(form.get("id"), "id", "That enquiry could not be identified");
  if (!id.ok) return id;
  const stateId = readUuid(form.get("stateId"), "stateId", "That state could not be identified");
  if (!stateId.ok) return stateId;

  const { text, params } = enquiryEditableStatement({ id: id.id });
  const rows = await storeQuery<
    {
      name: string;
      number: string;
      asked_for: string;
      note: string | null;
      enquiry_state_id: string | null;
    }[]
  >(text, params);

  const row = rows[0];
  if (!row) return fail("id", "That enquiry is no longer in the office");

  const contentHash = enquiryChangeCheck({
    name: row.name,
    number: row.number,
    asked_for: row.asked_for,
    note: row.note,
    enquiry_state_id: stateId.id,
  });

  try {
    const set = enquirySetStateStatement({
      id: id.id,
      stateId: stateId.id,
      contentHash,
      hashVersion: CHANGE_CHECK_VERSION,
      actorId: session.officeUserId,
    });
    await storeQuery(set.text, set.params);
  } catch (error) {
    const { code } = refusal(error);
    if (code === "23503") return fail("stateId", "That state is no longer in the office");
    // Anything else the store raised is a failed write, not a reason to lose the screen (D32).
    return storeRefusal("stateId", "That enquiry could not be given that state", error);
  }

  revalidateEnquiryPaths();
  return { ok: true };
}

/** What the saved-enquiry edit reports: whether it really moved the row, and the code it names. */
export type UpdateEnquiryResult =
  | { ok: true; changed: boolean; ref: string }
  | Extract<EditResult, { ok: false }>;

/**
 * Edit a saved enquiry's five details (owner ruling 2026-10-20, #4).
 *
 * The browser's strings are read by the enquiry's own rule (`readEnquirySeed`: name, number and
 * what was asked for are required), the chosen state is checked against the store's registry, and
 * the change-check is computed here from the values about to be written — never accepted from the
 * browser (truth 14). One statement moves the details, the state, the hash, the version and
 * `updated_at`; a retry with the same details writes nothing and still reports the row, so the
 * screen can say "Nothing changed" rather than claim a save.
 */
export async function updateEnquiry(form: FormData): Promise<UpdateEnquiryResult> {
  const session = await requireOfficeSession();

  const id = readUuid(form.get("id"), "id", "That enquiry could not be identified");
  if (!id.ok) return id;

  const rawState = form.get("stateId");
  const chosen = typeof rawState === "string" ? rawState.trim() : "";
  let stateId: string | null = null;
  if (chosen !== "") {
    if (!UUID.test(chosen)) return fail("stateId", "That state could not be identified");
    stateId = chosen;
  }

  const values = enquiryValuesFromForm(form);
  if (!values.ok) return values;
  const seed = readEnquirySeed(values.values);
  if (!seed.ok) return seed;

  // The row must be there before its hash is worth computing. The read is the recipe's own select,
  // so the action and the change-check cannot disagree about what an enquiry is.
  const stored = enquiryEditableStatement({ id: id.id });
  const rows = await storeQuery<Record<string, unknown>[]>(stored.text, stored.params);
  if (rows.length === 0) return fail("id", "That enquiry is no longer in the office");

  if (stateId !== null && !(await enquiryStateExists(stateId))) {
    return fail("stateId", "That state is no longer in the office");
  }

  const contentHash = enquiryChangeCheck({
    name: seed.seed.name,
    number: seed.seed.number,
    asked_for: seed.seed.asked_for,
    note: seed.seed.note,
    enquiry_state_id: stateId,
  });

  try {
    const { text, params } = enquiryUpdateStatement({
      id: id.id,
      seed: seed.seed,
      stateId,
      contentHash,
      hashVersion: CHANGE_CHECK_VERSION,
      actorId: session.officeUserId,
    });
    const written = await storeQuery<{ changed: boolean; id: string | null; ref: string | null }[]>(
      text,
      params,
    );
    const row = written[0];
    if (!row?.id || !row.ref) return fail("id", "That enquiry is no longer in the office");

    revalidateEnquiryPaths();
    return { ok: true, changed: row.changed, ref: row.ref };
  } catch (error) {
    const { code } = refusal(error);
    if (code === "23503") return fail("stateId", "That state is no longer in the office");
    // Anything else the store raised is a failed write, not a reason to lose the screen (D32).
    return storeRefusal("id", "That enquiry could not be saved", error);
  }
}
