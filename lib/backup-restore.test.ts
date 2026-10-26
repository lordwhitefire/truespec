/**
 * The restore's claims, executable without a database.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInsertPlans,
  connectionIdentity,
  isSameDatabase,
  parseBackupArchive,
  RestoreError,
  restoreArchive,
  truncateStatement,
  type RestoreClient,
  type RestoreRow,
} from "./backup-restore";
import type { BackupArchive } from "./backup-archive";
import { BACKUP_TABLES, type BackupTable } from "./backup-tables";

function archive(): BackupArchive {
  const tables = Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, [] as RestoreRow[]]),
  ) as unknown as BackupArchive["tables"];
  tables.office_user = [{ id: "u1", email: "owner@example.invalid" }];
  tables.car_state = [{ id: "s1", label: "New" }];
  tables.car = [{ id: "c1", state_id: "s1", features: ["leather", "sunroof"], note: null }];
  tables.enquiry_pdf = [
    { id: "p1", sanity_asset_id: "asset-1", filename: "sheet.pdf", rows_total: 2 },
  ];
  tables.enquiry = [{ id: "e1", pdf_import_id: "p1" }];
  return {
    format: "truespec-backup",
    version: 1,
    generated_at: "2026-10-23T02:00:00.000Z",
    tables,
    sequences: {
      ts_ref_seq: { last_value: 1068, is_called: true },
      enquiry_ref_seq: { last_value: 32, is_called: true },
    },
  };
}

const columnTypes: Record<string, Record<string, string>> = {
  office_user: { id: "uuid", email: "text" },
  car_state: { id: "uuid", label: "text" },
  car: { id: "uuid", state_id: "uuid", features: "jsonb", note: "text" },
  enquiry_pdf: {
    id: "uuid",
    sanity_asset_id: "text",
    filename: "text",
    rows_total: "integer",
  },
  enquiry: { id: "uuid", pdf_import_id: "uuid" },
};

test("a valid archive parses and keeps every table and sequence", () => {
  const parsed = parseBackupArchive(JSON.stringify(archive()));
  assert.equal(parsed.format, "truespec-backup");
  assert.equal(parsed.tables.office_user.length, 1);
  assert.deepEqual(parsed.sequences.ts_ref_seq, { last_value: 1068, is_called: true });
});

test("an archive with a missing or unknown table is refused before any write", () => {
  const missing = JSON.parse(JSON.stringify(archive())) as Record<string, unknown>;
  delete (missing.tables as Record<string, unknown>).car;
  assert.throws(() => parseBackupArchive(JSON.stringify(missing)), /missing: car/);

  const extra = JSON.parse(JSON.stringify(archive())) as Record<string, unknown>;
  (extra.tables as Record<string, unknown>).future_table = [];
  assert.throws(() => parseBackupArchive(JSON.stringify(extra)), /unknown: future_table/);
});

test("an archive with a bad sequence or malformed table is refused", () => {
  const badSequence = JSON.parse(JSON.stringify(archive())) as Record<string, unknown>;
  (badSequence.sequences as Record<string, unknown>).ts_ref_seq = { last_value: "many", is_called: true };
  assert.throws(() => parseBackupArchive(JSON.stringify(badSequence)), /state is not readable/);

  const badTable = JSON.parse(JSON.stringify(archive())) as Record<string, unknown>;
  (badTable.tables as Record<string, unknown>).draft = {};
  assert.throws(() => parseBackupArchive(JSON.stringify(badTable)), /draft is not an array/);

  assert.throws(() => parseBackupArchive("not json"), /not valid JSON/);
});

test("the target identity treats pooled and direct Neon hosts as the same database", () => {
  const pooled =
    "postgresql://neondb_owner:secret@ep-foo-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  const direct =
    "postgresql://neondb_owner:other@ep-foo.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  assert.equal(isSameDatabase(pooled, direct), true);
  assert.equal(
    isSameDatabase(pooled, direct.replace("ep-foo.c-6", "ep-other.c-6")),
    false,
  );
  assert.equal(isSameDatabase(pooled, direct.replace("/neondb", "/other")), false);
  assert.deepEqual(connectionIdentity(pooled), {
    host: "ep-foo.c-6.eu-central-1.aws.neon.tech",
    port: "5432",
    database: "neondb",
    user: "neondb_owner",
  });
  assert.throws(() => connectionIdentity("not a url"), RestoreError);
});

test("the truncate names every table and restarts identities", () => {
  const text = truncateStatement();
  for (const table of BACKUP_TABLES) assert.match(text, new RegExp(`"${table}"`));
  assert.match(text, /RESTART IDENTITY CASCADE/);
});

test("the truncate skips a preserved table and does not cascade into it", () => {
  const text = truncateStatement(["schema_migrations"]);
  assert.doesNotMatch(text, /"schema_migrations"/);
  for (const table of BACKUP_TABLES) {
    if (table !== "schema_migrations") assert.match(text, new RegExp(`"${table}"`));
  }
  assert.doesNotMatch(text, /CASCADE/);
});

test("a preserved table's rows are not planned for insert or checked against the target", () => {
  const fixture = archive();
  fixture.tables.schema_migrations = [{ version: "main-1", extra: true }];
  const plans = buildInsertPlans(
    fixture,
    { ...columnTypes, schema_migrations: { version: "text" } },
    ["schema_migrations"],
  );

  assert.equal(plans.some((plan) => plan.table === "schema_migrations"), false);
  assert.equal(plans.some((plan) => plan.table === "car"), true);
});

test("a jsonb array is sent as JSON text, not as a PostgreSQL array literal", () => {
  const plans = buildInsertPlans(archive(), columnTypes);
  const car = plans.find((plan) => plan.table === "car");
  const features = car?.columns.indexOf("features") ?? -1;
  assert.ok(features >= 0);
  assert.equal(car?.values[0][features], '["leather","sunroof"]');
});

test("a schema mismatch is refused by table and column name", () => {
  assert.throws(
    () => buildInsertPlans(archive(), { ...columnTypes, office_user: { id: "uuid" } }),
    /office_user columns do not match/,
  );
});

test("restore runs one transaction, parents first, verifies counts, sets both sequences, commits", async () => {
  const fixture = archive();
  const calls: { text: string; params?: unknown[] }[] = [];
  const client: RestoreClient = {
    async query(text, params) {
      calls.push({ text, params });
      if (text.startsWith("SELECT count(*)")) {
        const table = text.match(/"([^"]+)"/)?.[1] ?? "";
        return { rows: [{ n: fixture.tables[table as keyof typeof fixture.tables].length }] };
      }
      if (text.startsWith("SELECT last_value")) {
        const name = text.match(/"([^"]+)"/)?.[1] ?? "";
        const state = fixture.sequences[name as keyof typeof fixture.sequences];
        return { rows: [{ last_value: state.last_value, is_called: state.is_called }] };
      }
      return { rows: [] };
    },
  };

  const result = await restoreArchive(client, fixture, columnTypes);

  assert.equal(calls[0]?.text, "BEGIN");
  assert.match(calls[1]?.text ?? "", /^TRUNCATE TABLE/);
  assert.match(calls[1]?.text ?? "", /"schema_migrations"/);
  assert.match(calls[1]?.text ?? "", /CASCADE/);
  assert.equal(calls.at(-1)?.text, "COMMIT");
  assert.equal(result.tables.office_user, 1);
  assert.equal(result.tables.car, 1);

  const inserts = calls.filter((call) => call.text.startsWith("INSERT INTO"));
  const officeInsert = inserts.findIndex((call) => call.text.includes('"office_user"'));
  const carInsert = inserts.findIndex((call) => call.text.includes('"car"'));
  const pdfInsert = inserts.findIndex((call) => call.text.includes('"enquiry_pdf"'));
  const enquiryInsert = inserts.findIndex((call) => call.text.includes('"enquiry"'));
  assert.ok(officeInsert >= 0 && officeInsert < carInsert);
  assert.ok(pdfInsert >= 0 && pdfInsert < enquiryInsert);

  const setvals = calls.filter((call) => call.text.includes("setval"));
  assert.equal(setvals.length, 2);
  assert.deepEqual(setvals[0]?.params, ["ts_ref_seq", 1068, true]);
  assert.deepEqual(setvals[1]?.params, ["enquiry_ref_seq", 32, true]);
});

test("a count mismatch rolls back and names the table", async () => {
  const fixture = archive();
  const calls: string[] = [];
  const client: RestoreClient = {
    async query(text) {
      calls.push(text);
      if (text.startsWith("SELECT count(*)")) return { rows: [{ n: 999 }] };
      return { rows: [] };
    },
  };
  await assert.rejects(() => restoreArchive(client, fixture, columnTypes), /restored .* has 999 rows/);
  assert.ok(calls.includes("ROLLBACK"));
  assert.equal(calls.includes("COMMIT"), false);
});

test("preserveTables keeps schema_migrations while replacing the data tables", async () => {
  const fixture = archive();
  fixture.tables.schema_migrations = [{ version: "main-1" }];
  const state: Record<string, RestoreRow[]> = {
    schema_migrations: [{ version: "demo-1", dirty: false }],
    car: [{ id: "old-car" }],
  };
  const calls: { text: string; params?: unknown[] }[] = [];

  const client: RestoreClient = {
    async query(text, params) {
      calls.push({ text, params });
      if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") return { rows: [] };
      if (text.startsWith("TRUNCATE TABLE")) {
        for (const match of text.matchAll(/"([^"]+)"/g)) {
          const table = match[1];
          if (table) state[table] = [];
        }
        return { rows: [] };
      }
      if (text.startsWith("INSERT INTO")) {
        const table = text.match(/^INSERT INTO "([^"]+)"/)?.[1] ?? "";
        state[table] ??= [];
        state[table].push({});
        return { rows: [] };
      }
      if (text.startsWith("SELECT count(*)")) {
        const table = text.match(/"([^"]+)"/)?.[1] ?? "";
        return { rows: [{ n: (state[table] ?? []).length }] };
      }
      if (text.startsWith("SELECT last_value")) {
        const name = text.match(/"([^"]+)"/)?.[1] ?? "";
        const sequence = fixture.sequences[name as keyof typeof fixture.sequences];
        return {
          rows: [{ last_value: sequence.last_value, is_called: sequence.is_called }],
        };
      }
      return { rows: [] };
    },
  };

  const result = await restoreArchive(
    client,
    fixture,
    { ...columnTypes, schema_migrations: { version: "text" } },
    { preserveTables: ["schema_migrations"] },
  );

  assert.deepEqual(state.schema_migrations, [{ version: "demo-1", dirty: false }]);
  assert.equal(state.car?.length, 1);
  assert.equal(state.car?.[0]?.id, undefined);
  assert.equal(result.tables.schema_migrations, undefined);
  assert.equal(result.tables.car, 1);

  const truncate = calls.find((call) => call.text.startsWith("TRUNCATE TABLE"))?.text ?? "";
  assert.doesNotMatch(truncate, /"schema_migrations"/);
  assert.equal(
    calls.some(
      (call) => call.text.startsWith("INSERT INTO") && call.text.includes('"schema_migrations"'),
    ),
    false,
  );
  assert.equal(
    calls.some(
      (call) =>
        call.text.startsWith("SELECT count(*)") && call.text.includes('"schema_migrations"'),
    ),
    false,
  );
});

test("a schema mismatch refuses before BEGIN and TRUNCATE", async () => {
  const calls: string[] = [];
  const client: RestoreClient = {
    async query(text) {
      calls.push(text);
      return { rows: [] };
    },
  };

  await assert.rejects(
    () =>
      restoreArchive(
        client,
        archive(),
        { ...columnTypes, car: { id: "uuid", state_id: "uuid" } },
        { preserveTables: ["schema_migrations"] },
      ),
    /car columns do not match/,
  );
  assert.deepEqual(calls, []);
});

test("an unknown preserveTables name refuses before any write", async () => {
  const calls: string[] = [];
  const client: RestoreClient = {
    async query(text) {
      calls.push(text);
      return { rows: [] };
    },
  };

  await assert.rejects(
    () =>
      restoreArchive(client, archive(), columnTypes, {
        preserveTables: ["not_a_table" as BackupTable],
      }),
    /unknown preserveTables/,
  );
  assert.deepEqual(calls, []);
});
