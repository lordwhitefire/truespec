/**
 * What a backup contains — the fixed list, the sequence names, and the order a restore inserts in.
 *
 * The list is deliberately **fixed and written down**. The task's rule: a backup must not silently
 * miss a new table. `buildBackupArchive` compares this list with `information_schema.tables` and
 * fails when either side has a name the other does not — a future table cannot be forgotten, and a
 * listed table cannot quietly vanish.
 *
 * The order is the restore order, not the archive order: parents first, so a restore can insert in
 * one transaction without deferring every foreign key. (A dump can read them in any order.)
 */
export const BACKUP_TABLES = [
  "office_user",
  "car_state",
  "enquiry_state",
  "setting",
  "schema_migrations",
  "car",
  "car_secondary_state",
  "car_photo",
  "cost_line",
  "sale",
  "enquiry_pdf",
  "enquiry",
  "draft",
  "activity_event",
  "session",
  "auth_attempt",
  "tap",
  "tap_seen",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

/** The sequences whose next value must survive a restore. */
export const BACKUP_SEQUENCES = ["ts_ref_seq", "enquiry_ref_seq"] as const;
export type BackupSequence = (typeof BACKUP_SEQUENCES)[number];

/** Quote a known identifier for SQL. The list above is the only source of these names. */
export function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
