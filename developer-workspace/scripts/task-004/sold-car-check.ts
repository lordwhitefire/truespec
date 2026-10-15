/**
 * Proves the sale against the live store — marking sold, correcting it, and un-marking.
 *
 * Task 14's claims, run through the *same* `carUpdateStatement` the action runs, inside
 * one transaction that is rolled back, so the store is left exactly as it was:
 *
 *   1. setting the primary state to Sold writes the sale row — the price, the date, and
 *      the car's **own pre-write primary state** as `prior_state_id` (truth 5: setting
 *      Sold is what performs the sale, and un-marking returns the car to the state it
 *      came from). The state and the sale row are one fact;
 *   2. a retry of the same marking is a true no-op — one sale row, one `car.sold` row,
 *      no second version (design D18);
 *   3. correcting the price while still Sold keeps `prior_state_id` and is named
 *      `car.updated` — a correction is not a second sale;
 *   4. leaving Sold deletes the sale row and writes `car.unsold`, so no real-profit
 *      residue can outlive the un-marking;
 *   5. a retry of the un-marking moves nothing.
 *
 *   node --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/sold-car-check.ts
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
  const id = "14141414-1414-4414-8414-141414141414";

  try {
    const primary = async (label: string) =>
      (
        await client.query<{ id: string }>(
          "SELECT id FROM car_state WHERE kind='primary' AND label=$1",
          [label],
        )
      ).rows[0]?.id ?? "";
    const available = await primary("Available");
    const landed = await primary("Landed");
    const sold = await primary("Sold");
    if (!available || !landed || !sold) throw new Error("the four primaries are not in the store (run migrations)");
    const secondary = (
      await client.query<{ id: string }>("SELECT id FROM car_state WHERE kind='secondary' ORDER BY label LIMIT 1")
    ).rows[0]?.id ?? "";

    await client.query("BEGIN");

    const actor = (
      await client.query<{ id: string }>(
        "INSERT INTO office_user (email) VALUES ('sold-check@truespec.local') RETURNING id",
      )
    ).rows[0].id;

    // --- make a real car, through the create statement (a car is never born Sold) ---
    const born = readCarInput({
      brand: "Check", model: "Sold", trim: "S1", year: "2021",
      exteriorColor: "Green", interiorColor: "Tan", mileage: "4321",
      features: "Sunroof", price: "20,000,000", wasPrice: "",
      privateNote: "internal", note: "public", arrivalNote: "At port",
      stateId: available, secondaryStateIds: secondary ? [secondary] : [],
      costs: { purchase_price: "12,000,000" },
    });
    if (!born.ok) throw new Error(`witness create refused: ${JSON.stringify(born.errors)}`);
    const makeArgs = {
      id,
      columns: born.value.columns,
      costs: born.value.costs,
      secondaryStateIds: born.value.secondaryStateIds,
      contentHash: carChangeCheck(born.value.columns as unknown as Record<string, unknown>),
      hashVersion: CHANGE_CHECK_VERSION,
      actorId: actor,
    };
    const made = await client.query<{ ref: string }>(carCreateStatement(makeArgs).text, carCreateStatement(makeArgs).params);
    const ref = made.rows[0]?.ref ?? "";
    ok("the witness car is made", ref.startsWith("TS-"), ref);

    // The one builder: the form's own reader, then the change-check as the action computes
    // it. `salePrice`/`saleDate` are the two money facts the form submits with Sold.
    const edit = (stateId: string, sale: { salePrice: string; saleDate: string } | null): CarUpdateArgs => {
      const read = readCarInput({
        brand: "Check", model: "Sold", trim: "S1", year: "2021",
        exteriorColor: "Green", interiorColor: "Tan", mileage: "4321",
        features: "Sunroof", price: "20,000,000", wasPrice: "",
        privateNote: "internal", note: "public", arrivalNote: "At port",
        stateId, secondaryStateIds: secondary ? [secondary] : [],
        costs: { purchase_price: "12,000,000" },
        salePrice: sale?.salePrice,
        saleDate: sale?.saleDate,
      });
      if (!read.ok) throw new Error(`witness edit refused: ${JSON.stringify(read.errors)}`);
      return {
        id,
        columns: read.value.columns,
        costs: read.value.costs,
        secondaryStateIds: read.value.secondaryStateIds,
        sale: read.value.sale,
        contentHash: carChangeCheck(read.value.columns as unknown as Record<string, unknown>),
        hashVersion: CHANGE_CHECK_VERSION,
        actorId: actor,
      };
    };

    const count = async (sql: string) => Number((await client.query(sql, [id])).rows[0].count);
    const eventKinds = async () =>
      (
        await client.query<{ kind: string }>(
          "SELECT kind FROM activity_event WHERE subject=$1 ORDER BY at, kind",
          [ref],
        )
      ).rows.map((r) => r.kind);
    const saleRow = async () =>
      (
        await client.query<{ sale_price_kobo: string; sold_at: string | Date; prior_state_id: string }>(
          "SELECT sale_price_kobo, sold_at, prior_state_id FROM sale WHERE car_id=$1",
          [id],
        )
      ).rows[0];
    const day = (v: string | Date | undefined) => (v === undefined ? "" : new Date(v).toISOString().slice(0, 10));

    // --- the car goes to Landed first (a state change with no sale) ---
    const toLanded = edit(landed, null);
    await client.query(carUpdateStatement(toLanded).text, carUpdateStatement(toLanded).params);
    ok("setting Landed writes no sale row", (await count("SELECT count(*) FROM sale WHERE car_id=$1")) === 0);
    const versionLanded = Number((await client.query("SELECT version FROM car WHERE id=$1", [id])).rows[0].version);

    // --- 1. marking Sold performs the sale ---
    const mark = edit(sold, { salePrice: "18,500,000", saleDate: "2026-09-15" });
    const marked = await client.query<{ ref: string }>(carUpdateStatement(mark).text, carUpdateStatement(mark).params);
    ok("the marking returns the car's ref", marked.rows.length === 1 && marked.rows[0]?.ref === ref);

    const sale1 = await saleRow();
    ok("the sale row appears", sale1 !== undefined);
    ok("the sale price is stored", Number(sale1?.sale_price_kobo) === 1_850_000_000, String(sale1?.sale_price_kobo));
    ok("the sale date is the day chosen", day(sale1?.sold_at) === "2026-09-15", String(sale1?.sold_at));
    ok(
      "prior_state_id is the car's own pre-write state (Landed)",
      sale1?.prior_state_id === landed,
      `${sale1?.prior_state_id} vs landed ${landed}`,
    );
    const carState = (await client.query("SELECT state_id, version FROM car WHERE id=$1", [id])).rows[0];
    ok("the car's primary state is Sold", carState?.state_id === sold);
    ok("the car advanced one version", Number(carState?.version) === versionLanded + 1, String(carState?.version));
    ok(
      "the event is car.sold",
      (await eventKinds()).filter((k) => k === "car.sold").length === 1,
      (await eventKinds()).join(","),
    );

    // --- 2. a retry of the same marking moves nothing ---
    const versionSold = Number(carState?.version);
    await client.query(carUpdateStatement(mark).text, carUpdateStatement(mark).params);
    ok("a retry writes no second sale row", (await count("SELECT count(*) FROM sale WHERE car_id=$1")) === 1);
    ok("a retry advances no version", Number((await client.query("SELECT version FROM car WHERE id=$1", [id])).rows[0].version) === versionSold);
    ok("a retry writes no second car.sold row", (await eventKinds()).filter((k) => k === "car.sold").length === 1);

    // --- 3. correcting the price while still Sold keeps the previous state ---
    const correct = edit(sold, { salePrice: "19,000,000", saleDate: "2026-09-16" });
    await client.query(carUpdateStatement(correct).text, carUpdateStatement(correct).params);
    const sale2 = await saleRow();
    ok("the corrected price is stored", Number(sale2?.sale_price_kobo) === 1_900_000_000, String(sale2?.sale_price_kobo));
    ok("the previous state survives a correction", sale2?.prior_state_id === landed, String(sale2?.prior_state_id));
    ok("still exactly one sale row", (await count("SELECT count(*) FROM sale WHERE car_id=$1")) === 1);
    ok(
      "the correction is car.updated, not a second sale",
      (await eventKinds()).filter((k) => k === "car.sold").length === 1 &&
        (await eventKinds()).includes("car.updated"),
      (await eventKinds()).join(","),
    );

    // --- 4. leaving Sold deletes the sale and returns the car ---
    const versionCorrected = Number((await client.query("SELECT version FROM car WHERE id=$1", [id])).rows[0].version);
    const unmark = edit(landed, null);
    await client.query(carUpdateStatement(unmark).text, carUpdateStatement(unmark).params);
    ok("the sale row is gone", (await count("SELECT count(*) FROM sale WHERE car_id=$1")) === 0);
    ok("the car returns to the state it sold from", (await client.query("SELECT state_id FROM car WHERE id=$1", [id])).rows[0].state_id === landed);
    ok("the car's secondary states are untouched", (await count("SELECT count(*) FROM car_secondary_state WHERE car_id=$1")) === 1);
    ok(
      "the event is car.unsold",
      (await eventKinds()).filter((k) => k === "car.unsold").length === 1,
      (await eventKinds()).join(","),
    );
    ok("the un-marking advanced one version", Number((await client.query("SELECT version FROM car WHERE id=$1", [id])).rows[0].version) === versionCorrected + 1);

    // --- 5. a retry of the un-marking moves nothing ---
    const versionUnmarked = Number((await client.query("SELECT version FROM car WHERE id=$1", [id])).rows[0].version);
    await client.query(carUpdateStatement(unmark).text, carUpdateStatement(unmark).params);
    ok("a retry of the un-marking advances no version", Number((await client.query("SELECT version FROM car WHERE id=$1", [id])).rows[0].version) === versionUnmarked);
    ok("a retry of the un-marking writes no second car.unsold row", (await eventKinds()).filter((k) => k === "car.unsold").length === 1);

    await client.query("ROLLBACK");
    console.log("  (rolled back — the store is unchanged)");
    ok("the store holds no trace after rollback", (await count("SELECT count(*) FROM car WHERE id=$1")) === 0);
  } finally {
    await client.end();
  }
  console.log(failures === 0 ? "SOLD-CAR CHECK PASSED" : `SOLD-CAR CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
