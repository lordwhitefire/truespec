"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOfficeSession } from "@/lib/session";
import { storeQuery } from "@/lib/store-guard";
import { type FieldError } from "@/lib/car-input";
import { readCarForm } from "@/lib/car-form";
import { carCreateStatement } from "@/lib/car-create";
import { carUpdateStatement } from "@/lib/car-update";
import { carDeleteStatement, carRestoreStatement, carRemoveStatement } from "@/lib/car-delete";
import { carChangeCheck, CHANGE_CHECK_VERSION } from "@/lib/change-check";
import { SOLD_SECTION } from "@/lib/sale";
import { deleteAsset } from "@/lib/sanity";

/**
 * Create a car — the first write behind the door (build step 3).
 *
 * A Server Action is a public endpoint, so it does everything itself: it checks the
 * session, reads the form through the one reader (`lib/car-input.ts`), proves the
 * state facts against the registry, mints the car's key, computes the change-check
 * and writes. Nothing a browser sent is trusted — not the key, not the hash, not the
 * ref.
 *
 * **It is safe to retry.** The action goes through the one shared store guard
 * (`storeQuery`), which retries a transient failure — a cold Neon compute, a dropped
 * connection. A retry must not make a second car, so the key is minted here, once,
 * before the call: every attempt sends the same `id`, and the store's
 * `ON CONFLICT (id) DO NOTHING` turns a repeat into a no-op. The same statement
 * writes the car, its cost lines, its secondary states and its activity row, so a
 * half-made car cannot exist, and a retry converges on the one it already made.
 */

