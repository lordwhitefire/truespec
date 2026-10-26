/**
 * Take the one-time demo snapshot from main.
 *
 *   npm run demo:snapshot
 *
 * The owner runs this once, after main's demo content is final and before the first demo account
 * arrives. It reads main only, writes no database row and creates no table. It uploads the encrypted
 * archive to the asset store under the seed label and removes older seed-labelled copies so the
 * reset finds exactly one.
 *
 * The output is the summary only: counts, the generated time, the asset id/filename and any failed
 * cleanup ids. It never prints a row, the key, a connection string or a person.
 */
import { config as loadEnv } from "dotenv";

import { runDemoSnapshot } from "../lib/demo-snapshot";
import { deleteAsset, listFileAssets, uploadFile } from "../lib/sanity";
import { storeQueryMain } from "../lib/store-guard";

loadEnv({ path: ".env.local", quiet: true });

async function main(): Promise<void> {
  const summary = await runDemoSnapshot({
    key: process.env.BACKUP_ENCRYPTION_KEY,
    mainUrl: process.env.DATABASE_URL,
    demoUrl: process.env.DEMO_DATABASE_URL,
    // The archive builder takes a `{ rows }` result; the main door answers the rows themselves.
    query: async (text, params = []) => ({
      rows: await storeQueryMain<unknown[]>(text, params),
    }),
    uploadFile,
    listFileAssets,
    deleteAsset,
  });

  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
}

main().catch((error) => {
  // The orchestration returns a safe summary for every expected failure. This is the last-resort
  // guard for a bug: keep it to the error type, never a message that could carry a connection string.
  console.error(`snapshot failed: ${error instanceof Error ? error.name : "unknown error"}`);
  process.exitCode = 1;
});
