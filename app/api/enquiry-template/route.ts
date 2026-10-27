import { NextResponse } from 'next/server';
import { enquiryTemplatePdf } from '@/lib/enquiry-template';
import {
  ENQUIRY_TEMPLATE_CONTENT_TYPE,
  ENQUIRY_TEMPLATE_FILENAME,
  readEnquiryCount,
} from '@/lib/enquiry-template-rules';
import { getOfficeSession } from '@/lib/session';

/**
 * The enquiry blank, at the point where the upload happens (owner ruling 2026-10-20: "add an
 * enquiry template pdf … downloadable on Enquiries … readable by the existing upload").
 *
 * A `GET`, because it changes nothing. It is **office-only**: the blank carries the office's fields
 * and the names of its states, so it sits behind the door like every other office read. A caller
 * with no session gets a `401` and no bytes.
 *
 * The bytes are built on every request. Nothing is cached and nothing is stored, so there is no
 * filled-in copy anywhere for a download to pick up by mistake.
 *
 * Only `GET` is exported. The upload is `app/api/upload/route.ts`, which carries the explicit origin
 * check because it is the handler that receives something.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  // Read the count before the door: a request asking for a blank no blank can be is refused without
  // a store call, and saying so reveals nothing an office caller reads — no data is served either
  // way. An anonymous caller still gets no bytes, and no blank.
  const wanted = readEnquiryCount(new URL(request.url).searchParams.get('enquiries'));
  if (!wanted.ok) {
    return new Response(`${wanted.reason}\n`, {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const session = await getOfficeSession();
  if (!session) {
    return new Response('Not signed in.\n', {
      status: 401,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  let bytes: Uint8Array;
  try {
    bytes = await enquiryTemplatePdf(wanted.pages);
  } catch {
    return new Response('The template could not be built.\n', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      'content-type': ENQUIRY_TEMPLATE_CONTENT_TYPE,
      'content-disposition': `attachment; filename="${ENQUIRY_TEMPLATE_FILENAME}"`,
      'content-length': String(bytes.byteLength),
      'cache-control': 'no-store',
    },
  });
}
