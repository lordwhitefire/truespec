/**
 * The backup archive's claims, executable without a database.
 *
 * The table list is the safety property: missing or unknown public tables fail the run. The archive
 * keeps every fixed table, every known sequence, and the sequence state a restore needs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { BACKUP_TABLES } from "./backup-tables";
import { archiveRowCount, BackupError, buildBackupArchive } from "./backup-archive";

const fixedNow = new Date("2026-10-23T02:00:00.000Z");

function fakeQuery(options: { omit?: string; extra?: string; rows?: Record<string, unknown[]> } = {}) {
  const calls: string[] = [];
  const query = async (text: string) => {
    calls.push(text);
    if (text.includes("information_schema.tables")) {
      const names = BACKUP_TABLES.filter((name) => name !== options.omit);
      if (options.extra) names.push(options.extra as (typeof BACKUP_TABLES)[number]);
      return { rows: names.map((table_name) => ({ table_name })) };
    }
    if (text.includes("last_value")) {
      return { rows: [{ last_value: text.includes("enquiry_ref_seq") ? "32" : "1068", is_called: true }] };
    }
    const table = text.match(/FROM "([^"]+)"/)?.[1] ?? "";
    return { rows: options.rows?.[table] ?? [{ id: `${table}-row` }] };
  };
  return { query, calls };
}

test("it reads every fixed table, in the restore order, and both sequences", async () => {
  const { query, calls } = fakeQuery();
  const archive = await buildBackupArchive(query, fixedNow);

  assert.equal(archive.format, "truespec-backup");
  assert.equal(archive.version, 1);
  assert.equal(archive.generated_at, "2026-10-23T02:00:00.000Z");
  assert.deepEqual(Object.keys(archive.tables), [...BACKUP_TABLES]);
  assert.equal(calls.filter((text) => text.startsWith("SELECT * FROM")).length, BACKUP_TABLES.length);
  assert.deepEqual(archive.sequences, {
    ts_ref_seq: { last_value: 1068, is_called: true },
    enquiry_ref_seq: { last_value: 32, is_called: true },
  });
  assert.equal(archiveRowCount(archive), BACKUP_TABLES.length);
});

test("a public table missing from the fixed list fails the backup by name", async () => {
  const { query } = fakeQuery({ omit: "car_photo" });
  await assert.rejects(
    () => buildBackupArchive(query, fixedNow),
    (error: unknown) =>
      error instanceof BackupError &&
      error.step === "table-list" &&
      /missing: car_photo/.test(error.message),
  );
});

test("a public table not in the fixed list fails the backup by name", async () => {
  const { query } = fakeQuery({ extra: "future_table" });
  await assert.rejects(
    () => buildBackupArchive(query, fixedNow),
    (error: unknown) =>
      error instanceof BackupError &&
      error.step === "table-list" &&
      /not in the fixed list: future_table/.test(error.message),
  );
});

test("a sequence that cannot be read fails the backup, naming the step", async () => {
  const query = async (text: string) => {
    if (text.includes("information_schema.tables")) {
      return { rows: BACKUP_TABLES.map((table_name) => ({ table_name })) };
    }
    if (text.includes("last_value")) return { rows: [] };
    return { rows: [] };
  };
  await assert.rejects(
    () => buildBackupArchive(query, fixedNow),
    (error: unknown) => error instanceof BackupError && error.step === "sequences",
  );
});

test("empty tables are still present — an empty table is a fact, not a missing table", async () => {
  const { query } = fakeQuery({ rows: { draft: [] } });
  const archive = await buildBackupArchive(query, fixedNow);
  assert.deepEqual(archive.tables.draft, []);
});
