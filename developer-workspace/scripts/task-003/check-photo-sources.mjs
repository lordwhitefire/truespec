// Task 10 — the intended photo manifest, and the proof that every image resolves.
//
// The source set is the Unsplash photos the seed already names, now held in
// `car_photo.origin` as `unsplash:<id>`. For each one this fetches the exact URL
// the upload (Task 12) will use and records the outcome, writes the intended
// manifest, and prints the table that goes into plans/TASK-003-photo-manifest.md.
//
// Two decisions are baked into the fetch URL, both measured rather than assumed
// (probe-photo-bytes.mjs):
//   * `fm=jpg` — `auto=format` alone hands a no-Accept client whatever the source
//     was; one photo came back as a 1.9 MB PNG. Forcing JPEG keeps every upload a
//     sane web size (task.md §2, free tier respected).
//   * `w=1200` — wide enough for the 1100px layout, small enough for the tier.
//
// Reads only: nothing is written to the database or to Unsplash.
//
//   node --env-file=.env.local developer-workspace/scripts/task-003/check-photo-sources.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { Client } from "pg";

// The approved demo fleet (plans/TASK-003-demo-fleet.md).
const FLEET = [
  "TS-1001", "TS-1003", "TS-1005", "TS-1007", "TS-1008", "TS-1011", "TS-1012",
  "TS-1013", "TS-1014", "TS-1018", "TS-1015", "TS-1016", "TS-1017",
  "TS-1019", "TS-1020", "TS-1023", "TS-1025",
];

const WIDTH = 1200;
const FLEET_CARS = {
  "TS-1001": "Toyota Camry XSE V6",
  "TS-1003": "Lexus RX 350 F Sport",
  "TS-1005": "BMW X5 xDrive40i",
  "TS-1007": "Honda Accord Touring",
  "TS-1008": "Toyota RAV4 Prime SE",
  "TS-1011": "Mercedes-Benz C 300 AMG Line",
  "TS-1012": "BMW X3 xDrive30i",
  "TS-1013": "Range Rover Sport HSE",
  "TS-1014": "Porsche Macan S",
  "TS-1015": "Toyota Land Cruiser Prado VX",
  "TS-1016": "Chevrolet Tahoe LT",
  "TS-1017": "Ford F-150 Lariat",
  "TS-1018": "BMW X7 xDrive40i",
  "TS-1019": "Lexus RX 350",
  "TS-1020": "Honda CR-V EX-L",
  "TS-1023": "Mercedes-Benz E 350",
  "TS-1025": "Honda Civic EX (sold)",
};

const fetchUrl = (unsplashId) =>
  `https://images.unsplash.com/photo-${unsplashId}?auto=format&fit=crop&w=${WIDTH}&q=70&fm=jpg`;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const { rows } = await client.query(
  `SELECT c.ref, p.position, p.origin
     FROM car c JOIN car_photo p ON p.car_id = c.id
    WHERE c.ref = ANY($1)
    ORDER BY c.ref, p.position`,
  [FLEET],
);
await client.end();

const results = [];
let dead = 0;

async function check(row) {
  const unsplashId = row.origin.replace(/^unsplash:/, "");
  const url = fetchUrl(unsplashId);
  const entry = { ref: row.ref, position: row.position, origin: row.origin, unsplashId, url };
  try {
    const res = await fetch(url, { redirect: "follow" });
    const bytes = (await res.arrayBuffer()).byteLength;
    entry.status = res.status;
    entry.contentType = res.headers.get("content-type");
    entry.bytes = bytes;
    entry.ok = res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
  } catch (err) {
    entry.status = null;
    entry.error = err.message;
    entry.ok = false;
  }
  if (!entry.ok) dead += 1;
  results.push(entry);
}

// Five at a time — quick, and polite to Unsplash.
const queue = [...rows];
await Promise.all(
  Array.from({ length: 5 }, async () => {
    while (queue.length) await check(queue.shift());
  }),
);

results.sort((a, b) => (a.ref === b.ref ? a.position - b.position : a.ref < b.ref ? -1 : 1));

const dir = "developer-workspace/scripts/task-003/runs/task-10";
mkdirSync(dir, { recursive: true });

// The manifest the upload reads: one entry per image, in display order.
writeFileSync(
  `${dir}/photo-manifest.intended.json`,
  JSON.stringify(
    {
      purpose:
        "Task 10 intended manifest — the images Task 12 downloads and uploads. `fetchUrl` is the exact URL to fetch; `origin` is what the row records.",
      width: WIDTH,
      sizeRule: `auto=format&fit=crop&w=${WIDTH}&q=70&fm=jpg`,
      checkedAt: new Date().toISOString(),
      images: results.map((r) => ({
        ref: r.ref,
        position: r.position,
        origin: r.origin,
        unsplashId: r.unsplashId,
        fetchUrl: r.url,
        expectedBytes: r.bytes ?? null,
        expectedContentType: r.contentType ?? null,
        resolves: r.ok === true,
      })),
    },
    null,
    2,
  ),
);

// The evidence record of the resolution check itself.
writeFileSync(
  `${dir}/photo-resolution.json`,
  JSON.stringify({ width: WIDTH, fleet: FLEET, checkedAt: new Date().toISOString(), results }, null, 2),
);

// The table for the human-readable manifest.
const totalKb = results.reduce((n, r) => n + (r.bytes ?? 0), 0) / 1024;
console.log("| car | position | `origin` (what the row records) | fetch (upload URL) | type | bytes |");
console.log("|-----|----------|---------------------------------|--------------------|------|-------|");
for (const r of results) {
  console.log(
    `| ${r.ref} ${FLEET_CARS[r.ref] ?? ""} | ${r.position} | \`${r.origin}\` | \`photo-${r.unsplashId}\` | ${r.contentType ?? "-"} | ${r.bytes ?? "-"} |`,
  );
}
console.log(`\n${results.length} images, ${dead} dead, ${(totalKb / 1024).toFixed(1)} MB total at width ${WIDTH}.`);
process.exit(dead === 0 ? 0 : 1);
