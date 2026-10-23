/**
 * The cleanup card's exclusion rule: the job's backups are not litter; an unreferenced client file is.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { unreferencedLitter } from "./cleanup-litter";

const assets = [
  { assetId: "asset-backup", kind: "sanity.fileAsset", filename: "backup-2026-10-23.json.gz.enc", bytes: 100 },
  { assetId: "asset-pdf", kind: "sanity.fileAsset", filename: "enquiry-sheet.pdf", bytes: 200 },
  { assetId: "asset-photo", kind: "sanity.imageAsset", filename: "photo.jpg", bytes: 300 },
  { assetId: "asset-referenced", kind: "sanity.imageAsset", filename: "referenced.jpg", bytes: 400 },
];

test("a retained backup is never called litter", () => {
  const litter = unreferencedLitter(assets, new Set(["asset-referenced"]));
  assert.deepEqual(
    litter.map((asset) => asset.assetId),
    ["asset-pdf", "asset-photo"],
  );
});

test("the exclusion is the exact backup name, not any file with a similar name", () => {
  const nearMiss = [
    { assetId: "a", kind: "sanity.fileAsset", filename: "my-backup-2026-10-23.json.gz.enc", bytes: 1 },
    { assetId: "b", kind: "sanity.fileAsset", filename: "backup-2026-10-23.json.gz.enc.bak", bytes: 1 },
    { assetId: "c", kind: "sanity.fileAsset", filename: "backup-2026-10-2.json.gz.enc", bytes: 1 },
    { assetId: "d", kind: "sanity.fileAsset", filename: "backup-2026-10-23.json.gz.enc", bytes: 1 },
  ];
  const litter = unreferencedLitter(nearMiss, new Set());
  assert.deepEqual(
    litter.map((asset) => asset.assetId),
    ["a", "b", "c"],
  );
});

test("a referenced asset is not litter whether or not it is a backup", () => {
  const litter = unreferencedLitter(assets, new Set(assets.map((asset) => asset.assetId)));
  assert.deepEqual(litter, []);
});
