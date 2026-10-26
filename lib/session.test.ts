/**
 * The office session's limits and its space-bound store half, executable.
 *
 * These pin design D4 / D17 and `specs/office-access`:
 *   - valid iff `now < expires_at` (7 days total),
 *   - and idle no more than 12 hours,
 *   - with `last_seen_at` refreshed on a 5-minute cooldown,
 *   - the row is read and created in the resolved space, never the other one.
 *
 * The store-bound half is exercised through injected Clerk and store doors, so a main row and a
 * demo row can be checked without a database.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  LAST_SEEN_REFRESH_MS,
  SESSION_IDLE_MS,
  SESSION_TOTAL_MS,
  expiryFrom,
  isSessionValid,
  shouldRefreshLastSeen,
  type SessionWindow,
} from "./session-rules";
import {
  checkOfficeSessionWith,
  endSessionWith,
  type SessionDeps,
  type SessionQuery,
  type SessionRow,
} from "./session-space";
import type { Space } from "./space-rule";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A window created `at`, whose idle clock starts then, with the 7-day expiry. */
function windowCreatedAt(at: Date): SessionWindow {
  return { lastSeenAt: at, expiresAt: expiryFrom(at) };
}

test("the stated numbers are the ruled ones", () => {
  assert.equal(SESSION_TOTAL_MS, 7 * DAY);
  assert.equal(SESSION_IDLE_MS, 12 * HOUR);
  assert.equal(LAST_SEEN_REFRESH_MS, 5 * MINUTE);
});

test("expiryFrom stamps exactly created_at + 7 days", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  assert.equal(expiryFrom(created).toISOString(), "2026-10-21T09:00:00.000Z");
});

test("a fresh session is valid", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  const now = new Date(created.getTime() + MINUTE);
  assert.equal(isSessionValid(windowCreatedAt(created), now), true);
});

test("the idle window is inclusive at exactly 12 hours", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  const atLimit = new Date(created.getTime() + 12 * HOUR);
  assert.equal(isSessionValid(windowCreatedAt(created), atLimit), true);

  const justOver = new Date(atLimit.getTime() + 1);
  assert.equal(isSessionValid(windowCreatedAt(created), justOver), false);
});

test("the 7-day cap is strict — expired the instant it is reached", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  const expiry = expiryFrom(created);
  const justBefore = new Date(expiry.getTime() - 1);
  // seen a minute ago, so the total cap is what is being measured, not the idle one
  const window: SessionWindow = {
    expiresAt: expiry,
    lastSeenAt: new Date(justBefore.getTime() - MINUTE),
  };
  assert.equal(isSessionValid(window, justBefore), true);
  assert.equal(isSessionValid(window, expiry), false);
});

test("a refreshed session outlives its original creation, up to the 7-day cap", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  const window = windowCreatedAt(created);
  // activity every 6 hours: idle never exceeds 12h, so it stays valid until 7 days
  window.lastSeenAt = new Date(created.getTime() + 6 * DAY);
  assert.equal(isSessionValid(window, new Date(created.getTime() + 6 * DAY + HOUR)), true);
  // but not past the total cap, however recently it was seen
  assert.equal(isSessionValid(window, new Date(created.getTime() + 7 * DAY)), false);
});

test("last_seen_at is refreshed on the 5-minute cooldown, and not before", () => {
  const seen = new Date("2026-10-14T09:00:00.000Z");
  assert.equal(shouldRefreshLastSeen(seen, new Date(seen.getTime() + 4 * MINUTE + 59_999)), false);
  assert.equal(shouldRefreshLastSeen(seen, new Date(seen.getTime() + 5 * MINUTE)), true);
  assert.equal(shouldRefreshLastSeen(seen, new Date(seen.getTime() + HOUR)), true);
});

const NOW = new Date("2026-10-26T09:00:00.000Z");

function sessionRow(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    session_row_id: "session-row-1",
    office_user_id: "office-user-1",
    email: "person@example.invalid",
    clerk_session_id: "clerk-session-1",
    created_at: "2026-10-26T08:00:00.000Z",
    last_seen_at: "2026-10-26T08:56:00.000Z",
    expires_at: "2026-11-02T08:00:00.000Z",
    ...overrides,
  };
}

