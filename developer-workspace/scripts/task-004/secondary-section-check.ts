/**
 * Proves what a secondary state's `section` actually is in the store — the value
 * `getOfficeSecondaryStates` resolves through `sectionOfState`.
 *
 *   node --import tsx developer-workspace/scripts/task-004/secondary-section-check.ts
 */
import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local", quiet: true });

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const rows = (
      await client.query(
        `SELECT label, kind, section, (section IS NULL) AS section_is_null
           FROM car_state ORDER BY kind, sort, label`,
      )
    ).rows;
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
