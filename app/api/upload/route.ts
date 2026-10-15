import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { recordCarDrafts } from "@/lib/draft";
import { readCarFile } from "@/lib/draft-read";
import { isSameOrigin } from "@/lib/origin-rules";
import { uploadFile } from "@/lib/sanity";
import { getOfficeSession } from "@/lib/session";
import { TEMPLATE_CONTENT_TYPE } from "@/lib/template-rules";
import { checkUploadSize, heldFilename, sourceFilename } from "@/lib/upload-rules";

/**
 * The car file upload (Truth 9 / D16): a filled blank comes back and becomes **drafts** — one per
 * car the file carried — with the file itself held beside them.
 *
 * A Route Handler, not a Server Action, for one reason: **it receives something**. Next checks a
 * Server Action's origin itself, but nothing checks a Route Handler's — so the explicit origin check
 * (task.md line 96: "the receiving handlers carry the origin check") lives here, first, before the
 * body is read or the door is even consulted. It is office-only after that: a file names the office's
 * own fields, so a caller with no session gets a `401` and nothing is read from the bytes.
 *
 * Only `POST` is exported, so no GET can reach it and task.md line 253 ("No GET changes data") holds
 * by construction.
 *
 * The order is deliberate, and it is the order that leaves the least behind:
 *  1. **origin** — a request not from a page we serve is refused before anything is read;
 *  2. **door** — no session, no upload;
 *  3. **size** — a file too big to be a blank is refused before its bytes are opened;
 *  4. **read** — the bytes become drafts and refusals (`lib/draft-read.ts`, pure);
 *  5. **hold** — the file goes to the asset store under a randomised name, *only once at least one
 *     car has been read from it* (a file nothing waits on has no draft that needs its source);
 *  6. **record** — the drafts are written as one batch (`lib/draft.ts`).
 *
 * What it answers:
 *  - 403 — not from this origin;
 *  - 401 — not signed in;
 *  - 413 — the file is larger than a blank could be;
 *  - 422 — not a PDF, not one of our blanks, or a file no car could be read from (the **refusals**
 *    name the page and say why — a refused row is reported, never stored and never silently dropped);
 *  - 503 — the store or the asset store refused; the owner is told to try again;
 *  - 201 — the batch is recorded, with any refusals alongside it.
 *
 * The response never carries the held asset's id: the reference stays in the database, where the
 * office can reach the file through the server, and out of every payload (specs/media).
 */
export const dynamic = "force-dynamic";

function refused(status: number, reason: string): Response {
  return NextResponse.json({ ok: false, reason }, { status });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return refused(403, "refused: the request did not come from this site");
  }

  const session = await getOfficeSession();
  if (!session) return refused(401, "Not signed in.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return refused(422, "Send the filled template as a file.");
  }

  const sent = form.get("file");
  if (!(sent instanceof File)) return refused(422, "Send the filled template as a file.");

  const bytes = new Uint8Array(await sent.arrayBuffer());

  const size = checkUploadSize(bytes.byteLength);
  if (!size.ok) return refused(413, size.reason);

  const read = await readCarFile(bytes);
  if (!read.ok) return refused(422, read.reason);

  if (read.cars.length === 0) {
    // Nothing was read, so nothing is waiting on the file — there is no draft whose source would need
    // holding. The refusals are the entire answer, and every row is named.
    return NextResponse.json(
      { ok: false, reason: "No car could be read from that file.", refusals: read.refusals },
      { status: 422 },
    );
  }

  const batchId = randomUUID();

  let assetId: string;
  try {
    const held = await uploadFile(Buffer.from(bytes), {
      filename: heldFilename(randomUUID()),
      contentType: TEMPLATE_CONTENT_TYPE,
    });
    assetId = held.assetId;
  } catch {
    return refused(503, "The file could not be held. Try again.");
  }

  try {
    await recordCarDrafts({
      batchId,
      sourceFilename: sourceFilename(sent.name),
      sourceAssetId: assetId,
      cars: read.cars,
    });
  } catch {
    return refused(503, "The file was held but its cars were not recorded. Try again.");
  }

  return NextResponse.json(
    { ok: true, batchId, cars: read.cars.length, refusals: read.refusals },
    { status: 201 },
  );
}
