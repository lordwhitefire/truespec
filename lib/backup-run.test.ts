/**
 * The daily backup's claims, executable without a store or a network.
 *
 * The orchestration is the subject: the heartbeat waits for the asset id; a same-day rerun reuses
 * the file; retention keeps seven of its own files; retention's delete failure does not fail the
 * backup; a failed upload does not move the heartbeat.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  backupFilename,
  BACKUP_KEEP,
  pruneBackups,
  runDailyBackup,
  type BackupDeps,
  type BackupFile,
} from "./backup-run";
import type { BackupArchive } from "./backup-archive";
import { BACKUP_TABLES } from "./backup-tables";

const key = randomBytes(32).toString("base64");
const now = new Date("2026-10-23T02:00:00.000Z");

const archive = {
  format: "truespec-backup",
  version: 1,
  generated_at: now.toISOString(),
  tables: Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, []]),
  ) as unknown as BackupArchive["tables"],
  sequences: {
    ts_ref_seq: { last_value: 1068, is_called: true },
    enquiry_ref_seq: { last_value: 32, is_called: true },
  },
} as BackupArchive;

function backup(name: string, assetId = `asset-${name}`): BackupFile {
  return { assetId, filename: name, size: 100 };
}

function baseDeps(overrides: Partial<BackupDeps> = {}): BackupDeps {
  return {
    now,
    key,
    query: async () => ({ rows: [] }),
    buildArchive: async () => archive,
    listFileAssets: async () => [],
    listStoredAssets: async () => [],
    uploadFile: async () => ({ assetId: "asset-new" }),
    deleteAsset: async () => ({ deleted: true }),
    writeSetting: async () => {},
    databaseBytes: async () => 10_092_544,
    ...overrides,
  };
}

test("a first run uploads once, then writes the heartbeat, then keeps seven", async () => {
  const calls: string[] = [];
  const old = Array.from({ length: 8 }, (_, index) =>
    backup(`backup-2026-10-${String(index + 1).padStart(2, "0")}.json.gz.enc`),
  );
  let listCalls = 0;
  const summary = await runDailyBackup(
    baseDeps({
      listFileAssets: async () => {
        listCalls += 1;
        if (listCalls === 1) return [];
        return [backup("backup-2026-10-23.json.gz.enc", "asset-new"), ...old];
      },
      listStoredAssets: async () => [
        { assetId: "asset-new", size: 1234 },
        { assetId: "image-1", size: 999 },
      ],
      uploadFile: async () => {
        calls.push("upload");
        return { assetId: "asset-new" };
      },
      writeSetting: async (name, value) => {
        calls.push(`setting:${name}=${value}`);
      },
      deleteAsset: async (assetId) => {
        calls.push(`delete:${assetId}`);
        return { deleted: true };
      },
    }),
  );

  assert.equal(summary.ok, true);
  assert.equal(summary.filename, "backup-2026-10-23.json.gz.enc");
  assert.equal(summary.assetId, "asset-new");
  assert.equal(summary.reused, false);
  assert.equal(summary.rows, 0);
  assert.equal(summary.tables, BACKUP_TABLES.length);
  assert.ok(summary.bytes > 0);
  assert.ok(calls.indexOf("upload") < calls.indexOf("setting:last_backup_at=2026-10-23T02:00:00.000Z"));
  assert.equal(summary.retention?.kept, BACKUP_KEEP);
  assert.equal(summary.retention?.deleted.length, 2);
  assert.equal(summary.retention?.failed.length, 0);
  assert.deepEqual(summary.storage, { databaseBytes: 10_092_544, assetBytes: 2233 });
});

test("a second run on the same day reuses the exact file, with no dump and no upload", async () => {
  let uploads = 0;
  let dumps = 0;
  const summary = await runDailyBackup(
    baseDeps({
      listFileAssets: async () => [backup("backup-2026-10-23.json.gz.enc", "asset-existing")],
      buildArchive: async () => {
        dumps += 1;
        return archive;
      },
      uploadFile: async () => {
        uploads += 1;
        return { assetId: "asset-should-not-be-used" };
      },
    }),
  );

  assert.equal(summary.ok, true);
  assert.equal(summary.reused, true);
  assert.equal(summary.assetId, "asset-existing");
  assert.equal(summary.bytes, 100);
  assert.equal(uploads, 0);
  assert.equal(dumps, 0);
  assert.ok(summary.steps.some((step) => step.step === "reuse" && step.ok));
});

test("a failed upload leaves the heartbeat where it was and reports the failed step", async () => {
  const settings: string[] = [];
  const summary = await runDailyBackup(
    baseDeps({
      uploadFile: async () => {
        throw new Error("asset store unavailable");
      },
      writeSetting: async (name) => {
        settings.push(name);
      },
    }),
  );

  assert.equal(summary.ok, false);
  assert.equal(summary.assetId, null);
  assert.equal(summary.backupAt, null);
  assert.equal(settings.includes("last_backup_at"), false);
  assert.equal(summary.steps.find((step) => step.step === "upload")?.ok, false);
  assert.ok(summary.error);
});

test("a failed heartbeat is a failed run, even though the file landed", async () => {
  const settings: string[] = [];
  const summary = await runDailyBackup(
    baseDeps({
      writeSetting: async (name) => {
        settings.push(name);
        if (name === "last_backup_at") throw new Error("store unavailable");
      },
    }),
  );

  assert.equal(summary.ok, false);
  assert.equal(summary.assetId, "asset-new");
  assert.equal(summary.backupAt, null);
  assert.equal(settings.includes("last_backup_at"), true);
  assert.equal(summary.steps.find((step) => step.step === "heartbeat")?.ok, false);
});

test("an old backup that cannot be deleted is reported, but the new backup is still a success", async () => {
  const old = Array.from({ length: 8 }, (_, index) =>
    backup(`backup-2026-10-${String(index + 1).padStart(2, "0")}.json.gz.enc`),
  );
  let listCalls = 0;
  const summary = await runDailyBackup(
    baseDeps({
      listFileAssets: async () => {
        listCalls += 1;
        return listCalls === 1
          ? []
          : [backup("backup-2026-10-23.json.gz.enc", "asset-new"), ...old];
      },
      deleteAsset: async () => ({ deleted: false, reason: "HTTP 409: still referenced" }),
    }),
  );

  assert.equal(summary.ok, true);
  assert.equal(summary.retention?.deleted.length, 0);
  assert.equal(summary.retention?.failed.length, 2);
  assert.match(summary.retention?.failed[0]?.reason ?? "", /409/);
  assert.equal(summary.storage?.databaseBytes, 10_092_544);
  assert.equal(summary.storage?.assetBytes, summary.bytes);
});

test("a failed measurement fails the run, but the heartbeat stays true", async () => {
  const summary = await runDailyBackup(
    baseDeps({
      databaseBytes: async () => {
        throw new Error("db unavailable");
      },
    }),
  );

  assert.equal(summary.ok, false);
  assert.equal(summary.backupAt, "2026-10-23T02:00:00.000Z");
  assert.equal(summary.storage, undefined);
  assert.ok(summary.steps.some((step) => step.step === "measure-database" && !step.ok));
});

test("retention keeps exactly seven of its own files, newest first, and ignores other files", () => {
  const files: BackupFile[] = [
    ...Array.from({ length: 8 }, (_, index) =>
      backup(`backup-2026-10-${String(index + 1).padStart(2, "0")}.json.gz.enc`),
    ),
    backup("enquiry-sheet.pdf", "asset-pdf"),
    { assetId: "asset-photo", filename: "photo.jpg", size: 10 },
  ];
  const removed: string[] = [];
  return pruneBackups(files, async (assetId) => {
    removed.push(assetId);
    return { deleted: true };
  }).then((result) => {
    assert.equal(result.kept, 7);
    assert.deepEqual(removed.sort(), ["asset-backup-2026-10-01.json.gz.enc"]);
    assert.equal(result.failed.length, 0);
  });
});

test("the filename is the UTC date, always the same shape", () => {
  assert.equal(backupFilename(now), "backup-2026-10-23.json.gz.enc");
  assert.equal(backupFilename(new Date("2026-01-02T23:59:59.000Z")), "backup-2026-01-02.json.gz.enc");
});
