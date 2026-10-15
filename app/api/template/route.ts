import { NextResponse } from "next/server";
import { getOfficeSession } from "@/lib/session";
import { carTemplatePdf } from "@/lib/template";
import { readCarCount, TEMPLATE_CONTENT_TYPE, TEMPLATE_FILENAME } from "@/lib/template-rules";

/**
 * The car's blank, at the point where the upload happens (task.md §Q2/D16: "'Create from file'
 * sits on the office inventory … screen, the car template downloads there").
 *
 * A `GET`, because it changes nothing — and, with the tap, one of only two handlers here that are
 * reached without a form. It is **office-only**: the blank names the office's own fields (a private
 * note, a was price, a doorstep price, the registries' states), so it sits behind the door like
 * every other office read (specs/media: a file's "access exists only through the server on an
 * authenticated office request"). A caller with no session gets a `401` and no bytes.
 *
 * It answers for itself rather than redirecting, because a download has nowhere to be redirected
 * *to* — the reason `getOfficeSession()` exists beside `requireOfficeSession()`
 * (lib/session.ts:183).
 *
 * Only `GET` is exported. There is no `POST` here: the upload is `app/api/upload/route.ts`
 * (Task 22), which is the handler that must carry the explicit origin check, because it is the one
 * that receives something.
 *
 * The bytes are built on every request. Nothing is cached and nothing is stored, so there is no
 * filled-in copy anywhere for a download to pick up by mistake.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  // How many cars the blank should hold. Read *first*, before the door: a request asking for a blank
  // no blank can be is refused without a store call, and saying so reveals nothing an office caller
  // reads — no data is served either way. (An anonymous caller still gets no bytes, and no blank.)
  const wanted = readCarCount(new URL(request.url).searchParams.get("cars"));
  if (!wanted.ok) {
    return new Response(`${wanted.reason}\n`, {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const session = await getOfficeSession();
  if (!session) {
    return new Response("Not signed in.\n", {
      status: 401,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  let bytes: Uint8Array;
  try {
    bytes = await carTemplatePdf(wanted.cars);
  } catch {
    return new Response("The template could not be built.\n", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  return new NextResponse(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": TEMPLATE_CONTENT_TYPE,
      "content-disposition": `attachment; filename="${TEMPLATE_FILENAME}"`,
      "content-length": String(bytes.byteLength),
      "cache-control": "no-store",
    },
  });
}
