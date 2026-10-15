/**
 * Drops and recreates the `public` schema — the "drop" of a scratch rebuild.
 * Used only to prove `drop → migrate → seed` reproduces the fleet from nothing.
 *
 *   node --import tsx developer-workspace/scripts/task-004/drop-schema.ts
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
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    console.log("public schema dropped and recreated — the store is empty.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
