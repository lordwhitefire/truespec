import { NextResponse } from 'next/server';

import {
  openDemoClient,
  resetEnvFromProcess,
  resetHttpStatus,
  runDemoReset,
} from '@/lib/demo-reset';
import { deleteAsset, downloadFileAsset, listFileAssets, listStoredAssets } from '@/lib/sanity';

/**
 * The demo reset's door.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. The whole guard order lives in
 * `runDemoReset`: auth, the exact `DEMO_RESET_ENABLED === "1"` switch, configuration, the demo
 * target's identity and Neon branch proof, exactly one seed, then the main advisory lock — all
 * before a demo write.
 *
 * `GET` only. `force-dynamic` because this is a live restore, never a cached page. `maxDuration` is
 * the Hobby plan's ceiling; the restore's own statement/query timeout is shorter, so a hung query
 * is reported rather than killed with no summary.
 *
 * The response is the summary. A step failure is a non-200: Vercel's cron record and any log reader
 * see the failure. The one log line carries counts and the failed step — never a key, a connection
 * string, a row or a person.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const summary = await runDemoReset({
    authorization: request.headers.get('authorization'),
    env: resetEnvFromProcess(),
    listFileAssets,
    downloadSeed: downloadFileAsset,
    openDemo: openDemoClient,
    listStoredAssets,
    deleteAsset,
  });

  console.log(
    JSON.stringify({
      event: 'demo-reset',
      ok: summary.ok,
      step: summary.step,
      snapshotAt: summary.snapshotAt,
      rowsBefore: summary.rowsBefore,
      rowsAfter: summary.rowsAfter,
      cleanup: summary.cleanup,
      durationMs: summary.durationMs,
    })
  );

  return NextResponse.json(summary, { status: resetHttpStatus(summary) });
}
