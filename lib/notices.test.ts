import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BACKUP_STALE_HOURS,
  DEFAULT_DATABASE_WARNING_BYTES,
  DEFAULT_STORAGE_WARNING_BYTES,
  buildNotices,
  formatBytes,
  type Notice,
  type NoticeInput,
} from "./notices";

/**
 * The notices are read from `setting` rows and only displayed (D19). The things this file proves are
 * the things the spec names:
 *
 *   - database and asset storage are two lines with two limits — 800 MB and 4 GiB;
 *   - an absent row reads as "not reported yet"; a present-but-unreadable row reads as unreadable —
 *     neither is turned into zero;
 *   - the backup notice reads, ages, and refuses to invent a date.
 */

const NOW = new Date("2026-10-15T12:00:00.000Z");

const BASE: NoticeInput = {
  lastBackupAt: null,
  storageUsedBytes: null,
  storageWarningBytes: null,
  databaseUsedBytes: null,
  databaseWarningBytes: null,
};

const input = (overrides: Partial<NoticeInput> = {}): NoticeInput => ({ ...BASE, ...overrides });

const find = (notices: Notice[], kind: Notice["kind"]) => {
  const n = notices.find((x) => x.kind === kind);
  assert.ok(n, `expected a ${kind} notice`);
  return n;
};

describe("formatBytes", () => {
  it("reads the two spec figures as a person reads them", () => {
    assert.equal(formatBytes(DEFAULT_STORAGE_WARNING_BYTES), "4 GB");
    assert.equal(formatBytes(DEFAULT_DATABASE_WARNING_BYTES), "800 MB");
  });

  it("shows a fraction when there is one, and the smaller units", () => {
    assert.equal(formatBytes(4.2 * 1024 ** 3), "4.2 GB");
    assert.equal(formatBytes(512 * 1024 ** 2), "512 MB");
    assert.equal(formatBytes(900), "900 B");
  });
});

describe("the backup notice", () => {
  it("says so honestly when last_backup_at is absent — no invented date", () => {
    const notice = find(buildNotices(input(), NOW), "backup");
    assert.equal(notice.level, "warn");
    assert.equal(notice.title, "No backup recorded yet");
    assert.match(notice.body, /has not written a heartbeat/);
    assert.doesNotMatch(`${notice.title} ${notice.body}`, /\d{4}/);
  });

  it("reads it when present — the day and the time the row carries", () => {
    const notice = find(
      buildNotices(input({ lastBackupAt: "2026-10-15T09:30:00.000Z" }), NOW),
      "backup",
    );
    assert.equal(notice.level, "info");
    assert.equal(notice.title, "Backup is current");
    assert.match(notice.body, /15 Oct 2026, 09:30/);
  });

  it("warns once the heartbeat has gone quiet past its threshold", () => {
    const at = new Date(NOW.getTime() - (BACKUP_STALE_HOURS + 24) * 3_600_000).toISOString();
    const notice = find(buildNotices(input({ lastBackupAt: at }), NOW), "backup");
    assert.equal(notice.level, "warn");
    assert.match(notice.title, /^Last backup was /);
    assert.match(notice.body, /3 days ago/);
  });

  it("refuses to invent a date the store's value cannot be read as", () => {
    const notice = find(buildNotices(input({ lastBackupAt: "not-a-date" }), NOW), "backup");
    assert.equal(notice.level, "warn");
    assert.equal(notice.title, "Backup status could not be read");
    assert.doesNotMatch(`${notice.title} ${notice.body}`, /NaN/);
  });
});

