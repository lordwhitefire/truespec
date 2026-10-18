// TASK-005 Task 26 — read-only lister: every live car's photo count, to pick the witness fixtures
// (a car with no photos, one with exactly one, one with several). Changes nothing.
//
// Run: node --import tsx developer-workspace/scripts/task-005/photo-fixtures.ts
import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local", quiet: true });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select c.ref, count(cp.*)::int as photos
         from car c
         left join car_photo cp on cp.car_id = c.id
        where c.deleted_at is null
        group by c.ref
        order by photos asc, c.ref asc`,
    );
    for (const r of rows) console.log(`${r.ref}\t${r.photos}`);
    console.log(`total ${rows.length} live cars`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
