// Task 11 verification: a read-only call to project c2lc8g8n / production.
// Run from the project root:
//   node --env-file=.env.local --conditions=react-server --import tsx \
//     developer-workspace/scripts/task-003/sanity-probe.mts
//
// Reads only. Nothing is written to the dataset.

import { getConfig } from "../../../lib/config";
import { imageUrl, sanityClient } from "../../../lib/sanity";

const { sanityProjectId, sanityDataset } = getConfig();

// Never print the token; the project id and dataset are not secrets.
console.log(`project=${sanityProjectId} dataset=${sanityDataset}`);

const client = sanityClient();

// 1. A plain count: proves the credential reads the dataset.
const total = await client.fetch<number>(`count(*[_type == "sanity.imageAsset"])`);
console.log(`image assets in the dataset: ${total}`);

// 2. What is already there, if anything (the owner may have uploaded before).
const recent = await client.fetch<
  { _id: string; url: string; originalFilename?: string; size?: number }[]
>(`*[_type == "sanity.imageAsset"] | order(_createdAt desc) [0...5] {_id, url, originalFilename, size}`);
for (const a of recent) {
  console.log(`  ${a._id}  ${a.size ?? "?"}B  ${a.originalFilename ?? ""}`);
  console.log(`    reported: ${a.url}`);
  console.log(`    derived : ${imageUrl(a._id)}`);
  console.log(`    agree   : ${a.url === imageUrl(a._id)}`);
}
if (recent.length === 0) console.log("  (none yet — the uploads are Task 12's)");

// 3. The PDF half of the store: privately stored file assets.
const pdfs = await client.fetch<number>(`count(*[_type == "sanity.fileAsset"])`);
console.log(`file assets in the dataset: ${pdfs}`);
