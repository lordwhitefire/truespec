/**
 * The image byte boundary — where a photo is measured and made safe to store (truth 7; `specs/media`).
 *
 * An owner's photo is uploaded **before** any row exists, so this module owns the boundary the bytes
 * cross: they are measured against the cap, their metadata is stripped, and only then are they handed
 * to Sanity. Nothing here talks to the store or to Sanity — it takes bytes and gives bytes back, so
 * every rule is a pure function a test can pin, and the one place a photo can be quietly changed is
 * the one place that is tested. The rules that do not touch bytes live in `lib/photo-rules.ts`.
 *
 * **EXIF is stripped** (truth 7): a phone photo carries where it was taken. The owner is publishing a
 * car, not his afternoon, so the metadata goes at the write boundary — the bytes stored are the
 * original image with its metadata removed, never a re-encode. (XMP goes too: it carries the same
 * location and camera detail under a different name.)
 *
 * One consequence worth saying out loud: stripping EXIF also removes the **orientation** tag, and v1
 * deliberately has no derivative pipeline to bake the rotation in. A photo whose camera stored it
 * rotated, marked only by that tag, therefore shows in its stored orientation. That is the trade the
 * spec asks for (originals, no derivatives); it is recorded in the task's note rather than worked
 * around here.
 *
 * This module uses `Buffer`, so it is server-side in practice; importing it from a client component
 * would drag `Buffer` into the browser bundle. `lib/photo-rules.ts` is the half a client may hold.
 */
import { checkPhotoSize, isPhotoType } from "./photo-rules";

/** A refusal the owner can act on, or the bytes to store. */
export type PhotoBytes = { ok: true; bytes: Buffer; stripped: boolean } | { ok: false; reason: string };

/**
 * The write boundary: measure, then strip, then hand back the bytes to store.
 *
 * `bytes` is what the browser sent and `type` is what it said the file was. A file whose declared
 * type and whose actual shape disagree is refused rather than guessed at — a JPEG that is not a JPEG
 * would be stored as a broken image, and stripping nothing would store the metadata this function
 * exists to remove.
 */
export function preparePhoto(bytes: Buffer, type: string): PhotoBytes {
  if (!isPhotoType(type)) {
    return { ok: false, reason: "That file is not a photo the office stores. Use a JPEG, a PNG or a WebP." };
  }
  const size = checkPhotoSize(bytes.length);
  if (!size.ok) return size;

  const stripped =
    type === "image/jpeg" ? stripJpeg(bytes) : type === "image/png" ? stripPng(bytes) : stripWebp(bytes);
  if (!stripped.ok) return stripped;
  return { ok: true, bytes: stripped.bytes, stripped: stripped.stripped };
}

type SegmentWalk = { ok: true; bytes: Buffer; stripped: boolean } | { ok: false; reason: string };

const BAD = (what: string): { ok: false; reason: string } => ({
  ok: false,
  reason: `That file could not be read as an image (${what}), so its details cannot be stripped. Nothing was stored.`,
});

/**
 * JPEG: walk the markers before the scan and drop the metadata segments.
 *
 * A JPEG is `FF D8`, then segments of `FF <marker> <2-byte length> <payload>`, then `FF DA` (start of
 * scan) and the image data — which is **copied verbatim**: the data after a scan marker is not
 * marker-structured (`FF 00` is a stuffed byte), so the walk ends there and the rest is passed
 * through untouched. That is what makes this a metadata strip and not a re-encode.
 */
