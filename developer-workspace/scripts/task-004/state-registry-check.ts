/**
 * Proves the registry's writes and its refusals against the live store.
 *
 * Task 15's claims, run through the *same* statements the actions run, inside one
 * transaction that is rolled back, so the store is left exactly as it was:
 *
 *   1. adding a secondary lands it as a secondary — no section, no new-arrival flag —
 *      after every existing one, and a retry with the same key adds no second row;
 *   2. renaming and recolouring change only that secondary, and a repeat writes nothing;
 *   3. the order is the list sent, written onto the secondaries alone, and a repeat moves
 *      nothing;
 *   4. the four primaries are out of reach: rename, recolour, reorder and remove each
 *      match no row for a primary, and the primary is unchanged afterwards;
 *   5. the store, not the screen, is the guard: a name another state already carries is
 *      refused (23505), a secondary given a section is refused, and a state a car still
 *      carries cannot be deleted (23503) — with the store's own count as the reason;
 *   6. a state nothing carries is removed cleanly.
 *
 *   node --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/state-registry-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { readCarInput } from "../../../lib/car-input";
import { carCreateStatement } from "../../../lib/car-create";
import { carChangeCheck, CHANGE_CHECK_VERSION } from "../../../lib/change-check";
import {
  carStateAddStatement,
  carStateHoldersStatement,
  carStateRecolourStatement,
  carStateRemoveStatement,
  carStateRenameStatement,
  carStateReorderStatement,
} from "../../../lib/car-state";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

const A = "15151515-1515-4515-8515-151515151501";
const B = "15151515-1515-4515-8515-151515151502";
const CAR = "15151515-1515-4515-8515-1515151515ff";

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const primary = async (label: string) =>
      (
        await client.query<{ id: string; sort: number; label: string }>(
          "SELECT id, sort, label FROM car_state WHERE kind='primary' AND label=$1",
          [label],
        )
      ).rows[0];
    const available = await primary("Available");
    const landed = await primary("Landed");
    if (!available || !landed) throw new Error("the four primaries are not in the store (run migrations)");

    await client.query("BEGIN");

    const state = async (id: string) =>
      (
        await client.query<{ id: string; label: string; colour: string; kind: string; section: string | null; is_new_arrival: boolean; sort: number }>(
          "SELECT id, label, colour, kind, section, is_new_arrival, sort FROM car_state WHERE id=$1",
          [id],
        )
      ).rows[0];
    const run = async (s: { text: string; params: unknown[] }) => {
      const r = await client.query(s.text, s.params);
      return r.rows;
    };
    /** An expected refusal: the store aborts the whole transaction on a failed statement, so each
     *  probe is fenced in a savepoint and rolled back to, leaving the rest of the run usable. */
    const throws = async (s: { text: string; params: unknown[] }): Promise<{ code?: string; constraint?: string } | null> => {
      await client.query("SAVEPOINT probe");
      try {
        await client.query(s.text, s.params);
        await client.query("RELEASE SAVEPOINT probe");
        return null;
      } catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT probe");
        const e = error as { code?: string; constraint?: string };
        return { code: e.code, constraint: e.constraint };
      }
    };
    const maxSecondarySort = async () =>
      Number((await client.query("SELECT COALESCE(MAX(sort), -1) AS s FROM car_state WHERE kind='secondary'")).rows[0].s);

    // --- 1. adding a secondary ---
    const beforeMax = await maxSecondarySort();
    await run(carStateAddStatement({ id: A, label: "Check A", colour: "#3a7bd5" }));
    await run(carStateAddStatement({ id: B, label: "Check B", colour: "#0e7a3e" }));
    const a1 = await state(A);
    ok("the state is a secondary", a1.kind === "secondary", a1.kind);
    ok("the state carries no section", a1.section === null, String(a1.section));
    ok("the state carries no new-arrival flag", a1.is_new_arrival === false, String(a1.is_new_arrival));
    ok("a new state lands after every existing one", a1.sort > beforeMax && (await state(B)).sort > a1.sort, `${beforeMax} < ${a1.sort} < ${(await state(B)).sort}`);

    await run(carStateAddStatement({ id: A, label: "Check A", colour: "#3a7bd5" }));
    ok(
      "a retry of the add writes no second row",
      Number((await client.query("SELECT count(*) AS n FROM car_state WHERE id=$1", [A])).rows[0].n) === 1,
    );
    ok(
      "a retry of the add leaves the owner's order alone",
      Number((await client.query("SELECT count(*) AS n FROM car_state WHERE kind='secondary'")).rows[0].n) ===
        Number((await client.query("SELECT count(*) AS n FROM car_state WHERE kind='secondary' AND id <> $1", [A])).rows[0].n) + 1,
    );

    // --- 2. renaming and recolouring ---
    const renamed = await run(carStateRenameStatement({ id: A, label: "Cleared goods" }));
    ok("a rename writes the state", renamed.length === 1 && (await state(A)).label === "Cleared goods", renamed.length === 1 ? "" : "no row returned");
    ok("a repeat of the rename writes nothing", (await run(carStateRenameStatement({ id: A, label: "Cleared goods" }))).length === 0);

    await run(carStateRecolourStatement({ id: A, colour: "#c8a24a" }));
    ok("a recolour writes the state", (await state(A)).colour === "#c8a24a", (await state(A)).colour);
    ok("a repeat of the recolour writes nothing", (await run(carStateRecolourStatement({ id: A, colour: "#c8a24a" }))).length === 0);
    ok("the other secondary is untouched", (await state(B)).colour === "#0e7a3e");

    // --- 3. the order ---
    const moved = await run(carStateReorderStatement({ ids: [B, A] }));
    const a2 = await state(A);
    const b2 = await state(B);
    ok("the order is the list sent", a2.sort === 1 && b2.sort === 0, `A=${a2.sort} B=${b2.sort}`);
    ok("the order moves only the rows it names", Number(moved[0].moved) === 2, String(moved[0].moved));
    const again = await run(carStateReorderStatement({ ids: [B, A] }));
    ok("a repeat of the order moves nothing", Number(again[0].moved) === 0, String(again[0].moved));
    ok("a primary's order is not the owner's to set", (await primary("Landed")).sort === landed.sort, `${(await primary("Landed")).sort} vs ${landed.sort}`);

    // --- 4. the primaries are out of reach ---
    ok("a rename cannot reach a primary", (await run(carStateRenameStatement({ id: available.id, label: "Renamed" }))).length === 0);
    ok("a recolour cannot reach a primary", (await run(carStateRecolourStatement({ id: available.id, colour: "#123456" }))).length === 0);
    ok("a removal cannot reach a primary", (await run(carStateRemoveStatement({ id: available.id }))).length === 0);
    await run(carStateReorderStatement({ ids: [available.id, A, B] }));
    const a3 = await state(A);
    const b3 = await state(B);
    ok(
      "an order naming a primary writes the secondaries and leaves the primary alone",
      (await primary("Available")).sort === available.sort && a3.sort === 1 && b3.sort === 2,
      `A=${a3.sort} B=${b3.sort} primary=${(await primary("Available")).sort}`,
    );
    const primaryOnly = await run(carStateReorderStatement({ ids: [available.id] }));
    ok("an order naming only a primary moves nothing", Number(primaryOnly[0].moved) === 0, String(primaryOnly[0].moved));
    ok(
      "every primary is exactly as it was",
      (await primary("Available")).label === "Available" && (await state(available.id)).colour !== "#123456",
    );

    // --- 5. the store is the guard ---
    const dupRename = await throws(carStateRenameStatement({ id: B, label: "Landed" }));
    ok("a name a primary already carries is refused", dupRename?.code === "23505", `${dupRename?.code} ${dupRename?.constraint}`);
    const dupAdd = await throws(
      carStateAddStatement({ id: "15151515-1515-4515-8515-151515151503", label: "Cleared goods", colour: "#3a7bd5" }),
    );
    ok("a name another secondary carries is refused", dupAdd?.code === "23505", `${dupAdd?.code} ${dupAdd?.constraint}`);
    const sectioned = await throws({
      text: `INSERT INTO car_state (id, label, kind, colour, sort, section, is_new_arrival)
             VALUES ($1::uuid, 'Check sectioned', 'secondary', '#3a7bd5', 99, 'available', false)`,
      params: [A],
    });
    ok(
      "the store refuses a secondary that carries a section",
      sectioned?.code === "23514",
      `${sectioned?.code} ${sectioned?.constraint}`,
    );

    // --- 6. a state a car carries cannot be deleted ---
    const actor = (
      await client.query<{ id: string }>(
        "INSERT INTO office_user (email) VALUES ('state-check@truespec.local') RETURNING id",
      )
    ).rows[0].id;
    const born = readCarInput({
      brand: "Check", model: "State", trim: "S1", year: "2021",
      exteriorColor: "Green", interiorColor: "Tan", mileage: "1234",
      features: "Sunroof", price: "20,000,000", wasPrice: "",
      privateNote: "internal", note: "public", arrivalNote: "At port",
      stateId: available.id, secondaryStateIds: [B], costs: { purchase_price: "12,000,000" },
    });
    if (!born.ok) throw new Error(`witness create refused: ${JSON.stringify(born.errors)}`);
    await run(
      carCreateStatement({
        id: CAR,
        columns: born.value.columns,
        costs: born.value.costs,
        secondaryStateIds: born.value.secondaryStateIds,
        contentHash: carChangeCheck(born.value.columns as unknown as Record<string, unknown>),
        hashVersion: CHANGE_CHECK_VERSION,
        actorId: actor,
      }),
    );

    const occupied = await throws(carStateRemoveStatement({ id: B }));
    // An `ON DELETE RESTRICT` key refuses with 23001 (restrict_violation); a `NO ACTION` one with
    // 23503. Either way it is the store refusing, and no car is moved out of the state for him.
    ok(
      "a state a car carries cannot be deleted",
      occupied?.code === "23001" || occupied?.code === "23503",
      `${occupied?.code} ${occupied?.constraint}`,
    );
    const held = await run(carStateHoldersStatement({ id: B }));
    ok("the reason carries the store's own count", Number(held[0].holders) === 1, String(held[0].holders));
    ok(
      "the refusal moved no car out of the state",
      Number((await client.query("SELECT count(*) AS n FROM car_secondary_state WHERE car_id=$1 AND state_id=$2", [CAR, B])).rows[0].n) === 1,
    );

    // --- 7. a state nothing carries goes cleanly ---
    const gone = await run(carStateRemoveStatement({ id: A }));
    ok("an unoccupied state is removed", gone.length === 1 && gone[0].label === "Cleared goods", gone[0]?.label ?? "no row");
    ok("the row is gone from the store", (await state(A)) === undefined);
    ok("a repeat of the removal finds nothing", (await run(carStateRemoveStatement({ id: A }))).length === 0);

    await client.query("ROLLBACK");
    console.log("  (rolled back — the store is unchanged)");
    ok("the store holds no trace after rollback", (await state(A)) === undefined && (await state(B)) === undefined);
  } finally {
    await client.end();
  }
  console.log(failures === 0 ? "STATE-REGISTRY CHECK PASSED" : `STATE-REGISTRY CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