/** A fake two-branch store: each query must name its space, and each branch holds its own rows. */
function sessionStore(initial: Partial<Record<Space, SessionRow[]>> = {}) {
  const rows: Record<Space, SessionRow[]> = {
    main: [...(initial.main ?? [])],
    demo: [...(initial.demo ?? [])],
  };
  const calls: { text: string; params: unknown[]; space: Space }[] = [];
  const nextUserId = "office-user-new";
  const nextSessionRowId = "session-row-new";

  const query: SessionQuery = async <T>(
    text: string,
    params: unknown[] = [],
    options?: { space: Space },
  ): Promise<T> => {
    const space = options?.space;
    if (!space) throw new Error("a session query must carry its space");
    calls.push({ text, params, space });
    const sql = text.trim();

    if (sql.startsWith("SELECT s.id")) {
      return rows[space].filter(
        (row) => row.clerk_session_id === params[0],
      ) as T;
    }
    if (sql.startsWith("UPDATE session SET last_seen_at")) {
      const row = rows[space].find((item) => item.session_row_id === params[0]);
      if (row) row.last_seen_at = String(params[1]);
      return [] as T;
    }
    if (sql.startsWith("INSERT INTO office_user")) {
      return [{ id: nextUserId }] as T;
    }
    if (sql.startsWith("INSERT INTO session")) {
      const row = sessionRow({
        session_row_id: nextSessionRowId,
        office_user_id: String(params[0]),
        email: "signed-in@example.invalid",
        clerk_session_id: String(params[1]),
        created_at: String(params[2]),
        last_seen_at: String(params[2]),
        expires_at: String(params[3]),
      });
      rows[space].push(row);
      return [
        {
          session_row_id: row.session_row_id,
          office_user_id: row.office_user_id,
          clerk_session_id: row.clerk_session_id,
          created_at: row.created_at,
          last_seen_at: row.last_seen_at,
          expires_at: row.expires_at,
        },
      ] as T;
    }
    if (sql.startsWith("DELETE FROM session")) {
      const index = rows[space].findIndex(
        (row) => row.clerk_session_id === params[0],
      );
      if (index >= 0) rows[space].splice(index, 1);
      return [] as T;
    }
    throw new Error(`unexpected session SQL: ${sql}`);
  };

  return { rows, calls, query };
}

function sessionDeps(
  query: SessionQuery,
  overrides: Partial<Omit<SessionDeps, "query">> = {},
): SessionDeps {
  return {
    readAuth: async () => ({ userId: "user-1", sessionId: "clerk-session-1" }),
    resolveSpace: async () => "demo",
    readEmail: async () => "person@example.invalid",
    revokeSession: async () => {},
    now: () => NOW,
    ...overrides,
    query,
  };
}

test("a demo account's first request creates both rows in demo, after resolving the space", async () => {
  const store = sessionStore();
  const order: string[] = [];
  const state = await checkOfficeSessionWith(
    sessionDeps(
      async (text, params, options) => {
        order.push("query");
        return store.query(text, params, options);
      },
      {
        resolveSpace: async () => {
          order.push("space");
          return "demo";
        },
      },
    ),
  );

  assert.equal(state.status, "active");
  if (state.status !== "active") return;
  assert.equal(state.session.space, "demo");
  assert.equal(state.session.email, "person@example.invalid");
  assert.equal(store.rows.demo.length, 1);
  assert.equal(store.rows.main.length, 0);
  assert.equal(store.calls.every((call) => call.space === "demo"), true);
  assert.equal(order[0], "space");
});

test("a main account's first request creates both rows in main", async () => {
  const store = sessionStore();
  const state = await checkOfficeSessionWith(
    sessionDeps(store.query, { resolveSpace: async () => "main" }),
  );

  assert.equal(state.status, "active");
  if (state.status !== "active") return;
  assert.equal(state.session.space, "main");
  assert.equal(store.rows.main.length, 1);
  assert.equal(store.rows.demo.length, 0);
  assert.equal(store.calls.every((call) => call.space === "main"), true);
});

test("the lazy insert uses the 7-day expiry and one clock", async () => {
  const store = sessionStore();
  const state = await checkOfficeSessionWith(
    sessionDeps(store.query, { now: () => NOW }),
  );

  assert.equal(state.status, "active");
  assert.equal(store.rows.demo[0]?.created_at, NOW.toISOString());
  assert.equal(store.rows.demo[0]?.last_seen_at, NOW.toISOString());
  assert.equal(store.rows.demo[0]?.expires_at, expiryFrom(NOW).toISOString());
});

