import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BACKUP_STALE_HOURS,
  DEFAULT_STORAGE_WARNING_BYTES,
  buildNotices,
  formatBytes,
  type Notice,
} from "./notices";

/**
 * The notices are read from `setting` rows and only displayed (D19). The two things this file proves
 * are the two the spec names:
 *
 *   - with `last_backup_at` **absent**, the notice says so honestly — it does not invent a date and
 *     does not stay silent;
 *   - with it **present**, the notice reads it.
 *
 * And the same rule for storage: an unreported figure is said to be unreported, a figure the store
 * carries is read, and the warning figure falls back to the spec's 4 GB only when there is no row.
 */

const NOW = new Date("2026-10-15T12:00:00.000Z");

const find = (notices: Notice[], kind: Notice["kind"]) => {
  const n = notices.find((x) => x.kind === kind);
  assert.ok(n, `expected a ${kind} notice`);
  return n;
};

describe("formatBytes", () => {
  it("reads 4 GB as the spec writes it", () => {
    assert.equal(formatBytes(DEFAULT_STORAGE_WARNING_BYTES), "4 GB");
  });

  it("shows a fraction when there is one, and the smaller units", () => {
    assert.equal(formatBytes(4.2 * 1024 ** 3), "4.2 GB");
    assert.equal(formatBytes(512 * 1024 ** 2), "512 MB");
    assert.equal(formatBytes(900), "900 B");
  });
});

describe("the backup notice", () => {
  it("says so honestly when last_backup_at is absent — no invented date", () => {
    const notice = find(buildNotices({ lastBackupAt: null, storageUsedBytes: null, storageWarningBytes: null }, NOW), "backup");
    assert.equal(notice.level, "warn");
    assert.equal(notice.title, "No backup recorded yet");
    assert.match(notice.body, /has not written a heartbeat/);
    // no date of any kind leaks into it
    assert.doesNotMatch(`${notice.title} ${notice.body}`, /\d{4}/);
  });

  it("reads it when present — the day and the time the row carries", () => {
    const at = "2026-10-15T09:30:00.000Z";
    const notice = find(buildNotices({ lastBackupAt: at, storageUsedBytes: null, storageWarningBytes: null }, NOW), "backup");
    assert.equal(notice.level, "info");
    assert.equal(notice.title, "Backup is current");
    assert.match(notice.body, /15 Oct 2026, 09:30/);
  });

  it("warns once the heartbeat has gone quiet past its threshold", () => {
    const at = new Date(NOW.getTime() - (BACKUP_STALE_HOURS + 24) * 3_600_000).toISOString();
    const notice = find(buildNotices({ lastBackupAt: at, storageUsedBytes: null, storageWarningBytes: null }, NOW), "backup");
    assert.equal(notice.level, "warn");
    assert.match(notice.title, /^Last backup was /);
    assert.match(notice.body, /3 days ago/);
  });

  it("refuses to invent a date the store's value cannot be read as", () => {
    const notice = find(
      buildNotices({ lastBackupAt: "not-a-date", storageUsedBytes: null, storageWarningBytes: null }, NOW),
      "backup",
    );
    assert.equal(notice.level, "warn");
    assert.equal(notice.title, "Backup status could not be read");
    assert.doesNotMatch(`${notice.title} ${notice.body}`, /NaN/);
  });
});

describe("the storage notice", () => {
  it("says so honestly when the usage figure has not been reported", () => {
    const notice = find(
      buildNotices({ lastBackupAt: null, storageUsedBytes: null, storageWarningBytes: null }, NOW),
      "storage",
    );
    assert.equal(notice.level, "info");
    assert.match(notice.body, /has not been reported yet/);
    assert.doesNotMatch(`${notice.title} ${notice.body}`, /\d+ GB of/);
  });

  it("warns when storage passes the warning figure", () => {
    const notice = find(
      buildNotices({ lastBackupAt: null, storageUsedBytes: 5 * 1024 ** 3, storageWarningBytes: 4 * 1024 ** 3 }, NOW),
      "storage",
    );
    assert.equal(notice.level, "warn");
    assert.equal(notice.title, "Storage is past its warning figure");
    assert.match(notice.body, /5 GB of 4 GB/);
  });

  it("stays quiet — but still reads the figure — when storage is under the figure", () => {
    const notice = find(
      buildNotices({ lastBackupAt: null, storageUsedBytes: 1 * 1024 ** 3, storageWarningBytes: null }, NOW),
      "storage",
    );
    assert.equal(notice.level, "info");
    assert.match(notice.body, /1 GB of 4 GB/); // the default figure is the spec's 4 GB
  });

  it("uses the spec's 4 GB only when there is no warning row", () => {
    const withRow = find(
      buildNotices({ lastBackupAt: null, storageUsedBytes: 2 * 1024 ** 3, storageWarningBytes: 1024 ** 3 }, NOW),
      "storage",
    );
    assert.match(withRow.body, /2 GB of 1 GB/);
  });
});

describe("the shape the screen renders", () => {
  it("returns both notices, storage first, each with a title and a body", () => {
    const notices = buildNotices({ lastBackupAt: null, storageUsedBytes: null, storageWarningBytes: null }, NOW);
    assert.deepEqual(
      notices.map((n) => n.kind),
      ["storage", "backup"],
    );
    for (const n of notices) {
      assert.ok(n.title.length > 0);
      assert.ok(n.body.length > 0);
      assert.ok(n.level === "warn" || n.level === "info");
    }
  });
});
