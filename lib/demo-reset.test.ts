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
import { readFileSync } from "node:fs";

import {
  acquireMainResetLock,
  createResetLock,
  preflightReset,
  resetHttpStatus,
  ResetError,
  runDemoReset,
  type DemoResetClient,
  type DemoResetDeps,
  type LockClient,
  type ResetEnv,
  type ResetLock,
  type ResetPreflightDeps,
  type ResetPreflightResult,
  type ResetSummary,
} from "./demo-reset";
import { normalizeNeonHost, verifyDemoBranch, type FetchLike } from "./neon-api";
import { DEMO_SEED_FILENAME, DEMO_SEED_LABEL } from "./demo-snapshot";
import { encryptBackup } from "./backup-crypto";
import { BACKUP_SEQUENCES, BACKUP_TABLES } from "./backup-tables";
import type { BackupArchive } from "./backup-archive";
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

const SNAPSHOT_AT = "2026-10-25T02:00:00.000Z";

function emptyArchive(): BackupArchive {
  const tables = {} as BackupArchive["tables"];
  for (const table of BACKUP_TABLES) tables[table] = [];
  const sequences = {} as BackupArchive["sequences"];
  for (const name of BACKUP_SEQUENCES) {
    sequences[name] = { last_value: 1, is_called: false };
  }
  return {
    format: "truespec-backup",
    version: 1,
    generated_at: SNAPSHOT_AT,
    tables,
    sequences,
  };
}

function seedEnvelope(archive: BackupArchive = emptyArchive(), key = KEY): Buffer {
  return encryptBackup(JSON.stringify(archive), key);
}

type DemoFakeOptions = {
  beforeCounts?: Partial<Record<string, number>>;
  afterCounts?: Partial<Record<string, number>>;
  sequenceStates?: Partial<
    Record<string, { last_value: number; is_called: boolean }>
  >;
  omitColumnsFor?: string;
  failOn?: (sql: string) => Error | undefined;
};

/** A demo client that answers the restore's exact queries and records them. */
function fakeDemoClient(options: DemoFakeOptions = {}) {
  const calls: { text: string; params?: unknown[] }[] = [];
  const defaultSequences = emptyArchive().sequences;
  let truncated = false;
  let committed = false;
  let rolledBack = false;
  let ended = false;

  const client: DemoResetClient = {
    async query(text, params) {
      calls.push({ text, params });
      const injected = options.failOn?.(text);
      if (injected) throw injected;

      if (text.includes("information_schema.columns")) {
        return {
          rows: BACKUP_TABLES.filter(
            (table) => table !== options.omitColumnsFor,
          ).map((table) => ({
            table_name: table,
            column_name: "id",
            data_type: "integer",
          })),
        };
      }
      if (text === "BEGIN") return { rows: [] };
      if (text.startsWith("TRUNCATE")) {
        truncated = true;
        return { rows: [] };
      }
      if (text.startsWith("SELECT count(*)")) {
        const table = /FROM "([^"]+)"/.exec(text)?.[1] ?? "";
        const counts = truncated ? options.afterCounts : options.beforeCounts;
        return { rows: [{ n: counts?.[table] ?? (truncated ? 0 : 5) }] };
      }
      if (text.startsWith("SELECT setval")) return { rows: [] };
      if (text.startsWith("SELECT last_value")) {
        const name = /FROM "([^"]+)"/.exec(text)?.[1] ?? "";
        return {
          rows: [
            options.sequenceStates?.[name] ??
              defaultSequences[name as keyof typeof defaultSequences],
          ],
        };
      }
      if (text === "COMMIT") {
        committed = true;
        return { rows: [] };
      }
      if (text === "ROLLBACK") {
        rolledBack = true;
        return { rows: [] };
      }
      return { rows: [] };
    },
    async end() {
      ended = true;
    },
  };

  return {
    client,
    calls,
    get truncated() {
      return truncated;
    },
    get committed() {
      return committed;
    },
    get rolledBack() {
      return rolledBack;
    },
    get ended() {
      return ended;
    },
  };
}

function baseResetDeps(overrides: Partial<DemoResetDeps> = {}): DemoResetDeps {
  return {
    ...baseDeps(),
    downloadSeed: async () => seedEnvelope(),
    openDemo: async () => fakeDemoClient().client,
    listStoredAssets: async () => [seedAsset(), demoUpload()],
    deleteAsset: async (assetId) => ({ assetId, deleted: true }),
    ...overrides,
  };
}

function resetSummary(overrides: Partial<ResetSummary> = {}): ResetSummary {
  return {
    ok: false,
    step: "x",
    startedAt: NOW.toISOString(),
    snapshotAt: null,
    rowsBefore: null,
    rowsAfter: null,
    cleanup: null,
    durationMs: 0,
    seedAssetId: null,
    ...overrides,
  };
}

