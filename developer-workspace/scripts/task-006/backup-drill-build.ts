/**
 * TASK-006 F/T11 drill source: build a real archive from the throwaway branch and write its
 * encrypted envelope to `/tmp`, without touching Sanity.
 *
 *   TASK006_THROWAWAY=1 BACKUP_ENCRYPTION_KEY=<test key> \
 *     DATABASE_URL_UNPOOLED=<throwaway direct> \
 *     node --import tsx developer-workspace/scripts/task-006/backup-drill-build.ts
 *
 * The key is read from the environment and never printed. The output file is a test artifact and is
 * deleted after the restore drill.
 */
import { writeFileSync } from "node:fs";
import { config as loadEnv } from "dotenv";
import { Client } from "pg";
import { buildBackupArchive, archiveRowCount } from "../../../lib/backup-archive";
import { encryptBackup } from "../../../lib/backup-crypto";

loadEnv({ path: ".env.local", quiet: true });

if (process.env.TASK006_THROWAWAY !== "1") {
  throw new Error("refusing: set TASK006_THROWAWAY=1 and run against the disposable branch only");
}
const key = process.env.BACKUP_ENCRYPTION_KEY ?? "";
if (key === "") throw new Error("BACKUP_ENCRYPTION_KEY is not set");
const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";
if (connectionString === "") throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL is not set");

const OUTPUT = "/tmp/opencode/task006/backup-drill.json.gz.enc";

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const query = async (text: string, params?: unknown[]) => {
      const result = await client.query(text, params);
      return { rows: result.rows as unknown[] };
    };
    const archive = await buildBackupArchive(query, new Date());
    const envelope = encryptBackup(JSON.stringify(archive), key);
    writeFileSync(OUTPUT, envelope, { mode: 0o600 });
    console.log(
      JSON.stringify({
        file: OUTPUT,
        bytes: envelope.byteLength,
        tables: Object.keys(archive.tables).length,
        rows: archiveRowCount(archive),
        sequences: archive.sequences,
      }),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
