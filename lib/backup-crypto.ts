/**
 * The backup's envelope: gzip, then AES-256-GCM.
 *
 * The file on the asset store is not readable JSON and not readable gzip. Its layout is fixed and
 * written down here, because a restore script and a human may need to inspect it years from now:
 *
 *   offset  bytes  meaning
 *   0       15     ASCII "TRUESPEC-BACKUP"
 *   15      1      envelope version, currently 1
 *   16      12     random GCM IV
 *   28      16     GCM authentication tag
 *   44      ...    AES-256-GCM ciphertext of the gzipped JSON archive
 *
 * The key is 32 bytes, base64, in `BACKUP_ENCRYPTION_KEY`. It is never part of the file, never
 * logged, and never included in an error. GCM's tag is checked before a single byte is inflated, so
 * a wrong key or a damaged file fails as "could not be decrypted" and writes nothing.
 *
 * This module deliberately has no `server-only` import: the restore script runs outside Next. It is
 * still server-side by construction — nothing in the browser bundle imports it.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

export const BACKUP_MAGIC = Buffer.from("TRUESPEC-BACKUP", "ascii");
export const BACKUP_ENVELOPE_VERSION = 1;
export const BACKUP_IV_BYTES = 12;
export const BACKUP_TAG_BYTES = 16;
export const BACKUP_HEADER_BYTES =
  BACKUP_MAGIC.length + 1 + BACKUP_IV_BYTES + BACKUP_TAG_BYTES;

function readKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error("BACKUP_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  }
  return key;
}

/**
 * Encrypt the archive JSON. The result is the complete file: header, tag, ciphertext.
 */
export function encryptBackup(json: string, keyBase64: string): Buffer {
  const key = readKey(keyBase64);
  const iv = randomBytes(BACKUP_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const compressed = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();

  const version = Buffer.from([BACKUP_ENVELOPE_VERSION]);
  return Buffer.concat([BACKUP_MAGIC, version, iv, tag, ciphertext]);
}

/**
 * Verify the envelope and return the archive JSON. A wrong key, a tampered byte, a truncated file or
 * a version this build does not know all fail here — before the caller opens a transaction.
 */
export function decryptBackup(envelope: Buffer, keyBase64: string): string {
  if (!Buffer.isBuffer(envelope) || envelope.length < BACKUP_HEADER_BYTES) {
    throw new Error("this is not a TrueSpec backup file");
  }
  if (!envelope.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC)) {
    throw new Error("this is not a TrueSpec backup file");
  }

  const version = envelope[BACKUP_MAGIC.length];
  if (version !== BACKUP_ENVELOPE_VERSION) {
    throw new Error(`this backup was written by an envelope version this build does not know (${version})`);
  }

  const ivStart = BACKUP_MAGIC.length + 1;
  const tagStart = ivStart + BACKUP_IV_BYTES;
  const bodyStart = tagStart + BACKUP_TAG_BYTES;
  const iv = envelope.subarray(ivStart, tagStart);
  const tag = envelope.subarray(tagStart, bodyStart);
  const ciphertext = envelope.subarray(bodyStart);

  const key = readKey(keyBase64);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let compressed: Buffer;
  try {
    compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    // Never say which check failed: a wrong key and a damaged file are the same to the caller, and
    // neither message may carry the key.
    throw new Error("the backup could not be decrypted — wrong key or damaged file");
  }

  try {
    return gunzipSync(compressed).toString("utf8");
  } catch {
    throw new Error("the backup decrypted but its archive could not be read");
  }
}
