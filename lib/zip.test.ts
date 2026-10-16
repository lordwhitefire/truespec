import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crc32, inflateRawSync } from "node:zlib";
import {
  CENTRAL_HEADER_SIGNATURE,
  END_OF_CENTRAL_SIGNATURE,
  LOCAL_HEADER_SIGNATURE,
  buildZip,
} from "./zip";

/**
 * The export must be one ZIP that can actually be opened (truth 13; task.md: "open the ZIP and show
 * every subject present"). A ZIP that *looks* right and fails on extraction is the failure this file
 * is here to prevent, so the archive written here is read back field by field — headers, offsets,
 * CRCs and payloads — with Node's own `inflateRawSync` and `crc32` as the independent reference for
 * the two values that are easy to get wrong. (A second, wholly independent reader — Python's
 * `zipfile` — opens the real export in the Task 28 witness.)
 *
 * The values under test:
 *   - the CRC is the standard CRC-32, taken over the **uncompressed** bytes;
 *   - the central directory's recorded offsets point back at the local headers that were written;
 *   - a payload survives compression as its own bytes;
 *   - the timestamp is the instant asked for, read as UTC.
 */

const NOW = new Date("2026-10-15T23:59:30.000Z");

const decoder = new TextDecoder();

type LocalHeader = {
  method: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  name: string;
  payloadStart: number;
};

/** Walk the local headers exactly as an extractor does, so a wrong offset cannot hide. */
function readLocalHeaders(zip: Uint8Array): LocalHeader[] {
  const out: LocalHeader[] = [];
  let at = 0;
  for (;;) {
    const v = new DataView(zip.buffer, zip.byteOffset + at);
    if (v.getUint32(0, true) !== LOCAL_HEADER_SIGNATURE) break;
    const method = v.getUint16(8, true);
    const crc = v.getUint32(14, true);
    const compressedSize = v.getUint32(18, true);
    const uncompressedSize = v.getUint32(22, true);
    const nameLength = v.getUint16(26, true);
    const extraLength = v.getUint16(28, true);
    const nameStart = at + 30;
    const name = decoder.decode(zip.subarray(nameStart, nameStart + nameLength));
    const payloadStart = nameStart + nameLength + extraLength;
    out.push({ method, crc, compressedSize, uncompressedSize, name, payloadStart });
    if (compressedSize === 0 && uncompressedSize === 0 && method === 0 && name.length === 0) break;
    at = payloadStart + compressedSize;
  }
  return out;
}

/** Decode the end-of-central-directory record, which is the first thing a reader looks for. */
function readEndRecord(zip: Uint8Array): { count: number; directorySize: number; directoryOffset: number } {
  const at = zip.byteLength - 22;
  const v = new DataView(zip.buffer, zip.byteOffset + at);
  assert.equal(v.getUint32(0, true), END_OF_CENTRAL_SIGNATURE, "the archive must end with its end record");
  return {
    count: v.getUint16(10, true),
    directorySize: v.getUint32(12, true),
    directoryOffset: v.getUint32(16, true),
  };
}

const ENTRIES = [
  // Small enough that deflate does not pay, so this one exercises the *stored* method.
  { name: "README.txt", data: "read me" },
  // Large enough to compress, exercising the deflate method.
  { name: "master.json", data: JSON.stringify({ cars: Array.from({ length: 40 }, (_, i) => ({ ref: `TS-${1000 + i}`, note: "a line long enough to compress well, repeated" })) }) },
  { name: "costs.csv", data: "" }, // a subject with no rows — a real and expected case
  { name: "cars.csv", data: "id,ref\r\n1,TS-1001\r\n" },
];

