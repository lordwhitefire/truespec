/**
 * Proves the create statement against the live store — and that it is safe to retry.
 *
 * It runs the *same* `carCreateStatement` the action runs, but inside one transaction
 * that is rolled back, so the store is left exactly as it was. Two runs share the car's
 * key (as a retry does) and the second must be a no-op.
 *
 *   node --import tsx developer-workspace/scripts/task-004/create-car-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { readCarInput } from "../../../lib/car-input";
import { carCreateStatement } from "../../../lib/car-create";
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
  try {
    const primary = (await client.query<{ id: string }>("SELECT id FROM car_state WHERE kind='primary' AND label='Available'")).rows[0];
    const secondary = (await client.query<{ id: string }>("SELECT id FROM car_state WHERE kind='secondary' ORDER BY label LIMIT 1")).rows[0];

    await client.query("BEGIN");

    // A real actor, so the activity row's foreign key is exercised (the rebuild left office_user empty).
    const actor = (
      await client.query<{ id: string }>(
        "INSERT INTO office_user (email) VALUES ('check@truespec.local') RETURNING id",
      )
    ).rows[0].id;

    const read = readCarInput({
      brand: "Check", model: "Witness", trim: "T1", year: "2022",
      exteriorColor: "Blue", interiorColor: "Grey", mileage: "1234",
      features: "Sunroof\nHeated seats", price: "20,000,000", wasPrice: "25,000,000",
      privateNote: "internal", note: "public note", arrivalNote: "",
      stateId: primary.id, secondaryStateIds: [secondary.id],
      costs: { purchase_price: "12,000,000", shipping: "500,000", full_tank: "0" },
    });
    if (!read.ok) throw new Error(`witness form refused: ${JSON.stringify(read.errors)}`);
    const { columns, costs, secondaryStateIds } = read.value;

    const id = "11111111-1111-4111-8111-111111111111";
    const args = {
      id,
      columns,
      costs,
      secondaryStateIds,
      photos: [],
      contentHash: carChangeCheck(columns as unknown as Record<string, unknown>),
      hashVersion: CHANGE_CHECK_VERSION,
      actorId: actor,
    };

    // --- first run: makes the car ---
    const run1 = await client.query<{ ref: string }>(carCreateStatement(args).text, carCreateStatement(args).params);
    const ref = run1.rows[0]?.ref ?? "";
    ok("a car is created and a ref is returned", run1.rows.length === 1 && /^TS-\d{4}$/.test(ref), ref);

    const carRow = (await client.query("SELECT ref, content_hash, state_id, features, private_note, was_price_kobo, note, doorstep_price_kobo FROM car WHERE id=$1", [id])).rows[0];
    ok("the stored change-check is the server's", carRow?.content_hash === args.contentHash);
    ok("the primary state is stored", carRow?.state_id === primary.id);
    ok("features are stored as a JSON array text", JSON.parse(carRow?.features)?.length === 2);
    // The two columns the form did not offer before Task 11 (the private note and the
    // crossed-out "was" price) reach the store through the form's own path.
    ok("the private note is stored", carRow?.private_note === "internal", String(carRow?.private_note));
    ok("the public note is stored", carRow?.note === "public note", String(carRow?.note));
    ok("the was-price is stored in kobo", Number(carRow?.was_price_kobo) === 2500000000, String(carRow?.was_price_kobo));
    ok("the doorstep price is stored in kobo", Number(carRow?.doorstep_price_kobo) === 2000000000, String(carRow?.doorstep_price_kobo));

    const costs1 = Number((await client.query("SELECT count(*) FROM cost_line WHERE car_id=$1", [id])).rows[0].count);
    ok("three cost lines are written", costs1 === 3, String(costs1));
    const secs1 = Number((await client.query("SELECT count(*) FROM car_secondary_state WHERE car_id=$1", [id])).rows[0].count);
    ok("the secondary link is written", secs1 === 1, String(secs1));
    const events1 = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1", [ref])).rows[0].count);
    ok("one activity row is written for the ref", events1 === 1, String(events1));

    // --- second run with the SAME key (a retry): must move nothing ---
    const run2 = await client.query<{ ref: string }>(carCreateStatement(args).text, carCreateStatement(args).params);
    ok("a retry returns the same ref", run2.rows[0]?.ref === ref, `${run2.rows[0]?.ref}`);
    const carCount = Number((await client.query("SELECT count(*) FROM car WHERE id=$1", [id])).rows[0].count);
    const costs2 = Number((await client.query("SELECT count(*) FROM cost_line WHERE car_id=$1", [id])).rows[0].count);
    const secs2 = Number((await client.query("SELECT count(*) FROM car_secondary_state WHERE car_id=$1", [id])).rows[0].count);
    const events2 = Number((await client.query("SELECT count(*) FROM activity_event WHERE subject=$1", [ref])).rows[0].count);
    ok("a retry makes no second car", carCount === 1, String(carCount));
    ok("a retry writes no duplicate cost lines", costs2 === costs1, String(costs2));
    ok("a retry writes no duplicate secondary link", secs2 === secs1, String(secs2));
    ok("a retry writes no duplicate activity row", events2 === events1, String(events2));

    await client.query("ROLLBACK");
    console.log("  (rolled back — the store is unchanged)");

    const after = Number((await client.query("SELECT count(*) FROM car WHERE id=$1", [id])).rows[0].count);
    ok("the store holds no trace after rollback", after === 0);
  } finally {
    await client.end();
  }
  console.log(failures === 0 ? "CREATE-CAR CHECK PASSED" : `CREATE-CAR CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
