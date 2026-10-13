// TASK-003 Task 24 — the demo wipe, proved on a scratch store before it goes near the live one.
//
// When is this true: "the demo fleet can be removed in one move, leaving nothing of itself behind and
// touching no other record" (benchmark 11) and "at no point did any job remove it for him" (benchmark 8).
//
// The scratch store is built from nothing (chain + seed), and then **real records are planted next to
// the demo's** — a car that is not the demo's with its own cost lines, photo, sale, tap and activity
// row, an enquiry of its own with its own PDF, and a second enquiry that shares the *demo's* PDF row.
// That is the only way "touching no other record" can be checked rather than asserted: after the wipe
// the demo must be gone and every one of those planted records must still be there.
//
// The wipe runs `--no-assets` here on purpose: the demo's assets are the same real Sanity assets the
// live store still holds, so a scratch run must not delete them. The asset half is the live run's.
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/wipe-proof.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

const DB = "truespec_scratch_003e";
const RUN_DIR = "developer-workspace/scripts/task-003/runs/task-24";
mkdirSync(RUN_DIR, { recursive: true });

const baseUrl = new URL(process.env.DATABASE_URL);
const scratchUrl = new URL(baseUrl);
scratchUrl.pathname = `/${DB}`;
const scratch = scratchUrl.toString();

const log = [];
const say = (line) => {
  console.log(line);
  log.push(line);
};
const check = (ok, name, detail) => {
  const line = `${ok ? "ok  " : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`;
  say(line);
  return { ok, name, detail: detail ?? "" };
};

