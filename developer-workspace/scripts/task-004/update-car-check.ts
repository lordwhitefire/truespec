/**
 * Proves the update statement against the live store — and that it is safe to retry.
 *
 * It runs the *same* `carUpdateStatement` the action runs, inside one transaction that is
 * rolled back, so the store is left exactly as it was. It makes a real car first (through
 * the create statement), then:
 *
 *   1. edits every column that moves, and asserts the values changed and the **change-check
 *      was recomputed** (truth 14);
 *   2. runs the *same* edit again (a retry whose first reply was lost) and asserts nothing
 *      moves — no second value change, no second `car.updated` row (design D18);
 *   3. saves *identical* values (a no-op save) and asserts the same;
 *   4. hand-crafts `UPDATE car SET ref …` and `SET id …` and asserts the store's own
 *      `car_identity_is_final` trigger refuses each — the line the write path never crosses.
 *
 *   node --import tsx developer-workspace/scripts/task-004/update-car-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { readCarInput } from "../../../lib/car-input";
import { carCreateStatement } from "../../../lib/car-create";
import { carUpdateStatement, type CarUpdateArgs } from "../../../lib/car-update";
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
  const id = "11111111-1111-4111-8111-111111111111";
  try {
    const primary = (await client.query<{ id: string }>("SELECT id FROM car_state WHERE kind='primary' AND label='Available'")).rows[0];
    const secondary = (await client.query<{ id: string }>("SELECT id FROM car_state WHERE kind='secondary' ORDER BY label LIMIT 1")).rows[0];

    await client.query("BEGIN");

    const actor = (
      await client.query<{ id: string }>(
        "INSERT INTO office_user (email) VALUES ('update-check@truespec.local') RETURNING id",
      )
    ).rows[0].id;

    // --- make a real car, through the create statement ---
    const created = readCarInput({
      brand: "Check", model: "Witness", trim: "T1", year: "2022",
      exteriorColor: "Blue", interiorColor: "Grey", mileage: "1234",
      features: "Sunroof\nHeated seats", price: "20,000,000", wasPrice: "25,000,000",
      privateNote: "internal", note: "public note", arrivalNote: "",
      stateId: primary.id, secondaryStateIds: [secondary.id],
      costs: { purchase_price: "12,000,000", shipping: "500,000", full_tank: "0" },
    });
    if (!created.ok) throw new Error(`witness create refused: ${JSON.stringify(created.errors)}`);
    const createHash = carChangeCheck(created.value.columns as unknown as Record<string, unknown>);
    const makeArgs = {
      id,
      columns: created.value.columns,
      costs: created.value.costs,
      secondaryStateIds: created.value.secondaryStateIds,
      photos: [],
      contentHash: createHash,
      hashVersion: CHANGE_CHECK_VERSION,
      actorId: actor,
    };
    const made = await client.query<{ ref: string }>(carCreateStatement(makeArgs).text, carCreateStatement(makeArgs).params);
    const ref = made.rows[0]?.ref ?? "";

    // --- the edit: every moving column, new costs, secondaries cleared ---
    const edited = readCarInput({
      brand: "Check", model: "Witness", trim: "T2", year: "2023",
      exteriorColor: "Red", interiorColor: "Black", mileage: "2234",
      features: "Sunroof", price: "22,000,000", wasPrice: "",
      privateNote: "edited", note: "public v2", arrivalNote: "Landed already",
      stateId: primary.id, secondaryStateIds: [],
      costs: { purchase_price: "13,000,000", clearing: "700,000" },
    });
    if (!edited.ok) throw new Error(`witness edit refused: ${JSON.stringify(edited.errors)}`);
    const editHash = carChangeCheck(edited.value.columns as unknown as Record<string, unknown>);
    const editArgs: CarUpdateArgs = {
      id,
      columns: edited.value.columns,
      costs: edited.value.costs,
      secondaryStateIds: edited.value.secondaryStateIds,
      photos: [],
      sale: null,
      contentHash: editHash,
      hashVersion: CHANGE_CHECK_VERSION,
      actorId: actor,
    };

    const run1 = await client.query<{ ref: string }>(carUpdateStatement(editArgs).text, carUpdateStatement(editArgs).params);
    ok("the edit returns the car's ref", run1.rows.length === 1 && run1.rows[0]?.ref === ref, `${run1.rows.map((r) => r.ref).join(",")}`);

    const after1 = (await client.query(
      "SELECT ref, trim, year, exterior_color, interior_color, mileage, note, private_note, was_price_kobo, arrival_note, content_hash, version FROM car WHERE id=$1",
      [id],
    )).rows[0];
    ok("a column changed (trim)", after1?.trim === "T2", String(after1?.trim));
    ok("a column changed (year)", Number(after1?.year) === 2023, String(after1?.year));
    ok("a column changed (exterior colour)", after1?.exterior_color === "Red", String(after1?.exterior_color));
    ok("the public note changed", after1?.note === "public v2", String(after1?.note));
    ok("the private note changed", after1?.private_note === "edited", String(after1?.private_note));
    ok("a blank was-price is stored as NULL", after1?.was_price_kobo === null, String(after1?.was_price_kobo));
    ok("the arrival note changed", after1?.arrival_note === "Landed already", String(after1?.arrival_note));
    ok("the change-check was recomputed", after1?.content_hash === editHash && editHash !== createHash, `${after1?.content_hash}`);
    ok("the car advanced one version", Number(after1?.version) === 2, String(after1?.version));

    const costs1 = (await client.query<{ kind: string }>("SELECT kind FROM cost_line WHERE car_id=$1 ORDER BY kind", [id])).rows.map((r) => r.kind);
    ok("the cost lines are replaced (old kinds gone, new set present)", JSON.stringify(costs1) === JSON.stringify(["clearing", "purchase_price"]), costs1.join(","));
    const secs1 = Number((await client.query("SELECT count(*) FROM car_secondary_state WHERE car_id=$1", [id])).rows[0].count);
    ok("the secondary link is cleared", secs1 === 0, String(secs1));
    const events1 = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1", [ref])).rows[0].count);
    ok("one car.updated row is added (created + updated)", events1 === 2, String(events1));

    // --- a retry of the SAME edit: must move nothing ---
    const run2 = await client.query<{ ref: string }>(carUpdateStatement(editArgs).text, carUpdateStatement(editArgs).params);
    ok("a retry returns the same ref", run2.rows.length === 1 && run2.rows[0]?.ref === ref);
    const after2 = (await client.query("SELECT content_hash, version FROM car WHERE id=$1", [id])).rows[0];
    const costRows2 = Number((await client.query("SELECT count(*) FROM cost_line WHERE car_id=$1", [id])).rows[0].count);
    const events2 = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1", [ref])).rows[0].count);
    ok("a retry advances no version", Number(after2?.version) === 2, String(after2?.version));
    ok("a retry writes no duplicate cost lines", costRows2 === 2, String(costRows2));
    ok("a retry writes no duplicate activity row", events2 === events1, String(events2));

    // --- a no-op save (identical values): also moves nothing ---
    await client.query(carUpdateStatement(editArgs).text, carUpdateStatement(editArgs).params);
    const after3 = (await client.query("SELECT version FROM car WHERE id=$1", [id])).rows[0];
    const events3 = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1", [ref])).rows[0].count);
    ok("a no-op save advances no version", Number(after3?.version) === 2, String(after3?.version));
    ok("a no-op save writes no activity row", events3 === events1, String(events3));

    // --- the store's own identity lock, which the write path never crosses ---
    for (const [label, sql] of [
      ["ref", "UPDATE car SET ref='TS-9999' WHERE id=$1"],
      ["id", "UPDATE car SET id=gen_random_uuid() WHERE id=$1"],
    ] as const) {
      await client.query("SAVEPOINT ident");
      let refused = false;
      let message = "";
      try {
        await client.query(sql, [id]);
      } catch (err) {
        refused = true;
        message = err instanceof Error ? err.message : String(err);
      }
      await client.query("ROLLBACK TO SAVEPOINT ident");
      ok(`the store refuses a hand-crafted ${label} change`, refused && message.includes("cannot be changed"), message);
    }

    await client.query("ROLLBACK");
    console.log("  (rolled back — the store is unchanged)");
    const trace = Number((await client.query("SELECT count(*) FROM car WHERE id=$1", [id])).rows[0].count);
    ok("the store holds no trace after rollback", trace === 0);
  } finally {
    await client.end();
  }
  console.log(failures === 0 ? "UPDATE-CAR CHECK PASSED" : `UPDATE-CAR CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
