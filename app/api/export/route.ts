import { NextResponse } from 'next/server';
import { getOfficeSession } from '@/lib/session';
import { buildExport } from '@/lib/export';
import { buildZip } from '@/lib/zip';

/**
 * The export (truth 13 / AC 14): *one action → one ZIP*. Everything the system holds, as `master.json`
 * (nested) plus one CSV per subject plus a `README.txt`.
 *
 * It is a `GET`, because it changes nothing — and, like the blank's download beside it
 * (`app/api/template/route.ts`), it answers for itself rather than redirecting: a download has
 * nowhere to be redirected *to*, which is why `getOfficeSession()` exists beside
 * `requireOfficeSession()` (lib/session.ts).
 *
 * **The door is the whole security story here.** This route hands over every car's private note, every
 * enquiry's number and every setting in one response, so it sits behind the same session read as every
 * other office route and it is never a public path. It has no origin check, and that is not an
 * omission: the origin rule belongs to a handler that *receives* something (design D17 — the upload
 * and the writes), because a cross-origin request with no body has nothing to forge. A GET's response
 * is not readable cross-origin by the caller at all — the browser's same-origin policy stops it — so
 * what protects these bytes is the session, exactly as it protects the same rows on `/office/*`.
 *
 * **A caller with no session gets a `401` and no body at all** — not even a sentence. The spec's word
 * is *"returns nothing"* (AC 14), and an endpoint that would otherwise confirm which subjects exist,
 * how many there are, and when the office last answered, is better off saying nothing. That is a
 * deliberate difference from the template route, which does send a plain-text line.
 *
 * `force-dynamic` and `cache-control: no-store` are both required: this is a live read of the store
 * (D2 — the store is the truth), and Next would otherwise be free to keep answering from a saved copy
 * of the whole archive.
 */

/** A ZIP is a ZIP to every browser; the filename says which day and what it is. */
const EXPORT_CONTENT_TYPE = 'application/zip';

function exportFilename(at: Date): string {
  return `truespec-export-${at.toISOString().slice(0, 10)}.zip`;
}

// A download, not a page: never prerendered, never cached, read at request time.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const session = await getOfficeSession();
  if (!session) {
    return new Response(null, { status: 401, headers: { 'cache-control': 'no-store' } });
  }

  const now = new Date();

  let bytes: Uint8Array;
  try {
    const files = await buildExport(now);
    bytes = buildZip(
      files.map((file) => ({ name: file.name, data: file.body })),
      now
    );
  } catch {
    // The store could not be read in full. Saying so beats sending a partial archive: an export that
    // quietly omits a subject is the one failure the AC exists to catch.
    return new Response('The export could not be built.\n', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'content-type': EXPORT_CONTENT_TYPE,
      'content-disposition': `attachment; filename="${exportFilename(now)}"`,
      'content-length': String(bytes.byteLength),
      'cache-control': 'no-store',
    },
  });
}
