/**
 * The snapshot's claims, executable without a store or a network.
 *
 * The orchestration is the subject: main-only reads, the seed label, exactly one seed asset, a demo
 * upload with the same filename left alone, and no row/key/connection string in the summary.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { BACKUP_TABLES } from "./backup-tables";
import { decryptBackup } from "./backup-crypto";
import { parseBackupArchive } from "./backup-restore";
import {
  DEMO_SEED_FILENAME,
  DEMO_SEED_LABEL,
  runDemoSnapshot,
  type SnapshotAsset,
  type SnapshotDeps,
} from "./demo-snapshot";
import type { BackupArchive } from "./backup-archive";

const key = randomBytes(32).toString("base64");
const now = new Date("2026-10-26T03:00:00.000Z");
const MAIN = "postgresql://user:pass@main.example.invalid/db";
const DEMO = "postgresql://user:pass@demo.example.invalid/db";

function archive(at: Date): BackupArchive {
  const tables = Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, [] as unknown[]]),
  ) as unknown as BackupArchive["tables"];
  tables.car = [{ id: "car-1", note: "ROW-SENTINEL", owner: "person@example.invalid" }];
  return {
    format: "truespec-backup",
    version: 1,
    generated_at: at.toISOString(),
    tables,
    sequences: {
      ts_ref_seq: { last_value: 1068, is_called: true },
      enquiry_ref_seq: { last_value: 32, is_called: true },
    },
  };
}

function asset(assetId: string, filename: string | null, label: string | null): SnapshotAsset {
  return {
    assetId,
    filename,
    label,
    createdAt: "2026-10-01T00:00:00.000Z",
    size: 100,
  };
}

function baseDeps(overrides: Partial<SnapshotDeps> = {}): SnapshotDeps {
  return {
    now,
    key,
    mainUrl: MAIN,
    demoUrl: DEMO,
    query: async () => ({ rows: [] }),
    buildArchive: async () => archive(now),
    uploadFile: async (_bytes, options) => ({ assetId: "asset-new", label: options.label }),
    listFileAssets: async () => [],
    deleteAsset: async () => ({ deleted: true }),
    ...overrides,
  };
}

test("the snapshot uploads one labelled encrypted seed and removes older seed assets", async () => {
  const store: SnapshotAsset[] = [
    asset("asset-old-1", DEMO_SEED_FILENAME, DEMO_SEED_LABEL),
    asset("asset-old-2", "older.json.gz.enc", DEMO_SEED_LABEL),
    asset("asset-demo", DEMO_SEED_FILENAME, "truespec-demo"),
  ];
  const deleted: string[] = [];
  const uploads: { bytes: Buffer; options: { filename: string; contentType: string; label: string } }[] =
    [];

  const summary = await runDemoSnapshot(
    baseDeps({
      listFileAssets: async () => [...store],
      uploadFile: async (bytes, options) => {
        uploads.push({ bytes, options });
        const next = asset("asset-new", options.filename, options.label);
        store.push(next);
        return { assetId: next.assetId, label: next.label };
      },
      deleteAsset: async (assetId) => {
        const index = store.findIndex((item) => item.assetId === assetId);
        if (index < 0) return { deleted: false, reason: "not found" };
        store.splice(index, 1);
        deleted.push(assetId);
        return { deleted: true };
      },
    }),
  );

  assert.equal(summary.ok, true);
  assert.equal(summary.filename, DEMO_SEED_FILENAME);
  assert.equal(summary.assetId, "asset-new");
  const uploaded = uploads[0];
  if (!uploaded) assert.fail("the snapshot did not upload");
  assert.equal(summary.bytes, uploaded.bytes.length);
  assert.equal(summary.rows, 1);
  assert.equal(summary.tables, BACKUP_TABLES.length);
  assert.equal(summary.generatedAt, now.toISOString());
  assert.equal(summary.seedAssetsBefore, 2);
  assert.equal(summary.seedAssetsAfter, 1);
  assert.deepEqual(summary.deleted.sort(), ["asset-old-1", "asset-old-2"]);
  assert.deepEqual(summary.failed, []);

  assert.equal(uploaded.options.filename, DEMO_SEED_FILENAME);
  assert.equal(uploaded.options.contentType, "application/octet-stream");
  assert.equal(uploaded.options.label, DEMO_SEED_LABEL);

  // The bytes on the store are the encrypted fixed archive, not plaintext JSON.
  const parsed = parseBackupArchive(decryptBackup(uploaded.bytes, key));
  assert.equal(parsed.generated_at, now.toISOString());
  assert.equal(parsed.tables.car.length, 1);

  // The demo upload with the same filename is not the seed and was not deleted.
  assert.ok(store.some((item) => item.assetId === "asset-demo"));
  assert.ok(store.some((item) => item.assetId === "asset-new"));
  assert.equal(store.filter((item) => item.label === DEMO_SEED_LABEL).length, 1);

  // The summary carries counts, time and asset ids — no row, key or connection string.
  const printed = JSON.stringify(summary);
  assert.doesNotMatch(printed, /ROW-SENTINEL|person@example\.invalid/);
  assert.doesNotMatch(printed, /main\.example\.invalid|demo\.example\.invalid/);
  assert.equal(printed.includes(key), false);
});

test("a missing key refuses before the store or the archive is touched", async () => {
  let lists = 0;
  let archives = 0;
  let uploads = 0;
  const summary = await runDemoSnapshot(
    baseDeps({
      key: undefined,
      listFileAssets: async () => {
        lists += 1;
        return [];
      },
      buildArchive: async () => {
        archives += 1;
        return archive(now);
      },
      uploadFile: async () => {
        uploads += 1;
        return { assetId: "asset-new", label: DEMO_SEED_LABEL };
      },
    }),
  );

  assert.equal(summary.ok, false);
  assert.equal(summary.failedStep, "configuration");
  assert.match(summary.error ?? "", /BACKUP_ENCRYPTION_KEY/);
  assert.deepEqual({ lists, archives, uploads }, { lists: 0, archives: 0, uploads: 0 });
});

test("a missing main URL refuses", async () => {
  const summary = await runDemoSnapshot(baseDeps({ mainUrl: undefined }));
  assert.equal(summary.ok, false);
  assert.equal(summary.failedStep, "configuration");
  assert.match(summary.error ?? "", /DATABASE_URL/);
});

test("a demo URL that names main refuses, pooled and direct hosts included", async () => {
  let lists = 0;
  const summary = await runDemoSnapshot(
    baseDeps({
      mainUrl:
        "postgresql://user:pass@ep-foo-pooler.c-6.eu-central-1.aws.neon.tech/neondb",
      demoUrl: "postgresql://user:pass@ep-foo.c-6.eu-central-1.aws.neon.tech/neondb",
      listFileAssets: async () => {
        lists += 1;
        return [];
      },
    }),
  );

  assert.equal(summary.ok, false);
  assert.equal(summary.failedStep, "target");
  assert.match(summary.error ?? "", /names the main database/);
  assert.equal(lists, 0);
});

test("an upload without the seed label is removed and the old seed is left alone", async () => {
  const store: SnapshotAsset[] = [asset("asset-old", DEMO_SEED_FILENAME, DEMO_SEED_LABEL)];
  const deleted: string[] = [];

  const summary = await runDemoSnapshot(
    baseDeps({
      listFileAssets: async () => [...store],
      uploadFile: async (_bytes, options) => {
        store.push(asset("asset-new", options.filename, null));
        return { assetId: "asset-new", label: null };
      },
      deleteAsset: async (assetId) => {
        const index = store.findIndex((item) => item.assetId === assetId);
        if (index < 0) return { deleted: false, reason: "not found" };
        store.splice(index, 1);
        deleted.push(assetId);
        return { deleted: true };
      },
    }),
  );

  assert.equal(summary.ok, false);
  assert.equal(summary.failedStep, "verify-upload");
  assert.match(summary.error ?? "", /did not carry the seed label/);
  assert.deepEqual(deleted, ["asset-new"]);
  assert.ok(store.some((item) => item.assetId === "asset-old"));
  assert.equal(store.some((item) => item.assetId === "asset-new"), false);
});

test("a cleanup refusal is reported and more than one seed is never claimed as success", async () => {
  const store: SnapshotAsset[] = [
    asset("asset-old-1", DEMO_SEED_FILENAME, DEMO_SEED_LABEL),
    asset("asset-old-2", "older.json.gz.enc", DEMO_SEED_LABEL),
  ];

  const summary = await runDemoSnapshot(
    baseDeps({
      listFileAssets: async () => [...store],
      uploadFile: async (_bytes, options) => {
        const next = asset("asset-new", options.filename, options.label);
        store.push(next);
        return { assetId: next.assetId, label: next.label };
      },
      deleteAsset: async (assetId) => {
        if (assetId === "asset-old-1") {
          const index = store.findIndex((item) => item.assetId === assetId);
          if (index >= 0) store.splice(index, 1);
          return { deleted: true };
        }
        return { deleted: false, reason: "HTTP 409: still referenced" };
      },
    }),
  );

  assert.equal(summary.ok, false);
  assert.equal(summary.failedStep, "verify");
  assert.equal(summary.seedAssetsAfter, 2);
  assert.equal(summary.failed.length, 1);
  assert.equal(summary.failed[0]?.assetId, "asset-old-2");
  assert.match(summary.error ?? "", /2 seed asset/);
});

test("the snapshot's real archive path only reads; it creates no schema or table", async () => {
  const queries: string[] = [];
  const store: SnapshotAsset[] = [];

  const summary = await runDemoSnapshot(
    baseDeps({
      buildArchive: undefined,
      query: async (text) => {
        queries.push(text);
        if (text.includes("information_schema.tables")) {
          return { rows: BACKUP_TABLES.map((table_name) => ({ table_name })) };
        }
        if (text.startsWith("SELECT *")) return { rows: [] };
        if (text.includes("SELECT last_value")) {
          return { rows: [{ last_value: 7, is_called: true }] };
        }
        return { rows: [] };
      },
      listFileAssets: async () => [...store],
      uploadFile: async (_bytes, options) => {
        const next = asset("asset-new", options.filename, options.label);
        store.push(next);
        return { assetId: next.assetId, label: next.label };
      },
    }),
  );

  assert.equal(summary.ok, true);
  assert.ok(queries.length >= BACKUP_TABLES.length + 2);
  for (const text of queries) {
    assert.match(text, /^\s*SELECT\b/i);
    assert.doesNotMatch(
      text,
      /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE)\b/i,
    );
  }
});
