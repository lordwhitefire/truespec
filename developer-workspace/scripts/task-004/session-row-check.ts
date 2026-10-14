/**
 * Task 4 witness — the session row's SQL runs against the real store.
 *
 * The rules are unit-tested in `lib/session.test.ts`. This proves the *other* half:
 * that the exact statements `lib/session.ts` issues are accepted by the store built
 * from migrations 0001 + 0010 — the lazy upsert keyed by `clerk_session_id`, the
 * one-owner-row upsert by email, the 7-day expiry, and the 5-minute-cooldown write.
 *
 * It writes one throwaway owner + session under a random marker, checks the shape,
 * then removes both — nothing of the owner's is touched.
 *
 * Run:
 *   node --env-file=.env.local --conditions=react-server --import tsx \
 *     developer-workspace/scripts/task-004/session-row-check.ts
 */
import { randomUUID } from "node:crypto";
import { db } from "../../../lib/db";

const results: { name: string; ok: boolean; detail: string }[] = [];
function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const SESSION_TOTAL_MS = 7 * 24 * 60 * 60 * 1000;

async function main() {
  const sql = db();
  const marker = randomUUID();
  const email = `session-check-${marker}@example.com`;
  const clerkSessionId = `sess_check_${marker}`;
  const now = new Date();

  // Warm the pool first: concurrent cold Neon connections drop (learned TASK-003).
  await sql.query(`SELECT 1`);

  try {
    // --- the one-owner-row upsert, matched by email --------------------------
    const owners = (await sql.query(
      `INSERT INTO office_user (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET updated_at = $2
       RETURNING id`,
      [email, now.toISOString()],
    )) as { id: string }[];
    check("office_user upsert returns one id", owners.length === 1 && !!owners[0]?.id);

    const again = (await sql.query(
      `INSERT INTO office_user (email)
       VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET updated_at = $2
       RETURNING id`,
      [email, now.toISOString()],
    )) as { id: string }[];
    check(
      "office_user upsert is idempotent by email",
      again.length === 1 && again[0]?.id === owners[0]?.id,
    );

    const officeUserId = owners[0].id;

    // --- the session insert, keyed by clerk_session_id -----------------------
    const expiresAt = new Date(now.getTime() + SESSION_TOTAL_MS).toISOString();
    const insertSession = `INSERT INTO session (user_id, clerk_session_id, created_at, last_seen_at, expires_at)
       VALUES ($1, $2, $3, $3, $4)
       ON CONFLICT (clerk_session_id) DO UPDATE SET last_seen_at = $3
       RETURNING id AS session_row_id, created_at, last_seen_at, expires_at`;
    const created = (await sql.query(insertSession, [
      officeUserId,
      clerkSessionId,
      now.toISOString(),
      expiresAt,
    ])) as {
      session_row_id: string;
      created_at: string;
      last_seen_at: string;
      expires_at: string;
    }[];
    check("session insert returns one row", created.length === 1 && !!created[0]?.session_row_id);
    check(
      "expires_at is exactly created_at + 7 days",
      new Date(created[0].expires_at).getTime() - new Date(created[0].created_at).getTime() ===
        SESSION_TOTAL_MS,
    );

    // --- a reload must not add a second row (specs/office-access scenario) ----
    const reload = (await sql.query(insertSession, [
      officeUserId,
      clerkSessionId,
      now.toISOString(),
      expiresAt,
    ])) as { session_row_id: string }[];
    check("reload reuses the same row", reload[0]?.session_row_id === created[0].session_row_id);

    const countRows = (await sql.query(`SELECT id FROM session WHERE clerk_session_id = $1`, [
      clerkSessionId,
    ])) as { id: string }[];
    check("exactly one session row for the provider session", countRows.length === 1);

    // --- the joined read `getOfficeSession` performs -------------------------
    const joined = (await sql.query(
      `SELECT s.id AS session_row_id, s.user_id AS office_user_id, u.email,
              s.clerk_session_id, s.created_at, s.last_seen_at, s.expires_at
         FROM session s
         JOIN office_user u ON u.id = s.user_id
        WHERE s.clerk_session_id = $1`,
      [clerkSessionId],
    )) as { email: string }[];
    check("joined read resolves the owner's email", joined[0]?.email === email);

    // --- the cooldown write ---------------------------------------------------
    const before = created[0].last_seen_at;
    const later = new Date(now.getTime() + 6 * 60 * 1000).toISOString();
    await sql.query(`UPDATE session SET last_seen_at = $2 WHERE id = $1`, [
      created[0].session_row_id,
      later,
    ]);
    const after = (await sql.query(`SELECT last_seen_at FROM session WHERE id = $1`, [
      created[0].session_row_id,
    ])) as { last_seen_at: string }[];
    check(
      "last_seen_at advances on the cooldown write",
      new Date(after[0].last_seen_at).getTime() > new Date(before).getTime(),
    );

    // --- the constraints the design leans on ---------------------------------
    let uniqueRefused = false;
    try {
      await sql.query(
        `INSERT INTO session (user_id, clerk_session_id, created_at, last_seen_at, expires_at)
         VALUES ($1, $2, $3, $3, $4)`,
        [officeUserId, clerkSessionId + "_other", now.toISOString(), expiresAt],
      );
      // second distinct session for the same user is allowed; make the clerk id clash:
      await sql.query(
        `INSERT INTO session (user_id, clerk_session_id, created_at, last_seen_at, expires_at)
         VALUES ($1, $2, $3, $3, $4)`,
        [officeUserId, clerkSessionId, now.toISOString(), expiresAt],
      );
    } catch {
      uniqueRefused = true;
    }
    check("a duplicate clerk_session_id is refused by the store", uniqueRefused);
  } finally {
    // --- remove every throwaway row ------------------------------------------
    await sql.query(`DELETE FROM session WHERE clerk_session_id LIKE $1`, [`sess_check_${marker}%`]);
    await sql.query(`DELETE FROM office_user WHERE email = $1`, [email]);
    const leftovers = (await sql.query(`SELECT id FROM office_user WHERE email = $1`, [
      email,
    ])) as { id: string }[];
    check("throwaway rows removed", leftovers.length === 0);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
