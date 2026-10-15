/**
 * The operational notices, decided in one pure place.
 *
 * `specs/office-settings` (D19): storage-past-threshold and backup status are **read from `setting`
 * rows and only displayed** — the office never computes storage from the image store, and there is no
 * mail channel, so the office is where the owner is told. The rows are written elsewhere (the daily
 * job, TASK-006): `last_backup_at`, `storage_used_bytes`, and `storage_warning_bytes` (default 4 GB).
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

/** The default storage-warning figure (the spec's "4 GB"). Binary, as storage is counted. */
export const DEFAULT_STORAGE_WARNING_BYTES = 4 * 1024 ** 3;

/** How long a backup heartbeat may go quiet before the office says so. */
export const BACKUP_STALE_HOURS = 48;

export type NoticeLevel = "warn" | "info";
export type NoticeKind = "storage" | "backup";
export type Notice = { kind: NoticeKind; level: NoticeLevel; title: string; body: string };

/** What the store holds for the notices. `null` means the row is absent — never zero, never a guess. */
export type NoticeInput = {
  lastBackupAt: string | null;
  storageUsedBytes: number | null;
  storageWarningBytes: number | null;
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

/** The storage notice: past the warning figure, under it, or honestly unreported. */
function storageNotice(input: NoticeInput): Notice {
  const warning = input.storageWarningBytes ?? DEFAULT_STORAGE_WARNING_BYTES;
  const used = input.storageUsedBytes;

  if (used === null) {
    return {
      kind: "storage",
      level: "info",
      title: "Storage",
      body: "Image storage usage has not been reported yet. The daily job writes the figure; until it does, the office has nothing to show.",
    };
  }

  if (used >= warning) {
    return {
      kind: "storage",
      level: "warn",
      title: "Storage is past its warning figure",
      body: `Image storage is at ${formatBytes(used)} of ${formatBytes(warning)}. Upgrade, or trim photos.`,
    };
  }

  return {
    kind: "storage",
    level: "info",
    title: "Storage",
    body: `Image storage is at ${formatBytes(used)} of ${formatBytes(warning)}.`,
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

/** The notices, in the order the screen shows them: storage, then backup. */
export function buildNotices(input: NoticeInput, now: Date): Notice[] {
  return [storageNotice(input), backupNotice(input, now)];
}
