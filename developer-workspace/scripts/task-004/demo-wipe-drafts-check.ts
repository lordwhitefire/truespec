// TASK-004 Task 25 — the demo marker, and the wipe covering drafts and their assets
// (task.md:273-290, 404-407).
//
// When is this true: "anything the application creates while the demonstration is the fleet is
// demonstration data … nothing this layer writes may slip in without it", and "the wipe must cover
// everything the writes leave behind, or 'removable in one move' stops being true the moment the
// office starts saving: every demo car … every demo enquiry … and the file …" (a draft's file is
// exactly such a file, and so is an image the owner puts on a row).
//
// Three claims, each checked against a store rather than asserted about code:
//
//   1. the **dry run lists drafts** — how many are the demo's and how many assets they reference —
//      and changes nothing at all;
//   2. the one move **removes the demo's drafts** and leaves a draft that is not the demo's exactly
//      where it was;
//   3. the one move **takes the drafts' assets into the deletion set and removes them from the
//      store** — so a store that has been wiped holds no orphaned file or image a draft named.
//
// The store is a **scratch database** built from nothing (chain + seed) and dropped afterwards, so
// the live demonstration is never touched — the same pattern as `scripts/task-003/wipe-proof.mjs`.
//
// That task's witness ran the wipe `--no-assets`, because the seeded rows name the same real Sanity
// assets the live store still holds and a scratch run must not delete them. This witness needs the
// asset half to actually happen (claim 3), so before it runs the wipe **with** assets it removes the
// seeded rows' asset *references* from the scratch store and then proves, by asking the store, that
// the only asset id left anywhere the wipe reads is one this witness uploaded itself. The gate is the
// whole safety of the run: with no other reference in the store, the wipe cannot offer — or delete —
// anything but the witness's own two assets.
//
//   node --conditions=react-server --dns-result-order=ipv4first --import tsx \
//     developer-workspace/scripts/task-004/demo-wipe-drafts-check.ts
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import sharp from "sharp";
import { deleteAsset, findFileAsset, findImageAsset, uploadFile, uploadImage } from "../../../lib/sanity";

loadEnv({ path: ".env.local", quiet: true });

const DB = "truespec_scratch_004f";
const RUN_DIR = "developer-workspace/scripts/task-004/runs/task-25";
mkdirSync(RUN_DIR, { recursive: true });

const baseUrl = new URL(process.env.DATABASE_URL ?? "");
const scratchUrl = new URL(baseUrl);
scratchUrl.pathname = `/${DB}`;
const scratch = scratchUrl.toString();

const log: string[] = [];
const say = (line: string) => {
  console.log(line);
  log.push(line);
};
const verdicts: { ok: boolean; name: string; detail: string }[] = [];
const check = (ok: boolean, name: string, detail = "") => {
  say(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
  verdicts.push({ ok, name, detail });
  return ok;
};

const env = {
  ...process.env,
  DATABASE_URL: scratch,
  DATABASE_URL_UNPOOLED: scratch,
  // Neon answers on IPv6 first on a link that has no IPv6 route (ENETUNREACH), so every child is
  // asked to prefer IPv4 — the same reason the store witnesses run with this flag.
  NODE_OPTIONS: [process.env.NODE_OPTIONS, "--dns-result-order=ipv4first"].filter(Boolean).join(" "),
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a child script, retrying while the link to Neon is dropping. Three children build the scratch
 * store (migrate, seed, the wipe) and any of them can lose the connection on a flaky link; all three
 * are idempotent or wrapped in a transaction, so a retry is safe.
 */
const run = async (label: string, args: string[]): Promise<string> => {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const out = execFileSync("node", args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      say(`\n--- ${label} ---\n${out.trim()}`);
      return out;
    } catch (err) {
      say(`\n--- ${label}: the link dropped (attempt ${attempt}) — retrying ---`);
      if (attempt === 4) throw err;
      await sleep(2000 * attempt);
    }
  }
  throw new Error("unreachable");
};
const parse = (out: string) => JSON.parse(out.slice(out.indexOf("{")));

const db = new Client({ connectionString: scratch });
const q = async (sql: string, params?: unknown[]): Promise<any[]> => (await db.query(sql, params)).rows;
const one = async <T = any>(sql: string, params?: unknown[]): Promise<T> =>
  (await db.query(sql, params)).rows[0] as T;

/** Connect, retrying while the link is dropping (Neon refuses on IPv6 and times out on IPv4). */
const connectWithRetry = async (client: Client, label: string) => {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await client.connect();
      return;
    } catch (err) {
      if (attempt === 5) throw err;
      say(`connect ${label}: attempt ${attempt} failed — retrying`);
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
};

/** Real image bytes — the asset store only takes a picture it can actually decode. */
const picture = () =>
  sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 20, g: 90, b: 160 } } })
    .jpeg({ quality: 88 })
    .toBuffer();

