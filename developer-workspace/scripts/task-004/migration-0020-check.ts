/**
 * Validates migrations/0020_state_model_split.sql WITHOUT changing the store.
 *
 * It opens one transaction, runs the migration file, asserts the new model and the
 * store's refusals, then ROLLBACKs — so the live store is left exactly as it was.
 * A failed statement aborts a Postgres transaction, so every "must be refused" test
 * runs under a SAVEPOINT that is rolled back.
 *
 *   node --import tsx developer-workspace/scripts/task-004/migration-0020-check.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local" });

let failures = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

async function refusal(
  client: Client,
  name: string,
  sql: string,
  wantCode: string,
): Promise<void> {
  await client.query("SAVEPOINT probe");
  try {
    await client.query(sql);
    await client.query("ROLLBACK TO SAVEPOINT probe");
    ok(name, false, "the statement was ALLOWED; it should have been refused");
  } catch (err) {
    const e = err as { code?: string; constraint?: string; message?: string };
    await client.query("ROLLBACK TO SAVEPOINT probe");
    ok(name, e.code === wantCode, `sqlstate ${e.code} (${e.constraint ?? e.message})`);
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  const sql = readFileSync(
    join(process.cwd(), "migrations", "0020_state_model_split.sql"),
    "utf8",
  );

  try {
    const before = (
      await client.query<{ label: string }>("SELECT label FROM car_state ORDER BY sort")
    ).rows.map((r) => r.label);
    const carsBefore = Number(
      (await client.query("SELECT count(*) FROM car")).rows[0].count,
    );
    console.log(`before: car_state = [${before.join(", ")}], ${carsBefore} car(s)`);

    await client.query("BEGIN");
    try {
      await client.query(sql);
      console.log("\nthe migration ran to the end.");

      // --- the new model -------------------------------------------------------
      const states = (
        await client.query<{ label: string; kind: string; section: string | null; sort: number }>(
          "SELECT label, kind, section, sort FROM car_state ORDER BY sort",
        )
      ).rows;
      const prim = states.filter((s) => s.kind === "primary").map((s) => s.label).sort();
      const sec = states.filter((s) => s.kind === "secondary").map((s) => s.label).sort();
      console.log(`after:  car_state = ${states.map((s) => `${s.label}[${s.kind}/${s.section ?? "—"}]`).join(", ")}`);

      ok(
        "four primaries, pinned",
        JSON.stringify(prim) === JSON.stringify(["Available", "Landed", "On Order", "Sold"]),
        prim.join(", "),
      );
      ok(
        "the three old stages are secondary",
        JSON.stringify(sec) === JSON.stringify(["At port", "Cleared", "On the way"]),
        sec.join(", "),
      );
      ok(
        "every primary carries its one section",
        states
          .filter((s) => s.kind === "primary")
          .every((s) => s.section !== null),
      );
      ok(
        "every secondary carries no section",
        states.filter((s) => s.kind === "secondary").every((s) => s.section === null),
      );

      const nullState = Number(
        (
          await client.query(
            "SELECT count(*) FROM car WHERE state_id IS NULL",
          )
        ).rows[0].count,
      );
      ok("car.state_id has no NULL left", nullState === 0, `${nullState} null`);

      const notNull = (
        await client.query<{ is_nullable: string }>(
          `SELECT is_nullable FROM information_schema.columns
            WHERE table_name = 'car' AND column_name = 'state_id'`,
        )
      ).rows[0]?.is_nullable;
      ok("car.state_id is NOT NULL", notNull === "NO", String(notNull));

      const link = (
        await client.query(
          `SELECT to_regclass('public.car_secondary_state') AS t`,
        )
      ).rows[0].t;
      ok("car_secondary_state exists", link === "car_secondary_state", String(link));

      // A car's secondary links go with the car when it is deleted — the demo-wipe's move.
      const withLink = (
        await client.query<{ car_id: string }>(
          "SELECT car_id FROM car_secondary_state LIMIT 1",
        )
      ).rows[0];
      if (withLink) {
        await client.query("DELETE FROM car WHERE id = $1", [withLink.car_id]);
        const left = Number(
          (
            await client.query(
              "SELECT count(*) FROM car_secondary_state WHERE car_id = $1",
              [withLink.car_id],
            )
          ).rows[0].count,
        );
        ok("deleting a car takes its secondary links with it", left === 0, `${left} left`);
      } else {
        ok("deleting a car takes its secondary links with it", true, "no linked car to test");
      }

      // --- the store's refusals ------------------------------------------------
      console.log("\nthe store's refusals:");
      await refusal(
        client,
        "a fifth primary is refused",
        `INSERT INTO car_state (label, section, is_new_arrival, sort, colour, kind)
         VALUES ('Handover', 'available', false, 99, '#000000', 'primary')`,
        "23514",
      );
      await refusal(
        client,
        "renaming a primary is refused",
        `UPDATE car_state SET label = 'Stock' WHERE label = 'Available'`,
        "23514",
      );
      await refusal(
        client,
        "deleting an unoccupied primary is refused",
        `DELETE FROM car_state WHERE label = 'Sold'`,
        "23514",
      );
      await refusal(
        client,
        "turning a primary into a secondary is refused",
        `UPDATE car_state SET kind = 'secondary', section = NULL WHERE label = 'Landed'`,
        "23514",
      );
      await refusal(
        client,
        "a duplicate name is refused",
        `INSERT INTO car_state (label, section, is_new_arrival, sort, colour, kind)
         VALUES ('Landed', NULL, false, 99, '#000000', 'secondary')`,
        "23505",
      );
      await refusal(
        client,
        "a secondary carrying a section is refused",
        `INSERT INTO car_state (label, section, is_new_arrival, sort, colour, kind)
         VALUES ('Detailing', 'available', false, 99, '#000000', 'secondary')`,
        "23514",
      );
    } finally {
      await client.query("ROLLBACK");
      console.log("\nrolled back — the store is unchanged.");
    }
  } finally {
    await client.end();
  }

  console.log(failures === 0 ? "\nMIGRATION 0020: ALL CHECKS PASS" : `\nMIGRATION 0020: ${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
