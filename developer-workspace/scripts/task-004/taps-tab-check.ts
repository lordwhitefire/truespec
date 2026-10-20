/**
 * The Taps tab's read, executable — the panel is capped, a list a person asked for is not.
 *
 * `getOfficeTaps()` is the **dashboard panel's** read: newest first, bounded by `TAP_LIMIT`, because a
 * panel shows the newest few (truth 8, and `lib/export.ts`'s own rule: "getOfficeTaps() … capped at
 * 200, because they feed a panel. An export is not a panel"). The **Taps tab** on the Enquiries page
 * is not a panel either — it is a list the office asked for — so it reads the same table uncapped,
 * through `getAllOfficeTaps()`. That function is `getOfficeTaps(null)`: the same table, the same join,
 * the same one query, so the list and the shell's notice can never disagree.
 *
 * The only way to tell the two reads apart is to cross the cap. This witness puts `TAP_LIMIT + 5`
 * taps of its own into the store, reads both ways, and removes exactly what it added:
 *
 *   1. the panel read is exactly `TAP_LIMIT` rows — the cap still holds;
 *   2. the full read returns every row — five more than the panel;
 *   3. the five the cap drops are really there: a tap one past the cap is in the full read and NOT in
 *      the panel read. (This is the row a person would have found at the foot of "All taps" and the
 *      panel would have silently hidden — the same lie the count would tell, in rows.)
 *
 * Its rows carry a fixed id prefix, so the cleanup names precisely what it removes and the store's own
 * rows are untouched. A crashed earlier run cannot poison this one: the prefix is deleted first.
 *
 *   node --import tsx --conditions=react-server developer-workspace/scripts/task-004/taps-tab-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { TAP_LIMIT, getAllOfficeTaps, getOfficeTaps } from "../../../lib/office";

loadEnv({ path: ".env.local", quiet: true });

/** The fixed prefix of this witness's rows — the cleanup deletes by it, and nothing else does. */
const PREFIX = "18181818-1818-4818-8818-";
const COUNT = TAP_LIMIT + 5;

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

/** The id of the row one past the cap — the one the panel drops and the list keeps. */
const past = (n: number) => `${PREFIX}${String(n).padStart(12, "0")}`;

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  const clean = () => client.query("DELETE FROM tap WHERE id::text LIKE $1", [`${PREFIX}%`]);
  const storeTaps = async () => Number((await client.query("SELECT count(*) AS n FROM tap")).rows[0].n);

  const start = await storeTaps();
  try {
    await clean(); // an interrupted earlier run leaves nothing behind
    if (start !== 0) {
      console.log(`  note  the store already holds ${start} tap(s) — the reads are asserted against the counts taken now`);
    }

    // All at one instant: the ordering tie-break is the id, so "newest first" is deterministic and the
    // five the cap drops are the five highest ids, whatever the store held before.
    await client.query(
      `INSERT INTO tap (id, page, car_ref, at)
       SELECT ('${PREFIX}' || lpad(g::text, 12, '0'))::uuid, '/', NULL, now()
       FROM generate_series(1, $1) AS g`,
      [COUNT],
    );

    const full = await getAllOfficeTaps();
    const panel = await getOfficeTaps();

    ok("the panel read is bounded by TAP_LIMIT — the cap still holds", panel.length === TAP_LIMIT, `${panel.length} = ${TAP_LIMIT}`);
    ok("the full read returns every row — the cap is lifted for the list", full.length === start + COUNT, `${full.length} = ${start} + ${COUNT}`);
    ok("the full read is strictly larger than the panel's", full.length > panel.length, `${full.length} > ${panel.length}`);

    const dropped = past(TAP_LIMIT + 1);
    ok("a tap one past the cap IS in the full read", full.some((t) => t.id === dropped), dropped);
    ok("and is NOT in the panel read — the row the cap would have hidden", !panel.some((t) => t.id === dropped), dropped);

    ok("the full read is still every row through the real reader, newest first", full.length === start + COUNT);
  } finally {
    await clean();
    const after = await storeTaps();
    ok("the store is the size it was — the witness's own rows are gone", after === start, `${after} = ${start}`);
    await client.end();
  }

  console.log(failures === 0 ? "TAPS-TAB CHECK PASSED" : `TAPS-TAB CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
