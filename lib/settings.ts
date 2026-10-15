import "server-only";

import { storeQuery } from "./store-guard";
import { normaliseNigerianMobile } from "./phone";
import { parseCostAmount } from "./money";
import type { NoticeInput } from "./notices";

/**
 * The settings that exist, and the only door to the `setting` table (truth 12; `specs/office-settings`).
 *
 * Three values and one row each — the WhatsApp number, the tagline, and the full-tank default — keyed
 * exactly as migration `0005` wrote them. "There are exactly these, and no exchange-rate setting: no
 * rate exists anywhere in the system."
 *
 * **The screen field and the stored key are mapped in one place** (`KEY_FOR_FIELD`), so the screen can
 * speak in the names it shows and the store keeps the keys it was seeded with, and the two can never
 * drift apart in a second module.
 *
 * **A save is refused before it can write, never after.** A wrong WhatsApp number does not fail
 * loudly on this screen — it silently makes every chat button on the showroom dead — so the number is
 * normalised (`lib/phone.ts`) and refused here if it is not a Nigerian mobile; the tagline is held to
 * the length its own field declares; the full-tank default is read by the same money rule the car
 * form reads an amount with, so the prefill can never be something the form would then reject. A
 * refusal returns the reason and writes nothing, which is what leaves the previous value active.
 *
 * A write is an **upsert**, so a key whose row is somehow absent is written rather than silently
 * missed, and `updated_at` moves with it — the audit line on the screen says what the store says.
 */

/** The three keys the store holds — the only keys this module will ever write. */
export const SETTING_KEYS = ["whatsapp_number", "tagline", "full_tank_default"] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

/**
 * The keys the **daily job** writes (D8/D19) and this module only ever **reads**. They are not
 * settings the owner edits — the settings screen holds exactly the three above — they are the two
 * operational notices the office displays rather than mails.
 *
 * This is the contract with TASK-006, and it is written down here because this is the reading end:
 *   - `last_backup_at`       — an ISO 8601 instant, the job's heartbeat after a backup.
 *   - `storage_used_bytes`   — whole bytes the image store holds, as the job measured it.
 *   - `storage_warning_bytes` — whole bytes; the figure `storage_used_bytes` is measured against.
 *                                Absent, `lib/notices.ts` falls back to the spec's 4 GB.
 * Nothing here is ever computed live from the image store, and no row is invented: a key with no row
 * reads as `null`, which the notices say out loud rather than papering over.
 */
export const NOTICE_KEYS = ["last_backup_at", "storage_used_bytes", "storage_warning_bytes"] as const;

/** The screen's name for a setting, and the key it is stored under. */
const KEY_FOR_FIELD = {
  whatsapp: "whatsapp_number",
  tagline: "tagline",
  tank: "full_tank_default",
} as const;
export type SettingField = keyof typeof KEY_FOR_FIELD;

/** The tagline's own cap — the number its field already carries (`maxLength`). */
const TAGLINE_MAX = 80;

/** One setting as the screen needs it: what the store holds, and when it last changed. */
export type SettingValue = { value: string; updatedAt: string | null };

/** The three, keyed the way the screen names them. */
export type OfficeSettings = Record<SettingField, SettingValue>;

/** Read the three settings. A key with no row reads as empty and unknown, never as an invented value. */
export async function readSettings(): Promise<OfficeSettings> {
  const rows = await storeQuery<{ key: string; value: string; updated_at: Date | string }[]>(
    `SELECT key, value, updated_at FROM setting WHERE key = ANY($1::text[])`,
    [SETTING_KEYS],
  );
  const byKey = new Map(rows.map((row) => [row.key, row]));

  const read = (key: SettingKey): SettingValue => {
    const row = byKey.get(key);
    return {
      value: row?.value ?? "",
      updatedAt: row ? new Date(row.updated_at).toISOString() : null,
    };
  };

  return { whatsapp: read("whatsapp_number"), tagline: read("tagline"), tank: read("full_tank_default") };
}

/**
 * Read the notice rows the daily job writes (D19). Read-only: this module never writes these, and a
 * key with no row reads as `null` — which `lib/notices.ts` says out loud, rather than turning into a
 * zero or a guess. A value that is present but not a number (or not a date) is also `null`: the office
 * refuses to invent one either way.
 */
export async function readNotices(): Promise<NoticeInput> {
  const rows = await storeQuery<{ key: string; value: string }[]>(
    `SELECT key, value FROM setting WHERE key = ANY($1::text[])`,
    [NOTICE_KEYS],
  );
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  const number = (key: (typeof NOTICE_KEYS)[number]): number | null => {
    const raw = byKey.get(key);
    if (raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const rawBackup = byKey.get("last_backup_at");
  // A row that is present but unreadable is passed through as written, so `lib/notices.ts` can say
  // "could not be read" rather than "no backup recorded yet" — the two are different facts.
  const lastBackupAt = rawBackup === undefined ? null : rawBackup;

  return {
    lastBackupAt,
    storageUsedBytes: number("storage_used_bytes"),
    storageWarningBytes: number("storage_warning_bytes"),
  };
}

export type SaveSettingResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * The rule for one setting: what may be stored, and what the field says when it may not. Pure — it
 * reads nothing — so the reason a save was refused is decided before any connection is opened.
 */
function readSettingValue(key: SettingKey, raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const input = typeof raw === "string" ? raw : "";

  switch (key) {
    case "whatsapp_number": {
      const number = normaliseNigerianMobile(input);
      return number.ok ? { ok: true, value: number.value } : { ok: false, error: number.reason };
    }
    case "tagline": {
      const tagline = input.trim();
      if (tagline.length > TAGLINE_MAX) {
        return { ok: false, error: `A tagline is at most ${TAGLINE_MAX} characters.` };
      }
      return { ok: true, value: tagline };
    }
    case "full_tank_default": {
      const amount = parseCostAmount(input);
      return amount.ok ? { ok: true, value: input.trim() } : { ok: false, error: amount.error };
    }
  }
}

/**
 * Save one setting. The value is judged first and written only if it passes, so a malformed save
 * leaves the previous value exactly where it was. Returns the value as it was stored — for the
 * WhatsApp number that is the normalised `+234…`, which is what the screen should then show.
 */
export async function saveSetting(field: SettingField, raw: string): Promise<SaveSettingResult> {
  const key = KEY_FOR_FIELD[field];
  if (!key) return { ok: false, error: "That setting is not one of the three." };

  const read = readSettingValue(key, raw);
  if (!read.ok) return read;

  await storeQuery(
    `INSERT INTO setting (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, read.value],
  );

  return { ok: true, value: read.value };
}
