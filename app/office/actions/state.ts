"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOfficeSession } from "@/lib/session";
import { storeQuery } from "@/lib/store-guard";
import type { FieldError } from "@/lib/car-input";
import {
  carStateAddStatement,
  carStateHoldersStatement,
  carStateRecolourStatement,
  carStateRemoveStatement,
  carStateRenameStatement,
  carStateReorderStatement,
} from "@/lib/car-state";

/**
 * The registry's writes — the owner's own secondary states, and only those (truth 10, D15).
 *
 * A Server Action is a public endpoint, so each one does everything itself: it checks the session,
 * reads what it was sent, and refuses what it must *before* the store is asked. The four fixed
 * primary states are not reachable from here at all — the statements carry `kind = 'secondary'` in
 * their own `WHERE`, and the store's trigger stands behind that — so there is no shape of request
 * that renames, recolours, reorders or deletes one.
 *
 * Two refusals come from the store itself and are reported as it means them, never swallowed:
 * a name another state already carries (the store's `car_state_label_unique` covers both kinds),
 * and deleting a state a car still carries (the foreign keys are `ON DELETE RESTRICT`). The second
 * is the one truth 10 names: the state a car sits in cannot be deleted, refused by the store, with
 * the reason shown — so the reason carries the store's own count, asked only after it has refused.
 *
 * Every write is retry-safe (D18). The add's key is minted here, once, before the call, so a retried
 * transient failure converges on the one state; the rename, recolour and reorder each set a value to
 * a target, which a repeat sets identically; and the remove's *effect* is idempotent — a repeat
 * finds the row already gone and says so.
 */

export type StateEditResult = { ok: true } | { ok: false; errors: FieldError[] };

/** The failing half, named so a validator's success type is a *different* shape the compiler can narrow to. */
type Refusal = Exclude<StateEditResult, { ok: true }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX = /^#[0-9a-fA-F]{6}$/;
/** Enough for a name an owner reads on a chip; short enough to stay one on the smallest screen. */
const NAME_MAX = 40;
/** A registry this long is a mistake, not a registry — the cap keeps a stray payload off the store. */
const ORDER_MAX = 200;

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

/** A state's colour: the six-digit hex the store's own `car_state_colour_hex` check accepts. */
function readColour(raw: FormDataEntryValue | null): { ok: true; colour: string } | Refusal {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!HEX.test(value)) return fail("colour", "Pick a colour for the state");
  return { ok: true, colour: value };
}

function readId(raw: FormDataEntryValue | null): { ok: true; id: string } | Refusal {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!UUID.test(value)) return fail("id", "That state could not be identified");
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

/** The office pages a registry write changes. Public pages never read the owner's states. */
function revalidateStatePaths(): void {
  revalidatePath("/office/settings");
  revalidatePath("/office/car");
  revalidatePath("/office/inventory");
  revalidatePath("/office");
}

export async function addCarState(form: FormData): Promise<StateEditResult> {
  await requireOfficeSession();

  const label = readLabel(form.get("label"));
  if (!label.ok) return label;
  const colour = readColour(form.get("colour"));
  if (!colour.ok) return colour;

  const { text, params } = carStateAddStatement({
    id: randomUUID(),
    label: label.label,
    colour: colour.colour,
  });

  try {
    await storeQuery(text, params);
  } catch (error) {
    const { code } = refusal(error);
    if (code === "23505") {
      return fail("label", "Another state already has that name — names are shared by both kinds");
    }
    throw error;
  }

  revalidateStatePaths();
  return { ok: true };
}

export async function renameCarState(form: FormData): Promise<StateEditResult> {
  await requireOfficeSession();

  const id = readId(form.get("id"));
  if (!id.ok) return id;
  const label = readLabel(form.get("label"));
  if (!label.ok) return label;

  const { text, params } = carStateRenameStatement({ id: id.id, label: label.label });

  try {
    await storeQuery(text, params);
  } catch (error) {
    const { code } = refusal(error);
    if (code === "23505") {
      return fail("label", "Another state already has that name — names are shared by both kinds");
    }
    throw error;
  }

  revalidateStatePaths();
  return { ok: true };
}

export async function recolourCarState(form: FormData): Promise<StateEditResult> {
  await requireOfficeSession();

  const id = readId(form.get("id"));
  if (!id.ok) return id;
  const colour = readColour(form.get("colour"));
  if (!colour.ok) return colour;

  const { text, params } = carStateRecolourStatement({ id: id.id, colour: colour.colour });
  await storeQuery(text, params);

  revalidateStatePaths();
  return { ok: true };
}

export async function reorderCarStates(ids: string[]): Promise<StateEditResult> {
  await requireOfficeSession();

  if (!Array.isArray(ids) || ids.length === 0 || ids.length > ORDER_MAX || !ids.every((id) => UUID.test(id))) {
    return fail("order", "That order could not be read");
  }

  const { text, params } = carStateReorderStatement({ ids });
  await storeQuery(text, params);

  revalidateStatePaths();
  return { ok: true };
}

export async function removeCarState(id: string): Promise<StateEditResult> {
  await requireOfficeSession();

  if (typeof id !== "string" || !UUID.test(id)) {
    return fail("id", "That state could not be identified");
  }

  try {
    const { text, params } = carStateRemoveStatement({ id });
    const rows = await storeQuery<{ label: string }[]>(text, params);
    // A state that is not there is not a change: the delete has already happened, so a repeat
    // reports the same thing it would the first time (D18).
    if (!rows[0]) return fail("id", "That state is no longer in the office");
  } catch (error) {
    const { code } = refusal(error);
    // The store's own refusal (truth 10). Its number, not the screen's. Postgres reports an
    // `ON DELETE RESTRICT` foreign key as 23001 (restrict_violation) and a `NO ACTION` one as
    // 23503 (foreign_key_violation); both are the same refusal and both are caught here.
    if (code === "23001" || code === "23503") {
      const { text, params } = carStateHoldersStatement({ id });
      const held = await storeQuery<{ holders: string | number }[]>(text, params);
      const holders = Number(held[0]?.holders ?? 0);
      return fail(
        "id",
        holders > 0
          ? `${holders} ${holders === 1 ? "car" : "cars"} still carry this state — move ${holders === 1 ? "it" : "them"} out first`
          : "A car still carries this state, so the store won't delete it",
      );
    }
    throw error;
  }

  revalidateStatePaths();
  return { ok: true };
}