export type CreateCarResult = { ok: true; ref: string } | { ok: false; errors: FieldError[] };
export type UpdateCarResult = { ok: true; ref: string } | { ok: false; errors: FieldError[] };
export type DeleteCarResult = { ok: true; ref: string } | { ok: false; errors: FieldError[] };
export type RemoveCarResult =
  | { ok: true; ref: string; assetsCleared: number; assetsFailed: number }
  | { ok: false; errors: FieldError[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The office pages a car write changes. */
function revalidateCarPaths(): void {
  revalidatePath("/office");
  revalidatePath("/office/inventory");
  revalidatePath("/office/cars");
  revalidatePath("/office/car");
}

export async function createCar(form: FormData): Promise<CreateCarResult> {
  const session = await requireOfficeSession();

  const read = await readCarForm(form);
  if (!read.ok) return { ok: false, errors: read.errors };
  const { columns, costs, secondaryStateIds, photos } = read.value;

  // A car cannot *start* Sold. Un-marking returns a car to the primary state it held
  // before it sold (truth 5), and a car that never held one has nothing to return to —
  // so the sale is recorded on a car that exists, not on one being made. The add form
  // does not offer Sold; this is the guard behind that.
  if (read.value.section === SOLD_SECTION) {
    return {
      ok: false,
      errors: [{ field: "stateId", message: "A new car can't start as sold — add it first, then mark it sold" }],
    };
  }

  // The key, minted once so a retry is the same car. The change-check is computed
  // here from the values as they will be stored — never from the browser (truth 14).
  const { text, params } = carCreateStatement({
    id: randomUUID(),
    columns,
    costs,
    secondaryStateIds,
    photos,
    contentHash: carChangeCheck(columns as unknown as Record<string, unknown>),
    hashVersion: CHANGE_CHECK_VERSION,
    actorId: session.officeUserId,
  });
  const rows = await storeQuery<{ ref: string }[]>(text, params);

  const ref = rows[0]?.ref;
  if (!ref) throw new Error("createCar: the store returned no reference for the new car");

  revalidateCarPaths();
  return { ok: true, ref };
}

export async function updateCar(form: FormData): Promise<UpdateCarResult> {
  const session = await requireOfficeSession();

  // The car's key, as the edit form carries it. It is the row's name, not a detail —
  // the statement never writes it and the store's own trigger refuses a write that
  // would change it.
  const carId = form.get("carId");
  if (typeof carId !== "string" || !UUID.test(carId)) {
    return { ok: false, errors: [{ field: "carId", message: "This car could not be identified" }] };
  }

  const read = await readCarForm(form);
  if (!read.ok) return { ok: false, errors: read.errors };
  const { columns, costs, secondaryStateIds, photos } = read.value;

  // The change-check is recomputed here from the values as they will be stored, so the
  // hash always matches the row (truth 14). A browser-supplied hash is never read.
  // The sale, if any, rides this same write: marking Sold writes the sale row (with the
  // car's *own* pre-write state as the previous state, read by the statement itself),
  // and leaving Sold removes it — one atomic change, idempotent under a retry.
  const { text, params } = carUpdateStatement({
    id: carId,
    columns,
    costs,
    secondaryStateIds,
    photos,
    sale: read.value.sale,
    contentHash: carChangeCheck(columns as unknown as Record<string, unknown>),
    hashVersion: CHANGE_CHECK_VERSION,
    actorId: session.officeUserId,
  });
  const rows = await storeQuery<{ ref: string }[]>(text, params);

  const ref = rows[0]?.ref;
  if (!ref) return { ok: false, errors: [{ field: "carId", message: "That car is no longer in the office" }] };

  revalidateCarPaths();
  return { ok: true, ref };
}

/**
 * Delete a car — the tombstone, never a removal (truth 6, specs/inventory: "Delete with
 * confirmation and undo").
 *
 * The action only ever sets `car.deleted_at`; every office read already excludes it, so
 * the car leaves every screen at once while its photos, costs, state and sale stay
 * whole. Undo (below) clears the one column, so the car comes back byte-for-byte.
 *
 * **Nothing here removes a car, and no job, rule or clock will** (owner ruling
 * 2026-10-13). The store guard's retry is safe: a delete is idempotent, so a retry
 * finds the car already tombstoned and leaves it — it does not write a second event.
 */
export async function deleteCar(carId: string): Promise<DeleteCarResult> {
  const session = await requireOfficeSession();
  if (!UUID.test(carId)) {
    return { ok: false, errors: [{ field: "carId", message: "This car could not be identified" }] };
  }

  const { text, params } = carDeleteStatement({ id: carId, actorId: session.officeUserId });
  const rows = await storeQuery<{ ref: string }[]>(text, params);

  const ref = rows[0]?.ref;
  if (!ref) return { ok: false, errors: [{ field: "carId", message: "That car is no longer in the office" }] };

  revalidateCarPaths();
  return { ok: true, ref };
}

/**
 * Undo a delete — the 8-second window's write, and it is the same write whenever it
 * arrives (the car is simply not a tombstone any more). Idempotent, so the guard's
 * retry is safe.
 */
export async function undoDeleteCar(carId: string): Promise<DeleteCarResult> {
  const session = await requireOfficeSession();
  if (!UUID.test(carId)) {
    return { ok: false, errors: [{ field: "carId", message: "This car could not be identified" }] };
  }

  const { text, params } = carRestoreStatement({ id: carId, actorId: session.officeUserId });
  const rows = await storeQuery<{ ref: string }[]>(text, params);

  const ref = rows[0]?.ref;
  if (!ref) return { ok: false, errors: [{ field: "carId", message: "That car is no longer in the office" }] };

  revalidateCarPaths();
  return { ok: true, ref };
}

/**
 * Remove a tombstoned car for good — **the owner's own action, and nothing else's**
 * (owner ruling 2026-10-13).
 *
 * The statement does two things at once and refuses a car that is not a tombstone, so
 * the delete-then-remove order cannot be skipped: it deletes the row (the foreign keys
 * carry the photos, cost lines and sale row with it) and returns the car's photo asset
 * ids **from before the row went**, for this action to clear in the asset store. The
 * bytes are cleared here and any that would not go are **counted and reported**, never
 * swallowed — an asset left behind is one the daily job will see as unreferenced
 * (TASK-006), so nothing sits in the store forever.
 *
 * The store guard's retry is safe in effect (a second run finds nothing left to remove),
 * though a repeat reports honestly that the car is no longer waiting to be cleared.
 */
export async function removeCarForever(carId: string): Promise<RemoveCarResult> {
  const session = await requireOfficeSession();
  if (!UUID.test(carId)) {
    return { ok: false, errors: [{ field: "carId", message: "This car could not be identified" }] };
  }

  const { text, params } = carRemoveStatement({ id: carId, actorId: session.officeUserId });
  const rows = await storeQuery<{ ref: string | null; assets: string[] }[]>(text, params);

  const row = rows[0];
  if (!row?.ref) {
    return { ok: false, errors: [{ field: "carId", message: "That car is not waiting to be cleared" }] };
  }

  // The rows are gone within the store's own transaction; the bytes are external, so
  // they are cleared after and reported by count.
  let assetsCleared = 0;
  let assetsFailed = 0;
  for (const assetId of row.assets) {
    const result = await deleteAsset(assetId);
    if (result.deleted) assetsCleared += 1;
    else assetsFailed += 1;
  }

  revalidateCarPaths();
  return { ok: true, ref: row.ref, assetsCleared, assetsFailed };
}
