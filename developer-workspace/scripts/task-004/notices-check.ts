/**
 * Proves Task 27: the password is the provider's and the office holds no password material, and the
 * two operational notices are **read from `setting` rows and only displayed** (truth 12; the
 * office-settings spec's "In-product operational notices"; design D19).
 *
 * Two claims, and neither is taken on trust:
 *
 *   1. **No password material exists in any application table** — asked of the live schema, not of the
 *      migrations: no column anywhere is password-shaped, `office_user` is `id, email, created_at,
 *      updated_at`, and no `setting` row mentions one. (Migration 0010 drops the only one that ever
 *      existed; this checks the database that is actually running.)
 *   2. **The notices read the rows and invent nothing** — driven through `readNotices` (the very reader
 *      the page calls) and `buildNotices` (the very rule it calls). Absent rows are said to be absent;
 *      a `last_backup_at` that is present is read; a stale heartbeat warns; storage past the figure
 *      warns; an unreadable row says so rather than becoming a date.
 *
 * The storage figure is **not computed here** and the spec forbids computing it live from the image
 * store — so the witness only ever writes the numbers a job would write and reads them back.
 *
 * **The notice rows are a contract with TASK-006 (the daily job).** Writing one here is writing the
 * row that job will write; the witness removes them again in a `finally` so the office is left with no
 * heartbeat it did not have, and re-reads to prove it.
 *
 *     node --conditions=react-server --dns-result-order=ipv4first --import tsx \
 *       developer-workspace/scripts/task-004/notices-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { readNotices } from "../../../lib/settings";
import { buildNotices } from "../../../lib/notices";

loadEnv({ path: ".env.local", quiet: true });

const NOTICE_KEYS = ["last_backup_at", "storage_used_bytes", "storage_warning_bytes"] as const;
const HOUR_MS = 3_600_000;
const GB = 1024 ** 3;

let failures = 0;
function ok(label: string, pass: boolean, detail = "") {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  const q = (text: string, params?: unknown[]) => client.query(text, params);

  // ---- 1. No password material anywhere in the live schema -------------------------------------------------
  const passwordColumns = await q(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name ILIKE '%password%'`,
  );
  ok("no column in any application table is password-shaped", passwordColumns.rowCount === 0, `${passwordColumns.rowCount} column(s)`);

  const officeUser = (
    await q(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='office_user' ORDER BY ordinal_position`,
    )
  ).rows.map((r) => r.column_name as string);
  ok(
    "office_user holds no password column",
    !officeUser.some((c) => /pass/i.test(c)),
    `columns: ${officeUser.join(", ")}`,
  );

  const passwordSettings = await q(
    `SELECT key FROM setting WHERE key ILIKE '%password%' OR value ILIKE '%password%'`,
  );
  ok("no setting row mentions a password", passwordSettings.rowCount === 0, `${passwordSettings.rowCount} row(s)`);

  // ---- 2. The notices read the rows, and invent nothing ----------------------------------------------------
  const before = (await q(`SELECT key, value FROM setting WHERE key = ANY($1::text[])`, [NOTICE_KEYS])).rows as {
    key: string;
    value: string;
  }[];

  const write = (key: string, value: string) =>
    q(
      `INSERT INTO setting (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [key, value],
    );
  const clear = (keys: readonly string[]) => q(`DELETE FROM setting WHERE key = ANY($1::text[])`, [keys]);

  let caught: unknown = null;

  try {
    const now = new Date();

    // -- absent: the office says so, and invents no figure or date --
    await clear(NOTICE_KEYS);
    const absentRows = await readNotices();
    const absent = buildNotices(absentRows, now);
    const absentStorage = absent.find((n) => n.kind === "storage")!;
    const absentBackup = absent.find((n) => n.kind === "backup")!;
    ok(
      "with the rows absent, both read as absent — never as zero",
      absentRows.lastBackupAt === null && absentRows.storageUsedBytes === null && absentRows.storageWarningBytes === null,
    );
    ok("storage says the figure has not been reported", /has not been reported yet/.test(absentStorage.body));
    ok(
      "backup says so honestly, with no invented date",
      absentBackup.level === "warn" &&
        absentBackup.title === "No backup recorded yet" &&
        !/\d{4}/.test(`${absentBackup.title} ${absentBackup.body}`),
    );

    // -- present and current: the notice reads it --
    const recent = new Date(now.getTime() - 3 * HOUR_MS).toISOString();
    await write("last_backup_at", recent);
    const readBack = await readNotices();
    ok("a last_backup_at that is present is read back exactly", readBack.lastBackupAt === recent);
    const current = buildNotices(readBack, now).find((n) => n.kind === "backup")!;
    ok(
      "and the notice shows the day and the time the row carries",
      current.level === "info" &&
        current.title === "Backup is current" &&
        /\d{1,2} \w{3} \d{4}, \d{2}:\d{2}/.test(current.body),
      current.body,
    );

    // -- stale: the heartbeat has gone quiet --
    const stale = new Date(now.getTime() - 72 * HOUR_MS).toISOString();
    await write("last_backup_at", stale);
    const staleNotice = buildNotices(await readNotices(), now).find((n) => n.kind === "backup")!;
    ok(
      "a heartbeat gone quiet past its threshold warns, and says how long",
      staleNotice.level === "warn" && /^Last backup was /.test(staleNotice.title) && /3 days ago/.test(staleNotice.body),
      staleNotice.body,
    );

    // -- storage past the figure --
    await write("storage_used_bytes", String(5 * GB));
    await write("storage_warning_bytes", String(4 * GB));
    const over = buildNotices(await readNotices(), now).find((n) => n.kind === "storage")!;
    ok(
      "storage past the configured figure warns, with both numbers",
      over.level === "warn" && over.title === "Storage is past its warning figure" && /5 GB of 4 GB/.test(over.body),
      over.body,
    );

    // -- storage under the figure, with no warning row: the spec's 4 GB is the fallback --
    await write("storage_used_bytes", String(1 * GB));
    await clear(["storage_warning_bytes"]);
    const under = buildNotices(await readNotices(), now).find((n) => n.kind === "storage")!;
    ok(
      "with no warning row the figure falls back to the spec's 4 GB",
      under.level === "info" && /1 GB of 4 GB/.test(under.body),
      under.body,
    );

    // -- a row that cannot be read is said to be unreadable, not turned into a date --
    await write("last_backup_at", "not-a-date");
    const unreadable = buildNotices(await readNotices(), now).find((n) => n.kind === "backup")!;
    ok(
      "an unreadable row says so, and never becomes NaN or a fabricated date",
      unreadable.level === "warn" &&
        unreadable.title === "Backup status could not be read" &&
        !/NaN|\d{4}/.test(`${unreadable.title} ${unreadable.body}`),
    );
  } catch (err) {
    caught = err;
  }

  // Leave the office exactly as it was: the rows this witness wrote are removed, and any that were
  // already there are put back. A heartbeat left behind would be a notice the office invented.
  await clear(NOTICE_KEYS);
  for (const row of before) await write(row.key, row.value);

  const afterRows = (
    await q(`SELECT key, value FROM setting WHERE key = ANY($1::text[]) ORDER BY key`, [NOTICE_KEYS])
  ).rows as { key: string; value: string }[];
  const want = [...before].sort((a, b) => a.key.localeCompare(b.key));
  const same =
    afterRows.length === want.length &&
    afterRows.every((r, i) => r.key === want[i].key && r.value === want[i].value);
  ok("the office is left with exactly the notice rows it started with", same, `${afterRows.length} row(s)`);

  await client.end();
  if (caught) throw caught;

  console.log(`\n${failures === 0 ? "NOTICES CHECK PASSED" : `NOTICES CHECK FAILED — ${failures} failure(s)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
