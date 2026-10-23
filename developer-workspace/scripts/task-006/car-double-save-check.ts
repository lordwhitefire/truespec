/**
 * TASK-006 T13 witness: the same add-form session submitted twice makes one car, one activity row
 * and one cost line. Runs only on the disposable branch.
 *
 *   TASK006_THROWAWAY=1 DATABASE_URL_UNPOOLED=<branch direct> \
 *     node --import tsx developer-workspace/scripts/task-006/car-double-save-check.ts
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { carCreateStatement } from "../../../lib/car-create";
import { isSameDatabase } from "../../../lib/backup-restore";

loadEnv({ path: ".env.local", quiet: true });

if (process.env.TASK006_THROWAWAY !== "1") {
  throw new Error("refusing: set TASK006_THROWAWAY=1 and run against the disposable branch only");
}
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? "";
const main = process.env.DATABASE_URL ?? "";
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is not set");
if (!main) throw new Error("DATABASE_URL is not set, so the branch cannot be checked");
if (isSameDatabase(connectionString, main)) throw new Error("refusing: that is the main database");

async function mainRun() {
  const client = new Client({ connectionString });
  await client.connect();
  const submissionId = randomUUID();
  try {
    const state = await client.query<{ id: string }>("SELECT id FROM car_state LIMIT 1");
    const actor = await client.query<{ id: string }>("SELECT id FROM office_user LIMIT 1");
    if (!state.rows[0] || !actor.rows[0]) throw new Error("the branch has no state/user to use");

    const statement = carCreateStatement({
      id: submissionId,
      columns: {
        brand: "TASK006",
        model: "Double save",
        trim: "Witness",
        year: 2026,
        exterior_color: "Silver",
        interior_color: "Grey",
        mileage: 1,
        features: JSON.stringify(["witness"]),
        note: null,
        private_note: null,
        was_price_kobo: null,
        arrival_note: null,
        doorstep_price_kobo: 1_000_000,
        state_id: state.rows[0].id,
      },
      costs: [{ kind: "purchase_price", amountMinor: 500_000 }],
      secondaryStateIds: [],
      photos: [],
      contentHash: "task006-witness",
      hashVersion: 1,
      actorId: actor.rows[0].id,
    });

    const first = await client.query<{ ref: string; changed: boolean }>(statement.text, statement.params);
    const second = await client.query<{ ref: string; changed: boolean }>(statement.text, statement.params);
    const ref = first.rows[0]?.ref;
    const sameRef = Boolean(ref) && second.rows[0]?.ref === ref;
    const oneCar = await client.query<{ n: number }>("SELECT count(*)::int AS n FROM car WHERE id = $1", [submissionId]);
    const oneEvent = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM activity_event WHERE subject = $1 AND kind = 'car.created'",
      [ref],
    );
    const oneCost = await client.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM cost_line WHERE car_id = $1",
      [submissionId],
    );

    const pass =
      first.rows[0]?.changed === true &&
      second.rows[0]?.changed === false &&
      sameRef &&
      oneCar.rows[0]?.n === 1 &&
      oneEvent.rows[0]?.n === 1 &&
      oneCost.rows[0]?.n === 1;

    console.log(
      JSON.stringify({
        pass,
        ref,
        firstChanged: first.rows[0]?.changed,
        secondChanged: second.rows[0]?.changed,
        sameRef,
        cars: oneCar.rows[0]?.n,
        events: oneEvent.rows[0]?.n,
        costLines: oneCost.rows[0]?.n,
      }),
    );

    // Leave the branch as it was.
    await client.query("DELETE FROM activity_event WHERE subject = $1 AND kind = 'car.created'", [ref]);
    await client.query("DELETE FROM car WHERE id = $1", [submissionId]);
    if (!pass) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

mainRun().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
