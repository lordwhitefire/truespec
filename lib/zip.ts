/**
 * The one ZIP writer for the export (truth 13: "one download, not two: a single **ZIP** archive
 * holding `master.json` … and one CSV per subject … plus a `README.txt`", and *not* an Excel
 * workbook, which is one vendor's file and flattens the nesting).
 *
 * Written here rather than added as a dependency: **no ZIP library is installed** in this project
 * (`package.json` has none), so the archive is built from Node's own `zlib` — `deflateRawSync` for
 * the payload and `crc32` for the checksum it is built on. Nothing is imported that the lockfile
 * does not already carry.
 *
 * The format is the one the spec asks for and unzip reads it: for each entry a **local file header**
 * (0x04034b50) and its payload, then the **central directory** (0x02014b50) describing every entry,
 * then the **end-of-central-directory record** (0x06054b50) naming how many there are and where the
 * directory begins. All integers little-endian, as the format requires.
 *
 * Three things are easy to get silently wrong, so each is fixed here rather than at each call site:
 *
 * - **The CRC is taken over the *uncompressed* bytes**, whichever storage method is used for the
 *   payload. Reading the CRC from the wrong buffer produces an archive that extracts and then
 *   reports a checksum error — the most annoying possible failure.
 * - **Entry names are UTF-8** (the general-purpose bit 11 flag), so a filename survives intact.
 * - **The timestamp is one instant, in UTC, stamped on every entry** — the office's own clock
 *   (`lib/office-time.ts`), so a file written at 23:59 UTC is not labelled into the next day, and two
 *   entries of the same export never disagree with each other.
 *
 * A stored (method 0) entry is used whenever compression does not actually pay — for a very short
 * file, deflate is larger than the thing it compresses — which is what every archive tool does.
 */

import { crc32, deflateRawSync } from 'node:zlib';

export type ZipEntry = {
  /** The path inside the archive. The export's entries are flat — no directories to create. */
  name: string;
  /** The file's bytes. A string is encoded as UTF-8. */
  data: Uint8Array | string;
};

const UTF8 = new TextEncoder();

/** The three signatures an extractor looks for, little-endian as they are written. */
export const LOCAL_HEADER_SIGNATURE = 0x04034b50;
export const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
export const END_OF_CENTRAL_SIGNATURE = 0x06054b50;

const FLAG_UTF8_NAMES = 0x0800;
const VERSION_NEEDED = 20;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The DOS date/time pair the format actually stores: 16 bits for the time (hours 11, minutes 5,
 * seconds in twos) and 16 bits for the date (year from 1980, month, day). Read as UTC, and clamped
 * to the field's own ranges — a year outside 1980–2107 would write a date no reader agrees with.
 */
function dosDateTime(at: Date): { time: number; date: number } {
  const time =
    (clamp(at.getUTCHours(), 0, 23) << 11) |
    (clamp(at.getUTCMinutes(), 0, 59) << 5) |
    (clamp(Math.floor(at.getUTCSeconds()), 0, 29) >> 1);
  const date =
    ((clamp(at.getUTCFullYear(), 1980, 2107) - 1980) << 9) |
    (clamp(at.getUTCMonth() + 1, 1, 12) << 5) |
    clamp(at.getUTCDate(), 1, 31);
  return { time, date };
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.byteLength;
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.byteLength;
  }
  return out;
}

/**
 * Build the whole archive. `now` is the instant stamped on every entry — the caller passes the
 * export's own timestamp so the ZIP, `README.txt` and the response filename cannot disagree.
 */
export function buildZip(entries: readonly ZipEntry[], now: Date): Uint8Array {
  if (entries.length > 0xffff) {
    throw new Error(`A ZIP holds at most 65535 entries; this asked for ${entries.length}.`);
  }

  const { time, date } = dosDateTime(now);
  const bodies: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = UTF8.encode(entry.name);
    const raw = typeof entry.data === 'string' ? UTF8.encode(entry.data) : entry.data;

    // The CRC is over the bytes as they will be *read*, never as they are stored.
    const crc = crc32(raw) >>> 0;

    const deflated = deflateRawSync(raw);
    const useDeflate = deflated.byteLength < raw.byteLength;
    const payload = useDeflate ? new Uint8Array(deflated) : raw;
    const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, LOCAL_HEADER_SIGNATURE, true);
    lv.setUint16(4, VERSION_NEEDED, true);
    lv.setUint16(6, FLAG_UTF8_NAMES, true);
    lv.setUint16(8, method, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, payload.byteLength, true);
    lv.setUint32(22, raw.byteLength, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    local.set(nameBytes, 30);

    bodies.push(local, payload);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, CENTRAL_HEADER_SIGNATURE, true);
    cv.setUint16(4, VERSION_NEEDED, true); // version made by
    cv.setUint16(6, VERSION_NEEDED, true); // version needed
    cv.setUint16(8, FLAG_UTF8_NAMES, true);
    cv.setUint16(10, method, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, payload.byteLength, true);
    cv.setUint32(24, raw.byteLength, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk number
    cv.setUint16(36, 0, true); // internal attributes
    cv.setUint32(38, 0, true); // external attributes
    cv.setUint32(42, offset, true); // where its local header sits
    centralHeader.set(nameBytes, 46);
    central.push(centralHeader);

    offset += local.byteLength + payload.byteLength;
  }

  const centralBytes = concat(central);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, END_OF_CENTRAL_SIGNATURE, true);
  ev.setUint16(4, 0, true); // this disk
  ev.setUint16(6, 0, true); // disk with the directory
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralBytes.byteLength, true);
  ev.setUint32(16, offset, true); // where the directory begins
  ev.setUint16(20, 0, true); // no comment

  return concat([...bodies, centralBytes, end]);
}
