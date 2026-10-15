/**
 * Proves the dashboard's two feeds read the store (truth 15): `getOfficeActivity()` over
 * `activity_event`, and `getOfficeTaps()` over `tap` with the car's own name resolved by the ref.
 *
 * The reads are the **real read functions**, imported under `--conditions=react-server` so
 * `server-only` resolves — not a copy of their SQL, which could drift from them.
 *
 * **This witness writes, and removes exactly what it wrote.** The store holds no tap and no activity
 * row, so a read of real rows can only be proved by putting a few there; a read that went through
 * `pg` inside a transaction would not be the read the screens use (it goes over the Neon HTTP driver
 * on its own connection, so it cannot see uncommitted rows). So the rows are committed, read, and
 * then deleted by their own ids — never by a pattern — with the counts checked back at the end.
 *
 * What is claimed:
 *
 *   1. an activity row is read back, with the store's own instant as ISO and the actor it has;
 *   2. the newest row comes first, and the read is bounded by `ACTIVITY_LIMIT`;
 *   3. the shared wording rule words the kind the read returned (so the panel cannot show it raw);
 *   4. a tap on a car reads back with the car's **own name** resolved from `car` by the ref;
 *   5. a general tap (`car_ref` null) reads back with no car, and a tap whose ref no car holds keeps
 *      the ref and reads with no name — a tap outlives the car it named;
 *   6. one tap, one activity row, and the two reads are bounded by `TAP_LIMIT` / `ACTIVITY_LIMIT`;
 *   7. the store is the size it was: exactly the witness's own rows are gone.
 *
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/dashboard-feeds-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { ACTIVITY_LIMIT, TAP_LIMIT, getOfficeActivity, getOfficeTaps } from "../../../lib/office";
import { wordOf } from "../../../lib/activity-feed";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

/** The witness's own rows — fixed ids, so the cleanup can name precisely what it removes. */
const ACT_OLD = "17171717-1717-4717-8717-171717171701";
const ACT_NEW = "17171717-1717-4717-8717-171717171702";
const TAP_CAR = "17171717-1717-4717-8717-1717171717c1";
const TAP_GEN = "17171717-1717-4717-8717-1717171717c2";
const TAP_GHOST = "17171717-1717-4717-8717-1717171717c3";

/** A ref no car will ever hold — a code the sequence could not have reached yet. */
const GHOST_REF = "TS-0000";

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  const before = async () => {
    const tap = Number((await client.query("SELECT count(*) AS n FROM tap")).rows[0].n);
    const act = Number((await client.query("SELECT count(*) AS n FROM activity_event")).rows[0].n);
    return { tap, act };
  };
  const clean = async () => {
    await client.query("DELETE FROM tap WHERE id = ANY($1::uuid[])", [[TAP_CAR, TAP_GEN, TAP_GHOST]]);
    await client.query("DELETE FROM activity_event WHERE id = ANY($1::uuid[])", [[ACT_OLD, ACT_NEW]]);
  };

  const start = await before();
  try {
    if (start.tap !== 0 || start.act !== 0) {
      console.log(`  note  the store already holds ${start.tap} tap(s) and ${start.act} activity row(s) — reads are asserted against the counts taken now`);
    }

    // A real car, so a tap's name has something to resolve to.
    const car = (
      await client.query<{ ref: string; year: number | null; model: string; trim: string | null }>(
        "SELECT ref, year, model, trim FROM car WHERE deleted_at IS NULL ORDER BY ref LIMIT 1",
      )
    ).rows[0];
    if (!car) throw new Error("no live car in the store — nothing to resolve a tap against");
    const carName = [car.year, car.model, car.trim].filter(Boolean).join(" ");

    await clean(); // in case an interrupted earlier run left rows behind
    await client.query(
      `INSERT INTO activity_event (id, kind, subject, at)
       VALUES ($1::uuid, 'car.created', 'TS-1002', now() - interval '2 hours'),
              ($2::uuid, 'car.updated', 'TS-1003', now())`,
      [ACT_OLD, ACT_NEW],
    );
    await client.query(
      `INSERT INTO tap (id, page, car_ref, at)
       VALUES ($1::uuid, $4, $5, now() - interval '1 hour'),
              ($2::uuid, '/', NULL, now() - interval '30 minutes'),
              ($3::uuid, '/inventory', $6, now())`,
      [TAP_CAR, TAP_GEN, TAP_GHOST, `/car/${car.ref}`, car.ref, GHOST_REF],
    );

    // ------------------------------------------------------------- the activity read (truth 15) ---
    const activity = await getOfficeActivity();
    ok("the activity read returns the rows the store holds", activity.length === start.act + 2, `${activity.length}`);
    ok("an activity row is read back by its own id", activity.some((a) => a.id === ACT_NEW));
    ok("the row's kind and subject are the store's", activity.some((a) => a.id === ACT_NEW && a.kind === "car.updated" && a.subject === "TS-1003"));
    ok("the row's instant is ISO", activity.every((a) => new Date(a.at).toISOString() === a.at));
    ok("an activity row with no actor reads as one", activity.find((a) => a.id === ACT_NEW)?.actor === null);
    ok("the newest row comes first", activity[0]?.id === ACT_NEW, activity[0]?.id ?? "nothing");
    ok("the read is bounded by ACTIVITY_LIMIT", activity.length <= ACTIVITY_LIMIT, `${activity.length} <= ${ACTIVITY_LIMIT}`);
    ok(
      "the shared wording rule words the kind the read returned",
      wordOf(activity[0].kind) === "Edited a car",
      wordOf(activity[0].kind),
    );

    // ----------------------------------------------------------------- the taps read (truth 15) ---
    const taps = await getOfficeTaps();
    ok("the taps read returns the rows the store holds", taps.length === start.tap + 3, `${taps.length}`);
    const onCar = taps.find((t) => t.id === TAP_CAR);
    ok("a tap on a car keeps the ref it named", onCar?.carRef === car.ref, String(onCar?.carRef));
    ok("and reads with the car's own name, resolved by the ref", onCar?.car === carName, `${onCar?.car} vs ${carName}`);
    ok("the tap's page is the store's", onCar?.page === `/car/${car.ref}`, String(onCar?.page));
    ok("the tap's instant is ISO", taps.every((t) => new Date(t.at).toISOString() === t.at));

    const general = taps.find((t) => t.id === TAP_GEN);
    ok("a general tap has no ref and no car", general?.carRef === null && general?.car === null, `${general?.carRef} / ${general?.car}`);
    ok("a general tap still says which page it was on", general?.page === "/", String(general?.page));

    const ghost = taps.find((t) => t.id === TAP_GHOST);
    ok("a tap whose ref no car holds keeps the ref", ghost?.carRef === GHOST_REF, String(ghost?.carRef));
    ok("and reads with no name rather than the wrong one", ghost?.car === null, String(ghost?.car));

    ok("the newest tap comes first", taps[0]?.id === TAP_GHOST, taps[0]?.id ?? "nothing");
    ok("the read is bounded by TAP_LIMIT", taps.length <= TAP_LIMIT, `${taps.length} <= ${TAP_LIMIT}`);
  } finally {
    await clean();
    const after = await before();
    ok(
      "the store is the size it was — the witness's own rows are gone",
      after.tap === start.tap && after.act === start.act,
      `${after.tap} tap(s), ${after.act} activity row(s)`,
    );
    await client.end();
  }
  console.log(failures === 0 ? "DASHBOARD-FEEDS CHECK PASSED" : `DASHBOARD-FEEDS CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
