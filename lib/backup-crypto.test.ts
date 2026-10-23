/**
 * The backup envelope's claims: round-trip, and every failure before a write.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  BACKUP_HEADER_BYTES,
  BACKUP_MAGIC,
  decryptBackup,
  encryptBackup,
} from "./backup-crypto";

const key = randomBytes(32).toString("base64");

test("gzip + AES-256-GCM round-trips the exact archive JSON", () => {
  const json = JSON.stringify({ format: "truespec-backup", text: "Ada — ₦12,500.50", rows: [1, 2, 3] });
  const envelope = encryptBackup(json, key);

  assert.ok(envelope.length > BACKUP_HEADER_BYTES);
  assert.ok(envelope.subarray(0, BACKUP_MAGIC.length).equals(BACKUP_MAGIC));
  assert.equal(decryptBackup(envelope, key), json);
});

test("a wrong key fails before any archive is returned", () => {
  const envelope = encryptBackup("{}", key);
  const wrong = randomBytes(32).toString("base64");
  assert.throws(() => decryptBackup(envelope, wrong), /could not be decrypted/);
});

test("a tampered byte fails the authentication tag", () => {
  const envelope = encryptBackup("{}", key);
  const tampered = Buffer.from(envelope);
  tampered[tampered.length - 1] ^= 0x01;
  assert.throws(() => decryptBackup(tampered, key), /could not be decrypted/);
});

test("a key that is not 32 bytes is refused, without the key in the message", () => {
  assert.throws(() => encryptBackup("{}", Buffer.from("short").toString("base64")), /32 bytes/);
  assert.throws(
    () => decryptBackup(encryptBackup("{}", key), Buffer.from("short").toString("base64")),
    /32 bytes/,
  );
});

test("a file that is not ours, a truncated file, or an unknown version is refused", () => {
  assert.throws(() => decryptBackup(Buffer.from("not a backup"), key), /not a TrueSpec backup/);
  assert.throws(() => decryptBackup(encryptBackup("{}", key).subarray(0, 20), key), /not a TrueSpec backup/);
  const otherVersion = Buffer.from(encryptBackup("{}", key));
  otherVersion[BACKUP_MAGIC.length] = 99;
  assert.throws(() => decryptBackup(otherVersion, key), /version/);
});

test("the envelope carries a fresh IV each time", () => {
  const a = encryptBackup("{}", key);
  const b = encryptBackup("{}", key);
  assert.notDeepEqual(a.subarray(16, 28), b.subarray(16, 28));
});
