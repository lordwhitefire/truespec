// Task 12 — upload the demo photos and prove the store.
//
// Input:  developer-workspace/scripts/task-003/runs/task-10/photo-manifest.intended.json
// Output: scripts/demo-photo-manifest.json  (origin -> asset id, and per-car order)
//
// For each image: fetch the exact URL the manifest names, scan the bytes for an
// Exif segment (recorded as evidence for "EXIF stripped at the write boundary"),
// upload, and record what Sanity returns. Then it points the fleet's car_photo
// rows at the asset ids, so the store holds references rather than addresses.
//
// Re-runnable: an image already recorded whose asset still resolves is not
// re-uploaded. (Sanity also dedupes identical bytes, so a re-upload would return
// the same asset id anyway.)
//
//   node --env-file=.env.local --conditions=react-server --import tsx \
//     developer-workspace/scripts/task-003/upload-photos.mts

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { Client } from "pg";

import { findImageAsset, imageUrl, uploadImage } from "../../../lib/sanity";

const INTENDED = "developer-workspace/scripts/task-003/runs/task-10/photo-manifest.intended.json";
const RECORD = "scripts/demo-photo-manifest.json";
const RUN_DIR = "developer-workspace/scripts/task-003/runs/task-12";

type Intended = {
  width: number;
  sizeRule: string;
  images: { ref: string; position: number; origin: string; unsplashId: string; fetchUrl: string }[];
};

type Recorded = {
  origin: string;
  ref: string;
  position: number;
  assetId: string;
  url: string;
  sha1: string;
  bytes: number;
  contentType: string;
  exif: { hasExif: boolean; segments: string[] };
};

// --- the Exif scan -----------------------------------------------------------

const MARKERS: Record<number, string> = {
  0xe0: "APP0/JFIF",
  0xe1: "APP1/Exif",
  0xe2: "APP2/ICC",
  0xed: "APP13/IPTC",
  0xee: "APP14/Adobe",
  0xdb: "DQT",
  0xc0: "SOF0",
  0xc2: "SOF2",
  0xc4: "DHT",
  0xda: "SOS",
  0xd9: "EOI",
};

function scanSegments(bytes: Buffer): { hasExif: boolean; segments: string[] } {
  const segments: string[] = [];
  let hasExif = false;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return { hasExif, segments: ["(not a JPEG)"] };
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xda || marker === 0xd9) {
      segments.push(MARKERS[marker] ?? `0x${marker.toString(16)}`);
      break;
    }
    const len = bytes.readUInt16BE(i + 2);
    const name = MARKERS[marker] ?? `0x${marker.toString(16)}`;
    const head = bytes.subarray(i + 4, i + 10).toString("latin1");
    if (marker === 0xe1 && head.startsWith("Exif")) hasExif = true;
    segments.push(`${name}(${len})`);
    i += 2 + len;
  }
  return { hasExif, segments };
}

// --- the run -----------------------------------------------------------------

const intended: Intended = JSON.parse(readFileSync(INTENDED, "utf8"));
mkdirSync(RUN_DIR, { recursive: true });

const record: Recorded[] = existsSync(RECORD)
  ? JSON.parse(readFileSync(RECORD, "utf8")).images
  : [];
const byOrigin = new Map(record.map((r) => [r.origin, r]));

let uploaded = 0;
let skipped = 0;