/** A tiny but real PDF — the store takes files too, and a draft's held file is one. */
const tinyPdf = () =>
  Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
    "latin1",
  );

const draftCounts = async () => ({
  demo: (await one<{ n: number }>("SELECT count(*)::int n FROM draft WHERE is_demo")).n,
  other: (await one<{ n: number }>("SELECT count(*)::int n FROM draft WHERE NOT is_demo")).n,
});

// The witness's own two assets, so a later run can clear them if the wipe did not.
let imageAssetId: string | null = null;
let fileAssetId: string | null = null;

async function main() {
  const admin = new Client({ connectionString: baseUrl.toString() });
  await connectWithRetry(admin, "the admin connection");
  await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${DB}`);
  await admin.end();
  say(`created ${DB}`);
  await connectWithRetry(db, "the scratch connection");

  try {
    await run("the whole chain", ["--import", "tsx", "scripts/migrate.ts"]);
    await run("the demo seed", ["--import", "tsx", "scripts/seed.ts"]);

    const seeded = {
      cars: (await one<{ n: number }>("SELECT count(*)::int n FROM car WHERE is_demo")).n,
      enquiries: (await one<{ n: number }>("SELECT count(*)::int n FROM enquiry WHERE is_demo")).n,
      photos: (await one<{ n: number }>("SELECT count(*)::int n FROM car_photo p JOIN car c ON c.id=p.car_id WHERE c.is_demo")).n,
      drafts: (await draftCounts()).demo,
    };
    say(`\nseeded: ${JSON.stringify(seeded)}`);
    check(
      seeded.cars > 0 && seeded.enquiries > 0 && seeded.drafts === 0,
      "the store starts as the demo: seeded cars and enquiries with the marker, and no drafts yet",
      `cars=${seeded.cars} · enquiries=${seeded.enquiries} · drafts=${seeded.drafts}`,
    );

    // --- the safety gate: the wipe may only ever offer the witness's own assets -------------------
    // The seeded rows name the same real Sanity assets the live store holds. Those references come out
    // of the scratch copy first, and then the store itself is asked to confirm that nothing the wipe
    // reads still names an asset. Only after that is the wipe run with assets enabled, so nothing the
    // live store owns can be offered — let alone deleted.
    say("\n--- taking the seeded asset references out of the scratch copy ---");
    await q("DELETE FROM car_photo WHERE car_id IN (SELECT id FROM car WHERE is_demo)");
    await q(
      "DELETE FROM enquiry_pdf WHERE id IN (SELECT pdf_import_id FROM enquiry WHERE is_demo AND pdf_import_id IS NOT NULL)",
    );
    const stillNamed = await one<{ photos: number; pdfs: number }>(
      `SELECT (SELECT count(*)::int FROM car_photo WHERE sanity_asset_id IS NOT NULL) AS photos,
              (SELECT count(*)::int FROM enquiry_pdf WHERE sanity_asset_id IS NOT NULL) AS pdfs`,
    );
    if (stillNamed.photos !== 0 || stillNamed.pdfs !== 0) {
      throw new Error(
        `the scratch store still names assets the wipe would offer (photos=${stillNamed.photos}, pdfs=${stillNamed.pdfs}) — refusing to run with assets`,
      );
    }
    check(
      true,
      "the store names no asset the wipe could offer but the witness's own (the gate)",
      "car_photo and enquiry_pdf hold no non-null asset reference in the scratch copy",
    );

    // --- the witness's own assets -----------------------------------------------------------------
    const image = await uploadImage(await picture(), { filename: "witness-draft.jpg", contentType: "image/jpeg" });
    imageAssetId = image.assetId;
    const file = await uploadFile(tinyPdf(), { filename: "witness-draft.pdf", contentType: "application/pdf" });
    fileAssetId = file.assetId;
    say(`\nuploaded the witness's own two assets: ${imageAssetId} · ${fileAssetId}`);
    check(
      (await findImageAsset(imageAssetId)) !== null && (await findFileAsset(fileAssetId)) !== null,
      "both assets really are in the store before the wipe",
      "the query API answers with each id",
    );

    // --- plant: one draft the demo owns, one that is not ------------------------------------------
    say("\n--- planting one draft the demo owns, and one that is not ---");
    const batchId = randomUUID();
    const demoDraftId = randomUUID();
    const otherDraftId = randomUUID();
    const otherFile = `file-NOTTHEDEMO-${randomUUID().slice(0, 8)}-pdf`;
    await q(
      `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label, is_demo)
       VALUES ($1, 'car', $2, 'demo cars.pdf', $3, $4::jsonb, 'On Order', true)`,
      [demoDraftId, batchId, fileAssetId, JSON.stringify({ brand: "Demo Draft", model: "Waiting", year: 2020, mileage: 12 })],
    );
    await q("UPDATE draft SET image_asset_ids = $2 WHERE id = $1", [demoDraftId, [imageAssetId]]);
    await q(
      `INSERT INTO draft (id, kind, batch_id, source_filename, source_asset_id, values, state_label, is_demo)
       VALUES ($1, 'enquiry', $2, 'the client''s own file.pdf', $3, $4::jsonb, 'New', false)`,
      [
        otherDraftId,
        batchId,
        otherFile,
        JSON.stringify({ name: "Not The Demo", number: "+2348000000002", asked_for: "anything" }),
      ],
    );
    const planted = await draftCounts();
    say(`planted drafts: ${JSON.stringify(planted)}`);
    check(
      planted.demo === 1 && planted.other === 1,
      "one draft is the demo's and one is not, and both are waiting",
      `demo=${planted.demo} · not the demo's=${planted.other}`,
    );

    // --- the dry run: it lists drafts, and changes nothing ----------------------------------------
    const dry = parse(await run("dry run", ["--import", "tsx", "--conditions=react-server", "scripts/demo-wipe.ts", "--json"]));
    const afterDry = await draftCounts();
    check(
      dry.dryRun === true && afterDry.demo === 1 && afterDry.other === 1,
      "the dry run reports a dry run and removes nothing at all",
      `dryRun=${dry.dryRun} · drafts now: demo=${afterDry.demo} not the demo's=${afterDry.other}`,
    );
    check(
      dry.demo.drafts === 1 && dry.demo.draftAssets === 2,
      "the dry run lists the drafts, and the assets they reference",
      `demo.drafts=${dry.demo.drafts} · demo.draftAssets=${dry.demo.draftAssets} (the held file + one image)`,
    );
    say(`\nwhat the dry run says would go: ${JSON.stringify(dry.demo)}`);

    // --- the one move, with the assets ------------------------------------------------------------
    const wipe = parse(
      await run("the wipe", ["--import", "tsx", "--conditions=react-server", "scripts/demo-wipe.ts", "--yes", "--json"]),
    );
    const after = await draftCounts();
    say(`\nafter the wipe: ${JSON.stringify(after)}`);
    say(`assets: ${JSON.stringify(wipe.assets)}`);

    check(
      wipe.removed.drafts === 1 && after.demo === 0,
      "the demo's draft is gone — the one move takes it too",
      `removed.drafts=${wipe.removed.drafts} · demo drafts left=${after.demo}`,
    );
    check(
      after.other === 1,
      "a draft that is not the demo's is still waiting, untouched",
      `drafts not the demo's, planted=${planted.other} · after=${after.other}`,
    );
    check(
      wipe.assets.deleted.includes(imageAssetId) && wipe.assets.deleted.includes(fileAssetId) && wipe.assets.failed.length === 0,
      "the draft's file and image were both offered and both removed from the store",
      `deleted=[${wipe.assets.deleted.join(", ")}] · failed=${wipe.assets.failed.length}`,
    );
    check(
      (await findImageAsset(imageAssetId)) === null && (await findFileAsset(fileAssetId)) === null,
      "the store itself agrees they are gone — no orphaned asset a draft named remains",
      "the query API answers with nothing for either id",
    );
    check(
      wipe.untouched.missing.length === 0,
      "nothing that was not the demo's went missing — measured, not assumed",
      `${wipe.untouched.missing.length} ids missing`,
    );
    check(
      wipe.removed.cars === seeded.cars && wipe.removed.enquiries === seeded.enquiries,
      "the wipe's own summary still matches the store it ran against",
      `cars=${wipe.removed.cars} (seeded ${seeded.cars}) · enquiries=${wipe.removed.enquiries} (seeded ${seeded.enquiries})`,
    );

    const ok = verdicts.every((v) => v.ok);
    say(`\n${ok ? "PASS" : "FAIL"} — ${verdicts.filter((v) => v.ok).length}/${verdicts.length} verdicts`);
    writeFileSync(
      `${RUN_DIR}/demo-wipe-drafts.json`,
      JSON.stringify({ ranAt: new Date().toISOString(), scratch: DB, seeded, imageAssetId, fileAssetId, planted, dry, wipe, after, verdicts }, null, 2),
    );
    writeFileSync(`${RUN_DIR}/demo-wipe-drafts.log`, log.join("\n"));
    say(`wrote ${RUN_DIR}/demo-wipe-drafts.json`);
    process.exitCode = ok ? 0 : 1;
  } finally {
    // If the wipe did not remove them, remove them here — the witness must leave no junk of its own.
    for (const id of [imageAssetId, fileAssetId]) {
      if (!id) continue;
      const there = (await findImageAsset(id)) ?? (await findFileAsset(id));
      if (there) {
        const { deleted, reason } = await deleteAsset(id);
        say(`${deleted ? "cleared" : "could not clear"} the witness's own asset ${id}${reason ? ` (${reason})` : ""}`);
      }
    }
    await db.end().catch(() => {});
    const drop = new Client({ connectionString: baseUrl.toString() });
    await drop.connect();
    await drop.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
    await drop.end();
    console.log(`\ndropped ${DB}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