describe("the CRC the archive carries", () => {
  it("is the standard CRC-32", () => {
    // The canonical check value from the CRC-32 definition: if this ever differs, every checksum
    // in the archive is wrong and extractors will reject files that are actually fine.
    assert.equal(crc32("123456789") >>> 0, 0xcbf43926);
  });

  it("is taken over the uncompressed bytes, for a compressed entry too", () => {
    const zip = buildZip(ENTRIES, NOW);
    const headers = readLocalHeaders(zip);
    const big = headers.find((h) => h.name === "master.json")!;
    assert.equal(big.method, 8, "the big file should be deflated");
    assert.equal(big.crc, crc32(ENTRIES[1].data) >>> 0);
    assert.equal(big.uncompressedSize, Buffer.byteLength(ENTRIES[1].data));
    assert.ok(big.compressedSize < big.uncompressedSize, "compression should have paid");
  });

  it("is zero-length safe — an empty subject still has a correct checksum and size", () => {
    const zip = buildZip(ENTRIES, NOW);
    const empty = readLocalHeaders(zip).find((h) => h.name === "costs.csv")!;
    assert.equal(empty.crc, crc32("") >>> 0);
    assert.equal(empty.compressedSize, 0);
    assert.equal(empty.uncompressedSize, 0);
  });
});

describe("the payloads", () => {
  it("come back as their own bytes, compressed or not", () => {
    const zip = buildZip(ENTRIES, NOW);
    for (const header of readLocalHeaders(zip)) {
      const entry = ENTRIES.find((e) => e.name === header.name)!;
      const payload = zip.subarray(header.payloadStart, header.payloadStart + header.compressedSize);
      const bytes = header.method === 8 ? inflateRawSync(payload) : payload;
      assert.equal(Buffer.from(bytes).toString("utf8"), entry.data, `${header.name} must survive`);
      assert.equal(crc32(bytes) >>> 0, header.crc, `${header.name} must checksum`);
    }
  });
});

describe("the structure", () => {
  it("names every entry in the central directory, at offsets that point back at what was written", () => {
    const zip = buildZip(ENTRIES, NOW);
    const end = readEndRecord(zip);
    assert.equal(end.count, ENTRIES.length);
    assert.equal(end.directoryOffset + end.directorySize, zip.byteLength - 22);

    const locals = readLocalHeaders(zip);
    let at = end.directoryOffset;
    for (let i = 0; i < end.count; i++) {
      const v = new DataView(zip.buffer, zip.byteOffset + at);
      assert.equal(v.getUint32(0, true), CENTRAL_HEADER_SIGNATURE, "each directory entry has the right signature");
      const nameLength = v.getUint16(28, true);
      const localOffset = v.getUint32(42, true);
      const name = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength));
      assert.equal(name, ENTRIES[i].name, "the directory is in the order the entries were given");
      // the offset must land on a real local header carrying the same CRC
      const back = new DataView(zip.buffer, zip.byteOffset + localOffset);
      assert.equal(back.getUint32(0, true), LOCAL_HEADER_SIGNATURE, "a recorded offset must point at a local header");
      assert.equal(back.getUint32(14, true), v.getUint32(16, true), "the same file, the same CRC");
      at += 46 + nameLength;
    }
  });

  it("stamps every entry with the instant it was asked for, read as UTC", () => {
    const zip = buildZip(ENTRIES, NOW);
    const end = readEndRecord(zip);
    const v = new DataView(zip.buffer, zip.byteOffset + end.directoryOffset);
    const dosTime = v.getUint16(12, true);
    const dosDate = v.getUint16(14, true);
    assert.equal(((dosDate >> 9) & 0x7f) + 1980, NOW.getUTCFullYear());
    assert.equal((dosDate >> 5) & 0x0f, NOW.getUTCMonth() + 1);
    assert.equal(dosDate & 0x1f, NOW.getUTCDate());
    assert.equal(dosTime >> 11, NOW.getUTCHours());
    assert.equal((dosTime >> 5) & 0x3f, NOW.getUTCMinutes());
  });

  it("refuses more entries than the format can name", () => {
    const tooMany = Array.from({ length: 65_536 }, (_, i) => ({ name: `f${i}`, data: "x" }));
    assert.throws(() => buildZip(tooMany, NOW), /65535/);
  });
});