function stripJpeg(input: Buffer): SegmentWalk {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return BAD("no JPEG start marker");
  const out: Buffer[] = [input.subarray(0, 2)];
  let stripped = false;
  let i = 2;

  for (;;) {
    if (i >= input.length) return BAD("the file ends before its image data");
    if (input[i] !== 0xff) return BAD("a byte where a marker should be");

    let j = i + 1;
    while (j < input.length && input[j] === 0xff) j++; // fill bytes are legal
    if (j >= input.length) return BAD("the file ends inside a marker");
    const marker = input[j];

    // Standalone markers: no payload.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0xd8) {
      out.push(input.subarray(i, j + 1));
      i = j + 1;
      continue;
    }
    if (marker === 0xd9) {
      out.push(input.subarray(i, j + 1)); // end of image; nothing after it belongs to this walk
      break;
    }

    if (j + 2 >= input.length) return BAD("a segment length was cut off");
    const length = input.readUInt16BE(j + 1);
    if (length < 2 || j + 1 + length > input.length) return BAD("a segment runs past the end of the file");
    const payload = input.subarray(j + 3, j + 1 + length);

    if (marker === 0xe1 && isMetadataPayload(payload)) {
      stripped = true; // dropped: the segment is simply not copied
    } else {
      out.push(input.subarray(i, j + 1 + length));
    }
    i = j + 1 + length;

    if (marker === 0xda) {
      out.push(input.subarray(i)); // the scan: copied verbatim, never walked
      break;
    }
  }

  return { ok: true, bytes: Buffer.concat(out), stripped };
}

/** An APP1 segment carries either Exif or XMP; both are dropped. */
function isMetadataPayload(payload: Buffer): boolean {
  const head = payload.subarray(0, 29).toString("latin1");
  return head.startsWith("Exif\0\0") || head.startsWith("http://ns.adobe.com/xap/1.0/");
}

/**
 * PNG: drop the `eXIf` chunk, keep every other chunk and every length exactly as it was.
 *
 * PNG is `8-byte signature`, then `<4-byte length> <4-byte type> <data> <4-byte crc>` repeated. The
 * chunks are self-describing, so removing one needs no other edit — no length in the file counts
 * chunks. A chunk whose length runs past the end is a malformed file, and is refused.
 */
function stripPng(input: Buffer): SegmentWalk {
  const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (input.length < 8 || !input.subarray(0, 8).equals(SIGNATURE)) return BAD("no PNG signature");

  const out: Buffer[] = [input.subarray(0, 8)];
  let stripped = false;
  let i = 8;
  let sawEnd = false;

  while (i + 8 <= input.length) {
    const length = input.readUInt32BE(i);
    const type = input.subarray(i + 4, i + 8).toString("latin1");
    const end = i + 8 + length + 4;
    if (end > input.length) return BAD("a chunk runs past the end of the file");
    if (type === "eXIf") {
      stripped = true;
    } else {
      out.push(input.subarray(i, end));
    }
    i = end;
    if (type === "IEND") {
      sawEnd = true;
      break;
    }
  }

  if (!sawEnd) return BAD("no PNG end chunk");
  return { ok: true, bytes: Buffer.concat(out), stripped };
}

/**
 * WebP: drop the `EXIF` and `XMP ` chunks, then fix the one length the format keeps outside them.
 *
 * WebP is `RIFF <4-byte size> WEBP`, then chunks of `<4-byte fourcc> <4-byte size> <data>` padded to
 * an even length. Because one length at the head counts everything after it, removing a chunk means
 * writing a new size — the only place in this module where a byte that is not the metadata itself
 * changes, and it is rewritten to the truth rather than patched.
 */
function stripWebp(input: Buffer): SegmentWalk {
  if (
    input.length < 12 ||
    input.subarray(0, 4).toString("latin1") !== "RIFF" ||
    input.subarray(8, 12).toString("latin1") !== "WEBP"
  ) {
    return BAD("no WebP header");
  }

  const chunks: Buffer[] = [];
  let stripped = false;
  let i = 12;
  while (i + 8 <= input.length) {
    const fourcc = input.subarray(i, i + 4).toString("latin1");
    const length = input.readUInt32LE(i + 4);
    const end = i + 8 + length + (length % 2); // chunks are padded to an even length
    if (end > input.length) return BAD("a chunk runs past the end of the file");
    if (fourcc === "EXIF" || fourcc === "XMP ") {
      stripped = true;
    } else {
      chunks.push(input.subarray(i, end));
    }
    i = end;
  }

  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.write("RIFF", 0, "latin1");
  head.writeUInt32LE(body.length + 4, 4); // everything after this field, "WEBP" included
  head.write("WEBP", 8, "latin1");
  return { ok: true, bytes: Buffer.concat([head, body]), stripped };
}
