/**
 * Demo uploads, executable without Sanity or a session.
 *
 * The subjects are the server's label decision, the exact-label total cap, and the delete-and-refuse
 * rule for an upload that came back unmarked. The cap counts only `truespec-demo`; the seed, main
 * uploads, backups and unmarked assets are not demo storage. An unreadable sum refuses the upload.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEMO_ASSET_CAP_BYTES_DEFAULT,
  DEMO_ASSET_CAP_ENV,
  DEMO_UPLOAD_LABEL,
  MAIN_UPLOAD_LABEL,
  checkDemoAssetCap,
  readDemoAssetCap,
  selectDemoAssets,
  uploadLabelForSpace,
  verifyUploadMark,
  type AssetDeleteResult,
} from './demo-assets';
import type { StoredAsset } from './sanity';

const NOW = new Date('2026-10-26T03:00:00.000Z');

function asset(overrides: Partial<StoredAsset> = {}): StoredAsset {
  return {
    assetId: 'asset-1',
    kind: 'image',
    filename: 'photo.jpg',
    size: 100,
    label: DEMO_UPLOAD_LABEL,
    createdAt: '2026-10-25T03:00:00.000Z',
    ...overrides,
  };
}

test('the server picks the exact mark from the space, never from a client value', () => {
  assert.equal(uploadLabelForSpace('demo'), 'truespec-demo');
  assert.equal(uploadLabelForSpace('main'), 'truespec-main');
  assert.equal(uploadLabelForSpace('main') === DEMO_UPLOAD_LABEL, false);
  assert.equal(uploadLabelForSpace('demo') === MAIN_UPLOAD_LABEL, false);
  assert.notEqual(DEMO_UPLOAD_LABEL, 'truespec-demo-seed');
});

test('the demo cap defaults to 2 GiB and reads a positive whole-byte value', () => {
  assert.deepEqual(readDemoAssetCap({}), {
    ok: true,
    bytes: DEMO_ASSET_CAP_BYTES_DEFAULT,
  });
  assert.deepEqual(readDemoAssetCap({ [DEMO_ASSET_CAP_ENV]: '  ' }), {
    ok: true,
    bytes: DEMO_ASSET_CAP_BYTES_DEFAULT,
  });
  assert.deepEqual(readDemoAssetCap({ [DEMO_ASSET_CAP_ENV]: '1048576' }), {
    ok: true,
    bytes: 1048576,
  });
});

test('an invalid demo cap is refused, not guessed', () => {
  for (const raw of ['abc', '0', '-1', '1.5', '1e9', ' 12x ']) {
    const result = readDemoAssetCap({ [DEMO_ASSET_CAP_ENV]: raw });
    assert.equal(result.ok, false, raw);
    if (result.ok) continue;
    assert.match(result.reason, /demo storage cap/, raw);
  }
});

test('an empty demo store is under the default cap', async () => {
  const result = await checkDemoAssetCap(1024, {
    listStoredAssets: async () => [],
    env: {},
  });
  assert.deepEqual(result, {
    ok: true,
    usedBytes: 0,
    capBytes: DEMO_ASSET_CAP_BYTES_DEFAULT,
  });
});

test('the cap counts only exact demo-marked images and files', async () => {
  const assets = [
    asset({ assetId: 'demo-image', kind: 'image', size: 100 }),
    asset({ assetId: 'demo-file', kind: 'file', size: 50 }),
    asset({ assetId: 'seed', label: 'truespec-demo-seed', size: 1000 }),
    asset({ assetId: 'main', label: MAIN_UPLOAD_LABEL, size: 1000 }),
    asset({ assetId: 'unmarked', label: null, size: 1000 }),
    asset({ assetId: 'prefix', label: 'truespec-demo-extra', size: 1000 }),
  ];
  const result = await checkDemoAssetCap(50, {
    listStoredAssets: async () => assets,
    env: { [DEMO_ASSET_CAP_ENV]: '200' },
  });
  assert.deepEqual(result, { ok: true, usedBytes: 150, capBytes: 200 });
});

test('the cap refuses a file that would exceed it and allows an exact fit', async () => {
  const store = async () => [asset({ size: 100 })];

  const fit = await checkDemoAssetCap(100, {
    listStoredAssets: store,
    env: { [DEMO_ASSET_CAP_ENV]: '200' },
  });
  assert.deepEqual(fit, { ok: true, usedBytes: 100, capBytes: 200 });

  const over = await checkDemoAssetCap(101, {
    listStoredAssets: store,
    env: { [DEMO_ASSET_CAP_ENV]: '200' },
  });
  assert.equal(over.ok, false);
  if (over.ok) return;
  assert.equal(over.code, 'over-cap');
  assert.match(over.reason, /demo storage is full/);
  assert.match(over.reason, /Delete a demo upload or wait for the daily reset/);
});

test('an unreadable cap check refuses the upload', async () => {
  const result = await checkDemoAssetCap(1, {
    listStoredAssets: async () => {
      throw new Error('sanity down');
    },
    env: {},
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'unreadable');
  assert.match(result.reason, /could not be checked/);
});

test('a demo asset without a size refuses the cap check', async () => {
  const result = await checkDemoAssetCap(1, {
    listStoredAssets: async () => [asset({ size: null })],
    env: {},
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'unreadable');
  assert.match(result.reason, /could not be measured/);
});

test('an invalid cap configuration refuses the upload', async () => {
  const result = await checkDemoAssetCap(1, {
    listStoredAssets: async () => [],
    env: { [DEMO_ASSET_CAP_ENV]: 'nope' },
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'config');
});

test('a verified mark passes without deleting', async () => {
  const deleted: string[] = [];
  const result = await verifyUploadMark(
    { assetId: 'asset-1', label: DEMO_UPLOAD_LABEL },
    DEMO_UPLOAD_LABEL,
    {
      deleteAsset: async (assetId) => {
        deleted.push(assetId);
        return { assetId, deleted: true };
      },
    }
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(deleted, []);
});

test('a missing or wrong label deletes the just-uploaded asset and fails', async () => {
  for (const label of [null, MAIN_UPLOAD_LABEL, 'truespec-demo-extra']) {
    const deleted: string[] = [];
    const result = await verifyUploadMark({ assetId: 'asset-1', label }, DEMO_UPLOAD_LABEL, {
      deleteAsset: async (assetId) => {
        deleted.push(assetId);
        return { assetId, deleted: true };
      },
    });

    assert.equal(result.ok, false, String(label));
    if (result.ok) continue;
    assert.equal(result.deleted, true, String(label));
    assert.match(result.reason, /was removed/, String(label));
    assert.deepEqual(deleted, ['asset-1'], String(label));
  }
});

test('a refused delete is reported, not hidden', async () => {
  const refused: AssetDeleteResult = {
    assetId: 'asset-1',
    deleted: false,
    reason: 'HTTP 409',
  };
  const result = await verifyUploadMark({ assetId: 'asset-1', label: null }, DEMO_UPLOAD_LABEL, {
    deleteAsset: async () => refused,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.deleted, false);
  assert.match(result.reason, /could not be removed/);
});

test('a throwing delete is reported as an unremoved copy', async () => {
  const result = await verifyUploadMark({ assetId: 'asset-1', label: null }, DEMO_UPLOAD_LABEL, {
    deleteAsset: async () => {
      throw new Error('sanity down');
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.deleted, false);
  assert.match(result.reason, /could not be removed/);
});

test('cleanup selection is exact-label and strictly pre-reset', () => {
  const assets = [
    asset({ assetId: 'before', createdAt: '2026-10-26T02:59:59.999Z' }),
    asset({ assetId: 'at', createdAt: '2026-10-26T03:00:00.000Z' }),
    asset({ assetId: 'after', createdAt: '2026-10-26T03:00:00.001Z' }),
    asset({ assetId: 'seed', label: 'truespec-demo-seed' }),
    asset({ assetId: 'prefix', label: 'truespec-demo-extra' }),
    asset({ assetId: 'main', label: MAIN_UPLOAD_LABEL }),
    asset({ assetId: 'no-time', createdAt: null }),
  ];

  assert.deepEqual(
    selectDemoAssets(assets, NOW).map((selected) => selected.assetId),
    ['before']
  );
});
