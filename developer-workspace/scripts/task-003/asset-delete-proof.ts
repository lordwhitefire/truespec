// Does the wipe's asset delete actually remove an asset from the store?
//
// The wipe's own report says it deleted 50 assets, and `client.delete(id)` returned without error for
// every one. Neither of those is proof: a method can return cleanly and do nothing. This asks the
// store two questions instead, and answers a third that only a live asset can answer:
//
//   1. before: count the assets in the dataset;
//   2. upload one small image of our own — the count must go up by exactly one
//      (proving the count can see an asset at all; a check that can only ever say "none" proves nothing);
//   3. delete that asset with the very function the wipe uses;
//   4. count again — it must be back to where it started, and a query for the id must come back empty.
//
// Existence is asked of the query API, never of getDocument: that method cheerfully returns a document
// for an id that never existed, so it cannot tell "gone" from "here". The count can, and the count is
// what this proof leans on.
//
//   node --conditions=react-server --import tsx developer-workspace/scripts/task-003/asset-delete-proof.ts

import sharp from "sharp";
import { sanityClient, deleteAsset } from "../../../lib/sanity";

const COUNT = 'count(*[_type in ["sanity.imageAsset", "sanity.fileAsset"]])';
// A real image, made here rather than pasted as a base64 blob: a hand-rolled 1x1 was rejected by the
// store as an invalid image, and a control that cannot upload proves nothing either.
const png = () =>
  sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 30, b: 40 } } })
    .png()
    .toBuffer();

async function main() {
  const client = sanityClient();
  const before = Number((await client.fetch(COUNT)) ?? 0);
  console.log(`assets in the dataset before: ${before}`);

  console.log("uploading one throwaway image to prove the count can see an asset…");
  const uploaded = await client.assets.upload("image", await png(), { filename: "wipe-proof-do-not-keep.png" });
  console.log(`  uploaded ${uploaded._id}`);

  const during = Number((await client.fetch(COUNT)) ?? 0);
  console.log(`assets now: ${during}`);
  if (during !== before + 1) {
    throw new Error(`the count did not move: ${before} → ${during} — this check cannot see assets, so it proves nothing`);
  }

  console.log("removing it with the same call the wipe uses…");
  const result = await deleteAsset(uploaded._id);
  console.log(`  deleteAsset(${uploaded._id}) → ${JSON.stringify(result)}`);
  if (!result.deleted) throw new Error(`deleteAsset did not delete: ${result.reason}`);

  const after = Number((await client.fetch(COUNT)) ?? 0);
  const stillThere = await client.fetch<{ _id: string }[]>("*[_id == $id]", { id: uploaded._id });
  console.log(`assets after: ${after} · a query for that id: ${stillThere.length === 0 ? "empty" : "STILL THERE"}`);

  const ok = after === before && stillThere.length === 0;
  console.log(
    ok
      ? `\nPASS — the count can see an asset, deleteAsset removes it, and the dataset is back to ${before}.`
      : `\nFAIL — before ${before} · during ${during} · after ${after} · query for the id returned ${stillThere.length}`,
  );
  process.exitCode = ok ? 0 : 1;
}

main().catch((err) => {
  console.error(`proof failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
