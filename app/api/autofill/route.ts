import { NextResponse } from 'next/server';
import { autofillAnswer } from '@/lib/autofill';
import { readCarFile } from '@/lib/draft-read';
import { carStateByLabelCaseless } from '@/lib/draft-store';
import { isSameOrigin } from '@/lib/origin-rules';
import { getOfficeSession } from '@/lib/session';
import { checkUploadSize } from '@/lib/upload-rules';

/**
 * Autofill the manual car form from one filled car PDF (owner ruling 2026-10-20, #2).
 *
 * The file is read **in memory** and nothing is written: no draft, no asset, no file record. The
 * answer is the manual form's own strings, built by `carFormFromDraft` — the mapping the draft save
 * already uses — plus the matched state and any refusals beside the one car.
 *
 * A Route Handler, not a Server Action, for the same reason as the upload: it receives bytes, so it
 * carries the explicit origin check itself. The order is origin, door, size, read — a request not
 * from this site is refused before its body is read, and no session means no bytes are opened.
 *
 * Only `POST` is exported; autofill is a read of the uploaded bytes, but it is a read that must not
 * be reachable by a link or a prefetch, and the file arrives in a body.
 */
export const dynamic = 'force-dynamic';

function refused(status: number, reason: string): Response {
  return NextResponse.json({ ok: false, reason }, { status });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request.headers.get('origin'), request.headers.get('host'))) {
    return refused(403, 'refused: the request did not come from this site');
  }

  const session = await getOfficeSession();
  if (!session) return refused(401, 'Not signed in.');

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return refused(422, 'Send the filled car template as a file.');
  }

  const sent = form.get('file');
  if (!(sent instanceof File)) return refused(422, 'Send the filled car template as a file.');

  const bytes = new Uint8Array(await sent.arrayBuffer());

  const size = checkUploadSize(bytes.byteLength);
  if (!size.ok) return refused(413, size.reason);

  const read = await readCarFile(bytes);

  // The state lookup is only meaningful for exactly one car that named a state. Read it only then;
  // a zero/multi answer never touches the store.
  let matched: { id: string; label: string } | null = null;
  if (read.ok && read.cars.length === 1 && read.cars[0].stateLabel !== null) {
    try {
      const state = await carStateByLabelCaseless(read.cars[0].stateLabel);
      if (state) matched = { id: state.id, label: state.label };
    } catch {
      return refused(503, 'The state registry could not be read. Try again.');
    }
  }

  const answer = autofillAnswer(read, matched);
  return NextResponse.json(answer, { status: answer.ok ? 200 : 422 });
}
