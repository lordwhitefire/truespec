// One-off: import the original asset bytes from the Sanity export tarball into
// the preview dataset. Uploading the original (not the CDN-re-encoded) bytes
// preserves the content-addressed asset id, so database references resolve.
// Asset _id = image-<sha1>-<dims>-<ext> / file-<sha1>-<ext>; tarball filenames
// are the same minus the type prefix, with the last "." turned into "-".
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@sanity/client';

const env = readFileSync('.env.local', 'utf8');
const token = (env.match(/^SANITY_TOKEN=(.*)$/m)?.[1] ?? '').trim().replace(/^"|"$/g, '');
if (!token) throw new Error('SANITY_TOKEN missing from .env.local');

const exportDir = process.argv[2];
if (!exportDir) throw new Error('usage: node import-sanity-assets.mjs <exportDir>');
const meta = JSON.parse(readFileSync(join(exportDir, 'assets.json'), 'utf8'));

const toId = (kind, filename) => `${kind}-${filename.replace(/\.([^.]+)$/, '-$1')}`;
const all = [
  ...readdirSync(join(exportDir, 'images')).map((f) => ({
    kind: 'image',
    filename: f,
    id: toId('image', f),
  })),
  ...readdirSync(join(exportDir, 'files')).map((f) => ({
    kind: 'file',
    filename: f,
    id: toId('file', f),
  })),
];
const productionIds = new Set(all.map((a) => a.id));

const target = createClient({
  projectId: 'c2lc8g8n',
  dataset: 'preview',
  apiVersion: '2026-10-13',
  token,
  useCdn: false,
});

const existing = await target.fetch(`*[_type in ["sanity.imageAsset","sanity.fileAsset"]]{_id}`);
const duplicates = existing.map((a) => a._id).filter((id) => !productionIds.has(id));
console.log(`preview assets before: ${existing.length}; duplicates to remove: ${duplicates.length}`);
for (const id of duplicates) await target.delete(id);

const typeFor = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
};

let ok = 0;
const mismatch = [];
const failed = [];

for (const a of all) {
  const bytes = readFileSync(join(exportDir, a.kind === 'image' ? 'images' : 'files', a.filename));
  const assetKey = a.id.split('-').slice(0, 2).join('-');
  const original = (meta[assetKey]?.originalFilename ?? a.filename).split('/').pop();
  try {
    const uploaded = await target.assets.upload(a.kind, bytes, {
      filename: original,
      contentType: typeFor(a.filename),
    });
    if (uploaded._id === a.id) ok += 1;
    else mismatch.push({ expected: a.id, got: uploaded._id });
  } catch (err) {
    failed.push({ id: a.id, error: String(err?.message ?? err) });
  }
}

const after = await target.fetch(`*[_type in ["sanity.imageAsset","sanity.fileAsset"]]{_id}`);
const previewIds = new Set(after.map((a) => a._id));
const missingInPreview = [...productionIds].filter((id) => !previewIds.has(id));

console.log(
  JSON.stringify(
    {
      ok,
      previewCount: after.length,
      productionCount: productionIds.size,
      mismatch,
      failed,
      missingInPreview,
    },
    null,
    2
  )
);
