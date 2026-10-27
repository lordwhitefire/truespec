import { NextResponse } from 'next/server';
import { runDailyBackupLive } from '@/lib/backup-run-live';

/**
 * The daily backup's door.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. The check is the first thing that happens
 * — before the store is read, before the key is looked at, before a byte is dumped. A missing
 * `CRON_SECRET` refuses every request rather than becoming an open endpoint.
 *
 * `GET` only. `force-dynamic` because this is a live read and write, never a cached page.
 * `maxDuration` is the Hobby plan's ceiling; a dump that cannot finish inside it fails and says so
 * rather than being killed halfway with a heartbeat that claims success.
 *
 * The response is the summary. A step failure is a non-200: Vercel's cron record and any log reader
 * see the failure, and the next run is idempotent by filename.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const summary = await runDailyBackupLive();
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}
