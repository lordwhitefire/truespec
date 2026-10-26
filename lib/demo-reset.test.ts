/**
 * The reset's pre-write claims, executable without a database, a Neon project or an asset store.
 *
 * The subject is the order: auth, switch, configuration, target identity, branch proof, one seed,
 * then the main lock. The Neon API and the lock are injected so the tests can prove refusals before
 * any demo connection and the exact advisory-lock SQL.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import {
  acquireMainResetLock,
  createResetLock,
  preflightReset,
  ResetError,
  type LockClient,
  type ResetEnv,
  type ResetLock,
  type ResetPreflightDeps,
  type ResetPreflightResult,
} from "./demo-reset";
import { normalizeNeonHost, verifyDemoBranch, type FetchLike } from "./neon-api";
import { DEMO_SEED_FILENAME, DEMO_SEED_LABEL } from "./demo-snapshot";
import type { StoredAsset } from "./sanity";

const NOW = new Date("2026-10-26T03:00:00.000Z");
const DEMO_URL = "postgresql://user:pass@demo.example.invalid/db";
const DEMO_POOLED_URL = "postgresql://user:pass@demo-pooler.example.invalid/db";
const MAIN_URL = "postgresql://user:pass@main.example.invalid/db";
const MAIN_DIRECT_URL = "postgresql://user:pass@main-direct.example.invalid/db";
const KEY = randomBytes(32).toString("base64");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function branch(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "br-demo",
    project_id: "proj",
    name: "demo",
    default: false,
    ...overrides,
  };
}

function endpoint(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "ep-demo",
    project_id: "proj",
    branch_id: "br-demo",
    type: "read_write",
    host: "demo.example.invalid",
    hosts: {
      read_write_host: "demo.example.invalid",
      read_write_pooled_host: "demo-pooler.example.invalid",
    },
    ...overrides,
  };
}

function neonFetch(
  options: {
    branches?: unknown;
    endpoints?: unknown;
    status?: number;
    body?: string;
    throwNetwork?: boolean;
    onRequest?: (url: URL, init?: RequestInit) => void;
  } = {},
): FetchLike {
  return async (input, init) => {
    const url = input instanceof URL ? input : new URL(String(input));
    options.onRequest?.(url, init);
    if (options.throwNetwork) throw new Error("network down");
    if (options.status) return new Response("error", { status: options.status });
    if (options.body !== undefined) return new Response(options.body, { status: 200 });
    if (url.pathname.endsWith("/branches")) {
      return json({ branches: options.branches ?? [branch()] });
    }
    if (url.pathname.endsWith("/endpoints")) {
      return json({ endpoints: options.endpoints ?? [endpoint()] });
    }
    return json({});
  };
}

function seedAsset(assetId = "asset-seed"): StoredAsset {
  return {
    assetId,
    kind: "file",
    filename: DEMO_SEED_FILENAME,
    size: 1234,
    label: DEMO_SEED_LABEL,
    createdAt: "2026-10-20T00:00:00.000Z",
  };
}

function demoUpload(assetId = "asset-demo-upload"): StoredAsset {
  return {
    assetId,
    kind: "file",
    filename: DEMO_SEED_FILENAME,
    size: 1234,
    label: "truespec-demo",
    createdAt: "2026-10-21T00:00:00.000Z",
  };
}

function baseEnv(overrides: Partial<ResetEnv> = {}): ResetEnv {
  return {
    cronSecret: "cron-secret",
    demoResetEnabled: "1",
    demoDatabaseUrl: DEMO_URL,
    databaseUrl: MAIN_URL,
    databaseUrlUnpooled: MAIN_DIRECT_URL,
    backupEncryptionKey: KEY,
    neonApiKey: "neon-key",
    neonProjectId: "proj",
    demoBranchId: "br-demo",
    ...overrides,
  };
}

function lock(overrides: Partial<ResetLock> = {}): ResetLock {
  return {
    acquired: true,
    check: async () => {},
    release: async () => ({ released: true }),
    ...overrides,
  };
}

function baseDeps(overrides: Partial<ResetPreflightDeps> = {}): ResetPreflightDeps {
  return {
    authorization: "Bearer cron-secret",
    env: baseEnv(),
    now: NOW,
    fetch: neonFetch(),
    listFileAssets: async () => [seedAsset()],
    openLock: async () => lock(),
    ...overrides,
  };
}

function assertFailure(result: ResetPreflightResult, step: string): void {
  if (result.ok) assert.fail("expected the reset to refuse");
  assert.equal(result.summary.ok, false);
  assert.equal(result.summary.step, step);
}

function assertSuccess(result: ResetPreflightResult): asserts result is Extract<ResetPreflightResult, { ok: true }> {
  if (!result.ok) assert.fail(`expected the reset to pass preflight: ${result.summary.step}: ${result.summary.error}`);
}

test("normalizeNeonHost strips a pooled suffix but not a read-only type", () => {
  assert.equal(
    normalizeNeonHost("EP-FOO-POOLER.c-5.us-east-2.aws.neon.tech"),
    "ep-foo.c-5.us-east-2.aws.neon.tech",
  );
  assert.equal(normalizeNeonHost("demo.example.invalid"), "demo.example.invalid");
});

test("the branch proof accepts a direct or pooled read-write endpoint of the configured branch", async () => {
  for (const demoUrl of [DEMO_URL, DEMO_POOLED_URL]) {
    const requests: { url: URL; authorization: string | null }[] = [];
    const result = await verifyDemoBranch({
      apiKey: "neon-key",
      projectId: "proj",
      branchId: "br-demo",
      demoDatabaseUrl: demoUrl,
      fetch: neonFetch({
        onRequest: (url, init) => {
          requests.push({
            url,
            authorization: new Headers(init?.headers).get("authorization"),
          });
        },
      }),
    });

    assert.equal(result.branch.id, "br-demo");
    assert.equal(result.branch.name, "demo");
    assert.equal(result.endpoint.id, "ep-demo");
    assert.equal(requests.length, 2);
    assert.equal(requests[0]?.url.pathname, "/api/v2/projects/proj/branches");
    assert.equal(requests[1]?.url.pathname, "/api/v2/projects/proj/endpoints");
    for (const request of requests) {
      assert.equal(request.authorization, "Bearer neon-key");
    }
  }
});

test("the branch proof refuses a wrong id, name, default flag, read-only endpoint or host", async () => {
  const cases: { name: string; branches: unknown; endpoints: unknown; error: RegExp }[] = [
    {
      name: "id",
      branches: [branch({ id: "br-other" })],
      endpoints: [endpoint()],
      error: /configured branch is not in the Neon project/,
    },
    {
      name: "name",
      branches: [branch({ name: "main" })],
      endpoints: [endpoint()],
      error: /not named demo/,
    },
    {
      name: "default",
      branches: [branch({ default: true })],
      endpoints: [endpoint()],
      error: /default branch/,
    },
    {
      name: "read-only",
      branches: [branch()],
      endpoints: [
        endpoint({
          type: "read_only",
          hosts: {
            read_only_host: "demo.example.invalid",
            read_only_pooled_host: "demo-pooler.example.invalid",
          },
        }),
      ],
      error: /not a read-write endpoint/,
    },
    {
      name: "other branch",
      branches: [branch()],
      endpoints: [endpoint({ branch_id: "br-other" })],
      error: /no compute endpoint/,
    },
    {
      name: "other project",
      branches: [branch()],
      endpoints: [endpoint({ project_id: "other" })],
      error: /no compute endpoint/,
    },
    {
      name: "other host",
      branches: [branch()],
      endpoints: [
        endpoint({
          host: "other.example.invalid",
          hosts: { read_write_host: "other.example.invalid" },
        }),
      ],
      error: /not a read-write endpoint/,
    },
  ];

  for (const item of cases) {
    await assert.rejects(
      () =>
        verifyDemoBranch({
          apiKey: "neon-key",
          projectId: "proj",
          branchId: "br-demo",
          demoDatabaseUrl: DEMO_URL,
          fetch: neonFetch({ branches: item.branches, endpoints: item.endpoints }),
        }),
      item.error,
      item.name,
    );
  }
});

test("the branch proof refuses an unreachable, non-2xx or unreadable Neon API", async () => {
  const base = {
    apiKey: "neon-key",
    projectId: "proj",
    branchId: "br-demo",
    demoDatabaseUrl: DEMO_URL,
  };

  await assert.rejects(
    () => verifyDemoBranch({ ...base, fetch: neonFetch({ throwNetwork: true }) }),
    /could not be reached/,
  );
  await assert.rejects(
    () => verifyDemoBranch({ ...base, fetch: neonFetch({ status: 503 }) }),
    /HTTP 503/,
  );
  await assert.rejects(
    () => verifyDemoBranch({ ...base, fetch: neonFetch({ body: "not json" }) }),
    /unreadable response/,
  );
  await assert.rejects(
    () => verifyDemoBranch({ ...base, fetch: neonFetch({ branches: {} }) }),
    /unreadable branches list/,
  );
});

test("the reset refuses a missing or wrong bearer before any other check", async () => {
  for (const authorization of [null, "Bearer wrong", "cron-secret"]) {
    let fetches = 0;
    let lists = 0;
    let locks = 0;
    const result = await preflightReset(
      baseDeps({
        authorization,
        fetch: neonFetch({ onRequest: () => { fetches += 1; } }),
        listFileAssets: async () => {
          lists += 1;
          return [seedAsset()];
        },
        openLock: async () => {
          locks += 1;
          return lock();
        },
      }),
    );
    assertFailure(result, "auth");
    assert.deepEqual({ fetches, lists, locks }, { fetches: 0, lists: 0, locks: 0 });
  }

  const noSecret = await preflightReset(baseDeps({ env: baseEnv({ cronSecret: undefined }) }));
  assertFailure(noSecret, "auth");
});

test("only the exact string 1 turns the reset on", async () => {
  for (const value of ["true", "0", "yes", "", undefined]) {
    let fetches = 0;
    let lists = 0;
    let locks = 0;
    const result = await preflightReset(
      baseDeps({
        env: baseEnv({ demoResetEnabled: value }),
        fetch: neonFetch({ onRequest: () => { fetches += 1; } }),
        listFileAssets: async () => {
          lists += 1;
          return [seedAsset()];
        },
        openLock: async () => {
          locks += 1;
          return lock();
        },
      }),
    );
    assertFailure(result, "disabled");
    assert.deepEqual({ fetches, lists, locks }, { fetches: 0, lists: 0, locks: 0 });
  }
});

test("required configuration refuses before the Neon API, the seed list or the lock", async () => {
  const names: [keyof ResetEnv, string][] = [
    ["demoDatabaseUrl", "DEMO_DATABASE_URL"],
    ["databaseUrl", "DATABASE_URL"],
    ["databaseUrlUnpooled", "DATABASE_URL_UNPOOLED"],
    ["backupEncryptionKey", "BACKUP_ENCRYPTION_KEY"],
    ["neonApiKey", "NEON_API_KEY"],
    ["neonProjectId", "NEON_PROJECT_ID"],
    ["demoBranchId", "DEMO_BRANCH_ID"],
  ];

  for (const [key, name] of names) {
    let fetches = 0;
    let lists = 0;
    let locks = 0;
    const result = await preflightReset(
      baseDeps({
        env: baseEnv({ [key]: undefined }),
        fetch: neonFetch({ onRequest: () => { fetches += 1; } }),
        listFileAssets: async () => {
          lists += 1;
          return [seedAsset()];
        },
        openLock: async () => {
          locks += 1;
          return lock();
        },
      }),
    );
    assertFailure(result, "configuration");
    assert.match(result.ok ? "" : (result.summary.error ?? ""), new RegExp(name));
    assert.deepEqual({ fetches, lists, locks }, { fetches: 0, lists: 0, locks: 0 });
  }
});

test("a pooled DATABASE_URL_UNPOOLED refuses before any Neon or demo work", async () => {
  let fetches = 0;
  let lists = 0;
  let locks = 0;
  const result = await preflightReset(
    baseDeps({
      env: baseEnv({
        databaseUrlUnpooled:
          "postgresql://user:pass@main-pooler.example.invalid/db",
      }),
      fetch: neonFetch({ onRequest: () => { fetches += 1; } }),
      listFileAssets: async () => {
        lists += 1;
        return [seedAsset()];
      },
      openLock: async () => {
        locks += 1;
        return lock();
      },
    }),
  );

  assertFailure(result, "configuration");
  assert.match(result.ok ? "" : (result.summary.error ?? ""), /pooled host/);
  assert.deepEqual({ fetches, lists, locks }, { fetches: 0, lists: 0, locks: 0 });
});

test("a demo URL that names main refuses before the Neon API or the lock", async () => {
  let fetches = 0;
  let lists = 0;
  let locks = 0;
  const result = await preflightReset(
    baseDeps({
      env: baseEnv({ demoDatabaseUrl: MAIN_URL, databaseUrl: MAIN_URL }),
      fetch: neonFetch({ onRequest: () => { fetches += 1; } }),
      listFileAssets: async () => {
        lists += 1;
        return [seedAsset()];
      },
      openLock: async () => {
        locks += 1;
        return lock();
      },
    }),
  );

  assertFailure(result, "target");
  assert.match(result.ok ? "" : (result.summary.error ?? ""), /names the main database/);
  assert.deepEqual({ fetches, lists, locks }, { fetches: 0, lists: 0, locks: 0 });
});

test("a failed branch proof refuses before the seed or the lock", async () => {
  let lists = 0;
  let locks = 0;
  const result = await preflightReset(
    baseDeps({
      fetch: neonFetch({ branches: [branch({ name: "main" })] }),
      listFileAssets: async () => {
        lists += 1;
        return [seedAsset()];
      },
      openLock: async () => {
        locks += 1;
        return lock();
      },
    }),
  );

  assertFailure(result, "target");
  assert.match(result.ok ? "" : (result.summary.error ?? ""), /not named demo/);
  assert.deepEqual({ lists, locks }, { lists: 0, locks: 0 });
});

test("zero or more than one seed refuses; a demo upload with the same filename does not count", async () => {
  const zero = await preflightReset(
    baseDeps({ listFileAssets: async () => [demoUpload()] }),
  );
  assertFailure(zero, "seed");
  assert.match(zero.ok ? "" : (zero.summary.error ?? ""), /found 0/);

  const two = await preflightReset(
    baseDeps({ listFileAssets: async () => [seedAsset("a"), seedAsset("b")] }),
  );
  assertFailure(two, "seed");
  assert.match(two.ok ? "" : (two.summary.error ?? ""), /found 2/);

  let locked = false;
  const one = await preflightReset(
    baseDeps({
      listFileAssets: async () => [demoUpload(), seedAsset()],
      openLock: async () => {
        locked = true;
        return lock();
      },
    }),
  );
  assertSuccess(one);
  assert.equal(locked, true);
  assert.equal(one.context.seed.assetId, "asset-seed");
});

test("the lock is acquired last, on DATABASE_URL_UNPOOLED, and the preflight returns it held", async () => {
  let lockUrl = "";
  const held = lock();
  const result = await preflightReset(
    baseDeps({
      openLock: async (url) => {
        lockUrl = url;
        return held;
      },
    }),
  );

  assertSuccess(result);
  assert.equal(lockUrl, MAIN_DIRECT_URL);
  assert.equal(result.context.lock, held);
  assert.equal(result.context.demoUrl, DEMO_URL);
  assert.equal(result.context.mainUnpooledUrl, MAIN_DIRECT_URL);
  assert.equal(result.context.summary.ok, false);
  assert.equal(result.context.summary.step, "locked");
  assert.equal(result.context.summary.seedAssetId, "asset-seed");
  assert.equal(result.context.summary.startedAt, NOW.toISOString());
});

test("a held lock refuses the second reset and a lock error keeps its step", async () => {
  const second = await preflightReset(
    baseDeps({ openLock: async () => lock({ acquired: false }) }),
  );
  assertFailure(second, "lock");
  assert.match(second.ok ? "" : (second.summary.error ?? ""), /another reset is running/);

  const failed = await preflightReset(
    baseDeps({
      openLock: async () => {
        throw new ResetError("lock", "the main lock database could not be reached");
      },
    }),
  );
  assertFailure(failed, "lock");
  assert.match(failed.ok ? "" : (failed.summary.error ?? ""), /could not be reached/);
});

test("the lock uses the exact advisory lock, checks the connection and only reads", async () => {
  const calls: string[] = [];
  const client: LockClient = {
    async query(text) {
      calls.push(text);
      if (text.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      return { rows: [] };
    },
    async end() {
      calls.push("end");
    },
  };

  const held = await createResetLock(client);
  assert.equal(held.acquired, true);
  assert.equal(
    calls[0],
    "SELECT pg_try_advisory_lock(hashtext('truespec-demo-reset')) AS locked",
  );

  await held.check();
  assert.equal(calls.at(-1), "SELECT 1");

  const released = await held.release();
  assert.deepEqual(released, { released: true });
  assert.equal(
    calls.at(-2),
    "SELECT pg_advisory_unlock(hashtext('truespec-demo-reset'))",
  );
  assert.equal(calls.at(-1), "end");

  for (const sql of calls) {
    if (sql === "end") continue;
    assert.match(sql, /^SELECT\b/);
    assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE)\b/i);
  }
});

test("a second lock attempt refuses and ends its connection", async () => {
  const calls: string[] = [];
  const client: LockClient = {
    async query(text) {
      calls.push(text);
      return { rows: [{ locked: false }] };
    },
    async end() {
      calls.push("end");
    },
  };

  const held = await createResetLock(client);
  assert.equal(held.acquired, false);
  assert.equal(calls[0], "SELECT pg_try_advisory_lock(hashtext('truespec-demo-reset')) AS locked");
  assert.equal(calls[1], "end");
  await assert.rejects(() => held.check(), /not held/);
  assert.deepEqual(await held.release(), { released: true });
});

test("a dropped lock connection fails the check", async () => {
  let fail = false;
  const client: LockClient = {
    async query(text) {
      if (text.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      if (fail) throw new Error("connection closed");
      return { rows: [] };
    },
    async end() {},
  };

  const held = await createResetLock(client);
  fail = true;
  await assert.rejects(() => held.check(), /dropped/);
});

test("the lock's error event also marks the connection dropped", async () => {
  let onError: ((error: Error) => void) | undefined;
  const client: LockClient = {
    async query(text) {
      if (text.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      return { rows: [] };
    },
    async end() {},
    on(_event, listener) {
      onError = listener;
    },
  };

  const held = await createResetLock(client);
  onError?.(new Error("connection closed"));
  await assert.rejects(() => held.check(), /dropped/);
});

test("a lock query failure refuses and closes the connection", async () => {
  let ended = false;
  const client: LockClient = {
    async query() {
      throw new Error("connection refused");
    },
    async end() {
      ended = true;
    },
  };

  await assert.rejects(() => createResetLock(client), /could not be acquired/);
  assert.equal(ended, true);
});

test("a release failure is reported, not thrown, and the connection is ended", async () => {
  let ended = false;
  const client: LockClient = {
    async query(text) {
      if (text.includes("pg_try_advisory_lock")) return { rows: [{ locked: true }] };
      if (text.includes("pg_advisory_unlock")) throw new Error("connection closed");
      return { rows: [] };
    },
    async end() {
      ended = true;
    },
  };

  const held = await createResetLock(client);
  const released = await held.release();
  assert.equal(released.released, false);
  assert.match(released.error ?? "", /could not be released/);
  assert.equal(ended, true);
});

test("the live lock refuses a pooled or invalid DATABASE_URL_UNPOOLED before connecting", async () => {
  await assert.rejects(
    () =>
      acquireMainResetLock(
        "postgresql://user:pass@ep-foo-pooler.c-5.us-east-2.aws.neon.tech/neondb",
      ),
    /pooled host/,
  );
  await assert.rejects(() => acquireMainResetLock("not a url"), /valid PostgreSQL URL/);
});
