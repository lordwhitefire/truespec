"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireOfficeSession } from "@/lib/session";
import { storeQuery } from "@/lib/store-guard";
import { readCarInput, type CarFormInput, type FieldError } from "@/lib/car-input";
import { carCreateStatement } from "@/lib/car-create";
import { carChangeCheck, CHANGE_CHECK_VERSION } from "@/lib/change-check";

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read the form's strings into the reader's shape. Field names are the form's contract. */
function toCarForm(form: FormData): CarFormInput {
  const str = (name: string): string => {
    const v = form.get(name);
    return typeof v === "string" ? v : "";
  };
  return {
    brand: str("brand"),
    model: str("model"),
    trim: str("trim"),
    year: str("year"),
    exteriorColor: str("exteriorColor"),
    interiorColor: str("interiorColor"),
    mileage: str("mileage"),
    features: str("features"),
    note: str("note"),
    privateNote: str("privateNote"),
    wasPrice: str("wasPrice"),
    arrivalNote: str("arrivalNote"),
    price: str("price"),
    stateId: str("stateId"),
    secondaryStateIds: form.getAll("secondaryStateIds").filter((v): v is string => typeof v === "string"),
    costs: {
      purchase_price: str("cost.purchase_price"),
      shipping: str("cost.shipping"),
      clearing: str("cost.clearing"),
      trucking_usa: str("cost.trucking_usa"),
      trucking_ng: str("cost.trucking_ng"),
      full_tank: str("cost.full_tank"),
    },
  };
}

export async function createCar(form: FormData): Promise<CreateCarResult> {
  const session = await requireOfficeSession();

  const read = readCarInput(toCarForm(form));
  if (!read.ok) return { ok: false, errors: read.errors };

  const { columns, costs, secondaryStateIds } = read.value;

  // Ids are the store's keys; a malformed one must be a field refusal, never a SQL
  // error the owner cannot act on.
  const errors: FieldError[] = [];
  if (!UUID.test(columns.state_id)) errors.push({ field: "stateId", message: "Choose the car's state" });
  for (const id of secondaryStateIds) {
    if (!UUID.test(id)) errors.push({ field: "secondaryStateIds", message: "One of those states could not be read" });
  }
  if (errors.length > 0) return { ok: false, errors };

  // Prove the state facts against the registry: the primary is one of the four fixed
  // primaries, and every secondary still exists as a secondary. The store is the
  // truth; a form cannot invent a fifth primary or attach a state that is not there.
  const [check] = await storeQuery<{ primary_kind: string | null; secondaries_ok: boolean }[]>(
    `SELECT
       (SELECT kind FROM car_state WHERE id = $1) AS primary_kind,
       NOT EXISTS (
         SELECT 1
           FROM jsonb_array_elements_text($2::jsonb) AS s(value)
          WHERE NOT EXISTS (
                  SELECT 1 FROM car_state cs
                   WHERE cs.id = (s.value)::uuid AND cs.kind = 'secondary')
       ) AS secondaries_ok`,
    [columns.state_id, JSON.stringify(secondaryStateIds)],
  );
  if (check.primary_kind !== "primary") {
    return { ok: false, errors: [{ field: "stateId", message: "Choose one of the car's four states" }] };
  }
  if (!check.secondaries_ok) {
    return { ok: false, errors: [{ field: "secondaryStateIds", message: "One of those states no longer exists" }] };
  }

  // The key, minted once so a retry is the same car. The change-check is computed
  // here from the values as they will be stored — never from the browser (truth 14).
  const { text, params } = carCreateStatement({
    id: randomUUID(),
    columns,
    costs,
    secondaryStateIds,
    contentHash: carChangeCheck(columns as unknown as Record<string, unknown>),
    hashVersion: CHANGE_CHECK_VERSION,
    actorId: session.officeUserId,
  });
  const rows = await storeQuery<{ ref: string }[]>(text, params);

  const ref = rows[0]?.ref;
  if (!ref) throw new Error("createCar: the store returned no reference for the new car");

  revalidatePath("/office");
  revalidatePath("/office/inventory");
  revalidatePath("/office/cars");
  return { ok: true, ref };
}
