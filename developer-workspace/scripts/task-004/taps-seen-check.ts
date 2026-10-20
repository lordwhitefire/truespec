/**
 * The tap notice's **seen-watermark**, executable (owner ruling, 2026-10-16: the badge means "taps
 * since the office last looked", clears when the list is viewed, and climbs again as new taps land).
 *
 * This drives the **real functions** in `lib/office.ts` — `getNewOfficeTapCount()` and
 * `markTapsSeenThrough()` — against the live store, not copies of their SQL. It writes rows under
 * `/__witness/` (pages no page of this site can be) and restores the `tap_seen` row exactly as it
 * found it, in a `finally`.
 *
 * What is claimed:
 *
 *   1. `tap_seen` exists, is a single row, and holds only `id`, `seen_through`, `updated_at`;
 *   2. with no watermark yet, every tap counts as new — `getNewOfficeTapCount()` equals the rows;
 *   3. marking through a tap clears it: the count becomes the taps **newer** than that tap (0 for
 *      the newest);
 *   4. the watermark only moves **forward** — marking an older tap does not re-expose newer ones;
 *   5. an id no row holds writes nothing;
 *   6. a tap that arrives **after** the mark is new again — the count climbs (the in-flight case);
 *   7. the store is restored: the witness's own rows are gone and the watermark is what it was.
 *
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/taps-seen-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { getNewOfficeTapCount, getOfficeTapCount, markTapsSeenThrough } from "../../../lib/office";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

/** Pages no page of this site can be, so the cleanup can name precisely what it removes. */
const PAGE_A = "/__witness/seen-a";
const PAGE_B = "/__witness/seen-b";
const PAGE_C = "/__witness/seen-c";
const PAGES = [PAGE_A, PAGE_B, PAGE_C];

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  const q = (sql: string, params: unknown[] = []) => client.query(sql, params);
  const countAll = async () => Number((await q("SELECT count(*) AS n FROM tap")).rows[0].n);
  const clean = async () => {
    await q("DELETE FROM tap WHERE page = ANY($1::text[])", [PAGES]);
  };
  // Insert a witness tap with a controlled time, so "newest" is deterministic.
  const insertAt = async (page: string, secondsAgo: number) =>
    (
      await q(
        `INSERT INTO tap (page, car_ref, at) VALUES ($1, NULL, now() - ($2 || ' seconds')::interval) RETURNING id`,
        [page, String(secondsAgo)],
      )
    ).rows[0].id as string;

  const savedRow = (await q("SELECT seen_through FROM tap_seen WHERE id")).rows[0] as
    | { seen_through: string | Date | null }
    | undefined;
  const saved = savedRow ? savedRow.seen_through : undefined;

  const setWatermark = (value: string | null) =>
    q(
      `INSERT INTO tap_seen (id, seen_through, updated_at) VALUES (true, $1, now())
       ON CONFLICT (id) DO UPDATE SET seen_through = EXCLUDED.seen_through, updated_at = now()`,
      [value],
    );

  try {
    // ------------------------------------------------- the table's shape ---
    const columns = (
      (
        await q(
          `SELECT column_name FROM information_schema.columns WHERE table_name = 'tap_seen' ORDER BY column_name`,
        )
      ).rows as Array<{ column_name: string }>
    ).map((r) => r.column_name);
    ok(
      "tap_seen holds only id, seen_through, updated_at",
      JSON.stringify(columns) === JSON.stringify(["id", "seen_through", "updated_at"]),
      columns.join(", "),
    );

    // ------------------------------------------------- start from "never looked" ---
    await clean();
    await setWatermark(null);
    const idOldest = await insertAt(PAGE_A, 30);
    const idMiddle = await insertAt(PAGE_B, 20);
    const idNewest = await insertAt(PAGE_C, 10);

    const total = await countAll();
    const unseen = await getNewOfficeTapCount();
    ok(
      "with no watermark, every tap is new — the count equals the rows the office holds",
      unseen === total,
      `${unseen} vs ${total}`,
    );

    // ------------------------------------------------- marking clears it ---
    await markTapsSeenThrough(idNewest);
    const afterNewest = await getNewOfficeTapCount();
    ok("marking through the newest tap clears the count to zero", afterNewest === 0, String(afterNewest));

    // ------------------------------------------------- the watermark only moves forward ---
    await setWatermark(null);
    await markTapsSeenThrough(idNewest); // seen to the newest
    await markTapsSeenThrough(idOldest); // a stale caller names an older tap
    const afterStale = await getNewOfficeTapCount();
    ok("a stale caller cannot un-see newer taps (the watermark only moves forward)", afterStale === 0, String(afterStale));

    // ------------------------------------------------- an id no row holds writes nothing ---
    const guardId = await insertAt(PAGE_A, 0); // a real id, then delete it
    await q("DELETE FROM tap WHERE id = $1", [guardId]);
    await markTapsSeenThrough(guardId); // now holds nothing
    const afterBad = await getNewOfficeTapCount();
    ok("an id no row holds writes nothing", afterBad === 0, String(afterBad));

    // ------------------------------------------------- a tap arriving after the mark is new ---
    await setWatermark(null);
    await markTapsSeenThrough(idNewest);
    const idAfter = await insertAt(PAGE_B, 0); // arrives now, newer than the newest
    const afterArrival = await getNewOfficeTapCount();
    ok(
      "a tap arriving after the mark is new again — the count climbs (the in-flight case)",
      afterArrival === 1,
      String(afterArrival),
    );
    void idMiddle;
    void idAfter;

    // ------------------------------------------------- the badge figure is the notice's, the record's is all-time ---
    const allTime = await getOfficeTapCount();
    ok("the all-time figure still counts every row", allTime === (await countAll()), `${allTime} vs ${await countAll()}`);
    ok("and the new figure is never larger than the all-time figure", afterArrival <= allTime, `${afterArrival} vs ${allTime}`);
  } finally {
    await clean();
    // Restore the watermark exactly as found: the saved value, or no row at all.
    if (savedRow === undefined) await q("DELETE FROM tap_seen WHERE id");
    else await setWatermark(saved === null ? null : new Date(saved as string).toISOString());
    const leftRows = (
      await q("SELECT count(*) AS n FROM tap WHERE page = ANY($1::text[])", [PAGES])
    ).rows[0].n;
    ok("the store is restored — the witness's own rows are gone", Number(leftRows) === 0, String(leftRows));
    await client.end();
  }
  console.log(failures === 0 ? "TAPS-SEEN CHECK PASSED" : `TAPS-SEEN CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
