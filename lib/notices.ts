/**
 * The operational notices, decided in one pure place.
 *
 * `specs/office-settings` (D19): the database and asset-store figures and the backup status are **read
 * from `setting` rows and only displayed** — the office never computes storage from either store, and
 * there is no mail channel, so the office is where the owner is told. The rows are written elsewhere
 * (the daily job, TASK-006): `last_backup_at`, `storage_used_bytes`, `storage_warning_bytes`
 * (default 4 GiB), `database_used_bytes`, and `database_warning_bytes` (default 800 MiB).
 *
 * The rule lives here rather than in the reading module (`lib/settings.ts`, `server-only`) for the
 * same reason `lib/phone.ts` does: a `server-only` module cannot be unit-tested, and this is the part
 * that must be right — what the owner is told when a row is absent, and what they are told when it is
 * present. It reads nothing and touches no store: given the three values and a clock, it returns the
 * notices, so "says so honestly" is a test rather than a hope.
 *
 * **Honest by construction.** A missing row is never turned into a number. An absent backup is said
 * to be absent, an unreported storage figure is said to be unreported, and a figure the store does
 * not carry is never invented — the whole point of reading a row instead of computing.
 */

import { clock, longDay } from "./office-time";

/** The default asset-warning figure (the spec's "4 GB"). Binary, as storage is counted. */
export const DEFAULT_STORAGE_WARNING_BYTES = 4 * 1024 ** 3;

/** The default database-warning figure (the spec's "800 MB"). Neon Free's project limit is 1 GB. */
export const DEFAULT_DATABASE_WARNING_BYTES = 800 * 1024 ** 2;

/** How long a backup heartbeat may go quiet before the office says so. */
export const BACKUP_STALE_HOURS = 48;

export type NoticeLevel = "warn" | "info";
export type NoticeKind = "database" | "storage" | "backup";
export type Notice = { kind: NoticeKind; level: NoticeLevel; title: string; body: string };

/**
 * A row's number, or the fact that there is no row, or the fact that the row cannot be read. Those
 * are three different facts; collapsing the third into the first would tell the owner "not reported
 * yet" about a figure that is present and broken.
 */
export type StoredNumber = number | null | "unreadable";

/** What the store holds for the notices. `null` means the row is absent — never zero, never a guess. */
export type NoticeInput = {
  lastBackupAt: string | null;
  storageUsedBytes: StoredNumber;
  storageWarningBytes: StoredNumber;
  databaseUsedBytes: StoredNumber;
  databaseWarningBytes: StoredNumber;
};

const HOUR_MS = 3_600_000;

/** Whole bytes as a person reads them: `4 GB`, `4.2 GB`, `512 MB`, `900 B`. */
export function formatBytes(bytes: number): string {
  const one = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
  if (bytes >= 1024 ** 3) return `${one(bytes / 1024 ** 3)} GB`;
  if (bytes >= 1024 ** 2) return `${one(bytes / 1024 ** 2)} MB`;
  if (bytes >= 1024) return `${one(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function warningFigure(
  value: StoredNumber,
  fallback: number,
): { bytes: number; note: string } {
  if (value === "unreadable") {
    return {
      bytes: fallback,
      note: ` The stored warning figure could not be read, so the default of ${formatBytes(fallback)} is used.`,
    };
  }
  return { bytes: value ?? fallback, note: "" };
}

/** The photos-and-files notice: past the warning figure, under it, or honestly unreported. */
function storageNotice(input: NoticeInput): Notice {
  const { bytes: warning, note } = warningFigure(
    input.storageWarningBytes,
    DEFAULT_STORAGE_WARNING_BYTES,
  );
  const used = input.storageUsedBytes;

  if (used === "unreadable") {
    return {
      kind: "storage",
      level: "warn",
      title: "Photos and files: usage could not be read",
      body: "The stored asset-size figure is not a number the office can read. Nothing is invented here — fix the row and the notice will read it.",
    };
  }

  if (used === null) {
    return {
      kind: "storage",
      level: "info",
      title: "Photos and files",
      body: "Photo and file storage usage has not been reported yet. The daily job writes the figure; until it does, the office has nothing to show.",
    };
  }

  if (used >= warning) {
    return {
      kind: "storage",
      level: "warn",
      title: "Photos and files are past their warning figure",
      body: `Photo and file storage is at ${formatBytes(used)} of ${formatBytes(warning)}. Upgrade, or trim photos.${note}`,
    };
  }

  return {
    kind: "storage",
    level: "info",
    title: "Photos and files",
    body: `Photo and file storage is at ${formatBytes(used)} of ${formatBytes(warning)}.${note}`,
  };
}

/** The database notice: its own figure, because Neon Free stops writes at 1 GB. */
function databaseNotice(input: NoticeInput): Notice {
  const { bytes: warning, note } = warningFigure(
    input.databaseWarningBytes,
    DEFAULT_DATABASE_WARNING_BYTES,
  );
  const used = input.databaseUsedBytes;

  if (used === "unreadable") {
    return {
      kind: "database",
      level: "warn",
      title: "Database: usage could not be read",
      body: "The stored database-size figure is not a number the office can read. Nothing is invented here — fix the row and the notice will read it.",
    };
  }

  if (used === null) {
    return {
      kind: "database",
      level: "info",
      title: "Database",
      body: "Database size has not been reported yet. The daily job writes the figure; until it does, the office has nothing to show.",
    };
  }

  if (used >= warning) {
    return {
      kind: "database",
      level: "warn",
      title: "Database is past its warning figure",
      body: `The database is at ${formatBytes(used)} of ${formatBytes(warning)}. Neon Free stops accepting writes at 1 GB; trim or upgrade.${note}`,
    };
  }

  return {
    kind: "database",
    level: "info",
    title: "Database",
    body: `The database is at ${formatBytes(used)} of ${formatBytes(warning)}.${note}`,
  };
}

/** The backup notice: absent, gone quiet, or current — and it says which. */
function backupNotice(input: NoticeInput, now: Date): Notice {
  const at = input.lastBackupAt;

  if (at === null) {
    return {
      kind: "backup",
      level: "warn",
      title: "No backup recorded yet",
      body: "The daily backup job has not written a heartbeat. Nothing has been backed up yet — your export is your own copy until it does.",
    };
  }

  const ts = Date.parse(at);
  if (!Number.isFinite(ts)) {
    return {
      kind: "backup",
      level: "warn",
      title: "Backup status could not be read",
      body: "The stored backup time is not a date the office can read. Nothing is invented here — fix the row and the notice will read it.",
    };
  }

  const when = `${longDay(at)}, ${clock(at)}`;
  const ageHours = (now.getTime() - ts) / HOUR_MS;

  if (ageHours >= BACKUP_STALE_HOURS) {
    const days = Math.floor(ageHours / 24);
    const howLong = days >= 2 ? `${days} days` : `${Math.floor(ageHours)} hours`;
    return {
      kind: "backup",
      level: "warn",
      title: `Last backup was ${when}`,
      body: `That is ${howLong} ago. The daily job reports a heartbeat — check that it is still running.`,
    };
  }

  return {
    kind: "backup",
    level: "info",
    title: "Backup is current",
    body: `Last backup ${when}.`,
  };
}

/** The notices, in the order the screen shows them: database, photos/files, then backup. */
export function buildNotices(input: NoticeInput, now: Date): Notice[] {
  return [databaseNotice(input), storageNotice(input), backupNotice(input, now)];
}
