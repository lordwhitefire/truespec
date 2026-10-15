/**
 * Proves the removal statements against the live store — and that each is safe to retry.
 *
 * It runs the *same* `carDeleteStatement` / `carRestoreStatement` / `carRemoveStatement`
 * the actions run, inside one transaction that is rolled back, so the store is left
 * exactly as it was. It makes a real car first (through the create statement), gives it a
 * photo row and a sale row, then walks Task 13's claims:
 *
 *   1. **Delete tombstones.** `deleted_at` is set and *nothing else moves* — the costs, the
 *      photo and the sale are still there, the change-check is untouched (truth 6:
 *      "restored byte-for-byte"); the car leaves every office read at once while the
 *      tombstone read still finds it.
 *   2. **Delete is idempotent.** A retry (a reply lost) does not move `deleted_at` and does
 *      not write a second `car.deleted` row (design D18).
 *   3. **Undo restores.** `deleted_at` is cleared and everything else is as it was; a
 *      `car.restored` row is written, and a retry writes no second one.
 *   4. **Removal refuses a live car** — the delete-then-remove order cannot be skipped.
 *   5. **Removal takes the rows and returns the bytes.** The car, its cost lines, its photo
 *      rows and its sale row go (the foreign keys' own cascade), the photo asset ids come
 *      back for the caller to clear, and the activity rows stay. A retry finds nothing left.
 *
 *   node --import tsx developer-workspace/scripts/task-004/delete-car-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { readCarInput } from "../../../lib/car-input";
import { carCreateStatement } from "../../../lib/car-create";
import { carDeleteStatement, carRestoreStatement, carRemoveStatement } from "../../../lib/car-delete";
import { carChangeCheck, CHANGE_CHECK_VERSION } from "../../../lib/change-check";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  const id = "22222222-2222-4222-8222-222222222222";
  try {
    const primary = (await client.query<{ id: string }>("SELECT id FROM car_state WHERE kind='primary' AND label='Available'")).rows[0];

    await client.query("BEGIN");

    const actor = (
      await client.query<{ id: string }>(
        "INSERT INTO office_user (email) VALUES ('delete-check@truespec.local') RETURNING id",
      )
    ).rows[0].id;

    // --- make a real car, through the create statement, with a photo and a sale ---
    const created = readCarInput({
      brand: "Check", model: "Tombstone", trim: "T1", year: "2021",
      exteriorColor: "Green", interiorColor: "Cream", mileage: "4321",
      features: "Sunroof", price: "18,000,000", wasPrice: "",
      privateNote: "internal", note: "public note", arrivalNote: "",
      stateId: primary.id, secondaryStateIds: [],
      costs: { purchase_price: "12,000,000", shipping: "500,000" },
    });
    if (!created.ok) throw new Error(`witness create refused: ${JSON.stringify(created.errors)}`);
    const makeArgs = {
      id,
      columns: created.value.columns,
      costs: created.value.costs,
      secondaryStateIds: created.value.secondaryStateIds,
      photos: [],
      contentHash: carChangeCheck(created.value.columns as unknown as Record<string, unknown>),
      hashVersion: CHANGE_CHECK_VERSION,
      actorId: actor,
    };
    const made = await client.query<{ ref: string }>(carCreateStatement(makeArgs).text, carCreateStatement(makeArgs).params);
    const ref = made.rows[0]?.ref ?? "";
    const hashBefore = (await client.query<{ content_hash: string }>("SELECT content_hash FROM car WHERE id=$1", [id])).rows[0].content_hash;

    const assets = ["image-witnessasset-1", "image-witnessasset-2"];
    for (const [i, assetId] of assets.entries()) {
      await client.query(
        "INSERT INTO car_photo (car_id, sanity_asset_id, position, origin) VALUES ($1,$2,$3,$4)",
        [id, assetId, i, "owner upload"],
      );
    }
    await client.query("INSERT INTO sale (car_id, sale_price_kobo, sold_at) VALUES ($1,$2,now())", [id, 1_800_000_000n]);

    // --- 1. delete tombstones and moves nothing else ---
    const del = await client.query<{ ref: string }>(carDeleteStatement({ id, actorId: actor }).text, carDeleteStatement({ id, actorId: actor }).params);
    ok("delete returns the car's ref", del.rows.length === 1 && del.rows[0]?.ref === ref, del.rows.map((r) => r.ref).join(","));

    const afterDelete = (
      await client.query("SELECT deleted_at, content_hash, version, state_id FROM car WHERE id=$1", [id])
    ).rows[0];
    ok("the car is a tombstone (deleted_at set)", afterDelete?.deleted_at !== null);
    ok("the change-check is untouched", afterDelete?.content_hash === hashBefore, String(afterDelete?.content_hash));
    ok("the car did not advance a version", Number(afterDelete?.version) === 1, String(afterDelete?.version));
    ok("the car's state is still its state", afterDelete?.state_id === primary.id);

    const live = Number((await client.query("SELECT count(*) FROM car WHERE id=$1 AND deleted_at IS NULL", [id])).rows[0].count);
    ok("the car is gone from every office read (LiveIsNull)", live === 0, String(live));
    const waiting = Number((await client.query("SELECT count(*) FROM car WHERE id=$1 AND deleted_at IS NOT NULL", [id])).rows[0].count);
    ok("the car is listed as waiting to be cleared", waiting === 1, String(waiting));
    ok("its cost lines are untouched", Number((await client.query("SELECT count(*) FROM cost_line WHERE car_id=$1", [id])).rows[0].count) === 2);
    ok("its photo rows are untouched", Number((await client.query("SELECT count(*) FROM car_photo WHERE car_id=$1", [id])).rows[0].count) === 2);
    ok("its sale row is untouched", Number((await client.query("SELECT count(*) FROM sale WHERE car_id=$1", [id])).rows[0].count) === 1);
    const delEvents = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1 AND kind='car.deleted'", [ref])).rows[0].count);
    ok("one car.deleted row is written", delEvents === 1, String(delEvents));

    // --- 2. a retry of the delete moves nothing ---
    const retry = await client.query<{ ref: string }>(carDeleteStatement({ id, actorId: actor }).text, carDeleteStatement({ id, actorId: actor }).params);
    const afterRetry = (await client.query("SELECT deleted_at FROM car WHERE id=$1", [id])).rows[0];
    const delEvents2 = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1 AND kind='car.deleted'", [ref])).rows[0].count);
    ok("a retry still returns the ref", retry.rows[0]?.ref === ref, String(retry.rows[0]?.ref));
    ok("a retry does not move deleted_at", String(afterRetry?.deleted_at) === String(afterDelete?.deleted_at));
    ok("a retry writes no second car.deleted row", delEvents2 === 1, String(delEvents2));

    // --- 3. undo restores, byte-for-byte ---
    const und = await client.query<{ ref: string }>(carRestoreStatement({ id, actorId: actor }).text, carRestoreStatement({ id, actorId: actor }).params);
    ok("undo returns the car's ref", und.rows[0]?.ref === ref, String(und.rows[0]?.ref));
    const afterUndo = (await client.query("SELECT deleted_at, content_hash, version FROM car WHERE id=$1", [id])).rows[0];
    ok("the tombstone is cleared", afterUndo?.deleted_at === null);
    ok("the car is byte-for-byte (change-check)", afterUndo?.content_hash === hashBefore, String(afterUndo?.content_hash));
    ok("the car did not advance a version", Number(afterUndo?.version) === 1, String(afterUndo?.version));
    ok("its cost lines are still there", Number((await client.query("SELECT count(*) FROM cost_line WHERE car_id=$1", [id])).rows[0].count) === 2);
    ok("it is back in the office read", Number((await client.query("SELECT count(*) FROM car WHERE id=$1 AND deleted_at IS NULL", [id])).rows[0].count) === 1);
    const undoEvents = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1 AND kind='car.restored'", [ref])).rows[0].count);
    ok("one car.restored row is written", undoEvents === 1, String(undoEvents));

    const undoRetry = await client.query<{ ref: string }>(carRestoreStatement({ id, actorId: actor }).text, carRestoreStatement({ id, actorId: actor }).params);
    const undoEvents2 = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1 AND kind='car.restored'", [ref])).rows[0].count);
    ok("a retry of the undo returns the ref", undoRetry.rows[0]?.ref === ref, String(undoRetry.rows[0]?.ref));
    ok("a retry writes no second car.restored row", undoEvents2 === 1, String(undoEvents2));

    // --- 4. removal refuses a car that is not a tombstone ---
    const liveRemove = await client.query<{ ref: string | null }>(
      carRemoveStatement({ id, actorId: actor }).text,
      carRemoveStatement({ id, actorId: actor }).params,
    );
    ok("removing a live car is refused (no ref returned)", liveRemove.rows[0]?.ref === null, String(liveRemove.rows[0]?.ref));
    ok("the live car is still there", Number((await client.query("SELECT count(*) FROM car WHERE id=$1", [id])).rows[0].count) === 1);

    // --- 5. removal takes the rows and hands back the bytes ---
    await client.query(carDeleteStatement({ id, actorId: actor }).text, carDeleteStatement({ id, actorId: actor }).params);
    const removed = await client.query<{ ref: string | null; assets: string[] }>(
      carRemoveStatement({ id, actorId: actor }).text,
      carRemoveStatement({ id, actorId: actor }).params,
    );
    ok("removal returns the ref", removed.rows[0]?.ref === ref, String(removed.rows[0]?.ref));
    const returnedAssets = (removed.rows[0]?.assets ?? []).slice().sort();
    ok("removal returns the photo asset ids to clear", JSON.stringify(returnedAssets) === JSON.stringify([...assets].sort()), returnedAssets.join(","));
    ok("the car row is gone", Number((await client.query("SELECT count(*) FROM car WHERE id=$1", [id])).rows[0].count) === 0);
    ok("its cost lines went with it", Number((await client.query("SELECT count(*) FROM cost_line WHERE car_id=$1", [id])).rows[0].count) === 0);
    ok("its photo rows went with it", Number((await client.query("SELECT count(*) FROM car_photo WHERE car_id=$1", [id])).rows[0].count) === 0);
    ok("its sale row went with it", Number((await client.query("SELECT count(*) FROM sale WHERE car_id=$1", [id])).rows[0].count) === 0);
    const keptEvents = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1", [ref])).rows[0].count);
    ok("the activity rows stay (created, deleted, restored, deleted, removed = 5)", keptEvents === 5, String(keptEvents));
    const removedEvent = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1 AND kind='car.removed'", [ref])).rows[0].count);
    ok("one car.removed row is written", removedEvent === 1, String(removedEvent));

    const removeRetry = await client.query<{ ref: string | null }>(
      carRemoveStatement({ id, actorId: actor }).text,
      carRemoveStatement({ id, actorId: actor }).params,
    );
    ok("a retry of the removal finds nothing left", removeRetry.rows[0]?.ref === null, String(removeRetry.rows[0]?.ref));

    await client.query("ROLLBACK");
    console.log("  (rolled back — the store is unchanged)");
    const trace = Number((await client.query("SELECT count(*) FROM car WHERE id=$1", [id])).rows[0].count);
    ok("the store holds no trace after rollback", trace === 0);
  } finally {
    await client.end();
  }
  console.log(failures === 0 ? "DELETE-CAR CHECK PASSED" : `DELETE-CAR CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
