// Task 12 — what does the CDN actually serve for a stored asset?
//
// The proof run showed the fetched bytes' sha1 does not match the uploaded
// bytes' sha1. Before anything is claimed about "the asset served as it is",
// this establishes what differs: the URL (no parameters), the dimensions, the
// bytes, and what the dataset itself reports for the asset.
//
//   node --env-file=.env.local --conditions=react-server --import tsx \
//     developer-workspace/scripts/task-003/probe-served-bytes.mts

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { findImageAsset, imageUrl, sanityClient } from "../../../lib/sanity";

const manifest = JSON.parse(readFileSync("scripts/demo-photo-manifest.json", "utf8"));

function dimensions(bytes: Buffer): string {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return "(not jpeg)";
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const len = bytes.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return `${bytes.readUInt16BE(i + 7)}x${bytes.readUInt16BE(i + 5)} (SOF 0x${marker.toString(16)})`;
    }
    i += 2 + len;
  }
  return "(no SOF)";
}

for (const entry of manifest.images.slice(0, 3)) {
  const intended = manifest.images.find((i: { origin: string }) => i.origin === entry.origin);
  const unsplashUrl = `https://images.unsplash.com/photo-${entry.origin.replace(/^unsplash:/, "")}?auto=format&fit=crop&w=1200&q=70&fm=jpg`;

  const up = Buffer.from(await (await fetch(unsplashUrl)).arrayBuffer());
  const served = Buffer.from(await (await fetch(imageUrl(entry.assetId))).arrayBuffer());
  const asset = await findImageAsset(entry.assetId);
  const meta = await sanityClient().fetch<{ size: number; mimeType: string; dimensions: unknown } | null>(
    `*[_id == $id][0]{size, mimeType, "dimensions": metadata.dimensions}`,
    { id: entry.assetId },
  );

  console.log(`${entry.ref} p${entry.position}  ${entry.assetId}`);
  console.log(`  url asked for : ${imageUrl(entry.assetId)} (no query parameters)`);
  console.log(`  re-fetched orig: ${up.length}B sha1=${createHash("sha1").update(up).digest("hex").slice(0, 12)} dims=${dimensions(up)}`);
  console.log(`  manifest sha1 : ${entry.sha1.slice(0, 12)} bytes=${entry.bytes}  (matches re-fetch: ${createHash("sha1").update(up).digest("hex") === entry.sha1})`);
  console.log(`  dataset says  : size=${meta?.size} mime=${meta?.mimeType} dims=${JSON.stringify(meta?.dimensions)}`);
  console.log(`  cdn serves    : ${served.length}B sha1=${createHash("sha1").update(served).digest("hex").slice(0, 12)} dims=${dimensions(served)}`);
  console.log(`  findImageAsset: url=${asset?.url} size=${asset?.size}`);
  console.log();
}
