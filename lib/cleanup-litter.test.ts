/**
 * The cleanup card's exclusion rule: backups, the fixed seed and demo uploads are system-owned;
 * an unreferenced client file is litter.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { unreferencedLitter } from "./cleanup-litter";

const assets = [
  {
    assetId: "asset-backup",
    kind: "sanity.fileAsset",
    filename: "backup-2026-10-23.json.gz.enc",
    bytes: 100,
    label: null,
  },
  {
    assetId: "asset-pdf",
    kind: "sanity.fileAsset",
    filename: "enquiry-sheet.pdf",
    bytes: 200,
    label: null,
  },
  {
    assetId: "asset-photo",
    kind: "sanity.imageAsset",
    filename: "photo.jpg",
    bytes: 300,
    label: null,
  },
  {
    assetId: "asset-referenced",
    kind: "sanity.imageAsset",
    filename: "referenced.jpg",
    bytes: 400,
    label: null,
  },
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
    {
      assetId: "a",
      kind: "sanity.fileAsset",
      filename: "my-backup-2026-10-23.json.gz.enc",
      bytes: 1,
      label: null,
    },
    {
      assetId: "b",
      kind: "sanity.fileAsset",
      filename: "backup-2026-10-23.json.gz.enc.bak",
      bytes: 1,
      label: null,
    },
    {
      assetId: "c",
      kind: "sanity.fileAsset",
      filename: "backup-2026-10-2.json.gz.enc",
      bytes: 1,
      label: null,
    },
    {
      assetId: "d",
      kind: "sanity.fileAsset",
      filename: "backup-2026-10-23.json.gz.enc",
      bytes: 1,
      label: null,
    },
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

test("the fixed seed is excluded by its exact label or filename, never by a prefix", () => {
  const seedAndNearMisses = [
    {
      assetId: "seed-label",
      kind: "sanity.fileAsset",
      filename: "a-different-name.json.gz.enc",
      bytes: 1,
      label: "truespec-demo-seed",
    },
    {
      assetId: "seed-name",
      kind: "sanity.fileAsset",
      filename: "demo-seed.json.gz.enc",
      bytes: 1,
      label: null,
    },
    {
      assetId: "seed-label-prefix",
      kind: "sanity.fileAsset",
      filename: "not-the-seed.json.gz.enc",
      bytes: 1,
      label: "truespec-demo-seed-extra",
    },
    {
      assetId: "seed-name-suffix",
      kind: "sanity.fileAsset",
      filename: "demo-seed.json.gz.enc.bak",
      bytes: 1,
      label: null,
    },
  ];
  const litter = unreferencedLitter(seedAndNearMisses, new Set());
  assert.deepEqual(
    litter.map((asset) => asset.assetId),
    ["seed-label-prefix", "seed-name-suffix"],
  );
});

test("demo uploads are excluded by the exact demo label, never by a prefix", () => {
  const demoAndNearMisses = [
    {
      assetId: "demo-photo",
      kind: "sanity.imageAsset",
      filename: "demo.jpg",
      bytes: 1,
      label: "truespec-demo",
    },
    {
      assetId: "demo-pdf",
      kind: "sanity.fileAsset",
      filename: "demo.pdf",
      bytes: 1,
      label: "truespec-demo",
    },
    {
      assetId: "demo-prefix",
      kind: "sanity.imageAsset",
      filename: "demo-extra.jpg",
      bytes: 1,
      label: "truespec-demo-extra",
    },
    {
      assetId: "main",
      kind: "sanity.imageAsset",
      filename: "main.jpg",
      bytes: 1,
      label: "truespec-main",
    },
  ];
  const litter = unreferencedLitter(demoAndNearMisses, new Set());
  assert.deepEqual(
    litter.map((asset) => asset.assetId),
    ["demo-prefix", "main"],
  );
});