test("runDemoReset refuses auth and disabled before any seed or demo work", async () => {
  const cases: { authorization: string | null; enabled: string; step: string }[] = [
    { authorization: null, enabled: "1", step: "auth" },
    { authorization: "Bearer cron-secret", enabled: "0", step: "disabled" },
  ];

  for (const item of cases) {
    let downloads = 0;
    let opens = 0;
    const result = await runDemoReset({
      ...baseResetDeps({
        authorization: item.authorization,
        env: baseEnv({ demoResetEnabled: item.enabled }),
      }),
      downloadSeed: async () => {
        downloads += 1;
        return seedEnvelope();
      },
      openDemo: async () => {
        opens += 1;
        return fakeDemoClient().client;
      },
    });
    assert.equal(result.ok, false);
    assert.equal(result.step, item.step);
    assert.deepEqual({ downloads, opens }, { downloads: 0, opens: 0 });
  }
});

test("a successful reset restores the snapshot and cleans only exact pre-reset demo uploads", async () => {
  const demo = fakeDemoClient({ beforeCounts: { car: 4 } });
  const deleted: string[] = [];
  let downloaded = "";
  let opened = "";
  let releases = 0;
  const held = lock({
    release: async () => {
      releases += 1;
      return { released: true };
    },
  });

  const result = await runDemoReset({
    ...baseResetDeps({ openLock: async () => held }),
    downloadSeed: async (assetId) => {
      downloaded = assetId;
      return seedEnvelope();
    },
    openDemo: async (url) => {
      opened = url;
      return demo.client;
    },
    listStoredAssets: async () => [
      seedAsset(),
      demoUpload("old-demo"),
      { ...demoUpload("post-reset"), createdAt: "2026-10-26T03:30:00.000Z" },
      { ...demoUpload("main-label"), label: "truespec-main" },
      { ...demoUpload("unlabelled"), label: null },
      { ...demoUpload("seed-copy"), label: DEMO_SEED_LABEL },
      { ...demoUpload("no-created-at"), createdAt: null },
    ],
    deleteAsset: async (assetId) => {
      deleted.push(assetId);
      return { assetId, deleted: true };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.step, "done");
  assert.equal(result.snapshotAt, SNAPSHOT_AT);
  assert.equal(result.rowsBefore?.car, 4);
  assert.equal(result.rowsAfter?.car, 0);
  assert.equal(
    result.rowsBefore !== null && "schema_migrations" in result.rowsBefore,
    false,
  );
  assert.equal(
    result.rowsAfter !== null && "schema_migrations" in result.rowsAfter,
    false,
  );
  assert.deepEqual(result.cleanup, { candidates: 1, deleted: 1, failed: 0 });
  assert.deepEqual(deleted, ["old-demo"]);
  assert.equal(downloaded, "asset-seed");
  assert.equal(opened, DEMO_URL);
  assert.equal(result.seedAssetId, "asset-seed");
  assert.equal(releases, 1);
  assert.equal(demo.committed, true);
  assert.equal(demo.ended, true);
  assert.equal(result.durationMs >= 0, true);

  const truncate =
    demo.calls.find((call) => call.text.startsWith("TRUNCATE"))?.text ?? "";
  assert.match(truncate, /TRUNCATE TABLE/);
  assert.doesNotMatch(truncate, /schema_migrations/);
  assert.doesNotMatch(truncate, /CASCADE/);
  assert.equal(
    demo.calls.some((call) => /INSERT INTO/.test(call.text)),
    false,
  );
});

test("a corrupt or unparseable seed refuses before opening demo", async () => {
  const cases: { name: string; envelope: Buffer; step: string }[] = [
    {
      name: "wrong key",
      envelope: seedEnvelope(emptyArchive(), randomBytes(32).toString("base64")),
      step: "decrypt",
    },
    {
      name: "not JSON",
      envelope: encryptBackup("not json", KEY),
      step: "parse",
    },
  ];

  for (const item of cases) {
    let opened = false;
    let released = 0;
    const result = await runDemoReset({
      ...baseResetDeps({
        openLock: async () =>
          lock({
            release: async () => {
              released += 1;
              return { released: true };
            },
          }),
      }),
      downloadSeed: async () => item.envelope,
      openDemo: async () => {
        opened = true;
        return fakeDemoClient().client;
      },
    });
    assert.equal(result.ok, false, item.name);
    assert.equal(result.step, item.step, item.name);
    assert.equal(opened, false, item.name);
    assert.equal(released, 1, item.name);
  }
});

test("a schema mismatch leaves demo untouched", async () => {
  const demo = fakeDemoClient({ omitColumnsFor: "car" });
  const result = await runDemoReset({
    ...baseResetDeps(),
    openDemo: async () => demo.client,
  });

  assert.equal(result.ok, false);
  assert.equal(result.step, "schema");
  assert.match(result.error ?? "", /no table car/);
  assert.equal(demo.truncated, false);
  assert.equal(demo.committed, false);
  assert.equal(demo.ended, true);
});

test("a count mismatch rolls back and never claims the restore", async () => {
  const demo = fakeDemoClient({ afterCounts: { car: 1 } });
  const result = await runDemoReset({
    ...baseResetDeps(),
    openDemo: async () => demo.client,
  });

  assert.equal(result.ok, false);
  assert.equal(result.step, "verify");
  assert.match(result.error ?? "", /restored car has 1 rows/);
  assert.equal(demo.rolledBack, true);
  assert.equal(demo.committed, false);
  assert.equal(result.rowsAfter, null);
});

test("a sequence mismatch rolls back", async () => {
  const demo = fakeDemoClient({
    sequenceStates: { ts_ref_seq: { last_value: 99, is_called: true } },
  });
  const result = await runDemoReset({
    ...baseResetDeps(),
    openDemo: async () => demo.client,
  });

  assert.equal(result.ok, false);
  assert.equal(result.step, "verify");
  assert.match(result.error ?? "", /sequence ts_ref_seq/);
  assert.equal(demo.rolledBack, true);
  assert.equal(demo.committed, false);
});

test("a statement timeout is reported and never claimed as success", async () => {
  const timeout = Object.assign(
    new Error("canceling statement due to statement timeout"),
    { code: "57014" },
  );
  const demo = fakeDemoClient({
    failOn: (sql) => (sql.startsWith("TRUNCATE") ? timeout : undefined),
  });
  const result = await runDemoReset({
    ...baseResetDeps(),
    openDemo: async () => demo.client,
  });

  assert.equal(result.ok, false);
  assert.equal(result.step, "timeout");
  assert.match(result.error ?? "", /time limit/);
  assert.equal(demo.rolledBack, true);
  assert.equal(demo.committed, false);
});

test("a dropped main lock after the restore is a lock failure and cleanup does not run", async () => {
  const demo = fakeDemoClient();
  let checks = 0;
  let cleanupListed = false;
  const held = lock({
    check: async () => {
      checks += 1;
      if (checks === 2) {
        throw new ResetError("lock", "the main lock connection dropped");
      }
    },
  });

  const result = await runDemoReset({
    ...baseResetDeps({ openLock: async () => held }),
    openDemo: async () => demo.client,
    listStoredAssets: async () => {
      cleanupListed = true;
      return [];
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.step, "lock");
  assert.match(result.error ?? "", /dropped/);
  assert.equal(cleanupListed, false);
  assert.equal(result.cleanup, null);
  assert.equal(demo.committed, true);
  assert.equal(checks, 2);
});

test("a cleanup failure leaves the data reset standing and is reported", async () => {
  const demo = fakeDemoClient();
  const result = await runDemoReset({
    ...baseResetDeps(),
    openDemo: async () => demo.client,
    listStoredAssets: async () => [demoUpload("old-demo")],
    deleteAsset: async (assetId) => ({
      assetId,
      deleted: false,
      reason: "HTTP 409",
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.step, "cleanup");
  assert.deepEqual(result.cleanup, {
    candidates: 1,
    deleted: 0,
    failed: 1,
    error: "1 demo asset(s) could not be deleted",
  });
  assert.equal(result.rowsAfter?.car, 0);
  assert.equal(demo.committed, true);
});

test("a cleanup listing failure is reported, not hidden", async () => {
  const demo = fakeDemoClient();
  const result = await runDemoReset({
    ...baseResetDeps(),
    openDemo: async () => demo.client,
    listStoredAssets: async () => {
      throw new Error("sanity down");
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.step, "cleanup");
  assert.equal(result.cleanup?.error, "the asset store could not be listed");
  assert.equal(result.cleanup?.candidates, 0);
  assert.equal(demo.committed, true);
});

test("the route status maps auth, disabled, lock, success and other failures", () => {
  assert.equal(resetHttpStatus(resetSummary({ ok: true, step: "done" })), 200);
  assert.equal(resetHttpStatus(resetSummary({ step: "auth" })), 401);
  assert.equal(resetHttpStatus(resetSummary({ step: "disabled" })), 403);
  assert.equal(resetHttpStatus(resetSummary({ step: "lock" })), 409);
  assert.equal(resetHttpStatus(resetSummary({ step: "timeout" })), 500);
  assert.equal(resetHttpStatus(resetSummary({ step: "cleanup" })), 500);
});

test("the reset cron runs at 03:00 UTC and the backup stays at 02:00 UTC", () => {
  const config = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  ) as { crons: { path: string; schedule: string }[] };
  const schedules = new Map(
    config.crons.map((cron) => [cron.path, cron.schedule] as const),
  );
  assert.equal(schedules.get("/api/cron/daily"), "0 2 * * *");
  assert.equal(schedules.get("/api/demo/reset"), "0 3 * * *");
  assert.equal(config.crons.length, 2);
});