test("an existing demo row is read in demo and does not insert", async () => {
  const existing = sessionRow();
  const store = sessionStore({ demo: [existing] });
  const state = await checkOfficeSessionWith(sessionDeps(store.query));

  assert.equal(state.status, "active");
  if (state.status !== "active") return;
  assert.equal(state.session.sessionRowId, existing.session_row_id);
  assert.equal(state.session.space, "demo");
  assert.equal(store.rows.demo.length, 1);
  assert.equal(store.rows.main.length, 0);
  assert.equal(
    store.calls.some((call) => call.text.startsWith("INSERT")),
    false,
  );
  assert.equal(
    store.calls.some((call) => call.text.startsWith("UPDATE")),
    false,
  );
});

test("a row that exists only in the other space does not authorise; the selected space's lazy check runs", async () => {
  const mainRow = sessionRow();
  const store = sessionStore({ main: [mainRow] });
  const state = await checkOfficeSessionWith(
    sessionDeps(store.query, { resolveSpace: async () => "demo" }),
  );

  assert.equal(state.status, "active");
  if (state.status !== "active") return;
  assert.equal(state.session.space, "demo");
  assert.notEqual(state.session.sessionRowId, mainRow.session_row_id);
  assert.equal(store.rows.main.length, 1);
  assert.equal(store.rows.demo.length, 1);
  assert.equal(store.calls.every((call) => call.space === "demo"), true);
});

test("an expired row is ended in its own space and the provider session is revoked", async () => {
  for (const space of ["main", "demo"] as const) {
    const initial: Partial<Record<Space, SessionRow[]>> = {};
    initial[space] = [
      sessionRow({ last_seen_at: "2026-10-25T08:00:00.000Z" }),
    ];
    const store = sessionStore(initial);
    const revoked: string[] = [];
    const state = await checkOfficeSessionWith(
      sessionDeps(store.query, {
        resolveSpace: async () => space,
        revokeSession: async (clerkSessionId) => {
          revoked.push(clerkSessionId);
        },
      }),
    );

    assert.equal(state.status, "ended", space);
    assert.deepEqual(revoked, ["clerk-session-1"], space);
    assert.equal(store.rows[space].length, 0, space);
    assert.equal(store.rows[space === "main" ? "demo" : "main"].length, 0, space);
    const deleted = store.calls.find((call) =>
      call.text.startsWith("DELETE FROM session"),
    );
    assert.equal(deleted?.space, space, space);
  }
});

test("a valid row refreshes last_seen_at in its own space", async () => {
  const store = sessionStore({
    demo: [sessionRow({ last_seen_at: "2026-10-26T08:50:00.000Z" })],
  });
  const state = await checkOfficeSessionWith(sessionDeps(store.query));

  assert.equal(state.status, "active");
  if (state.status !== "active") return;
  assert.equal(state.session.lastSeenAt.toISOString(), NOW.toISOString());
  const update = store.calls.find((call) =>
    call.text.startsWith("UPDATE session SET last_seen_at"),
  );
  assert.equal(update?.space, "demo");
  assert.equal(store.rows.demo[0]?.last_seen_at, NOW.toISOString());
});

test("sign-out revokes first, then deletes the row in the same space", async () => {
  for (const space of ["main", "demo"] as const) {
    const initial: Partial<Record<Space, SessionRow[]>> = {};
    initial[space] = [sessionRow()];
    const store = sessionStore(initial);
    const order: string[] = [];
    const revoked: string[] = [];

    await endSessionWith("clerk-session-1", space, {
      revokeSession: async (clerkSessionId) => {
        order.push("revoke");
        revoked.push(clerkSessionId);
      },
      query: async (text, params, options) => {
        order.push("delete");
        return store.query(text, params, options);
      },
    });

    assert.deepEqual(revoked, ["clerk-session-1"], space);
    assert.deepEqual(order, ["revoke", "delete"], space);
    assert.equal(store.rows[space].length, 0, space);
    assert.equal(store.calls[0]?.space, space, space);
    assert.equal(store.calls[0]?.text.startsWith("DELETE FROM session"), true, space);
  }
});

test("an anonymous request is none before a space is resolved or a store is read", async () => {
  let resolved = 0;
  let queried = 0;
  const state = await checkOfficeSessionWith(
    sessionDeps(
      async <T>() => {
        queried += 1;
        return [] as T;
      },
      {
        readAuth: async () => ({ userId: null, sessionId: null }),
        resolveSpace: async () => {
          resolved += 1;
          return "demo";
        },
      },
    ),
  );

  assert.equal(state.status, "none");
  assert.deepEqual({ resolved, queried }, { resolved: 0, queried: 0 });
});