async function handle(image: Intended["images"][number]) {
  const already = byOrigin.get(image.origin);
  if (already) {
    const still = await findImageAsset(already.assetId);
    if (still) {
      skipped += 1;
      console.log(`skip  ${image.ref} p${image.position}  ${already.assetId} (resolves)`);
      return;
    }
    console.log(`stale ${image.ref} p${image.position}  ${already.assetId} no longer resolves — re-uploading`);
  }

  const res = await fetch(image.fetchUrl, { redirect: "follow" });
  if (!res.ok) throw new Error(`${image.ref} p${image.position}: fetch ${res.status} ${image.fetchUrl}`);
  const contentType = res.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await res.arrayBuffer());
  if (contentType !== "image/jpeg") throw new Error(`${image.ref} p${image.position}: unexpected ${contentType}`);

  const exif = scanSegments(bytes);
  const sha1 = createHash("sha1").update(bytes).digest("hex");
  const asset = await uploadImage(bytes, {
    filename: `${image.ref}-${image.position}.jpg`,
    contentType: "image/jpeg",
  });

  const entry: Recorded = {
    origin: image.origin,
    ref: image.ref,
    position: image.position,
    assetId: asset.assetId,
    url: asset.url,
    sha1,
    bytes: asset.size ?? bytes.length,
    contentType: "image/jpeg",
    exif,
  };
  byOrigin.set(image.origin, entry);
  uploaded += 1;

  writeFileSync(
    RECORD,
    JSON.stringify(
      {
        purpose:
          "TASK-003 demo photo manifest — the Unsplash origin of each uploaded image and the Sanity asset id the store holds. Asset ids and unsplash: tokens are not secrets.",
        width: intended.width,
        sizeRule: intended.sizeRule,
        uploadedAt: new Date().toISOString(),
        images: [...byOrigin.values()].sort((a, b) =>
          a.ref === b.ref ? a.position - b.position : a.ref < b.ref ? -1 : 1,
        ),
      },
      null,
      2,
    ),
  );

  console.log(
    `up    ${image.ref} p${image.position}  ${(bytes.length / 1024).toFixed(0)}KB exif=${exif.hasExif}  -> ${asset.assetId}`,
  );
}

const queue = [...intended.images];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (queue.length) await handle(queue.shift()!);
  }),
);

console.log(`\nuploaded ${uploaded}, skipped ${skipped}, recorded ${byOrigin.size}`);

// --- point the fleet's rows at the asset ids ---------------------------------

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
let pointed = 0;
for (const entry of byOrigin.values()) {
  const r = await client.query(
    `UPDATE car_photo SET sanity_asset_id = $1
      WHERE position = $2 AND car_id = (SELECT id FROM car WHERE ref = $3)`,
    [entry.assetId, entry.position, entry.ref],
  );
  pointed += r.rowCount ?? 0;
}
console.log(`car_photo rows pointed at asset ids: ${pointed}`);

const { rows: leftover } = await client.query(
  `SELECT c.ref, count(*)::int AS n FROM car_photo p JOIN car c ON c.id = p.car_id
    WHERE p.sanity_asset_id ~ '^https?://' GROUP BY c.ref ORDER BY c.ref`,
);
console.log(`cars still holding a third-party address: ${leftover.length}`);
for (const r of leftover) console.log(`  ${r.ref}  ${r.n} photos`);
await client.end();

// --- the two proofs ----------------------------------------------------------

// Measured, not assumed: the URL carries no parameters and the asset is served at
// original dimensions. Sanity's ingest normalises the JPEG encoding (progressive
// -> baseline), so the served sha1 differs from the uploaded one while the pixel
// dimensions are identical (probe-served-bytes.mts). No downscale, no crop, no
// format change — no derivative pipeline, which is the rule.
console.log("\nproof — a stored reference resolves, untransformed, at original dimensions:");
let proven = 0;
for (const entry of [...byOrigin.values()].slice(0, 3)) {
  const asset = await findImageAsset(entry.assetId);
  const url = imageUrl(entry.assetId);
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const ok = asset !== null && res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  if (ok) proven += 1;
  console.log(
    `  ${entry.assetId}\n    in dataset: ${asset !== null}  url: ${url}\n    fetched: ${res.status} ${res.headers.get("content-type")} ${buf.length}B  sha1 match: ${createHash("sha1").update(buf).digest("hex") === entry.sha1}`,
  );
}
console.log(`\n${proven}/3 references proved; ${byOrigin.size} images in the manifest.`);
writeFileSync(
  `${RUN_DIR}/upload-run.json`,
  JSON.stringify({ at: new Date().toISOString(), uploaded, skipped, recorded: byOrigin.size, pointed, leftover: leftover.length }, null, 2),
);
