/**
 * Proves the saved-enquiry edit's statement (owner ruling 2026-10-20, #4; P6).
 *
 * The claim: **one write moves the five editable details and the change-check; a retry that carries
 * the same details writes nothing and still reports the row; and the hash the server stores is the
 * hash of the values the row now holds.** No session is involved: this drives the same statement
 * the Server Action drives, with the same server-computed hash.
 *
 * Everything it makes, it removes in `finally`.
 *
 * Run:
 *   node --conditions=react-server --dns-result-order=ipv4first --import tsx \
 *     developer-workspace/scripts/task-004/enquiry-update-check.ts
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { CHANGE_CHECK_VERSION, enquiryChangeCheck } from "../../../lib/change-check";
import { enquiryUpdateStatement } from "../../../lib/enquiry-update";
import { readEnquirySeed } from "../../../lib/draft-save";

loadEnv({ path: ".env.local", quiet: true });

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

type Row = {
  id: string;
  name: string;
  number: string;
  asked_for: string;
  note: string | null;
  enquiry_state_id: string | null;
  content_hash: string;
  hash_version: number;
  updated_at: Date;
};

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  const q = (text: string, params?: unknown[]) => client.query(text, params);

  const id = randomUUID();
  const original = {
    name: "Witness Original",
    number: "+2348000000001",
    asked_for: "the original ask",
    note: "the original note",
  };
  let stateId: string | null = null;

  try {
    const states = (
      await q(`SELECT id, label FROM enquiry_state ORDER BY sort, label`)
    ).rows as { id: string; label: string }[];
    if (states.length > 0) stateId = states[0].id;

    const initialHash = enquiryChangeCheck({ ...original, enquiry_state_id: stateId });
    await q(
      `INSERT INTO enquiry (id, name, number, asked_for, note, enquiry_state_id, content_hash, hash_version)
       VALUES ($1, $2, $3, $4, $5, $6::uuid, $7, $8)`,
      [id, original.name, original.number, original.asked_for, original.note, stateId, initialHash, CHANGE_CHECK_VERSION],
    );

    const before = (await q(`SELECT updated_at FROM enquiry WHERE id = $1`, [id])).rows[0].updated_at as Date;

    // ---------------------------------------------------------------- the edit: all five details ---
    const edited = {
      name: "Witness Edited",
      number: "+2348000000002",
      asked_for: "a small saloon",
      note: "call after six",
    };
    const nextState = states.length > 1 ? states[1].id : stateId;
    const hash = enquiryChangeCheck({ ...edited, enquiry_state_id: nextState });
    const statement = enquiryUpdateStatement({
      id,
      seed: edited,
      stateId: nextState,
      contentHash: hash,
      hashVersion: CHANGE_CHECK_VERSION,
    });

    const first = (await q(statement.text, statement.params)).rows[0];
    ok("the edit reports that it moved the row", first?.changed === true, String(first?.changed));
    ok("...and the row it moved", first?.id === id, String(first?.id));

    const after = (
      await q(
        `SELECT id, name, number, asked_for, note, enquiry_state_id, content_hash, hash_version, updated_at
           FROM enquiry WHERE id = $1`,
        [id],
      )
    ).rows[0] as Row;

    ok(
      "all five editable details are the edited ones",
      after.name === edited.name &&
        after.number === edited.number &&
        after.asked_for === edited.asked_for &&
        after.note === edited.note &&
        after.enquiry_state_id === nextState,
      `${after.name} / ${after.number} / ${after.enquiry_state_id}`,
    );
    ok("the state moved with them", after.enquiry_state_id === nextState);
    ok(
      "the stored hash is the hash of what the row now holds",
      after.content_hash === enquiryChangeCheck({ ...edited, enquiry_state_id: after.enquiry_state_id }) &&
        after.hash_version === CHANGE_CHECK_VERSION,
    );
    ok("updated_at moved exactly once", after.updated_at.getTime() > before.getTime());

    // -------------------------------------------------------------------- a retry writes nothing ---
    const retry = (await q(statement.text, statement.params)).rows[0];
    const unchanged = (
      await q(`SELECT updated_at, content_hash FROM enquiry WHERE id = $1`, [id])
    ).rows[0] as { updated_at: Date; content_hash: string };

    ok("a retry reports the row without a change", retry?.changed === false && retry?.id === id);
    ok("...and does not move updated_at", unchanged.updated_at.getTime() === after.updated_at.getTime());
    ok("...and does not rewrite the hash", unchanged.content_hash === after.content_hash);

    // ------------------------------------------------------------------- the state may be cleared ---
    const clearedHash = enquiryChangeCheck({ ...edited, enquiry_state_id: null });
    const clear = enquiryUpdateStatement({
      id,
      seed: edited,
      stateId: null,
      contentHash: clearedHash,
      hashVersion: CHANGE_CHECK_VERSION,
    });
    const cleared = (await q(clear.text, clear.params)).rows[0];
    const noState = (await q(`SELECT enquiry_state_id, content_hash FROM enquiry WHERE id = $1`, [id])).rows[0];

    ok("clearing the state is a real change", cleared?.changed === true);
    ok("...and the row sits in none", noState.enquiry_state_id === null);
    ok(
      "...and its hash says so",
      noState.content_hash === enquiryChangeCheck({ ...edited, enquiry_state_id: null }),
    );

    // --------------------------------------------------------------------- the record's own rule ---
    const missing = readEnquirySeed({ name: " ", number: "", asked_for: "", note: "" });
    ok(
      "the save's rule asks for the three required values",
      !missing.ok && missing.errors.map((e) => e.field).sort().join(",") === "asked_for,name,number",
      missing.ok ? "it accepted blanks" : missing.errors.map((e) => e.field).join(","),
    );
  } finally {
    await q(`DELETE FROM enquiry WHERE id = $1`, [id]);
    const left = Number((await q(`SELECT count(*) AS n FROM enquiry WHERE id = $1`, [id])).rows[0].n);
    ok("the store is left as it was found", left === 0);
    await client.end();
  }

  console.log(failures === 0 ? "ENQUIRY-UPDATE CHECK PASSED" : `ENQUIRY-UPDATE CHECK FAILED (${failures})`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