describe("the database notice", () => {
  it("says the figure has not been reported when its row is absent", () => {
    const notice = find(buildNotices(input(), NOW), "database");
    assert.equal(notice.level, "info");
    assert.equal(notice.title, "Database");
    assert.match(notice.body, /has not been reported yet/);
    assert.doesNotMatch(`${notice.title} ${notice.body}`, /\d+ MB of/);
  });

  it("uses the 800 MB default under it and warns over it", () => {
    const under = find(buildNotices(input({ databaseUsedBytes: 400 * 1024 ** 2 }), NOW), "database");
    assert.equal(under.level, "info");
    assert.match(under.body, /400 MB of 800 MB/);

    const over = find(buildNotices(input({ databaseUsedBytes: 900 * 1024 ** 2 }), NOW), "database");
    assert.equal(over.level, "warn");
    assert.equal(over.title, "Database is past its warning figure");
    assert.match(over.body, /900 MB of 800 MB/);
    assert.match(over.body, /Neon Free stops accepting writes at 1 GB/);
  });

  it("says a present-but-unreadable figure is unreadable, never zero", () => {
    const notice = find(buildNotices(input({ databaseUsedBytes: "unreadable" }), NOW), "database");
    assert.equal(notice.level, "warn");
    assert.match(notice.title, /could not be read/);
    assert.doesNotMatch(`${notice.title} ${notice.body}`, / 0 MB/);
  });

  it("uses the default warning when the warning row itself is unreadable, and says so", () => {
    const notice = find(
      buildNotices(
        input({ databaseUsedBytes: 100 * 1024 ** 2, databaseWarningBytes: "unreadable" }),
        NOW,
      ),
      "database",
    );
    assert.match(notice.body, /100 MB of 800 MB/);
    assert.match(notice.body, /warning figure could not be read/);
  });

  it("honours a stored warning figure", () => {
    const notice = find(
      buildNotices(
        input({ databaseUsedBytes: 600 * 1024 ** 2, databaseWarningBytes: 512 * 1024 ** 2 }),
        NOW,
      ),
      "database",
    );
    assert.equal(notice.level, "warn");
    assert.match(notice.body, /600 MB of 512 MB/);
  });
});

describe("the photos-and-files notice", () => {
  it("says so honestly when the usage figure has not been reported", () => {
    const notice = find(buildNotices(input(), NOW), "storage");
    assert.equal(notice.level, "info");
    assert.equal(notice.title, "Photos and files");
    assert.match(notice.body, /has not been reported yet/);
    assert.doesNotMatch(`${notice.title} ${notice.body}`, /\d+ GB of/);
  });

  it("warns when assets pass the warning figure", () => {
    const notice = find(
      buildNotices(input({ storageUsedBytes: 5 * 1024 ** 3 }), NOW),
      "storage",
    );
    assert.equal(notice.level, "warn");
    assert.equal(notice.title, "Photos and files are past their warning figure");
    assert.match(notice.body, /5 GB of 4 GB/);
  });

  it("stays quiet — but still reads the figure — when assets are under the figure", () => {
    const notice = find(
      buildNotices(input({ storageUsedBytes: 1 * 1024 ** 3 }), NOW),
      "storage",
    );
    assert.equal(notice.level, "info");
    assert.match(notice.body, /1 GB of 4 GB/);
  });

  it("uses the spec's 4 GiB only when there is no warning row", () => {
    const withRow = find(
      buildNotices(
        input({ storageUsedBytes: 2 * 1024 ** 3, storageWarningBytes: 1024 ** 3 }),
        NOW,
      ),
      "storage",
    );
    assert.match(withRow.body, /2 GB of 1 GB/);
  });

  it("says a present-but-unreadable asset figure is unreadable, never zero", () => {
    const notice = find(buildNotices(input({ storageUsedBytes: "unreadable" }), NOW), "storage");
    assert.equal(notice.level, "warn");
    assert.match(notice.title, /could not be read/);
  });
});

describe("the shape the screen renders", () => {
  it("returns database, photos/files, backup — each with a unique kind, title and body", () => {
    const notices = buildNotices(input(), NOW);
    assert.deepEqual(
      notices.map((n) => n.kind),
      ["database", "storage", "backup"],
    );
    assert.equal(new Set(notices.map((n) => n.kind)).size, notices.length);
    for (const n of notices) {
      assert.ok(n.title.length > 0);
      assert.ok(n.body.length > 0);
      assert.ok(n.level === "warn" || n.level === "info");
    }
  });
});
