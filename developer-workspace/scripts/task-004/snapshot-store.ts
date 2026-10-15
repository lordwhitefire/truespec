/**
 * A JSON snapshot of every public table, as a restore point before a scratch rebuild.
 * pg_dump 16 cannot talk to the Neon server (18), so we copy rows through the driver.
 *
 *   node --import tsx developer-workspace/scripts/task-004/snapshot-store.ts <out.json>
 */
import { writeFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";

loadEnv({ path: ".env.local", quiet: true });

async function main() {
  const out = process.argv[2] ?? "/tmp/opencode/truespec-store-snapshot.json";
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const tables = (
      await client.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
      )
    ).rows.map((r) => r.table_name);
    const dump: Record<string, unknown[]> = {};
    for (const t of tables) {
      dump[t] = (await client.query(`SELECT * FROM "${t}"`)).rows;
      console.log(`  ${t}: ${dump[t].length} row(s)`);
    }
    writeFileSync(out, JSON.stringify({ takenAt: new Date().toISOString(), tables: dump }, null, 2));
    console.log(`wrote ${out}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
