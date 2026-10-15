/**
 * Proves the office's enquiry layer against the live store: the reads (truth 15), the registry's
 * writes and refusals (truth 10), any-state-at-any-time (truth 13), and the change-check staying the
 * server's (truth 14).
 *
 * The statements are the *same builders the actions run*, inside one transaction that is rolled
 * back, so the store is left exactly as it was. The reads are the *real read functions* — imported
 * with `--conditions=react-server` so `server-only` resolves — called before and after, so the
 * rollback is measured rather than assumed.
 *
 * What is claimed:
 *
 *   1. the registry reads every `enquiry_state` row in the owner's order, and the number beside a
 *      state is the store's own count of the enquiries in it;
 *   2. the board's read returns every enquiry, each either in no state or in one the registry holds,
 *      and its instants are ISO;
 *   3. the activity read is bounded to the newest 200 and matches the store's own row count;
 *   4. adding a state lands it after every existing one, and a retry with the same key adds no
 *      second row;
 *   5. renaming and recolouring change only that state, and a repeat writes nothing;
 *   6. the order is the list sent, a repeat moves nothing, and the states the store ships with are
 *      reorderable like any other — nothing here is a pipeline;
 *   7. a name another state already carries is refused by the store (23505);
 *   8. an enquiry can be given any state at any time — one end of the order to the other — the
 *      stored hash is the server's own recomputation from the row's stored values, the details are
 *      untouched, and a repeat of the same state is a true no-op;
 *   9. a state an enquiry still sits in cannot be deleted (23001/23503), the reason carries the
 *      store's own count, and no enquiry is moved out of it;
 *  10. a state nothing sits in is removed cleanly, and a repeat finds nothing;
 *  11. an enquiry's identity is final: its `id` cannot be changed;
 *  12. after the rollback the store holds no trace and the reads say the same thing.
 *
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx developer-workspace/scripts/task-004/enquiry-registry-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { CHANGE_CHECK_VERSION, enquiryChangeCheck } from "../../../lib/change-check";
import {
  enquiryStateAddStatement,
  enquiryStateHoldersStatement,
  enquiryStateRecolourStatement,
  enquiryStateRemoveStatement,
  enquiryStateRenameStatement,
  enquiryStateReorderStatement,
} from "../../../lib/enquiry-state";
import { enquiryEditableStatement, enquirySetStateStatement } from "../../../lib/enquiry-set-state";
import { ACTIVITY_LIMIT, getEnquiries, getEnquiryStateRegistry, getOfficeActivity } from "../../../lib/office";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

/** Ids this run mints; the rows it adds go with the rollback. */
const A = "16161616-1616-4616-8616-161616161601";
const B = "16161616-1616-4616-8616-161616161602";
const TMP = "16161616-1616-4616-8616-161616161603";
const ENQ = "16161616-1616-4616-8616-1616161616ff";

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // ------------------------------------------------------------ the reads (truth 15) ---
    // Called before the transaction, so they see exactly what a screen sees.
    const readRegistry = await getEnquiryStateRegistry();
    const readEnquiries = await getEnquiries();
    const readActivity = await getOfficeActivity();

    const storeStateCount = Number((await client.query("SELECT count(*) AS n FROM enquiry_state")).rows[0].n);
    const storeEnquiryCount = Number((await client.query("SELECT count(*) AS n FROM enquiry")).rows[0].n);
    const storeActivityCount = Number((await client.query("SELECT count(*) AS n FROM activity_event")).rows[0].n);

    ok("the registry read returns every state", readRegistry.length === storeStateCount, `${readRegistry.length} of ${storeStateCount}`);
    const direct = new Map(
      (
        await client.query<{ id: string; n: string }>(
          "SELECT s.id, (SELECT count(*) FROM enquiry e WHERE e.enquiry_state_id = s.id) AS n FROM enquiry_state s",
        )
      ).rows.map((r) => [r.id, Number(r.n)]),
    );
    ok(
      "the number beside a state is the store's own count",
      readRegistry.every((s) => s.enquiries === direct.get(s.id)),
      readRegistry.map((s) => `${s.label}=${s.enquiries}`).join(" "),
    );
    const storeOrder = (await client.query<{ id: string }>("SELECT id FROM enquiry_state ORDER BY sort, label")).rows.map((r) => r.id);
    ok("the registry is drawn in the owner's order", JSON.stringify(readRegistry.map((s) => s.id)) === JSON.stringify(storeOrder));
    ok("every state carries a colour the office can draw", readRegistry.every((s) => /^#[0-9a-fA-F]{6}$/.test(s.colour)));

    ok("the board read returns every enquiry", readEnquiries.length === storeEnquiryCount, `${readEnquiries.length} of ${storeEnquiryCount}`);
    const known = new Set(readRegistry.map((s) => s.id));
    ok(
      "every enquiry is in no state or in one the registry holds",
      readEnquiries.every((e) => e.stateId === null || known.has(e.stateId)),
      `${readEnquiries.filter((e) => e.stateId === null).length} with no state`,
    );
    ok("an enquiry's instants are ISO", readEnquiries.every((e) => new Date(e.createdAt).toISOString() === e.createdAt));
    ok(
      "the activity read is bounded to the newest 200",
      readActivity.length === Math.min(storeActivityCount, ACTIVITY_LIMIT),
      `${readActivity.length} row(s); the store holds ${storeActivityCount}`,
    );
    ok("the activity read's instants are ISO", readActivity.every((a) => new Date(a.at).toISOString() === a.at));
    console.log(
      storeActivityCount === 0
        ? "  note  the log is empty: nothing has written an activity row yet — no seed authors one (honest, and reported)"
        : `  note  the log holds ${storeActivityCount} row(s)`,
    );

    await client.query("BEGIN");

    const state = async (id: string) =>
      (
        await client.query<{ id: string; label: string; colour: string; sort: number }>(
          "SELECT id, label, colour, sort FROM enquiry_state WHERE id=$1",
          [id],
        )
      ).rows[0];
    const run = async (s: { text: string; params: unknown[] }) => (await client.query(s.text, s.params)).rows;
    /** An expected refusal aborts the whole transaction, so each probe is fenced in a savepoint. */
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
    const maxSort = async () => Number((await client.query("SELECT COALESCE(MAX(sort), -1) AS s FROM enquiry_state")).rows[0].s);

    // -------------------------------------------------------- adding a state (truth 10) ---
    const beforeMax = await maxSort();
    await run(enquiryStateAddStatement({ id: A, label: "Check A", colour: "#3a7bd5" }));
    await run(enquiryStateAddStatement({ id: B, label: "Check B", colour: "#0e7a3e" }));
    const a1 = await state(A);
    ok("a new state is written", a1?.label === "Check A", a1?.label ?? "no row");
    ok("a new state lands after every existing one", a1.sort > beforeMax && (await state(B)).sort > a1.sort, `${beforeMax} < ${a1.sort} < ${(await state(B)).sort}`);

    await run(enquiryStateAddStatement({ id: A, label: "Check A", colour: "#3a7bd5" }));
    ok("a retry of the add writes no second row", Number((await client.query("SELECT count(*) AS n FROM enquiry_state WHERE id=$1", [A])).rows[0].n) === 1);
    ok(
      "a retry of the add leaves the registry the size the first write left it",
      Number((await client.query("SELECT count(*) AS n FROM enquiry_state")).rows[0].n) === storeStateCount + 2,
    );

    // ----------------------------------------------- renaming and recolouring (truth 10) ---
    ok("a rename writes the state", (await run(enquiryStateRenameStatement({ id: A, label: "Cleared enquiries" }))).length === 1 && (await state(A)).label === "Cleared enquiries");
    ok("a repeat of the rename writes nothing", (await run(enquiryStateRenameStatement({ id: A, label: "Cleared enquiries" }))).length === 0);
    await run(enquiryStateRecolourStatement({ id: A, colour: "#c8a24a" }));
    ok("a recolour writes the state", (await state(A)).colour === "#c8a24a", (await state(A)).colour);
    ok("a repeat of the recolour writes nothing", (await run(enquiryStateRecolourStatement({ id: A, colour: "#c8a24a" }))).length === 0);
    ok("the state beside it is untouched", (await state(B)).colour === "#0e7a3e");

    // ----------------------------------------------------------- the order (truth 13) ---
    // The whole registry, with the states the store ships with in it: the order is layout, so a
    // state the store shipped with is moved exactly like one the owner added. Nothing is a pipeline.
    const shipped = (await client.query<{ id: string }>("SELECT id FROM enquiry_state WHERE id <> $1 AND id <> $2 ORDER BY sort, label", [A, B])).rows.map((r) => r.id);
    const wanted = [B, ...shipped.slice(0, 1), A, ...shipped.slice(1)];
    const moved = await run(enquiryStateReorderStatement({ ids: wanted }));
    ok("the order is the list sent", Number(moved[0].moved) === wanted.length, `${moved[0].moved} of ${wanted.length}`);
    ok(
      "a state the store shipped with is reorderable like any other",
      (await client.query<{ id: string }>("SELECT id FROM enquiry_state ORDER BY sort, label")).rows.map((r) => r.id).join() === wanted.join(),
    );
    ok("a repeat of the order moves nothing", Number((await run(enquiryStateReorderStatement({ ids: wanted })))[0].moved) === 0);

    // --------------------------------------------------- the store is the guard (truth 10) ---
    const dupAdd = await throws(enquiryStateAddStatement({ id: TMP, label: "Cleared enquiries", colour: "#3a7bd5" }));
    ok("a name another state carries is refused", dupAdd?.code === "23505", `${dupAdd?.code} ${dupAdd?.constraint}`);
    const dupRename = await throws(enquiryStateRenameStatement({ id: B, label: "Cleared enquiries" }));
    ok("a rename onto a name another state carries is refused", dupRename?.code === "23505", `${dupRename?.code} ${dupRename?.constraint}`);

    // ------------------------------------------------------ an enquiry's state (13, 14) ---
    const ends = (
      await client.query<{ id: string; label: string }>("SELECT id, label FROM enquiry_state WHERE id <> $1 AND id <> $2 ORDER BY sort, label", [A, B])
    ).rows;
    const first = ends[0];
    const last = ends[ends.length - 1];

    const seedHash = enquiryChangeCheck({ name: "Check Enquiry", number: "0800 000 0000", asked_for: "A green saloon", note: "internal", enquiry_state_id: first.id });
    await client.query(
      `INSERT INTO enquiry (id, name, number, asked_for, note, enquiry_state_id, content_hash, hash_version)
       VALUES ($1::uuid, 'Check Enquiry', '0800 000 0000', 'A green saloon', 'internal', $2::uuid, $3, $4)`,
      [ENQ, first.id, seedHash, CHANGE_CHECK_VERSION],
    );
    const enquiryRow = async () =>
      (
        await client.query<{
          name: string; number: string; asked_for: string; note: string | null; enquiry_state_id: string | null;
          content_hash: string; hash_version: number;
        }>("SELECT name, number, asked_for, note, enquiry_state_id, content_hash, hash_version FROM enquiry WHERE id=$1", [ENQ])
      ).rows[0];

    const before = await enquiryRow();
    const editable = (await run(enquiryEditableStatement({ id: ENQ })))[0] as {
      name: string; number: string; asked_for: string; note: string | null; enquiry_state_id: string | null;
    };
    ok(
      "the row's editable values are what the change-check recipe names",
      editable.name === before.name && editable.number === before.number && editable.asked_for === before.asked_for && editable.note === before.note,
    );

    const hash = enquiryChangeCheck({ ...editable, enquiry_state_id: last.id });
    const set = await run(enquirySetStateStatement({ id: ENQ, stateId: last.id, contentHash: hash, hashVersion: CHANGE_CHECK_VERSION }));
    ok("giving an enquiry any state at any time is accepted", set.length === 1, `${first.label} → ${last.label}`);
    const after = await enquiryRow();
    ok("the enquiry is now in that state", after.enquiry_state_id === last.id, last.label);
    ok(
      "the stored hash is the server's own recomputation from the stored values",
      after.content_hash === enquiryChangeCheck({ ...editable, enquiry_state_id: last.id }) && after.hash_version === CHANGE_CHECK_VERSION,
      `v${after.hash_version}`,
    );
    ok(
      "the enquiry's details are untouched by setting a state",
      after.name === before.name && after.number === before.number && after.asked_for === before.asked_for && after.note === before.note,
    );

    // The guard, proved rather than assumed: `now()` is the transaction's clock, so a write is shown
    // by leaving a sentinel in the hash. Ask again with the state unchanged — a write takes the
    // sentinel, and a true no-op leaves it.
    await client.query("UPDATE enquiry SET content_hash='SENTINEL' WHERE id=$1::uuid", [ENQ]);
    const repeat = await run(enquirySetStateStatement({ id: ENQ, stateId: last.id, contentHash: hash, hashVersion: CHANGE_CHECK_VERSION }));
    ok("a repeat still reports the row it found", repeat.length === 1);
    ok("a repeat of the same state is a true no-op", (await enquiryRow()).content_hash === "SENTINEL");

    // Back the other way, so the move is not one-directional.
    const back = { ...editable, enquiry_state_id: first.id };
    await run(enquirySetStateStatement({ id: ENQ, stateId: first.id, contentHash: enquiryChangeCheck(back), hashVersion: CHANGE_CHECK_VERSION }));
    ok("and back again, which is also accepted", (await enquiryRow()).enquiry_state_id === first.id, `${last.label} → ${first.label}`);

    // --------------------------------- an occupied state cannot be deleted (truth 10) ---
    const occupied = await throws(enquiryStateRemoveStatement({ id: first.id }));
    ok("a state an enquiry sits in cannot be deleted", occupied?.code === "23001" || occupied?.code === "23503", `${occupied?.code} ${occupied?.constraint}`);
    const held = await run(enquiryStateHoldersStatement({ id: first.id }));
    ok("the reason carries the store's own count", Number(held[0].holders) >= 1, `${held[0].holders} in ${first.label}`);
    ok("the refusal moved no enquiry out of the state", (await enquiryRow()).enquiry_state_id === first.id);

    // ------------------------------------ a state nothing sits in goes cleanly (truth 10) ---
    const gone = await run(enquiryStateRemoveStatement({ id: B }));
    ok("a state nothing sits in is removed cleanly", gone.length === 1 && gone[0].label === "Check B", gone[0]?.label ?? "no row");
    ok("the row is gone from the store", (await state(B)) === undefined);
    ok("a repeat of the removal finds nothing", (await run(enquiryStateRemoveStatement({ id: B }))).length === 0);

    // ------------------------------------------------ the identity is final (D12 / 0018) ---
    const renamedId = await throws({ text: "UPDATE enquiry SET id = $2::uuid WHERE id = $1::uuid", params: [ENQ, "16161616-1616-4616-8616-1616161616fe"] });
    ok("an enquiry's id cannot be changed", renamedId?.code === "23514", `${renamedId?.code} ${renamedId?.constraint}`);

    await client.query("ROLLBACK");
    console.log("  (rolled back — the store is unchanged)");
    ok("the store holds no trace after rollback", (await state(A)) === undefined && (await state(B)) === undefined);
    ok(
      "the store is the size it was",
      Number((await client.query("SELECT count(*) AS n FROM enquiry_state")).rows[0].n) === storeStateCount &&
        Number((await client.query("SELECT count(*) AS n FROM enquiry")).rows[0].n) === storeEnquiryCount,
    );
    const auditRegistry = await getEnquiryStateRegistry();
    ok("and the reads say the same thing", JSON.stringify(auditRegistry.map((s) => s.id)) === JSON.stringify(readRegistry.map((s) => s.id)));
  } finally {
    await client.end();
  }
  console.log(failures === 0 ? "ENQUIRY-REGISTRY CHECK PASSED" : `ENQUIRY-REGISTRY CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