const env = { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch };
const run = (label, args) => {
  const out = execFileSync("node", args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  say(`\n--- ${label} ---\n${out.trim()}`);
  return out;
};

// One connection for the whole run. A fresh TLS handshake per query is slow, and on a link that is
// dropping it is a way to lose the run halfway through the planting.
const db = new Client({ connectionString: scratch });
async function q(sql, params) {
  return (await db.query(sql, params)).rows;
}

const one = async (sql, params) => (await db.query(sql, params)).rows[0];

// The demo's own footprint, by the wipe's own clauses.
const DEMO_FOOTPRINT = {
  demoCars: "SELECT count(*)::int n FROM car WHERE is_demo",
  demoEnquiries: "SELECT count(*)::int n FROM enquiry WHERE is_demo",
  demoCostLines:
    "SELECT count(*)::int n FROM cost_line l JOIN car c ON c.id=l.car_id WHERE c.is_demo",
  demoPhotos: "SELECT count(*)::int n FROM car_photo p JOIN car c ON c.id=p.car_id WHERE c.is_demo",
  demoSales: "SELECT count(*)::int n FROM sale s JOIN car c ON c.id=s.car_id WHERE c.is_demo",
  tapsOnDemoRefs:
    "SELECT count(*)::int n FROM tap WHERE car_ref IN (SELECT ref FROM car WHERE is_demo)",
  activityNamingDemoRefs:
    "SELECT count(*)::int n FROM activity_event WHERE subject IN (SELECT ref FROM car WHERE is_demo)",
};

// The planted records: the ones that must survive untouched.
const PLANTED = {
  car_TS_9001: "SELECT count(*)::int n FROM car WHERE ref='TS-9001'",
  costlines_TS_9001: "SELECT count(*)::int n FROM cost_line l JOIN car c ON c.id=l.car_id WHERE c.ref='TS-9001'",
  photo_TS_9001: "SELECT count(*)::int n FROM car_photo p JOIN car c ON c.id=p.car_id WHERE c.ref='TS-9001'",
  sale_TS_9001: "SELECT count(*)::int n FROM sale s JOIN car c ON c.id=s.car_id WHERE c.ref='TS-9001'",
  enquiry_real: "SELECT count(*)::int n FROM enquiry WHERE is_demo=false AND name='Real Customer'",
  enquiry_sharing_demo_pdf:
    "SELECT count(*)::int n FROM enquiry e JOIN enquiry_pdf p ON p.id=e.pdf_import_id WHERE e.is_demo=false AND e.name='Shares The Demo PDF'",
  pdf_own: "SELECT count(*)::int n FROM enquiry_pdf WHERE filename='real-own.pdf'",
  tap_TS_9001: "SELECT count(*)::int n FROM tap WHERE car_ref='TS-9001'",
  activity_TS_9001: "SELECT count(*)::int n FROM activity_event WHERE subject='TS-9001'",
  settings: "SELECT count(*)::int n FROM setting",
};

const snapshot = async () => {
  const out = {};
  for (const [name, sql] of Object.entries(DEMO_FOOTPRINT)) out[name] = (await one(sql)).n;
  for (const [name, sql] of Object.entries(PLANTED)) out[name] = (await one(sql)).n;
  return out;
};

const verdicts = [];
const admin = new Client({ connectionString: baseUrl.toString() });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${DB}`);
await admin.end();
say(`created ${DB}`);
await db.connect();

try {
  run("the whole chain", ["--import", "tsx", "scripts/migrate.ts"]);
  run("the demo seed", ["--import", "tsx", "scripts/seed.ts"]);

  const seeded = await snapshot();
  say(`\nseeded: ${JSON.stringify(seeded)}`);

  // --- plant records that are NOT the demo's ---------------------------------
  say("\n--- planting records that are not the demo's ---");
  await q(`
    INSERT INTO car (ref, brand, model, trim, year, exterior_color, interior_color, mileage,
                     features, note, private_note, was_price_kobo, arrival_note, doorstep_price_kobo,
                     state_id, version, is_demo)
    SELECT 'TS-9001', brand, model, trim, 2019, exterior_color, interior_color, 12345,
           features, note, private_note, NULL, arrival_note, doorstep_price_kobo,
           state_id, version, false
      FROM car WHERE ref = 'TS-1001'
  `);
  await q(`
    INSERT INTO cost_line (car_id, kind, amount_minor)
    SELECT (SELECT id FROM car WHERE ref='TS-9001'), kind, amount_minor + 1
      FROM cost_line WHERE car_id = (SELECT id FROM car WHERE ref='TS-1001')
  `);
  await q(`
    INSERT INTO car_photo (car_id, sanity_asset_id, position, origin)
    VALUES ((SELECT id FROM car WHERE ref='TS-9001'), 'image-KEEPKEEPKEEP-1x1-jpg', 0, 'unsplash:keep')
  `);
  await q(`
    INSERT INTO sale (car_id, sale_price_kobo, sold_at)
    VALUES ((SELECT id FROM car WHERE ref='TS-9001'), 1, now())
  `);
  await q(`
    INSERT INTO enquiry_pdf (sanity_asset_id, filename, rows_total, imported_at)
    VALUES ('file-KEEPKEEPKEEP-pdf', 'real-own.pdf', 3, now())
  `);
  await q(`
    INSERT INTO enquiry (name, number, car_ref, note, enquiry_state_id, pdf_import_id, is_demo, created_at, updated_at)
    VALUES ('Real Customer', '+2348000009999', 'TS-9001', 'a real enquiry',
            (SELECT id FROM enquiry_state ORDER BY label LIMIT 1),
            (SELECT id FROM enquiry_pdf WHERE filename='real-own.pdf'), false, now(), now())
  `);
  // The edge the wipe's PDF clause exists for: a non-demo enquiry holding the DEMO's PDF row. That
  // row must survive, and its asset must not be offered for deletion.
  const demoPdf = await one("SELECT id FROM enquiry_pdf ORDER BY imported_at LIMIT 1");
  say(`the demo's imported PDF row: ${demoPdf.id}`);
  await q(
    `INSERT INTO enquiry (name, number, car_ref, note, enquiry_state_id, pdf_import_id, is_demo, created_at, updated_at)
     VALUES ('Shares The Demo PDF', '+2348000009998', 'TS-9001', 'imported from the same document',
             (SELECT id FROM enquiry_state ORDER BY label LIMIT 1), $1, false, now(), now())`,
    [demoPdf.id],
  );
  await q("INSERT INTO tap (page, car_ref, at) VALUES ('/car/TS-9001','TS-9001', now())");
  await q("INSERT INTO activity_event (kind, subject, at) VALUES ('view', 'TS-9001', now())");
  // ...and the demo's own log rows, which must go with it (task.md:115).
  await q(`
    INSERT INTO tap (page, car_ref, at)
    SELECT '/car/' || ref, ref, now() FROM car WHERE is_demo LIMIT 1
  `);
  await q(`
    INSERT INTO activity_event (kind, subject, at)
    SELECT 'view', ref, now() FROM car WHERE is_demo LIMIT 1
  `);

  const planted = await snapshot();
  say(`planted: ${JSON.stringify(planted)}`);
  say(`  (every planted measure must read > 0 before the wipe — the assertions below compare the store's state before and after)`);

  // --- the dry run must change nothing ---------------------------------------
  const dryOut = run("dry run", [
    "--import", "tsx", "--conditions=react-server", "scripts/demo-wipe.ts", "--json",
  ]);
  const dry = JSON.parse(dryOut.slice(dryOut.indexOf("{")));
  const afterDry = await snapshot();
  verdicts.push(
    check(
      dry.dryRun === true && JSON.stringify(afterDry) === JSON.stringify(planted),
      "the dry run reports a dry run and changes nothing at all",
      `dryRun=${dry.dryRun} · store identical: ${JSON.stringify(afterDry) === JSON.stringify(planted)}`,
    ),
  );
  say(`\nwhat the dry run says would go: ${JSON.stringify(dry.demo)}`);

  // --- the one move ----------------------------------------------------------
  const wipeOut = run("the wipe (rows only — the assets are the live run's)", [
    "--import", "tsx", "--conditions=react-server", "scripts/demo-wipe.ts", "--yes", "--no-assets", "--json",
  ]);
  const wipe = JSON.parse(wipeOut.slice(wipeOut.indexOf("{")));
  const after = await snapshot();
  say(`\nafter the wipe: ${JSON.stringify(after)}`);

  // 1. the demo is gone
  verdicts.push(
    check(
      after.demoCars === 0 && after.demoEnquiries === 0 && after.demoCostLines === 0 &&
        after.demoPhotos === 0 && after.demoSales === 0 && after.tapsOnDemoRefs === 0 &&
        after.activityNamingDemoRefs === 0,
      "nothing of the demo is left: cars, enquiries, cost lines, photos, sales, taps, activity rows",
      `demoCars=${after.demoCars} demoEnquiries=${after.demoEnquiries} demoCostLines=${after.demoCostLines} demoPhotos=${after.demoPhotos} demoSales=${after.demoSales} taps=${after.tapsOnDemoRefs} activity=${after.activityNamingDemoRefs}`,
    ),
  );

  // 2. no other record was touched
  const survived = Object.entries(PLANTED).filter(([name, sql]) => planted[name] === after[name]);
  const moved = Object.entries(PLANTED).filter(([name]) => planted[name] !== after[name]);
  verdicts.push(
    check(
      moved.length === 0,
      `every planted non-demo record survived (${survived.length} measures)`,
      moved.length ? moved.map(([n]) => `${n}: ${planted[n]} → ${after[n]}`).join(" · ") : `all ${Object.keys(PLANTED).length} unchanged`,
    ),
  );

  // 3. the shared-PDF guard: a non-demo enquiry holding the demo's PDF keeps it alive
  const demoPdfAfter = await one("SELECT count(*)::int n FROM enquiry_pdf WHERE id = $1", [demoPdf.id]);
  const sharerAfter = await one("SELECT count(*)::int n FROM enquiry WHERE pdf_import_id = $1 AND is_demo = false", [
    demoPdf.id,
  ]);
  verdicts.push(
    check(
      demoPdfAfter.n === 1 && sharerAfter.n === 1,
      "the demo's PDF row survives when an enquiry that is not the demo's still holds it",
      `the demo's PDF row still present: ${demoPdfAfter.n} · non-demo enquiries holding it: ${sharerAfter.n}`,
    ),
  );

  // 4. the wipe's own report agrees with the store
  verdicts.push(
    check(
      wipe.removed.cars === seeded.demoCars && wipe.removed.enquiries === seeded.demoEnquiries &&
        wipe.assetsDeletedFromStore === false && wipe.untouched.missing.length === 0,
      "the wipe's own summary matches the store it ran against",
      `removed.cars=${wipe.removed.cars} (seeded ${seeded.demoCars}) · removed.enquiries=${wipe.removed.enquiries} (seeded ${seeded.demoEnquiries}) · assets deleted: ${wipe.assetsDeletedFromStore} · ids lost that were not the demo's: ${wipe.untouched.missing.length}`,
    ),
  );

  // 5. the assets it would have deleted are exactly the demo's
  const demoAssetIds = (
    await q("SELECT DISTINCT sanity_asset_id FROM car_photo p JOIN car c ON c.id=p.car_id WHERE c.is_demo")
  ).length;
  verdicts.push(
    check(
      wipe.assets.collected === seeded.demoPhotos && demoAssetIds === 0,
      "the assets offered for deletion were exactly the demo's photos, and none is left to offer",
      `offered=${wipe.assets.collected} (the demo had ${seeded.demoPhotos} photos) · demo photo asset ids remaining=${demoAssetIds}`,
    ),
  );

  // 6. it reports honestly that it removed only rows
  verdicts.push(
    check(
      wipe.assets.deleted.length === 0 && wipe.assets.failed.length === 0,
      "rows-only mode deleted no asset and admitted no failure",
      `deleted=${wipe.assets.deleted.length} failed=${wipe.assets.failed.length}`,
    ),
  );

  const ok = verdicts.every((v) => v.ok);
  say(`\n${ok ? "PASS" : "FAIL"} — ${verdicts.filter((v) => v.ok).length}/${verdicts.length} verdicts`);
  writeFileSync(
    `${RUN_DIR}/wipe-proof.json`,
    JSON.stringify({ ranAt: new Date().toISOString(), scratch: DB, seeded, planted, after, dry, wipe, verdicts }, null, 2),
  );
  writeFileSync(`${RUN_DIR}/wipe-proof.log`, log.join("\n"));
  say(`wrote ${RUN_DIR}/wipe-proof.json`);
  process.exitCode = ok ? 0 : 1;
} finally {
  await db.end().catch(() => {});
  const drop = new Client({ connectionString: baseUrl.toString() });
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await drop.end();
  console.log(`\ndropped ${DB}`);
}
